// RevenueCat bridge for the paywall in CAGE_SCRIPT (lib.rs). Rust registers
// an instance of this class on the webview as the script message handler
// "konvoStore" (lib.rs, with_webview); pages post {cmd, id, ...} and the
// reply arrives as window.__konvoStoreReply(id, {...}).
//
// RevenueCat wraps StoreKit 2 underneath (entitlement "Pro" - capital P,
// it must match the dashboard identifier exactly; offering
// "default": $rc_annual / $rc_monthly / $rc_lifetime). No accounts and no
// Konvo backend, on purpose: the subscription is tied to the Apple ID
// through the receipt, which survives app deletion, reinstall, and new
// devices. Restore is restorePurchases(). The bridge protocol is unchanged
// from the pure-StoreKit era, so the paywall JS never knew about the swap.
//
// Analytics: the "track" command posts funnel events to PostHog natively
// (URLSession) because Instagram's CSP would block the page from doing it.
// Lean payloads by decision (Aug 3): event + screen ids, no quiz values.

import BackgroundTasks
import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings
import Network
import RevenueCat
import RevenueCatUI
import SafariServices
import StoreKit
import SuperwallKit
import SwiftUI
import UIKit
import UniformTypeIdentifiers
import UserNotifications
import WebKit
import UserJot

// Superwall's purchase controller, delegating all money movement to
// RevenueCat — the official integration (superwall.com/docs/ios/guides/
// using-revenuecat), same file to spare the hand-maintained pbxproj a
// source entry. Superwall renders the paywall; RevenueCat completes the
// purchase; syncSubscriptionStatus streams RC entitlements into Superwall
// so its gating always agrees with the "Pro" entitlement.
final class RCPurchaseController: PurchaseController {
    func syncSubscriptionStatus() {
        assert(Purchases.isConfigured, "Configure RevenueCat first.")
        Task {
            for await customerInfo in Purchases.shared.customerInfoStream {
                let entitlements = customerInfo.entitlements
                    .activeInCurrentEnvironment.keys.map { Entitlement(id: $0) }
                await MainActor.run { [entitlements] in
                    Superwall.shared.subscriptionStatus = .active(Set(entitlements))
                }
            }
        }
    }

    func purchase(product: SuperwallKit.StoreProduct) async -> PurchaseResult {
        do {
            guard let sk2Product = product.sk2Product else {
                return .failed(NSError(
                    domain: "Konvo", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "no SK2 product"]))
            }
            let storeProduct = RevenueCat.StoreProduct(sk2Product: sk2Product)
            KonvoActivationAnalytics.shared.record("native_plan_selected", ["plan": storeProduct.productIdentifier])
            let result = try await Purchases.shared.purchase(product: storeProduct)
            if !result.userCancelled, result.customerInfo.entitlements.active["Pro"] != nil {
                KonvoActivationAnalytics.shared.record("native_purchase_completed", ["plan": storeProduct.productIdentifier])
            }
            return result.userCancelled ? .cancelled : .purchased
        } catch let error as ErrorCode {
            return error == .paymentPendingError ? .pending : .failed(error)
        } catch {
            return .failed(error)
        }
    }

    func restorePurchases() async -> RestorationResult {
        do {
            _ = try await Purchases.shared.restorePurchases()
            return .restored
        } catch {
            return .failed(error)
        }
    }
}

// CHECKOUT_ATTEMPT_BEGIN
// A native outcome survives destruction of the JavaScript page/callback.
// Only public catalog metadata and bounded enums enter the analytics payload.
final class KonvoCheckoutAttempt {
    private var properties: [String: Any]
    private let started = Date()
    private let emit: (String, [String: Any]) -> Void
    private var finished = false
    init(productId: String, context: [String: Any]?, emit: @escaping (String, [String: Any]) -> Void) {
        self.emit = emit
        let supplied = context?["checkout_attempt_id"] as? String ?? ""
        let validID = !supplied.isEmpty && supplied.count <= 80 && supplied.unicodeScalars.allSatisfy {
            CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-").contains($0)
        }
        properties = ["checkout_attempt_id": validID ? supplied : UUID().uuidString,
            "checkout_tracking_version": 1, "product_id": productId, "store_requested": false]
        for (key, allowed) in ["screen_id": ["s13_paywall", "new_paywall"],
                               "paywall_id": ["original", "expired_inbox_v1", "inbox_annual_weekly_v3", "inbox_special_annual_v3"],
                               "checkout_copy_version": ["clarity_v1", "expired_inbox_v1"],
                               "placement": ["onboarding", "lapsed"],
                               "plan": ["annual", "monthly", "weekly", "lifetime", "annual_special"]] {
            if let value = context?[key] as? String, allowed.contains(value) { properties[key] = value }
        }
        // Preserve what the user saw separately from the package selected by RC.
        for key in ["displayed_price", "currency", "offering_id"] {
            if let value = context?[key] as? String, value.count <= 100 {
                properties[key == "displayed_price" ? key : "displayed_" + key] = value
            }
        }
        if let days = context?["trial_days"] as? Int, (0...366).contains(days) { properties["displayed_trial_days"] = days }
        if let eligible = context?["trial_eligible"] as? Bool { properties["displayed_trial_eligible"] = eligible }
        emit("checkout_received", properties)
    }
    func storeRequested(catalog: [String: Any]) {
        guard !finished else { return }
        for key in ["product_id", "offering_id", "package_id", "price_amount", "currency", "localized_price"] {
            if let value = catalog[key] { properties[key] = value }
        }
        properties["store_requested"] = true
        emit("checkout_store_requested", properties)
    }
    func finish(_ reply: [String: Any], reason: String? = nil, errorCode: Int? = nil) -> [String: Any] {
        guard !finished else { return reply }
        finished = true
        properties["result"] = reply["ok"] as? Bool == true && reply["entitled"] as? Bool == true ? "purchased"
            : reply["cancelled"] as? Bool == true ? "cancelled"
            : reply["pending"] as? Bool == true ? "pending"
            : reply["ok"] as? Bool == true ? "not_entitled" : "error"
        properties["elapsed_ms"] = Int(Date().timeIntervalSince(started) * 1000)
        if let reason { properties["failure_stage"] = reason }
        if let errorCode { properties["error_code"] = errorCode }
        emit("checkout_result", properties)
        return reply
    }
}
// CHECKOUT_ATTEMPT_END

// CHECKOUT_OUTBOX_BEGIN
// Persist only checkout telemetry, including its original identity/timestamp/UUID.
// A transient network failure must not turn an attempted purchase into a silent
// paywall exit. Sending/retrying never delays or retries the purchase itself.
final class KonvoCheckoutOutbox {
    private let queue = DispatchQueue(label: "konvo.checkout.telemetry")
    private var items: [Data]
    private var sending = false, retryScheduled = false
    private var retryDelay: TimeInterval = 2
    private let save: (Data) -> Void
    private let send: (Data, @escaping (Int?) -> Void) -> Void
    private let schedule: (TimeInterval, @escaping () -> Void) -> Void
    init(load: () -> Data?, save: @escaping (Data) -> Void,
         send: @escaping (Data, @escaping (Int?) -> Void) -> Void,
         schedule: @escaping (TimeInterval, @escaping () -> Void) -> Void = { delay, work in
             DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + delay, execute: DispatchWorkItem(block: work))
         }) {
        self.save = save; self.send = send; self.schedule = schedule
        items = (load().flatMap { try? JSONDecoder().decode([Data].self, from: $0) }) ?? []
    }
    func enqueue(_ payload: Data) {
        queue.async {
            // Bound persistent storage if telemetry is blocked for a long time.
            if self.items.count >= 500 { self.items.removeFirst() }
            self.items.append(payload); self.persist(); self.drain()
        }
    }
    func flush() { queue.async { self.drain() } }
    private func persist() { if let data = try? JSONEncoder().encode(items) { save(data) } }
    private func drain() {
        guard !sending, !retryScheduled, let payload = items.first else { return }
        sending = true
        send(payload) { status in
            self.queue.async {
                self.sending = false
                let accepted = status.map { (200..<300).contains($0) } ?? false
                let permanent = status.map { (400..<500).contains($0) && $0 != 408 && $0 != 429 } ?? false
                if accepted || permanent {
                    // Capacity eviction may have removed this in-flight item.
                    if self.items.first == payload { self.items.removeFirst() }
                    self.retryDelay = 2; self.persist(); self.drain()
                } else {
                    self.retryScheduled = true
                    let delay = self.retryDelay; self.retryDelay = min(300, delay * 2)
                    self.schedule(delay) {
                        self.queue.async { self.retryScheduled = false; self.drain() }
                    }
                }
            }
        }
    }
}
// CHECKOUT_OUTBOX_END

@objc(KonvoStore)
public class KonvoStore: NSObject, WKScriptMessageHandler {
    private static let purchaseController = RCPurchaseController()
    // Public SDK keys (safe to embed). Lazily configured once, before any
    // use. Superwall rides RevenueCat via the purchase controller above;
    // identify with RC's anonymous id so both dashboards and PostHog join
    // on the same user without Konvo ever having accounts.
    private static let configureOnce: Void = {
        if #available(iOS 16.0, *) { migrateCageSelection() }
        Purchases.logLevel = .warn
        Purchases.configure(withAPIKey: "appl_ghuOElWpSeJyXhbJcOKQpQoRSsQ")
        ActivationPal.configure(
            app: "konvodmsonly",
            key: "ap_pk_e9129afb4aa3bb0d5d1a54a14d024b2f100b81b9af3eb65b",
            userId: Purchases.shared.appUserID)
        Superwall.configure(
            apiKey: "pk_qgUOhtAwezkyYCcEJ8kT_",
            purchaseController: purchaseController)
        purchaseController.syncSubscriptionStatus()
        Superwall.shared.identify(userId: Purchases.shared.appUserID)
        // UserJot (Sep 1): the feedback board, presented natively because
        // Instagram's CSP would block their web widget inside the page.
        // Same anonymous id as the two above, so a post joins PostHog.
        DispatchQueue.main.async {
            UserJot.setup(projectId: userJotProject)
            UserJot.identify(userId: Purchases.shared.appUserID)
        }
    }()

    // UserJot dashboard > Settings > Login > Secrets > Project ID.
    private static let userJotProject = "cmthvmiur00u90kmt3vple0uu"

    // iOS pins a form accessory bar (the ^ v Done strip) above every
    // keyboard in a WKWebView. No public API removes it; the accepted
    // App-Store-safe technique is a runtime subclass of the WKContent view
    // whose inputAccessoryView answers nil. Patched once, on the first
    // bridge message - the bundled onboarding tracks s1 at launch, long
    // before any keyboard (earliest: Instagram's login form) can appear.
    // Keep native and CSS zoom at 1:1, including media opened inside a chat.
    private static func applyZoom(_ webView: WKWebView) {
        if webView.pageZoom != 1 { webView.pageZoom = 1 }
    }

    private static var accessoryKilled = false
    private static func killAccessoryBar(_ webView: WKWebView) {
        guard !accessoryKilled else { return }
        for sub in webView.scrollView.subviews
        where NSStringFromClass(type(of: sub)).hasPrefix("WKContent") {
            let base: AnyClass = type(of: sub)
            let name = "KonvoNoAccessory_\(NSStringFromClass(base))"
            let patched: AnyClass
            if let existing = NSClassFromString(name) {
                patched = existing
            } else if let fresh = objc_allocateClassPair(base, name, 0) {
                let sel = #selector(getter: UIResponder.inputAccessoryView)
                let imp = imp_implementationWithBlock(
                    { (_: Any) -> UIView? in nil } as @convention(block) (Any) -> UIView?)
                class_addMethod(fresh, sel, imp, "@@:")
                objc_registerClassPair(fresh)
                patched = fresh
            } else {
                return
            }
            object_setClass(sub, patched)
        }
        // Set regardless: retrying this walk on every single
        // bridge message bought nothing.
        accessoryKilled = true
    }

    // WKWebView re-insets the page when the keyboard appears but not when
    // it changes height (text -> emoji swap), which left the taller emoji
    // keyboard covering Instagram's compose bar. Poke the page with resize
    // events on every keyboard frame change so Instagram re-anchors it,
    // and remember where the keyboard's top edge is - the tap-to-dismiss
    // gesture below needs it.
    private static var keyboardNudgeInstalled = false
    private static var keyboardTop: CGFloat = .greatestFiniteMagnitude
    private static var resizeWork: DispatchWorkItem?
    private static func installKeyboardNudge(_ webView: WKWebView) {
        guard !keyboardNudgeInstalled else { return }
        keyboardNudgeInstalled = true
        NotificationCenter.default.addObserver(
            forName: UIResponder.keyboardDidChangeFrameNotification,
            object: nil, queue: .main
        ) { [weak webView] note in
            let was = Self.keyboardTop
            if let frame = (note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey]
                as? NSValue)?.cgRectValue {
                Self.keyboardTop = frame.minY
            }
            // Coalesced: keyboardDidChangeFrame fires continuously while a
            // finger drags the keyboard away, and each dispatch relayouts
            // the whole thread.
            Self.resizeWork?.cancel()
            let work = DispatchWorkItem { [weak webView] in
                webView?.evaluateJavaScript(
                    "window.visualViewport&&window.visualViewport"
                        + ".dispatchEvent(new Event('resize'));"
                        + "window.dispatchEvent(new Event('resize'))",
                    completionHandler: nil)
            }
            Self.resizeWork = work
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.12, execute: work)
            // A KEYBOARD THAT GREW (text -> emoji) is not re-inset by
            // WebKit: the page keeps the short keyboard's offset and the
            // compose bar ends up hidden behind the tall one. Scroll by the
            // growth - exactly the flick that fixed it by hand.
            // ponytail: moves the webview's own scroll view; if Instagram
            // ever composes inside an inner scroller this needs the focused
            // element's scroll parent instead.
            // Resizing the PAGE for the keyboard is reverted, deliberately.
            // Growing the bottom safe-area inset did put the compose bar
            // above the emoji keyboard - and it re-laid out the whole thread
            // on every keyboard frame notification, which iOS fires
            // continuously through swipes and interactive dismissals. The
            // result was distortion mid-swipe, a black flash on dismiss, and
            // general lag in chats: a structural bug traded for a cosmetic
            // one. Build 41 was better, and this is build 41's behaviour.
            //
            // The emoji keyboard covering the compose bar is a known,
            // narrow, cosmetic issue. It stays until there is a fix that
            // does not touch layout on every frame.
            let grew = was - Self.keyboardTop
            guard was < UIScreen.main.bounds.height - 1, grew > 1 else { return }
            webView?.evaluateJavaScript(
                "var a=document.activeElement;"
                    + "if(a&&a.scrollIntoView)a.scrollIntoView({block:'nearest'})",
                completionHandler: nil)
        }
    }

    // Native gestures for an app-like feel. Edge-swipe drives Instagram's
    // own back navigation (thread -> inbox only; at the inbox, back would
    // walk into the login chain). Tap-anywhere dismisses the keyboard, but
    // only above the compose row so a tap into the text bar or the emoji
    // panel never kills typing.
    // ponytail: the compose row is a 96pt geometry allowance, not DOM
    // truth; grows a cage-patch selector if Instagram's layout shifts.
    fileprivate static var route = "other"
    // True while the back-swipe owns the screen, so the push animation
    // never fires on the route change the gesture itself caused.
    fileprivate static var swiping = false
    // Set when a swipe commits: the navigation it triggers reports back
    // through JS a few hundred ms later, and that report must not animate.
    fileprivate static var swipeSettleUntil: Date = .distantPast

    // Opening a thread is a push, not a cut: the inbox holds the screen
    // while Instagram renders, then the thread slides in from the right
    // over it with the inbox easing back, the way a navigation controller
    // does it. Without this the tap lands on a blank frame and snaps.
    // ponytail: 1.2s cap if the settled signal never arrives.
    // The screens behind the current one, newest last - a navigation stack
    // of pictures. The back-swipe reveals the top of this stack, which is
    // why going back from a profile lands on the chat that opened it and
    // not on the inbox.
    // ponytail: capped at 5; deeper than that nobody swipes back through.
    fileprivate static var snapStack: [UIView] = []
    // The current screen, captured while it was idle - see pushIntoThread.
    fileprivate static var settledSnap: UIView?
    // When settledSnap was refreshed by a raw tap; fresh beats live pixels.
    fileprivate static var tapSnapAt = Date.distantPast
    private static var firstNavDone = false

    // Five full-screen snapshots is 55-75MB on a modern iPhone, held for
    // the life of the process. That is memory pressure we were creating
    // ourselves - and pressure is what kills the web content process, which
    // is why the reload recovery below exists. Give it all back the moment
    // iOS asks, or when the app leaves the screen.
    private static var purgeInstalled = false
    private static func installSnapshotPurge() {
        guard !purgeInstalled else { return }
        purgeInstalled = true
        for name: NSNotification.Name in [
            UIApplication.didReceiveMemoryWarningNotification,
            UIApplication.didEnterBackgroundNotification,
        ] {
            NotificationCenter.default.addObserver(
                forName: name, object: nil, queue: .main
            ) { _ in
                snapStack.forEach { $0.removeFromSuperview() }
                snapStack.removeAll()
                settledSnap = nil
                cancelPreparedChat()
                cancelTabTransition()
            }
        }
    }

    // Prepared once and reused: a freshly allocated generator spins the
    // Taptic Engine up synchronously, and it was being allocated on the
    // exact frame the swipe animation starts.
    fileprivate static let haptic = UIImpactFeedbackGenerator(style: .light)

    // TAB_TRANSITION_BEGIN
    fileprivate static var tabRoot = false
    private static var tabCover: UIView?
    private static var tabOutgoing: UIView?
    private static var tabTimeout: DispatchWorkItem?
    fileprivate static func cancelTabTransition() {
        tabTimeout?.cancel()
        tabTimeout = nil
        tabCover?.removeFromSuperview()
        tabCover = nil
        tabOutgoing = nil
    }
    fileprivate static func prepareTabTransition(_ webView: WKWebView) {
        cancelTabTransition()
        guard !swiping, !UIAccessibility.isReduceMotionEnabled,
              let host = webView.superview,
              let outgoing = webView.snapshotView(afterScreenUpdates: false)
        else { return }
        // Keep the 64pt web tab bar stationary and interactive. Only the page
        // above it is covered while Instagram replaces its route's DOM.
        let cover = UIView(frame: CGRect(
            origin: webView.frame.origin,
            size: CGSize(width: webView.bounds.width, height: max(0, webView.bounds.height - 64))))
        cover.clipsToBounds = true
        cover.backgroundColor = .clear
        outgoing.frame = webView.bounds
        outgoing.isUserInteractionEnabled = false
        cover.addSubview(outgoing)
        host.addSubview(cover)
        tabCover = cover
        tabOutgoing = outgoing
        let timeout = DispatchWorkItem { cancelTabTransition() }
        tabTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.6, execute: timeout)
    }
    fileprivate static func finishTabTransition(_ webView: WKWebView, forward: Bool) {
        guard let cover = tabCover, let outgoing = tabOutgoing,
              !UIAccessibility.isReduceMotionEnabled
        else { cancelTabTransition(); return }
        let distance = webView.bounds.width * (forward ? 1 : -1)
        // Reveal the live destination underneath the departing page. Freezing
        // a second screenshot here hid Instagram's continuing render, then
        // visibly jumped to the newer content when that screenshot disappeared.
        UIView.animate(withDuration: 0.16, delay: 0, options: [.curveEaseOut, .beginFromCurrentState]) {
            outgoing.transform = CGAffineTransform(translationX: -distance, y: 0)
        } completion: { _ in
            if tabCover === cover { cancelTabTransition() }
        }
    }
    // TAB_TRANSITION_END

    // CHAT_PREPARATION_BEGIN
    fileprivate static var preparedChat: UIView?
    private static var preparedChatTimeout: DispatchWorkItem?
    fileprivate static func cancelPreparedChat() {
        preparedChatTimeout?.cancel()
        preparedChatTimeout = nil
        preparedChat?.removeFromSuperview()
        preparedChat = nil
    }
    fileprivate static func prepareChat(_ webView: WKWebView) {
        guard preparedChat == nil, !swiping,
              Date() >= swipeSettleUntil,
              let host = webView.superview,
              let cover = webView.snapshotView(afterScreenUpdates: false) ?? settledSnap
        else { return }
        cover.frame = webView.frame
        cover.isUserInteractionEnabled = false
        host.addSubview(cover)
        preparedChat = cover
        // No navigation, failed router, or backgrounding: always release.
        let timeout = DispatchWorkItem { cancelPreparedChat() }
        preparedChatTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0, execute: timeout)
    }
    // CHAT_PREPARATION_END

    fileprivate static func pushIntoThread(
        _ webView: WKWebView, back: Bool = false
    ) {
        // Prefer the picture taken when the screen last went quiet: the
        // FIRST snapshotView of a session comes back empty (the web
        // content process has not replicated its layer tree yet), which is
        // why the first chat you opened after launch slid in over black.
        // It is also free here - no synchronous capture on the tap frame.
        // The stored idle snapshot is only right for the FIRST navigation
        // of a session, where a live capture comes back empty. After that
        // it is stale the moment the user scrolls, so take live pixels.
        // A tap snapshot under a second old is the screen being left,
        // guaranteed pre-navigation; live pixels by now can already be the
        // destination mid-render. Older than that, live pixels win - a
        // stored picture goes stale the moment the user scrolls.
        let tapFresh = Date().timeIntervalSince(tapSnapAt) < 1.0
        let live = (preparedChat == nil && firstNavDone && !tapFresh)
            ? webView.snapshotView(afterScreenUpdates: false) : nil
        guard let host = webView.superview,
              let current = preparedChat ?? live ?? settledSnap
                ?? webView.snapshotView(afterScreenUpdates: false)
        else { return }
        preparedChatTimeout?.cancel()
        preparedChatTimeout = nil
        preparedChat = nil
        firstNavDone = true
        settledSnap = nil
        // Forward: the screen being left goes on the stack. Back: the
        // screen being returned to comes off it.
        if back {
            _ = snapStack.popLast()
            current.frame = webView.frame
            current.isUserInteractionEnabled = false
            host.addSubview(current)
            UIView.animate(
                withDuration: 0.2, delay: 0,
                options: [.curveEaseOut, .beginFromCurrentState]
            ) {
                current.transform =
                    CGAffineTransform(translationX: webView.bounds.width, y: 0)
            } completion: { _ in
                current.transform = .identity
                current.removeFromSuperview()
            }
            return
        }
        let under: UIView
        if true {
            under = current
            snapStack.append(current)
            if snapStack.count > 5 { snapStack.removeFirst() }
        }
        under.frame = webView.frame
        under.transform = .identity
        under.alpha = 1
        under.isUserInteractionEnabled = false
        host.insertSubview(under, belowSubview: webView)
        let width = webView.bounds.width * (back ? -1 : 1)
        webView.transform = CGAffineTransform(translationX: width, y: 0)
        var started = false
        let slide = {
            if started { return }
            started = true
            UIView.animate(
                withDuration: 0.22, delay: 0,
                options: [.curveEaseOut, .beginFromCurrentState]
            ) {
                webView.transform = .identity
                under.transform = CGAffineTransform(translationX: -width * 0.3, y: 0)
            } completion: { _ in
                under.transform = .identity
                under.removeFromSuperview()
            }
        }
        // The cage reports a chat push after its usable shell has painted.
        // The prepared snapshot covers the earlier DOM replacement.
        slide()
    }

    private final class KonvoGestures: NSObject, UIGestureRecognizerDelegate {
        weak var webView: WKWebView?
        // The interactive back-swipe, double-buffered like a real
        // navigation controller: a snapshot of the thread rides the
        // finger, and what it reveals is the standing INBOX snapshot -
        // never the live page, which spends ~300ms mid-render after
        // history.back() and looks like a glitch. Everything is decided
        // synchronously from the cage's route reports, so the slide
        // engages the frame the finger moves; navigation fires exactly
        // once, at commit, so a cancelled swipe never touches the thread.
        // ponytail: 0.45s settle grace is a guess by eye; tune on device.
        private var snap: UIView?
        private var under: UIView?
        @objc func edgeBack(_ g: UIScreenEdgePanGestureRecognizer) {
            guard let wv = webView else { return }
            let x = max(0, g.translation(in: wv).x)
            switch g.state {
            case .began:
                // Any screen that is not the inbox can be swiped back -
                // threads, profiles, posts. The inbox is the floor: back
                // from there is Instagram's login chain.
                guard KonvoStore.route != "inbox", !KonvoStore.tabRoot, snap == nil,
                      let s = wv.snapshotView(afterScreenUpdates: false)
                else { return }
                // What the drag reveals: the screen underneath this one on
                // the stack - the chat that opened this profile, not
                // whatever the inbox happened to look like. Popped only if
                // the swipe commits.
                let u = KonvoStore.snapStack.last ?? {
                    let v = UIView()
                    v.backgroundColor = .systemBackground
                    return v
                }()
                u.frame = wv.frame
                u.alpha = 1
                u.isUserInteractionEnabled = false
                wv.superview?.addSubview(u)
                under = u
                s.frame = wv.frame
                s.layer.shadowColor = UIColor.black.cgColor
                s.layer.shadowOpacity = 0.25
                s.layer.shadowRadius = 8
                s.layer.shadowOffset = CGSize(width: -4, height: 0)
                wv.superview?.addSubview(s)
                snap = s
                KonvoStore.swiping = true
                KonvoStore.haptic.prepare()
                // Keyboard drops as the slide starts, like native; its
                // re-layout happens under the snapshot, invisible.
                wv.endEditing(true)
            case .changed:
                snap?.frame.origin.x = x
            case .ended, .cancelled, .failed:
                // swiping stays true until this gesture's own animation is
                // done: its history.back() fires a popstate, and the nav
                // handler must not animate on top of the slide in flight.
                guard let s = snap else { KonvoStore.swiping = false; return }
                let u = under
                snap = nil
                under = nil
                let commit = x > wv.bounds.width * 0.3
                    || g.velocity(in: wv).x > 600
                if commit {
                    // The small confirmation buzz a native back-swipe has.
                    KonvoStore.haptic.impactOccurred()
                    KonvoStore.swipeSettleUntil = Date().addingTimeInterval(1.2)
                    // The revealed screen is now the current one.
                    if !KonvoStore.snapStack.isEmpty { KonvoStore.snapStack.removeLast() }
                    // Navigate now, once; the thread slides off and the
                    // inbox picture holds the frame until the live inbox
                    // reports settled, then a quick fade lands on a
                    // FINISHED page - a timer here always guessed wrong.
                    // ponytail: 1.5s cap if the settle signal never comes.
                    wv.evaluateJavaScript(
                        "if(!/^\\/direct\\/(inbox)?\\/?$/.test(location.pathname))"
                            + "history.back()",
                        completionHandler: nil)
                    UIView.animate(
                        withDuration: 0.18, delay: 0, options: .curveEaseOut
                    ) {
                        s.frame.origin.x = wv.bounds.width
                    } completion: { _ in
                        s.removeFromSuperview()
                        KonvoStore.swiping = false
                        // Nothing held. The inbox reorders the instant you
                        // send a message, so any picture we keep differs
                        // from the live page and the swap reads as a jump.
                        // Show the real inbox straight away, mid-render or
                        // not - a page finishing its paint looks like a
                        // page loading; a screen swapping under you looks
                        // like a bug.
                        u?.removeFromSuperview()
                    }
                } else {
                    // Nothing was navigated: pure animation, the thread
                    // underneath never moved.
                    UIView.animate(withDuration: 0.16) {
                        s.frame.origin.x = 0
                    } completion: { _ in
                        s.removeFromSuperview()
                        u?.removeFromSuperview()
                        KonvoStore.swiping = false
                    }
                }
            default: break
            }
        }
        @objc func tapDismiss(_ g: UITapGestureRecognizer) {
            guard let wv = webView else { return }
            // The screen as it stands ON the tap frame, before Instagram's
            // router paints anything. The nav report lands ~80ms after the
            // tap (device log, Aug 7), and a snapshot taken then catches
            // the destination mid-render - headerless, pre-zoom - which
            // the next back-swipe then reveals as a garbled "inbox".
            if let s = wv.snapshotView(afterScreenUpdates: false) {
                s.frame = wv.frame
                KonvoStore.settledSnap = s
                KonvoStore.tapSnapAt = Date()
            }
            guard KonvoStore.keyboardTop < UIScreen.main.bounds.height,
                  g.location(in: nil).y < KonvoStore.keyboardTop - 96
            else { return }
            wv.endEditing(true)
        }
        func gestureRecognizer(
            _ gestureRecognizer: UIGestureRecognizer,
            shouldReceive touch: UITouch
        ) -> Bool {
            if gestureRecognizer is UIScreenEdgePanGestureRecognizer {
                return !KonvoStore.tabRoot && KonvoStore.route != "inbox"
            }
            return true
        }
        func gestureRecognizer(
            _ gestureRecognizer: UIGestureRecognizer,
            shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer
        ) -> Bool { true }
    }
    private static let gestures = KonvoGestures()
    private static var gesturesInstalled = false
    private static func installGestures(_ webView: WKWebView) {
        guard !gesturesInstalled else { return }
        gesturesInstalled = true
        gestures.webView = webView
        installScreenTimeRecovery(webView)
        let edge = UIScreenEdgePanGestureRecognizer(
            target: gestures, action: #selector(KonvoGestures.edgeBack(_:)))
        edge.edges = .left
        edge.delegate = gestures
        webView.addGestureRecognizer(edge)
        let tap = UITapGestureRecognizer(
            target: gestures, action: #selector(KonvoGestures.tapDismiss(_:)))
        tap.cancelsTouchesInView = false
        tap.delegate = gestures
        webView.addGestureRecognizer(tap)
    }

    private static var screenTimeObservation: NSKeyValueObservation?
    private static func installScreenTimeRecovery(_ webView: WKWebView) {
        guard #available(iOS 26.0, *), screenTimeObservation == nil else { return }
        screenTimeObservation = webView.observe(\.isBlockedByScreenTime, options: [.initial, .new]) { wv, _ in
            guard wv.isBlockedByScreenTime else { return }
            DispatchQueue.main.async { [weak wv] in
                guard let wv, wv.isBlockedByScreenTime,
                      UserDefaults.standard.bool(forKey: cageActiveKey) else { return }
                // Some OS restrictions include the corresponding website. Release
                // only our own shield rather than leave Konvo locked out of DMs.
                cageClear()
                track("cage_paused_for_web_conflict", [:])
                wv.evaluateJavaScript("window.dispatchEvent(new Event('konvo-cage-paused'))", completionHandler: nil)
                guard let front = frontViewController(), front.presentedViewController == nil else { return }
                let alert = UIAlertController(title: "Instagram block paused",
                    message: "Screen Time also blocked Instagram inside Konvo, so Konvo’s block was turned off. You can choose the Instagram app again from the lock tab. Other Screen Time limits are unchanged.", preferredStyle: .alert)
                alert.addAction(UIAlertAction(title: "OK", style: .default))
                front.present(alert, animated: true)
            }
        }
    }

    // iOS reclaims the webview's content process under memory pressure and
    // WKWebView then renders a dead white page on foreground. wry's
    // navigation delegate does not implement the termination callback, so
    // add it at runtime: reload immediately and the boot overlay covers
    // the recovery - reopening the app just works. If a future wry ships
    // its own handler, the class_getInstanceMethod guard leaves it alone.
    private static var terminationRecoveryInstalled = false
    private static func installTerminationRecovery(_ webView: WKWebView) {
        guard !terminationRecoveryInstalled,
              let delegate = webView.navigationDelegate else { return }
        terminationRecoveryInstalled = true
        let cls: AnyClass = type(of: delegate)
        let sel = #selector(
            WKNavigationDelegate.webViewWebContentProcessDidTerminate(_:))
        guard class_getInstanceMethod(cls, sel) == nil else { return }
        let imp = imp_implementationWithBlock(
            { (_: Any, wv: WKWebView) in wv.reload() }
                as @convention(block) (Any, WKWebView) -> Void)
        class_addMethod(cls, sel, imp, "v@:@")
    }

    // Login navigation diagnostics: observe WebKit callbacks while an explicit
    // sign-in handoff is active. Preserve wry's handlers and never retry here.
    // LOGIN_DIAGNOSTICS_BEGIN (also compiled by the focused native regression)
    private static var loginDiagnosticClasses = Set<ObjectIdentifier>()
    private static weak var loginDiagnosticWebView: WKWebView?
    private static var loginDiagnosticActive = false
    private static let loginNavigationTimes = NSMapTable<WKNavigation, NSNumber>.weakToStrongObjects()

    private static func beginLoginNavigationDiagnostics(_ webView: WKWebView, url: URL) {
        // The same go command also restores the inbox on ordinary launches.
        // Only an explicit onboarding handoff starts this diagnostic window.
        loginDiagnosticActive = url.fragment?.hasPrefix("konvo=") == true
        loginDiagnosticWebView = loginDiagnosticActive ? webView : nil
        loginNavigationTimes.removeAllObjects()
        guard loginDiagnosticActive else { return }
        installLoginNavigationDiagnostics(webView)
        track("login_handoff_started", ["stage": loginNavigationStage(url)])
    }

    private static func loginNavigationStage(_ url: URL?) -> String {
        guard let url, let host = url.host?.lowercased() else { return "handoff" }
        if host == "instagram.com" || host == "www.instagram.com" {
            let path = url.path
            if path.contains("/challenge") { return "challenge" }
            if path.contains("two_factor") { return "two_factor" }
            if path.hasPrefix("/accounts/password/reset") { return "reset" }
            if path.hasPrefix("/accounts/login") { return "login" }
            if path.hasPrefix("/direct/inbox") { return "inbox" }
            return "instagram_other"
        }
        if host.hasSuffix(".instagram.com") || host == "facebook.com" ||
            host.hasSuffix(".facebook.com") || host == "meta.com" || host.hasSuffix(".meta.com") {
            return "verification_host"
        }
        return "other"
    }

    private static func loginNavigationEvent(_ webView: WKWebView, _ navigation: WKNavigation?,
                                              phase: String, error: NSError? = nil) {
        guard loginDiagnosticActive, loginDiagnosticWebView === webView else { return }
        let now = ProcessInfo.processInfo.systemUptime
        let started = navigation.flatMap { loginNavigationTimes.object(forKey: $0)?.doubleValue }
        if phase == "started", let navigation {
            loginNavigationTimes.setObject(NSNumber(value: now), forKey: navigation)
        }
        let failedURL = error?.userInfo[NSURLErrorFailingURLErrorKey] as? URL
        var props: [String: Any] = ["stage": loginNavigationStage(failedURL ?? webView.url), "phase": phase]
        if let started { props["ms"] = Int(max(0, now - started) * 1000) }
        var event = "login_navigation_" + phase
        if let error {
            // Full errors can contain URLs, usernames, or request details.
            // Only a fixed domain category and numeric code leave the device.
            props["error_domain"] = error.domain == NSURLErrorDomain ? "url"
                : error.domain == WKErrorDomain ? "webkit" : "other"
            props["error_code"] = error.code
            event = error.domain == NSURLErrorDomain && error.code == NSURLErrorCancelled
                ? "login_navigation_cancelled" : "login_navigation_failed"
        }
        track(event, props)
        if phase != "started", let navigation { loginNavigationTimes.removeObject(forKey: navigation) }
    }

    private static func installLoginNavigationDiagnostics(_ webView: WKWebView) {
        guard let delegate = webView.navigationDelegate else { return }
        // WebKit caches which optional callbacks the delegate implements.
        // Refresh that cache before load(), retaining the exact same delegate.
        defer {
            webView.navigationDelegate = nil
            webView.navigationDelegate = delegate
        }
        let cls: AnyClass = type(of: delegate)
        guard loginDiagnosticClasses.insert(ObjectIdentifier(cls)).inserted else { return }
        typealias NavigationCallback = @convention(c) (AnyObject, Selector, WKWebView, WKNavigation?) -> Void
        typealias ErrorCallback = @convention(c) (AnyObject, Selector, WKWebView, WKNavigation?, NSError) -> Void
        let navigationCallbacks: [(Selector, String)] = [
            (#selector(WKNavigationDelegate.webView(_:didStartProvisionalNavigation:)), "started"),
            (#selector(WKNavigationDelegate.webView(_:didFinish:)), "finished")
        ]
        for (selector, phase) in navigationCallbacks {
            let method = class_getInstanceMethod(cls, selector)
            let original = method.map { unsafeBitCast(method_getImplementation($0), to: NavigationCallback.self) }
            let imp = imp_implementationWithBlock({ (receiver: AnyObject, wv: WKWebView, nav: WKNavigation?) in
                Self.loginNavigationEvent(wv, nav, phase: phase)
                original?(receiver, selector, wv, nav)
            } as @convention(block) (AnyObject, WKWebView, WKNavigation?) -> Void)
            // Add an override for inherited implementations; never mutate a superclass.
            if !class_addMethod(cls, selector, imp, "v@:@@") {
                class_replaceMethod(cls, selector, imp, "v@:@@")
            }
        }
        let errorCallbacks: [(Selector, String)] = [
            (#selector(WKNavigationDelegate.webView(_:didFailProvisionalNavigation:withError:)), "provisional"),
            (#selector(WKNavigationDelegate.webView(_:didFail:withError:)), "committed")
        ]
        for (selector, phase) in errorCallbacks {
            let method = class_getInstanceMethod(cls, selector)
            let original = method.map { unsafeBitCast(method_getImplementation($0), to: ErrorCallback.self) }
            let imp = imp_implementationWithBlock({ (receiver: AnyObject, wv: WKWebView, nav: WKNavigation?, error: NSError) in
                Self.loginNavigationEvent(wv, nav, phase: phase, error: error)
                original?(receiver, selector, wv, nav, error)
            } as @convention(block) (AnyObject, WKWebView, WKNavigation?, NSError) -> Void)
            if !class_addMethod(cls, selector, imp, "v@:@@@") {
                class_replaceMethod(cls, selector, imp, "v@:@@@")
            }
        }
    }
    // LOGIN_DIAGNOSTICS_END

    public func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        _ = Self.configureOnce
        guard
            let body = message.body as? [String: Any],
            let cmd = body["cmd"] as? String,
            let id = body["id"] as? Int,
            let webView = message.webView
        else { return }
        Self.installSnapshotPurge()
        Self.applyZoom(webView)
        Self.killAccessoryBar(webView)
        Self.installKeyboardNudge(webView)
        Self.installTerminationRecovery(webView)
        Self.installGestures(webView)
        // Only pages we host may talk to purchases or analytics. The webview
        // shows instagram.com and the bundled onboarding page; Meta's login
        // chain hops to other Meta domains and reCAPTCHA, and none of those
        // get a purchase sheet or an event stream.
        let host = message.frameInfo.securityOrigin.host
        guard message.frameInfo.isMainFrame,
              host.hasSuffix("instagram.com") || host.hasSuffix("localhost") || host.isEmpty
        else { return }

        let productId = body["productId"] as? String ?? ""

        // Fire-and-forget appearance switch: the bundled onboarding runs
        // pinned Light (set at startup in Rust); "dark" pins the S5-S7
        // impact stretch; "auto" hands the app to the phone. The value
        // rides in productId.
        if cmd == "appearance" {
            // "light" pins the funnel design, "dark" pins the S5-S7 impact
            // stretch, "blue" is the full-bleed pact screen, "auto" hands
            // the app to the phone. Blue takes the dark style so the status
            // bar draws white over it.
            let inboxOnboarding = productId == "onboarding-inbox"
            let inboxReveal = productId == "inbox-reveal"
            let specialOffer = productId == "onboarding-offer"
            let inboxDark = productId == "inbox-dark" ||
                (productId == "auto" && UserDefaults.standard.bool(forKey: "konvoInboxDark"))
            let blue = productId == "blue"
            // "black" (Sep 1) is the sign-in sheet: the band above
            // Instagram's page is the dark Konvo page the sheet rose over,
            // the clock draws white, and the page itself is held Light so
            // the sheet stays a light sheet whatever the phone prefers.
            let black = productId == "black"
            let style: UIUserInterfaceStyle =
                (productId == "light" || inboxOnboarding) ? .light
                : (productId == "dark" || inboxDark || inboxReveal || specialOffer || blue || black) ? .dark
                : .unspecified
            // Remembered across launches: lib.rs pins Light at startup only
            // while the funnel is unfinished. Only "auto" means done.
            UserDefaults.standard.set(productId == "auto" || inboxDark, forKey: "konvoFunnelDone")
            if inboxDark { UserDefaults.standard.set(true, forKey: "konvoInboxDark") }
            DispatchQueue.main.async {
                let root = webView.window?.rootViewController
                root?.overrideUserInterfaceStyle = style
                webView.overrideUserInterfaceStyle = inboxOnboarding || inboxDark || inboxReveal || specialOffer ? .dark : black ? .light : .unspecified
                if let root, black || Self.sheetBand != nil {
                    Self.band(in: root, over: webView).isHidden = !black
                }
                // The letterbox above and below the safe-area-pinned webview
                // is the root view; CSS cannot reach it, so a screen that
                // must fill the whole phone has to say so through here.
                // Explicit black/white, not .systemBackground: in this
                // hierarchy that resolves to the elevated dark grey
                // (#1C1C1E) and framed the pure-black wall with grey bands
                // above and below (device, Sep 1). The wall and Instagram's
                // dark theme are #000, light is #fff.
                let bg: UIColor = specialOffer
                    ? UIColor(red: 6 / 255, green: 11 / 255, blue: 27 / 255, alpha: 1)
                    : blue
                    ? UIColor(red: 10 / 255, green: 92 / 255, blue: 240 / 255, alpha: 1)
                    : black ? UIColor(white: 0.97, alpha: 1)  // the sheet's toolbar grey, under the home indicator
                    : style == .light ? .white
                    : style == .dark ? .black
                    : UIColor { $0.userInterfaceStyle == .dark ? .black : .white }
                root?.view.backgroundColor = bg
                webView.backgroundColor = bg
                webView.scrollView.backgroundColor = bg
            }
            return
        }

        // DM links open in the in-app Safari sheet, like Instagram's own
        // browser: swipe it away and the chat is still there. http(s)
        // only - SFSafariViewController traps on anything else - and only
        // for pages past the host guard above. Fire-and-forget.
        if cmd == "open" {
            if let url = URL(string: productId),
               url.scheme == "http" || url.scheme == "https" {
                DispatchQueue.main.async {
                    let sheet = SFSafariViewController(url: url)
                    webView.window?.rootViewController?
                        .present(sheet, animated: true)
                }
            }
            return
        }

        // Route reports from the cage. "inbox-settled" means the inbox
        // finished rendering (DOM went quiet): refresh the standing
        // snapshot the back-swipe reveals, and release any swipe holding
        // its picture waiting for the crossfade moment.
        if cmd == "route" {
            DispatchQueue.main.async { [weak webView] in
                if productId.hasSuffix("-settled") {
                    // Capture the finished screen now, while nothing is
                    // animating, so the next push has a real picture ready
                    // and never has to snapshot on the tap frame.
                    if let wv = webView,
                       let s = wv.snapshotView(afterScreenUpdates: false) {
                        s.frame = wv.frame
                        Self.settledSnap = s
                    }
                } else {
                    Self.route = productId
                }
            }
            return
        }

        // Navigate from native. The page cannot do this itself: iOS treats a
        // cross-origin navigation to instagram.com as a universal link and
        // opens the installed Instagram app instead, which strands the user
        // outside Konvo having never logged in. Loads issued here are exempt.
        if cmd == "go" {
            if let url = URL(string: productId),
               url.host?.hasSuffix("instagram.com") == true {
                DispatchQueue.main.async { [weak webView] in
                    guard let webView else { return }
                    Self.beginLoginNavigationDiagnostics(webView, url: url)
                    webView.load(URLRequest(url: url))
                }
            }
            return
        }

        // The page's own background colour, painted onto the native
        // letterbox the webview cannot reach. Fire-and-forget.
        if cmd == "bg" {
            let nums = productId.components(
                separatedBy: CharacterSet(charactersIn: "rgba(), ")
            ).compactMap(Double.init)
            guard nums.count >= 3 else { return }
            let color = UIColor(
                red: nums[0] / 255, green: nums[1] / 255, blue: nums[2] / 255,
                alpha: nums.count > 3 ? nums[3] : 1)
            guard (nums.count > 3 ? nums[3] : 1) > 0.01 else { return }
            DispatchQueue.main.async { [weak webView] in
                guard let wv = webView else { return }
                let root = wv.window?.rootViewController
                // The dark inbox underneath must not recolor white onboarding's safe areas.
                root?.view.backgroundColor = (wv.overrideUserInterfaceStyle == .dark &&
                    root?.overrideUserInterfaceStyle == .light) ? .white : color
                wv.backgroundColor = color
                wv.scrollView.backgroundColor = color
            }
            return
        }

        // Every SPA navigation animates the same way, wherever it goes:
        // forward slides in from the right, back from the left. The
        // back-swipe owns its own animation, so it opts out.

        if cmd == "nav-prepare" || cmd == "nav-cancel" {
            DispatchQueue.main.async { [weak webView] in
                if cmd == "nav-cancel" { Self.cancelPreparedChat() }
                else if let webView { Self.prepareChat(webView) }
            }
            return
        }

        if cmd == "tab-root" || cmd == "tab-prepare" || cmd == "tab-reveal" || cmd == "tab-cancel" {
            DispatchQueue.main.async { [weak webView] in
                switch cmd {
                case "tab-root": Self.tabRoot = productId == "1"
                case "tab-prepare": if let webView { Self.prepareTabTransition(webView) }
                case "tab-reveal":
                    if let webView { Self.finishTabTransition(webView, forward: productId == "next") }
                    else { Self.cancelTabTransition() }
                default: Self.cancelTabTransition()
                }
            }
            return
        }

        if cmd == "nav" {
            DispatchQueue.main.async { [weak webView] in
                // After a swipe commits, exactly ONE report - the swipe's
                // own round-trip, whatever navFor calls it - is swallowed,
                // then the window closes. A blanket 1.2s window ate the
                // "push" of every chat tapped within a second of a
                // back-swipe, which is how an inbox is actually used
                // (device log, Aug 7). Checked before the swiping guard:
                // the round-trip usually lands mid-slide, and it must
                // consume the window even then.
                guard let wv = webView else { return }
                if Date() < Self.swipeSettleUntil {
                    Self.swipeSettleUntil = .distantPast
                    return
                }
                guard !Self.swiping else { return }
                if productId == "push-silent" {
                    Self.cancelPreparedChat()
                    // Bottom tabs change directly. Chat pushes continue to
                    // the slide below; back-swipes still need this snapshot.
                    let leaving = Date().timeIntervalSince(Self.tapSnapAt) < 1.0
                        ? Self.settledSnap : nil
                    if let s = leaving ?? wv.snapshotView(afterScreenUpdates: false) {
                        s.frame = wv.frame
                        Self.snapStack.append(s)
                        if Self.snapStack.count > 5 { Self.snapStack.removeFirst() }
                    }
                    Self.settledSnap = nil
                    Self.firstNavDone = true
                    return
                }
                Self.pushIntoThread(wv, back: productId == "pop")
            }
            return
        }

        // The native app's little tap when a message sends. Fire-and-forget.
        if cmd == "haptic" {
            DispatchQueue.main.async {
                KonvoStore.haptic.impactOccurred()
            }
            return
        }

        // Fire-and-forget funnel event. Never blocks, never replies.
        if cmd == "track" {
            if let event = body["event"] as? String {
                if event == "login_succeeded", Self.loginDiagnosticWebView === webView {
                    Self.loginDiagnosticActive = false
                    Self.loginNavigationTimes.removeAllObjects()
                }
                Self.track(event, body["props"] as? [String: Any] ?? [:])
            }
            return
        }

        // Session insurance (Aug 17): WebKit writes cookies to disk lazily,
        // and a force-quit soon after signing in can lose the Instagram
        // session before it ever reaches disk. A tester relogged on every
        // launch because of it. The page asks for a snapshot once the
        // inbox settles, and asks for it back when a launch finds the
        // session gone. These need the webView, so they answer here
        // instead of run().
        if cmd == "cookieSave" || cmd == "cookieRestore" {
            let wantsRestore = cmd == "cookieRestore"
            Task { @MainActor in
                let store = webView.configuration.websiteDataStore.httpCookieStore
                var reply: [String: Any]
                if wantsRestore {
                    if !Self.cookieRestoreSpent,
                       let saved = Self.readCookieSnapshot(), !saved.isEmpty {
                        // Once per launch: a genuine logout would restore
                        // cookies Instagram already killed server-side,
                        // land back on login, and must not loop.
                        Self.cookieRestoreSpent = true
                        for c in saved { await store.setCookie(c) }
                        reply = ["restored": true, "n": saved.count]
                    } else {
                        reply = ["restored": false]
                    }
                } else {
                    let ig = await store.allCookies()
                        .filter { $0.domain.hasSuffix("instagram.com") }
                    Self.writeCookieSnapshot(ig)
                    reply = ["ok": true, "n": ig.count]
                }
                let json: String
                if let data = try? JSONSerialization.data(withJSONObject: reply),
                   let text = String(data: data, encoding: .utf8) {
                    json = text
                } else {
                    json = "null"
                }
                webView.evaluateJavaScript(
                    "window.__konvoStoreReply(\(id), \(json))",
                    completionHandler: nil)
            }
            return
        }

        Task { @MainActor in
            let reply = await Self.run(cmd, productId, checkout: body["checkout"] as? [String: Any])
            let json: String
            if let data = try? JSONSerialization.data(withJSONObject: reply),
               let text = String(data: data, encoding: .utf8) {
                json = text
            } else {
                json = "null"
            }
            webView.evaluateJavaScript(
                "window.__konvoStoreReply(\(id), \(json))", completionHandler: nil)
        }
    }

    // The cookie snapshot lives in Application Support, never leaves the
    // device, and never touches analytics. Restored cookies lose their
    // HttpOnly flag (no public property key for it); Instagram reissues
    // proper ones on the next response.
    static var cookieRestoreSpent = false
    static let cookieFile: URL = {
        let dir = FileManager.default.urls(
            for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(
            at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("konvo-session.plist")
    }()

    static func writeCookieSnapshot(_ cookies: [HTTPCookie]) {
        let rows = cookies.map { c -> [String: Any] in
            var r: [String: Any] = ["n": c.name, "v": c.value,
                                    "d": c.domain, "p": c.path,
                                    "s": c.isSecure]
            if let e = c.expiresDate { r["e"] = e }
            return r
        }
        if let data = try? PropertyListSerialization.data(
            fromPropertyList: rows, format: .binary, options: 0) {
            // Session cookies at rest: readable after the first unlock so the
            // background badge check still runs, never before it (Sep 3).
            try? data.write(to: cookieFile,
                            options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        }
    }

    static func readCookieSnapshot() -> [HTTPCookie]? {
        guard let data = try? Data(contentsOf: cookieFile),
              let rows = try? PropertyListSerialization.propertyList(
                from: data, options: [], format: nil) as? [[String: Any]]
        else { return nil }
        return rows.compactMap { r in
            guard let n = r["n"] as? String, let v = r["v"] as? String,
                  let d = r["d"] as? String, let p = r["p"] as? String
            else { return nil }
            var props: [HTTPCookiePropertyKey: Any] = [
                .name: n, .value: v, .domain: d, .path: p,
            ]
            if let e = r["e"] as? Date {
                if e < Date() { return nil }
                props[.expires] = e
            }
            if r["s"] as? Bool == true { props[.secure] = "TRUE" }
            return HTTPCookie(properties: props)
        }
    }

    // The free trial a product carries, in days, only when THIS user is
    // still eligible for it (RevenueCat asks the store). nil means the
    // paywall must not describe a trial that will not happen.
    private static func trialDays(_ p: RevenueCat.StoreProduct) async -> Int? {
        guard let intro = p.introductoryDiscount,
              intro.paymentMode == .freeTrial,
              await Purchases.shared
                  .checkTrialOrIntroDiscountEligibility(product: p) == .eligible
        else { return nil }
        let v = intro.subscriptionPeriod.value
        switch intro.subscriptionPeriod.unit {
        case .day: return v
        case .week: return v * 7
        case .month: return v * 30
        case .year: return v * 365
        }
    }

    // One native assignment shared by the bundled quiz and instagram.com webview.
    // An inactive/missing flag, timeout, existing customer, or bad offering stays OG
    // and is excluded from the experiment. Never reassign an exposed install.
    private static let experimentKey = "konvo-onboarding-annual-v1"
    private static let specialOfferingIdentifier = "konvo_special_offer_v1"
    private static let specialProductIdentifier = "konvo.pro.yearly.special"
    private static var specialOfferEligible = false
    private static var onboardingPreview = false
    @objc public static func enableOnboardingPreview() { onboardingPreview = true }
    private static let experimentStorage = "konvo.onboarding.annual.v1"
    private static var experimentTask: Task<[String: Any], Never>?
    // Retirement overrides cached test assignments and preview launch arguments.
    // Keep historical assignment storage intact; do not relabel old exposures.
    private static var experiment: [String: Any] {
        ["variant": "control", "enrolled": false, "retired": true,
         "offering_id": "konvo_ab_control_v1"]
    }
    private static var experimentTest: Bool { experiment["variant"] as? String == "test" }
    private static var experimentEnrolled: Bool { experiment["enrolled"] as? Bool == true }
    private static func selectedOffering() async throws -> Offering? {
        let offerings = try await Purchases.shared.offerings()
        return offerings.all["konvo_ab_control_v1"]
    }
    @MainActor private static func resolveExperiment(fresh: Bool) async -> [String: Any] {
        _ = configureOnce
        return experiment
    }

    private static func productFailure(_ reason: String, code: Int = 0) -> [String: Any] {
        // Enumerated catalog diagnostics only: never receipts, account data or raw SDK errors.
        track("store_products_failed", ["reason": reason, "code": code])
        return ["ok": false, "reason": reason, "code": code]
    }

    // The personalized paywall supports full-price annual and weekly packages only.
    // Validate again at checkout; a dashboard change must never introduce a trial
    // or a different billing period than the one displayed in the app.
    private static func validPersonalizedPackage(_ package: Package) -> Bool {
        let product = package.storeProduct
        guard product.introductoryDiscount == nil,
              product.price > 0, product.subscriptionPeriod?.value == 1 else { return false }
        return (package.packageType == .annual && product.subscriptionPeriod?.unit == .year) ||
               (package.packageType == .weekly && product.subscriptionPeriod?.unit == .week)
    }

    private static func specialOfferPackage(regular: Package) async throws -> Package? {
        guard experimentTest, validPersonalizedPackage(regular), regular.packageType == .annual,
              let offer = try await Purchases.shared.offerings().all[specialOfferingIdentifier]?.annual,
              offer.storeProduct.productIdentifier == specialProductIdentifier,
              offer.packageType == .annual, validPersonalizedPackage(offer),
              let currency = regular.storeProduct.currencyCode, !currency.isEmpty,
              offer.storeProduct.currencyCode == currency,
              offer.storeProduct.price < regular.storeProduct.price else { return nil }
        return offer
    }

    private static var purchaseInFlight = false
    @MainActor static func run(_ cmd: String, _ productId: String, checkout: [String: Any]? = nil) async -> [String: Any] {
        switch cmd {
        case "onboardingExperiment":
            return await resolveExperiment(fresh: productId == "fresh")
        case "onboardingExperimentFallback":
            if experiment.isEmpty { UserDefaults.standard.set(["variant": "control", "enrolled": false], forKey: experimentStorage) }
            return experiment
        case "experimentExposure":
            #if !DEBUG
            if !onboardingPreview, experimentEnrolled, let variant = experiment["variant"] as? String {
                track("$experiment_exposure", ["$feature_flag": experimentKey,
                    "$feature_flag_response": variant, "placement": productId])
                track("experiment_exposed", ["placement": productId,
                    "$set_once": ["konvo_onboarding_annual_v1": variant]])
            }
            #endif
            return ["ok": true]
        case "onboardingAnswers":
            if let data = productId.data(using: .utf8),
               let input = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                // Whitelist quiz values. Never save a username or signature here.
                var answers: [String: Any] = [:]
                for key in ["instagramMinutes", "messagingMinutes", "instagramUnknown", "messagingUnknown", "instagramLabel"] {
                    if let v = input[key] { answers[key] = v }
                }
                UserDefaults.standard.set(answers, forKey: "konvo.onboarding.answers.v1")
            }
            return ["ok": true]
        case "onboardingContext":
            var result = experiment
            result["answers"] = UserDefaults.standard.dictionary(forKey: "konvo.onboarding.answers.v1") ?? [:]
            return result
        case "paywallImpression":
            let offering: Offering?
            if experimentTest && specialOfferEligible && productId == "inbox_special_annual_v3" {
                offering = try? await Purchases.shared.offerings().all[specialOfferingIdentifier]
            } else {
                offering = try? await selectedOffering()
            }
            if let offering {
                Purchases.shared.trackCustomPaywallImpression(
                    CustomPaywallImpressionParams(paywallId: productId, offering: offering))
            }
            return ["ok": true]
        // ── The Screen Time cage (locked Aug 16) ──────────────────────
        // Shields the native Instagram app so Konvo is the only window to
        // the messages. The JS wall gates these behind Pro/beta access;
        // the bridge stays policy-free like the rest of the protocol.
        // iOS 16 floor: individual FamilyControls authorization does not
        // exist below it, so 15.x answers unsupported and the offer never
        // renders there.
        case "cageStatus":
            guard #available(iOS 16.0, *) else { return ["supported": false] }
            // Belt and braces for the pass: if a pass is marked active but
            // its window is long over (the monitor extension should have
            // relocked; maybe it did not run), relock here on the next
            // Konvo launch. The window is per pass length, not one
            // constant tuned for the longest pass.
            if cageDefaults.bool(forKey: KonvoShared.keyPassActive) {
                let last = max(Self.passesUsedToday() - 1, 0)
                let length = PassPolicy.lengthsMinutes[
                    min(last, PassPolicy.perDay - 1)]
                if Date().timeIntervalSince1970
                    - cageDefaults.double(forKey: KonvoShared.keyPassStart)
                    > PassPolicy.backstopSeconds(for: length) {
                    _ = cageApply()
                    cageDefaults.set(false, forKey: KonvoShared.keyPassActive)
                }
            }
            return [
                "supported": true,
                "authorized": AuthorizationCenter.shared.authorizationStatus == .approved,
                "picked": (storedCageSelection().map(cageCount) ?? 0) > 0,
                "active": UserDefaults.standard.bool(forKey: cageActiveKey),
                "passAvailable": Self.passesUsedToday() < PassPolicy.perDay,
                "passMins": PassPolicy.minutes(
                    afterUsed: Self.passesUsedToday()) ?? 0,
                "passesLeft": max(PassPolicy.perDay - Self.passesUsedToday(), 0),
            ]
        case "cagePass":
            guard #available(iOS 16.0, *) else { return ["granted": false] }
            return await cagePassStart()
        case "cageAuthorize":
            guard #available(iOS 16.0, *) else { return ["authorized": false] }
            do {
                try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                return ["authorized": true]
            } catch {
                return ["authorized": false]
            }
        case "cagePick":
            guard #available(iOS 16.0, *) else { return ["count": 0] }
            return ["count": await cagePick()]
        case "cageOn":
            guard #available(iOS 16.0, *) else { return ["active": false] }
            return ["active": cageApply()]
        case "cageOff":
            // No user-facing unlock by design; this exists for the one
            // honest reason to lift the shield without deleting Konvo -
            // a lapsed subscription must not hold Instagram hostage.
            guard #available(iOS 16.0, *) else { return ["active": false] }
            cageClear()
            return ["active": false]
        case "feedback":
            // The UserJot board as a sheet over the webview (Sep 1).
            DispatchQueue.main.async { UserJot.showFeedback() }
            return ["ok": true]
        case "review":
            // The system's rating sheet, asked from the onboarding screen
            // that names the years they get back. iOS owns whether it
            // appears (never in TestFlight, a few times a year at most in
            // the store); Konvo only asks.
            if let scene = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .first(where: { $0.activationState == .foregroundActive }) {
                if #available(iOS 16.0, *) {
                    AppStore.requestReview(in: scene)
                } else {
                    SKStoreReviewController.requestReview(in: scene)
                }
            }
            return ["ok": true]
        case "entitlements":
            return await accessStatus()
        case "products":
            // Live localized values (locked decision: never hardcode money).
            // Shapes consumed by pay() in CAGE_SCRIPT. trialDays is present
            // only when this user is actually eligible for the intro trial.
            do {
                guard let current = try await selectedOffering() else {
                    return productFailure("offering_unavailable")
                }
                var out: [String: Any] = ["ok": true, "offeringId": current.identifier]
                let yearly = experimentTest ? current.annual : current.availablePackages.first {
                    $0.storeProduct.productIdentifier == "konvo.pro.yearly" }
                if experimentTest && yearly == nil { return productFailure("annual_product_unavailable") }
                if experimentTest && (yearly?.storeProduct.introductoryDiscount != nil ||
                    yearly?.storeProduct.subscriptionPeriod?.unit != .year ||
                    yearly?.storeProduct.subscriptionPeriod?.value != 1) {
                    return productFailure("invalid_annual_product")
                }
                let monthly = current.availablePackages.first {
                    $0.storeProduct.productIdentifier == "konvo.pro.monthly" }
                let weekly = experimentTest ? current.weekly : nil
                let lifetime = current.availablePackages.first {
                    $0.storeProduct.productIdentifier == "konvo.pro.lifetime" }
                if let p = yearly?.storeProduct {
                    var d: [String: Any] = ["price": p.localizedPriceString,
                        "productId": p.productIdentifier, "amount": NSDecimalNumber(decimal: p.price),
                        "currency": p.currencyCode ?? "", "noIntroOffer": p.introductoryDiscount == nil]
                    // Both framings, computed from the live price: the card
                    // shows per-month, other copy can use per-week.
                    if let f = p.priceFormatter {
                        if let s = f.string(from: NSDecimalNumber(decimal: p.price / 52)) {
                            d["perWeek"] = s
                        }
                        if let s = f.string(from: NSDecimalNumber(decimal: p.price / 12)) {
                            d["perMonth"] = s
                        }
                    }
                    // The honest discount vs twelve months of monthly.
                    if let m = monthly?.storeProduct, m.price > 0 {
                        let pct = (1 - p.price / (m.price * 12)) * 100
                        d["savePct"] = Int(
                            NSDecimalNumber(decimal: pct).doubleValue.rounded())
                    }
                    if let days = await trialDays(p) { d["trialDays"] = days }
                    out["yearly"] = d
                }
                if let p = monthly?.storeProduct {
                    var d: [String: Any] = ["price": p.localizedPriceString,
                        "productId": p.productIdentifier, "amount": NSDecimalNumber(decimal: p.price),
                        "currency": p.currencyCode ?? "", "noIntroOffer": p.introductoryDiscount == nil]
                    if let days = await trialDays(p) { d["trialDays"] = days }
                    out["monthly"] = d
                }
                if let package = weekly, validPersonalizedPackage(package) {
                    let p = package.storeProduct
                    var weeklyData: [String: Any] = ["price": p.localizedPriceString,
                        "productId": p.productIdentifier, "amount": NSDecimalNumber(decimal: p.price),
                        "currency": p.currencyCode ?? "", "noIntroOffer": true]
                    weeklyData["annualizedPrice"] = p.priceFormatter?.string(from: NSDecimalNumber(decimal: p.price * 52))
                    out["weekly"] = weeklyData
                } else if experimentTest {
                    // Annual remains usable if Apple's weekly product is unavailable.
                    out["weeklyUnavailableReason"] = weekly == nil ? "weekly_product_unavailable" : "invalid_weekly_product"
                }
                if experimentTest, let regular = yearly {
                    // Offer failures must not take down regular annual or weekly checkout.
                    if let special = try? await specialOfferPackage(regular: regular) {
                        let p = special.storeProduct
                        var data: [String: Any] = ["price": p.localizedPriceString,
                            "productId": p.productIdentifier, "amount": NSDecimalNumber(decimal: p.price),
                            "currency": p.currencyCode ?? "", "noIntroOffer": true,
                            "offeringId": specialOfferingIdentifier]
                        data["perWeek"] = p.priceFormatter?.string(from: NSDecimalNumber(decimal: p.price / 52))
                        out["specialOffer"] = data
                    } else { out["specialOfferUnavailableReason"] = "special_offer_unavailable" }
                }
                if let p = lifetime?.storeProduct {
                    out["lifetime"] = ["price": p.localizedPriceString]
                }
                if experimentTest {
                    track("store_products_ready", ["offering_id": current.identifier,
                        "product_id": yearly?.storeProduct.productIdentifier ?? "",
                        "weekly_product_id": (out["weekly"] as? [String: Any])?["productId"] ?? "",
                        "currency": yearly?.storeProduct.currencyCode ?? ""])
                    if onboardingPreview, let product = out["weekly"] as? [String: Any] {
                        // Device QA evidence contains only public catalog metadata.
                        print("KONVO_WEEKLY_QA catalog \(current.identifier) \(product["productId"] ?? "") \(product["price"] ?? "") \(product["currency"] ?? "")")
                    }
                }
                return out
            } catch {
                return productFailure("store_unavailable", code: (error as NSError).code)
            }
        case "purchase":
            let attempt = KonvoCheckoutAttempt(productId: productId, context: checkout, emit: track)
            guard !purchaseInFlight else {
                return attempt.finish(["ok": false, "error": "purchase in progress"], reason: "purchase_in_progress")
            }
            purchaseInFlight = true
            defer { purchaseInFlight = false }
            var storeRequested = false
            do {
                guard let offering = try await selectedOffering() else {
                    return attempt.finish(["ok": false, "error": "offering unavailable"], reason: "offering_unavailable")
                }
                let selectedPackage: Package?
                if productId == specialProductIdentifier {
                    guard experimentTest, specialOfferEligible, let regular = offering.annual else {
                        return attempt.finish(["ok": false, "error": "special offer unavailable"], reason: "special_offer_unavailable")
                    }
                    selectedPackage = try await specialOfferPackage(regular: regular)
                } else {
                    selectedPackage = offering.availablePackages.first { $0.storeProduct.productIdentifier == productId }
                }
                guard let package = selectedPackage else { return attempt.finish(["ok": false, "error": "unknown product"], reason: "product_unavailable") }
                if experimentTest && !validPersonalizedPackage(package) {
                    return attempt.finish(["ok": false, "error": "invalid experimental purchase"], reason: "invalid_product")
                }
                KonvoActivationAnalytics.shared.record("native_plan_selected", ["plan": productId])
                let product = package.storeProduct
                attempt.storeRequested(catalog: ["product_id": product.productIdentifier,
                    "offering_id": productId == specialProductIdentifier ? specialOfferingIdentifier : offering.identifier,
                    "package_id": package.identifier, "price_amount": NSDecimalNumber(decimal: product.price),
                    "currency": product.currencyCode ?? "", "localized_price": product.localizedPriceString])
                storeRequested = true
                let result = try await Purchases.shared.purchase(package: package)
                if result.userCancelled {
                    if experimentTest && productId != specialProductIdentifier { specialOfferEligible = true }
                    return attempt.finish(["ok": false, "cancelled": true])
                }
                let ok = result.customerInfo.entitlements.active["Pro"] != nil
                if onboardingPreview {
                    let entitlement = result.customerInfo.entitlements.active["Pro"]
                    print("KONVO_WEEKLY_QA purchase requested=\(productId) entitlement_product=\(entitlement?.productIdentifier ?? "none") sandbox=\(entitlement?.isSandbox ?? false) active=\(ok)")
                }
                if ok {
                    KonvoActivationAnalytics.shared.record("native_purchase_completed", ["plan": productId])
                }
                return attempt.finish(["ok": ok, "entitled": ok])
            } catch {
                if let rcError = error as? RevenueCat.ErrorCode, rcError == .purchaseCancelledError {
                    if experimentTest && productId != specialProductIdentifier { specialOfferEligible = true }
                    return attempt.finish(["ok": false, "cancelled": true])
                }
                if let rcError = error as? RevenueCat.ErrorCode,
                   rcError == .paymentPendingError {
                    // Ask to Buy and the like: the entitlement lands later,
                    // and the launch check in CAGE_SCRIPT picks it up.
                    return attempt.finish(["ok": false, "pending": true])
                }
                return attempt.finish(["ok": false, "error": "\(error)"],
                    reason: storeRequested ? "store_purchase" : "catalog_lookup", errorCode: (error as NSError).code)
            }
        case "restore":
            let info = try? await Purchases.shared.restorePurchases()
            let ok = info?.entitlements.active["Pro"] != nil
            return ["ok": true, "entitled": ok]
        // ── The invite loop (Sep 1) ──────────────────────────────────
        // Send = the iOS share sheet with the draft and the link, week 1
        // on its completion; claim = the friend's paste sheet at the
        // paywall; inviteStatus = the sender's meter. The site holds
        // handles, RevenueCat ids and counts; the RevenueCat secret key
        // never leaves it.
        case "invite":
            return await inviteShare(productId)
        case "claim":
            return await inviteClaim(mode: productId)
        case "paywall":
            // Superwall placement, raised from CAGE_SCRIPT only when the
            // cage-patch flips {"superwall": true}. Resolves when the sheet
            // is done (bought, closed, skipped, or errored); the JS side
            // reads `entitled` and raises the injected wall as the
            // enforcement floor if the answer is still no.
            await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
                var done = false
                let finish = {
                    if !done { done = true; cont.resume() }
                }
                let handler = PaywallPresentationHandler()
                handler.onPresent { _ in
                    KonvoActivationAnalytics.shared.record("paywall_presented", ["placement": "campaign_trigger"])
                }
                handler.onDismiss { _, _ in
                    // A verified purchase already clears the visible state.
                    KonvoActivationAnalytics.shared.record("paywall_exited")
                    finish()
                }
                handler.onSkip { _ in finish() }
                handler.onError { _ in finish() }
                Superwall.shared.register(
                    placement: "campaign_trigger", handler: handler
                ) {
                    finish()
                }
            }
            return ["ok": true, "entitled": await entitled()]
        case "rcPaywall":
            // RevenueCat's remotely designed paywall for the price step
            // (Sep 1), raised from CAGE_SCRIPT when the cage-patch says
            // {"rcPaywall": true}. No close button: the wall is as hard
            // here as the injected screen. The JS reads `entitled`;
            // anything short of a purchase or restore falls back to the
            // injected price screen, the enforcement floor.
            _ = configureOnce
            guard let offering = try? await selectedOffering(),
                  offering.paywall != nil || offering.paywallComponents != nil
            else { return ["ok": false, "result": "no_paywall", "entitled": await entitled()] }
            let outcome = await presentRCPaywall(offering)
            var reply: [String: Any] = ["ok": true, "result": outcome.result, "entitled": await entitled()]
            if let pid = outcome.productId { reply["productId"] = pid }
            return reply
        case "notify":
            // Asks for notification permission; with a trial length in the
            // argument slot (sent from S14 once the plan is known) it also
            // schedules the "ends in 2 days" reminder two days before the
            // charge. iOS discards requests added without authorization,
            // so the add is gated on the grant. Before Aug 21 the reminder
            // sat at a fixed 12 days, after every trial had already billed.
            let center = UNUserNotificationCenter.current()
            let granted = (try? await center.requestAuthorization(
                options: [.alert, .sound, .badge])) ?? false
            if granted { await registerForPush() }
            if granted, let days = Int(productId), days > 2 {
                let content = UNMutableNotificationContent()
                content.title = "Konvo"
                content.body = "Your Konvo trial ends in 2 days. " +
                    "Keep your hours, or cancel anytime in Settings."
                let trigger = UNTimeIntervalNotificationTrigger(
                    timeInterval: TimeInterval(days - 2) * 86400, repeats: false)
                try? await center.add(UNNotificationRequest(
                    identifier: "konvo.trial.reminder",
                    content: content, trigger: trigger))
            }
            return ["ok": true, "granted": granted]
        default:
            return ["ok": false]
        }
    }

    // ACCESS_STATUS_BEGIN
    static func accessStatus() async -> [String: Any] {
        _ = configureOnce
        guard let info = try? await Purchases.shared.customerInfo() else {
            // Unknown must not clear a subscriber's offline access cache.
            return ["accessState": "unknown"]
        }
        if info.entitlements.active["Pro"] != nil {
            // Includes cancelled auto-renewal with time remaining and billing grace.
            return ["entitled": true, "accessState": "active"]
        }
        if let prior = info.entitlements.all["Pro"],
           let expiry = prior.expirationDate, expiry <= Date() {
            return ["entitled": false, "accessState": prior.periodType == .trial
                ? "expired_trial" : "expired_subscription"]
        }
        return ["entitled": false, "accessState": "none"]
    }
    // ACCESS_STATUS_END

    static func entitled() async -> Bool {
        _ = configureOnce
        let info = try? await Purchases.shared.customerInfo()
        return info?.entitlements.active["Pro"] != nil
    }

    // PostHog capture, fire-and-forget. distinct_id is RevenueCat's
    // anonymous app user id so funnels join revenue without any account.
    // Which network carried the event: the stuck-chat reports (Aug 27)
    // were undiagnosable without this one dimension. Kept through the
    // build 74-76 revert - it is detection, not behavior.
    private static var netType = "unknown"
    private static let netMonitor: NWPathMonitor = {
        let m = NWPathMonitor()
        m.pathUpdateHandler = { path in
            netType = path.usesInterfaceType(.cellular) ? "cellular"
                : path.usesInterfaceType(.wifi) ? "wifi" : "other"
        }
        m.start(queue: .global(qos: .background))
        return m
    }()
    private static let checkoutOutbox = KonvoCheckoutOutbox(
        load: { UserDefaults.standard.data(forKey: "konvo.checkout.telemetry.v1") },
        save: { UserDefaults.standard.set($0, forKey: "konvo.checkout.telemetry.v1") },
        send: { body, done in
            guard let url = URL(string: KonvoShared.posthogCapture) else { done(400); return }
            var request = URLRequest(url: url)
            request.httpMethod = "POST"; request.httpBody = body; request.timeoutInterval = 20
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            URLSession.shared.dataTask(with: request) { _, response, error in
                done(error == nil ? (response as? HTTPURLResponse)?.statusCode : nil)
            }.resume()
        })
    static func track(_ event: String, _ props: [String: Any]) {
        // distinct_id is RevenueCat's anonymous id, and Purchases.shared is
        // a fatalError until configure() has run. Build 88 tracked from
        // didFinishLaunching (the push hooks) before anything had
        // configured it and died on every open. Configure here, once, so
        // no caller has to remember.
        _ = configureOnce
        _ = netMonitor
        ActivationPal.setUserId(Purchases.shared.appUserID)
        KonvoActivationAnalytics.shared.record(event, props)
        var properties = props
        properties["onboarding_version"] = "original"
        properties["onboarding_experiment_retired"] = true
        if experimentEnrolled, let variant = experiment["variant"] as? String {
            properties["experiment_key"] = experimentKey
            properties["experiment_variant"] = variant
            properties["$feature/" + experimentKey] = variant
            properties["onboarding_version"] = variant == "test" ? "personalized_weekly_offer_v3" : "original"
        }
        #if DEBUG
        properties["is_test_build"] = true
        #else
        properties["is_test_build"] = onboardingPreview
        #endif
        properties["onboarding_preview"] = onboardingPreview
        properties["net"] = netType
        properties["platform"] = "ios"
        // Every event carries the build number: funnels that mixed builds
        // faked drop-offs twice (retired screens, new screens). Filtering
        // by build kills that class; date pins never could.
        properties["build"] =
            Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? ""
        let checkoutEvent = properties["checkout_attempt_id"] != nil &&
            ["purchase_started", "purchase_result", "checkout_received", "checkout_store_requested", "checkout_result"].contains(event)
        var payload: [String: Any] = [
            "api_key": KonvoShared.posthogKey,
            "event": event,
            "distinct_id": Purchases.shared.appUserID,
            "properties": properties,
        ]
        if checkoutEvent {
            let format = ISO8601DateFormatter()
            format.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            payload["timestamp"] = format.string(from: Date())
            payload["uuid"] = UUID().uuidString
        }
        guard let url = URL(string: KonvoShared.posthogCapture),
              let body = try? JSONSerialization.data(withJSONObject: payload)
        else { return }
        if checkoutEvent {
            checkoutOutbox.enqueue(body)
            return
        }
        // A normal app event also resumes pending telemetry after relaunch.
        checkoutOutbox.flush()
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        URLSession.shared.dataTask(with: request).resume()
    }

    // ── Unread alerts while closed (Sep 1, option A) ─────────────────
    // iOS wakes the app now and then (Background App Refresh); the check
    // reads the cookie snapshot the settled inbox saved, asks Instagram
    // for the same badge its own web client polls, and posts a local
    // notification when the count rose. Count only, never content, and
    // no server: the only request is the one Instagram's page makes.
    // Cadence is iOS's call (a few times a day, more for daily users);
    // the bg_check events measure it. Option B (a silent-push heartbeat)
    // reuses everything here and only adds the wake-up.
    private static let refreshId = "com.matthewchan.konvo.refresh"
    private static let badgeKey = "konvoUnreadBadge"
    private static var refreshInstalled = false

    // Called from main.mm before UIApplicationMain: BGTaskScheduler wants
    // handlers registered before the launch completes, and Tauri owns
    // the app delegate.
    @objc public static func registerBackgroundRefresh() {
        guard !refreshInstalled else { return }
        refreshInstalled = true
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: refreshId, using: nil
        ) { task in
            let work = Task {
                await checkUnread(via: "refresh")
                await checkInvites(via: "refresh")
                scheduleRefresh()
                task.setTaskCompleted(success: true)
            }
            task.expirationHandler = { work.cancel() }
        }
        // Option B (Sep 1): once the app has launched, the push selectors
        // are added to Tauri's delegate and, if notifications were granted
        // before, the device token is refreshed (tokens rotate).
        NotificationCenter.default.addObserver(
            forName: UIApplication.didFinishLaunchingNotification,
            object: nil, queue: .main
        ) { _ in
            _ = configureOnce
            installPushHooks()
            Task {
                let status = await UNUserNotificationCenter.current()
                    .notificationSettings().authorizationStatus
                if status == .authorized || status == .provisional { await registerForPush() }
            }
        }
        NotificationCenter.default.addObserver(
            forName: UIApplication.didEnterBackgroundNotification,
            object: nil, queue: .main
        ) { _ in
            scheduleRefresh()
            // Leaving the app is when the baseline is right (the inbox was
            // just read) and the one path every build exercises in the
            // field, so these events also prove the fetch works.
            let bg = UIApplication.shared.beginBackgroundTask(expirationHandler: nil)
            Task {
                await checkUnread(via: "background")
                await checkInvites(via: "background")
                UIApplication.shared.endBackgroundTask(bg)
            }
        }
    }

    private static func scheduleRefresh() {
        let req = BGAppRefreshTaskRequest(identifier: refreshId)
        req.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        try? BGTaskScheduler.shared.submit(req)
    }

    static func checkUnread(via: String) async {
        _ = configureOnce
        guard let cookies = readCookieSnapshot(),
              cookies.contains(where: { $0.name == "sessionid" })
        else { track("bg_check", ["via": via, "status": "no_session"]); return }
        var req = URLRequest(url: URL(
            string: "https://www.instagram.com/api/v1/direct_v2/get_badge_count/")!)
        req.timeoutInterval = 20
        req.httpShouldHandleCookies = false
        req.setValue(cookies.map { "\($0.name)=\($0.value)" }.joined(separator: "; "),
                     forHTTPHeaderField: "Cookie")
        req.setValue("936619743392459", forHTTPHeaderField: "X-IG-App-ID")
        if let csrf = cookies.first(where: { $0.name == "csrftoken" })?.value {
            req.setValue(csrf, forHTTPHeaderField: "X-CSRFToken")
        }
        req.setValue("XMLHttpRequest", forHTTPHeaderField: "X-Requested-With")
        req.setValue("https://www.instagram.com/direct/inbox/", forHTTPHeaderField: "Referer")
        req.setValue("*/*", forHTTPHeaderField: "Accept")
        req.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) " +
                     "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
                     forHTTPHeaderField: "User-Agent")
        guard let result = try? await URLSession.shared.data(for: req) else {
            track("bg_check", ["via": via, "status": "network"]); return
        }
        let (data, resp) = result
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        guard code == 200, let n = json?["badge_count"] as? Int else {
            track("bg_check", ["via": via, "status": "http_\(code)"]); return
        }
        let defaults = UserDefaults.standard
        let last = defaults.object(forKey: badgeKey) as? Int
        defaults.set(n, forKey: badgeKey)
        var posted = false
        if via == "refresh" || via == "push", let last, n > last {
            let center = UNUserNotificationCenter.current()
            let status = await center.notificationSettings().authorizationStatus
            if status == .authorized || status == .provisional {
                let content = UNMutableNotificationContent()
                content.title = "Konvo"
                content.body = n == 1 ? "1 unread conversation" : "\(n) unread conversations"
                content.sound = .default
                try? await center.add(UNNotificationRequest(
                    identifier: "konvo.unread", content: content, trigger: nil))
                posted = true
            }
        }
        track("bg_check", ["via": via, "status": "ok", "badge": n, "posted": posted])
    }

    // ── Option B: the silent-push heartbeat (Sep 1) ──────────────────
    // konvoinstall.com pings every device with an empty push every 15
    // minutes; the phone then runs checkUnread with its own session. The
    // server holds device tokens and nothing else. Tauri (tao) owns the
    // app delegate and implements none of the remote-notification
    // selectors, so they are added to its class at runtime after launch;
    // class_addMethod refuses if a future tao adds them itself, and the
    // push_hooks event says so.
    private static let pushRegisterURL = "https://konvoinstall.com/api/push/register"
    private static var pushHooksInstalled = false

    static func installPushHooks() {
        guard !pushHooksInstalled, let delegate = UIApplication.shared.delegate else { return }
        pushHooksInstalled = true
        let cls: AnyClass = type(of: delegate)
        let onToken: @convention(block) (AnyObject, UIApplication, Data) -> Void = { _, _, data in
            registerPushToken(data.map { String(format: "%02x", $0) }.joined())
        }
        let onFail: @convention(block) (AnyObject, UIApplication, NSError) -> Void = { _, _, err in
            track("push_registered", ["status": "apns_refused", "code": err.code])
        }
        let onPush: @convention(block)
            (AnyObject, UIApplication, NSDictionary, @escaping (UIBackgroundFetchResult) -> Void) -> Void = { _, _, _, done in
            Task { await checkUnread(via: "push"); await checkInvites(via: "push"); done(.newData) }
        }
        let added = [
            class_addMethod(cls, NSSelectorFromString("application:didRegisterForRemoteNotificationsWithDeviceToken:"),
                            imp_implementationWithBlock(onToken), "v@:@@"),
            class_addMethod(cls, NSSelectorFromString("application:didFailToRegisterForRemoteNotificationsWithError:"),
                            imp_implementationWithBlock(onFail), "v@:@@"),
            class_addMethod(cls, NSSelectorFromString("application:didReceiveRemoteNotification:fetchCompletionHandler:"),
                            imp_implementationWithBlock(onPush), "v@:@@@?"),
        ]
        track("push_hooks", ["status": added.allSatisfy { $0 } ? "installed" : "refused"])
    }

    @MainActor static func registerForPush() {
        UIApplication.shared.registerForRemoteNotifications()
    }

    // Development-signed builds (the cable) talk to APNs' sandbox; store
    // and TestFlight builds to production. The embedded profile says which.
    private static var apnsEnvironment: String {
        guard let path = Bundle.main.path(forResource: "embedded", ofType: "mobileprovision"),
              let text = try? String(contentsOfFile: path, encoding: .isoLatin1),
              let range = text.range(of: "aps-environment</key>")
        else { return "production" }
        return text[range.upperBound...].prefix(80).contains("development") ? "sandbox" : "production"
    }

    // Sent when the token changes and at most once a day otherwise: the
    // server only needs to know the token is alive.
    static func registerPushToken(_ hex: String) {
        let d = UserDefaults.standard
        let same = d.string(forKey: "konvoPushToken") == hex
        let sentAt = d.object(forKey: "konvoPushSent") as? Date ?? .distantPast
        if same && Date().timeIntervalSince(sentAt) < 86400 { return }
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? ""
        let payload: [String: Any] = ["token": hex, "build": build, "env": apnsEnvironment, "platform": "ios"]
        guard let url = URL(string: pushRegisterURL),
              let body = try? JSONSerialization.data(withJSONObject: payload) else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
        URLSession.shared.dataTask(with: req) { _, resp, err in
            let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
            if code == 200 {
                d.set(hex, forKey: "konvoPushToken"); d.set(Date(), forKey: "konvoPushSent")
            }
            track("push_registered", ["status": err == nil ? "http_\(code)" : "network", "env": apnsEnvironment])
        }.resume()
    }

    // ── RevenueCat Paywalls on the price step (Sep 1) ─────────────────
    @MainActor
    private static func presentRCPaywall(_ offering: RevenueCat.Offering) async -> (result: String, productId: String?) {
        guard let front = frontViewController() else { return ("no_presenter", nil) }
        let bridge = RCPaywallBridge()
        let controller = RevenueCatUI.PaywallViewController(
            offering: offering, displayCloseButton: false,
            dismissRequestedHandler: { controller in
                controller.dismiss(animated: true) { bridge.finish() }
            })
        controller.delegate = bridge
        controller.modalPresentationStyle = .fullScreen
        controller.isModalInPresentation = true
        front.present(controller, animated: true) {
            KonvoActivationAnalytics.shared.record("paywall_presented", ["placement": "onboarding_revenuecat"])
        }
        return await withCheckedContinuation { cont in bridge.continuation = cont }
    }

    // Kept alive by the continuation; the controller's delegate is weak.
    private final class RCPaywallBridge: NSObject, RevenueCatUI.PaywallViewControllerDelegate {
        var continuation: CheckedContinuation<(result: String, productId: String?), Never>?
        var result = "dismissed"
        var productId: String?
        func finish() {
            guard continuation != nil else { return }
            KonvoActivationAnalytics.shared.record("paywall_exited")
            continuation?.resume(returning: (result, productId))
            continuation = nil
        }
        func paywallViewController(_ controller: RevenueCatUI.PaywallViewController,
                                   didStartPurchaseWith package: RevenueCat.Package) {
            KonvoActivationAnalytics.shared.record("native_plan_selected", ["plan": package.storeProduct.productIdentifier])
        }
        func paywallViewController(_ controller: RevenueCatUI.PaywallViewController,
                                   didFinishPurchasingWith customerInfo: RevenueCat.CustomerInfo) {
            result = "purchased"
            productId = customerInfo.entitlements.active["Pro"]?.productIdentifier
            if let productId = productId {
                KonvoActivationAnalytics.shared.record("native_purchase_completed", ["plan": productId])
            }
        }
        func paywallViewController(_ controller: RevenueCatUI.PaywallViewController,
                                   didFinishRestoringWith customerInfo: RevenueCat.CustomerInfo) {
            if customerInfo.entitlements.active["Pro"] != nil { result = "restored" }
        }
        func paywallViewController(_ controller: RevenueCatUI.PaywallViewController,
                                   didFailPurchasingWith error: NSError) {
            KonvoStore.track("rc_paywall_error", ["code": error.code])
        }
    }

    // ── The Screen Time cage ──────────────────────────────────────────
    // Apple's picker is the only way to target Instagram - apps cannot
    // name other apps - so the user taps it once and the opaque selection
    // persists here. The shield itself is drawn by the two PlugIns
    // (ShieldConfig / ShieldAction); iOS keeps it up with Konvo closed.
    // Revocation always exists in Settings > Screen Time, so no copy
    // anywhere claims the block is unbreakable.

    private static let cageSelectionKey = KonvoShared.keySelection
    private static let cageActiveKey = "konvoCageActive"
    // App group: the relock extension (KonvoActivityMonitor) reads the
    // selection from here with the app dead. Standard defaults remain the
    // fallback read for installs that stored the selection before the
    // group existed.
    static var cageDefaults: UserDefaults {
        KonvoShared.groupDefaults ?? .standard
    }

    @available(iOS 16.0, *)
    private static var cageStore: ManagedSettingsStore {
        ManagedSettingsStore(named: .init(KonvoShared.cageStoreName))
    }

    @available(iOS 16.0, *)
    private static func storedCageSelection() -> FamilyActivitySelection? {
        guard let data = cageDefaults.data(forKey: cageSelectionKey)
            ?? UserDefaults.standard.data(forKey: cageSelectionKey)
        else { return nil }
        return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    }

    @available(iOS 16.0, *)
    private static func cageCount(_ s: FamilyActivitySelection) -> Int {
        CageSelectionPolicy.isSafe(applications: s.applicationTokens.count,
            categories: s.categoryTokens.count, domains: s.webDomainTokens.count) ? 1 : 0
    }

    @available(iOS 16.0, *)
    private static func migrateCageSelection() {
        // Clear restrictions owned by Konvo only. OS/user/other-app limits remain theirs.
        cageStore.shield.webDomains = nil
        cageStore.shield.webDomainCategories = nil
        cageStore.shield.applicationCategories = nil
        if storedCageSelection().map({ cageCount($0) == 1 }) != true {
            cageClear()
            cageDefaults.removeObject(forKey: cageSelectionKey)
            UserDefaults.standard.removeObject(forKey: cageSelectionKey)
        }
    }

    @available(iOS 16.0, *)
    static func cageApply() -> Bool {
        guard let s = storedCageSelection(), cageCount(s) > 0 else {
            cageClear()
            return false
        }
        let store = cageStore
        store.shield.webDomains = nil
        store.shield.webDomainCategories = nil
        store.shield.applicationCategories = nil
        store.shield.applications = s.applicationTokens.isEmpty ? nil : s.applicationTokens
        UserDefaults.standard.set(true, forKey: cageActiveKey)
        return true
    }

    @available(iOS 16.0, *)
    static func cageClear() {
        // Mark stale before stopping: stopMonitoring can trigger a final callback.
        cageDefaults.set("disabled", forKey: KonvoShared.keyPassName)
        cageDefaults.set(false, forKey: KonvoShared.keyPassActive)
        DeviceActivityCenter().stopMonitoring(PassPolicy.allActivityNames.map { DeviceActivityName($0) })
        cageStore.clearAllSettings()
        UserDefaults.standard.set(false, forKey: cageActiveKey)
    }

    private static func dayStamp() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }

    // The daily passes (reshaped Aug 17 after the relock proved itself):
    // five minutes first, then one spare minute - the user cannot see a
    // countdown inside Instagram, so the spare covers "the relock caught
    // me mid-story". Both relock themselves. Pass length is WALL CLOCK
    // via the schedule warning below; the usage threshold stays
    // registered as a spare but proved unreliable in the field (Aug 17).
    @available(iOS 16.0, *)
    static func passesUsedToday() -> Int {
        let d = cageDefaults
        return d.string(forKey: KonvoShared.keyPassDay) == dayStamp()
            ? d.integer(forKey: KonvoShared.keyPassN) : 0
    }

    @available(iOS 16.0, *)
    @MainActor
    static func cagePassStart() -> [String: Any] {
        let d = cageDefaults
        let used = passesUsedToday()
        guard let mins = PassPolicy.minutes(afterUsed: used) else {
            return ["granted": false, "why": "used"]
        }
        guard let s = storedCageSelection(), cageCount(s) > 0,
              UserDefaults.standard.bool(forKey: cageActiveKey)
        else { return ["granted": false, "why": "nocage"] }
        let store = cageStore
        store.shield.applications = nil
        store.shield.applicationCategories = nil
        d.set(dayStamp(), forKey: KonvoShared.keyPassDay)
        d.set(used + 1, forKey: KonvoShared.keyPassN)
        d.set(true, forKey: KonvoShared.keyPassActive)
        d.set(Date().timeIntervalSince1970, forKey: KonvoShared.keyPassStart)
        let passName = PassPolicy.activityName(afterUsed: used)
        d.set(passName, forKey: KonvoShared.keyPassName)
        // The monitor extension reports its lifecycle to PostHog under the
        // same person; this is how a relock that never fires becomes
        // diagnosable instead of a mystery (first field test, Aug 16).
        d.set(Purchases.shared.appUserID, forKey: KonvoShared.keyUid)
        let now = Date()
        let cal = Calendar.current
        // Every number here derives from PassPolicy: the interval keeps a
        // margin over Apple's 15-minute minimum, and warningTime (end
        // minus interval-minus-length) puts intervalWillEndWarning
        // exactly the pass length after start - wall clock, the boundary
        // the field proved reliable while the usage threshold never
        // fired at all (Aug 17).
        let schedule = DeviceActivitySchedule(
            intervalStart: cal.dateComponents(
                [.hour, .minute, .second], from: now),
            intervalEnd: cal.dateComponents(
                [.hour, .minute, .second],
                from: now.addingTimeInterval(
                    Double(PassPolicy.intervalMinutes * 60))),
            repeats: false,
            warningTime: DateComponents(
                minute: PassPolicy.warningMinutes(for: mins)))
        let event = DeviceActivityEvent(
            applications: s.applicationTokens, categories: [],
            webDomains: [], threshold: DateComponents(minute: mins))
        let center = DeviceActivityCenter()
        center.stopMonitoring(
            PassPolicy.allActivityNames.map { DeviceActivityName($0) })
        do {
            try center.startMonitoring(
                DeviceActivityName(passName), during: schedule,
                events: [DeviceActivityEvent.Name("passUsed"): event])
        } catch {
            track("cage_pass_monitor_error", ["err": String(describing: error)])
        }
        if let url = URL(string: "instagram://app") {
            UIApplication.shared.open(url)
        }
        return ["granted": true]
    }

    // ── The invite loop (Sep 1) ──────────────────────────────────
    // A dev build can point at a preview deploy with the launch argument
    // -konvoInviteHost https://...; store builds always talk to the site.
    // inviteStatus() is the heartbeat's read (checkInvites); the page never
    // asks for it since Sep 2 (the sender gets nothing, so no meter).
    private static var inviteHost: String {
        UserDefaults.standard.string(forKey: "konvoInviteHost") ?? "https://konvoinstall.com"
    }
    static func invitePost(_ path: String, _ body: [String: Any]) async -> (Int, [String: Any]?) {
        guard let url = URL(string: inviteHost + path),
              let data = try? JSONSerialization.data(withJSONObject: body) else { return (0, nil) }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.httpBody = data
        req.timeoutInterval = 20
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        guard let (d, resp) = try? await URLSession.shared.data(for: req) else { return (0, nil) }
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        return (code, (try? JSONSerialization.jsonObject(with: d)) as? [String: Any])
    }
    @MainActor
    private static func inviteShare(_ json: String) async -> [String: Any] {
        guard let d = json.data(using: .utf8),
              let o = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any],
              let handle = o["handle"] as? String, let text = o["text"] as? String,
              let link = o["url"] as? String, let url = URL(string: link),
              let front = frontViewController() else { return ["ok": false] }
        let rc = Purchases.shared.appUserID
        _ = await invitePost("/api/invite/register", ["handle": handle, "rc": rc])
        let pbBefore = UIPasteboard.general.changeCount
        let completed: Bool = await withCheckedContinuation { cont in
            var done = false
            let sheet = UIActivityViewController(activityItems: [text, url], applicationActivities: nil)
            sheet.completionWithItemsHandler = { _, ok, _, _ in
                guard !done else { return }
                done = true
                cont.resume(returning: ok)
            }
            front.present(sheet, animated: true)
        }
        // Copy from the share sheet puts our own link on the clipboard.
        if UIPasteboard.general.changeCount != pbBefore {
            UserDefaults.standard.set(UIPasteboard.general.changeCount, forKey: "konvoClaimSkip")
        }
        guard completed else { return ["ok": true, "sent": false] }
        let (_, r) = await invitePost("/api/invite/sent",
            ["handle": handle, "rc": rc, "draft": o["draft"] ?? 0])
        Purchases.shared.invalidateCustomerInfoCache()
        _ = try? await Purchases.shared.customerInfo(fetchPolicy: .fetchCurrent)
        return ["ok": true, "sent": true, "expires": r?["expires"] ?? NSNull()]
    }
    static func inviteStatus() async -> [String: Any] {
        guard var c = URLComponents(string: inviteHost + "/api/invite/status") else { return ["ok": false] }
        c.queryItems = [URLQueryItem(name: "rc", value: Purchases.shared.appUserID)]
        guard let u = c.url, let (d, _) = try? await URLSession.shared.data(from: u),
              let j = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any] else { return ["ok": false] }
        return j
    }
    // "auto" asks the pasteboard only whether it holds a web link; nothing
    // is read and no alert shows. The link itself is read when the friend
    // taps the paste button (UIPasteControl reads without the alert).
    // The same clipboard content asks once (Matthew, Sep 6: the sheet kept
    // returning for his own invite link, copied days before). konvoClaimSkip
    // holds the pasteboard changeCount the sheet must ignore: the app's own
    // copy ("own", the copy row; the share sheet when it touched the
    // pasteboard), or a link the sheet already came up for.
    @MainActor
    private static func inviteClaim(mode: String) async -> [String: Any] {
        let pb = UIPasteboard.general, d = UserDefaults.standard
        if mode == "own" {
            d.set(pb.changeCount, forKey: "konvoClaimSkip")
            return ["ok": true, "shown": false, "entitled": false]
        }
        if mode == "auto" {
            if d.object(forKey: "konvoClaimSkip") != nil && d.integer(forKey: "konvoClaimSkip") == pb.changeCount {
                return ["ok": true, "shown": false, "entitled": false]
            }
            let found: Bool = await withCheckedContinuation { cont in
                pb.detectPatterns(for: [.probableWebURL]) { r in
                    cont.resume(returning: ((try? r.get()) ?? []).contains(.probableWebURL))
                }
            }
            if !found { return ["ok": true, "shown": false, "entitled": false] }
            d.set(pb.changeCount, forKey: "konvoClaimSkip")
        }
        // The paste control is iOS 16+; below it there is no sheet, and
        // the paywall stays as it is.
        guard #available(iOS 16.0, *) else { return ["ok": true, "shown": false, "entitled": false] }
        guard let front = frontViewController() else { return ["ok": false] }
        let result: [String: Any] = await withCheckedContinuation { cont in
            var done = false
            let vc = InviteClaimController()
            vc.finish = { r in
                guard !done else { return }
                done = true
                vc.dismiss(animated: true)
                cont.resume(returning: r)
            }
            vc.modalPresentationStyle = .pageSheet
            front.present(vc, animated: true)
        }
        var out = result
        out["ok"] = true
        out["shown"] = true
        return out
    }
    // The heartbeat's second question (Sep 1): any new joins? One local
    // notification per new claim, and only from a real wake, never from
    // the plain backgrounding that primes the baseline.
    static func checkInvites(via: String) async {
        _ = configureOnce
        let s = await inviteStatus()
        guard s["ok"] as? Bool == true, let claims = s["claims"] as? Int else { return }
        let d = UserDefaults.standard
        let last = d.integer(forKey: "konvoInviteClaims")
        d.set(claims, forKey: "konvoInviteClaims")
        // One notification per new join (three at most per code).
        guard claims > last, via != "background" else { return }
        let joined = (s["joined"] as? [[String: Any]]) ?? []
        let named = (joined.last?["handle"] as? String) ?? ""
        let who = named.isEmpty ? "A friend" : named
        let center = UNUserNotificationCenter.current()
        let status = await center.notificationSettings().authorizationStatus
        guard status == .authorized || status == .provisional else { return }
        let content = UNMutableNotificationContent()
        content.title = "Konvo"
        content.body = "\(who) joined Konvo through your link."
        content.sound = .default
        try? await center.add(UNNotificationRequest(
            identifier: "konvo.invite.\(claims)", content: content, trigger: nil))
    }

    // The black band above the sign-in sheet (appearance "black"): a view
    // behind the webview from the top of the screen down to the webview's
    // safe-area top, where the letterbox alone would be one flat colour.
    private static var sheetBand: UIView?
    @MainActor
    private static func band(in root: UIViewController, over webView: WKWebView) -> UIView {
        if let b = sheetBand { return b }
        let b = UIView()
        b.backgroundColor = .black
        b.translatesAutoresizingMaskIntoConstraints = false
        root.view.addSubview(b)
        root.view.sendSubviewToBack(b)
        NSLayoutConstraint.activate([
            b.topAnchor.constraint(equalTo: root.view.topAnchor),
            b.leadingAnchor.constraint(equalTo: root.view.leadingAnchor),
            b.trailingAnchor.constraint(equalTo: root.view.trailingAnchor),
            b.bottomAnchor.constraint(equalTo: webView.topAnchor),
        ])
        sheetBand = b
        return b
    }

    @MainActor
    private static func frontViewController() -> UIViewController? {
        let windows = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }.flatMap(\.windows)
        var vc = (windows.first { $0.isKeyWindow } ?? windows.first)?.rootViewController
        while let presented = vc?.presentedViewController { vc = presented }
        return vc
    }

    @available(iOS 16.0, *)
    @MainActor
    static func cagePick() async -> Int {
        guard let front = frontViewController() else { return 0 }
        return await withCheckedContinuation { (cont: CheckedContinuation<Int, Never>) in
            var resumed = false
            // Seeded EMPTY on purpose (Aug 17): Screen Time tokens are
            // opaque and die with their authorization, and app-group data
            // can outlive a reinstall. A stored seed let a stale token
            // pose as a selection - Cancel counted it, cage_enabled
            // fired, and nothing was actually shielded (field report,
            // build 52). A fresh pick mints live tokens every time, and
            // Cancel is zero, never the stored count.
            let host = UIHostingController(rootView: CagePickerSheet(
                selection: FamilyActivitySelection(),
                finish: { sel in
                    guard !resumed else { return }
                    resumed = true
                    if let sel, cageCount(sel) > 0, let data = try? JSONEncoder().encode(sel) {
                        cageDefaults.set(data, forKey: cageSelectionKey)
                    }
                    front.dismiss(animated: true)
                    cont.resume(returning: sel.map(cageCount) ?? 0)
                }))
            // Full screen and undismissable by swipe: the only exits are
            // Cancel and Continue, so the continuation cannot strand.
            host.modalPresentationStyle = .fullScreen
            host.isModalInPresentation = true
            front.present(host, animated: true)
        }
    }
}

// The selection screen, modeled on the pattern Opal proved: Apple's
// FamilyActivityPicker is a plain SwiftUI View, so it embeds inside a
// branded scaffold - our header, our pinned Continue - while the list
// itself stays the system's, rendered out of process and following
// light/dark automatically. SwiftUI because the picker has no UIKit form.
@available(iOS 16.0, *)
private struct CagePickerSheet: View {
    @State var selection: FamilyActivitySelection
    let finish: (FamilyActivitySelection?) -> Void

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                Button("Cancel") { finish(nil) }
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 20)
            .padding(.top, 14)
            VStack(alignment: .leading, spacing: 6) {
                Text("Select Instagram")
                    .font(.largeTitle.bold())
                Text("Expand the category and select the Instagram app only. Leave categories and websites unchecked.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20)
            .padding(.top, 2)
            FamilyActivityPicker(selection: $selection)
                .frame(maxHeight: .infinity)
            // Dead until something is ticked: Continue on an empty (or
            // blank-rendering) picker was one of the ways a user could
            // "finish" with nothing blocked.
            Button { finish(selection) } label: {
                Text("Continue")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color(red: 0.10, green: 0.42, blue: 0.95))
                    .clipShape(Capsule())
            }
            .disabled(!validSelection)
            .opacity(validSelection ? 1 : 0.4)
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 6)
        }
        .background(Color(.systemBackground).ignoresSafeArea())
    }

    private var validSelection: Bool {
        CageSelectionPolicy.isSafe(applications: selection.applicationTokens.count,
            categories: selection.categoryTokens.count, domains: selection.webDomainTokens.count)
    }
}

// The friend's claim sheet (Sep 1), presented over the paywall. The paste
// button is Apple's UIPasteControl: it reads the clipboard without the
// paste alert, only when tapped. The handle field is the fallback for a
// friend who arrived without the link on their clipboard.
@available(iOS 16.0, *)
final class InviteClaimController: UIViewController {
    var finish: (([String: Any]) -> Void)?
    private let status = UILabel()
    private let field = UITextField()
    private var busy = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        pasteConfiguration = UIPasteConfiguration(
            acceptableTypeIdentifiers: [UTType.url.identifier, UTType.plainText.identifier])
        let title = UILabel()
        title.text = "Did a friend send you Konvo?"
        title.font = .systemFont(ofSize: 26, weight: .bold)
        title.numberOfLines = 0
        let sub = UILabel()
        sub.text = "Paste their link and your 3 free days start. No card needed."
        sub.font = .systemFont(ofSize: 16)
        sub.textColor = .secondaryLabel
        sub.numberOfLines = 0
        var cfg = UIPasteControl.Configuration()
        cfg.displayMode = .iconAndLabel
        cfg.baseBackgroundColor = .systemBlue
        cfg.baseForegroundColor = .white
        cfg.cornerStyle = .large
        let paste = UIPasteControl(configuration: cfg)
        paste.target = self
        paste.heightAnchor.constraint(equalToConstant: 54).isActive = true
        field.placeholder = "Their Instagram handle"
        field.borderStyle = .roundedRect
        field.autocapitalizationType = .none
        field.autocorrectionType = .no
        field.font = .systemFont(ofSize: 17)
        field.heightAnchor.constraint(equalToConstant: 48).isActive = true
        let claim = UIButton(type: .system)
        claim.setTitle("Claim", for: .normal)
        claim.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
        claim.addTarget(self, action: #selector(claimTyped), for: .touchUpInside)
        let skip = UIButton(type: .system)
        skip.setTitle("Skip", for: .normal)
        skip.titleLabel?.font = .systemFont(ofSize: 17)
        skip.addTarget(self, action: #selector(skipTapped), for: .touchUpInside)
        status.font = .systemFont(ofSize: 15)
        status.textColor = .secondaryLabel
        status.numberOfLines = 0
        status.textAlignment = .center
        let row = UIStackView(arrangedSubviews: [field, claim])
        row.spacing = 12
        row.alignment = .center
        let stack = UIStackView(arrangedSubviews: [title, sub, paste, row, status, skip])
        stack.axis = .vertical
        stack.spacing = 18
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 32),
        ])
    }

    override func paste(itemProviders: [NSItemProvider]) {
        for p in itemProviders {
            if p.canLoadObject(ofClass: NSURL.self) {
                p.loadObject(ofClass: NSURL.self) { obj, _ in
                    DispatchQueue.main.async { self.take((obj as? NSURL)?.absoluteString ?? "", method: "clipboard") }
                }
                return
            }
            if p.canLoadObject(ofClass: NSString.self) {
                p.loadObject(ofClass: NSString.self) { obj, _ in
                    DispatchQueue.main.async { self.take((obj as? NSString) as String? ?? "", method: "clipboard") }
                }
                return
            }
        }
        status.text = "No invite link on your clipboard. Type the handle instead."
    }

    @objc private func claimTyped() { take(field.text ?? "", method: "handle") }
    @objc private func skipTapped() { finish?(["entitled": false, "method": "skip"]) }

    private func take(_ raw: String, method: String) {
        let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        let handle: String
        if let r = text.range(of: #"/i/([A-Za-z0-9._]{1,30})"#, options: .regularExpression) {
            handle = String(text[r]).replacingOccurrences(of: "/i/", with: "")
        } else if method == "handle", text.range(of: #"^@?[A-Za-z0-9._]{1,30}$"#, options: .regularExpression) != nil {
            handle = text.replacingOccurrences(of: "@", with: "")
        } else {
            status.text = method == "handle" ? "That does not look like an Instagram handle."
                : "No invite link on your clipboard. Type the handle instead."
            return
        }
        guard !busy else { return }
        busy = true
        status.text = "Checking\u{2026}"
        Task { @MainActor in
            let (code, r) = await KonvoStore.invitePost("/api/invite/claim",
                ["handle": handle, "rc": Purchases.shared.appUserID, "method": method])
            if code == 200, r?["ok"] as? Bool == true {
                Purchases.shared.invalidateCustomerInfoCache()
                _ = try? await Purchases.shared.customerInfo(fetchPolicy: .fetchCurrent)
                finish?(["entitled": true, "method": method, "expires": r?["expires"] ?? NSNull()])
                return
            }
            busy = false
            let why: [String: String] = [
                "cap": "That link has been used three times already.",
                "own_code": "That is your own link.",
                "already": "You already used an invite.",
                "no_code": "No invite under that handle.",
            ]
            status.text = why[(r?["reason"] as? String) ?? ""]
                ?? (code == 0 ? "No connection. Try again." : "Could not claim right now. Try again.")
        }
    }
}
