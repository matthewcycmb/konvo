//
//  ActivationPal.swift
//
//  Tiny opinionated analytics SDK. Single file, no dependencies, iOS 15+.
//  Events buffer in memory, persist to disk, and flush in batches to the
//  ActivationPal ingest endpoint. Fails silently — never crashes, never
//  blocks the main thread, no-ops when not configured.
//

import Foundation
import StoreKit
import UIKit
#if canImport(AdServices)
import AdServices
#endif

public enum ActivationPal {

    // MARK: - Public API

    public static func configure(app: String, key: String, userId: String? = nil) {
        Client.shared.configure(app: app, key: key, userId: userId)
    }

    public static func setUserId(_ id: String?) {
        Client.shared.setUserId(id)
    }

    /// Where an event actually happened, when that isn't the process sending
    /// it. A Watch app has no SDK of its own — it relays through the phone,
    /// which would otherwise stamp the event with the phone's hardware model
    /// and file it under iPhone. Pass `from: .watch` at the relay point and
    /// the dashboard files it under Apple Watch.
    public enum Origin: String {
        case phone, watch, widget, vision, mac
    }

    public static func track(_ name: String, _ props: [String: Any]? = nil, from origin: Origin? = nil) {
        Client.shared.track(name, props: props, origin: origin?.rawValue)
    }

    /// Convenience for the common relay: everything a Watch app forwards.
    public static func trackFromWatch(_ name: String, _ props: [String: Any]? = nil) {
        track(name, props, from: .watch)
    }

    // MARK: - Opinionated helpers (fixed event names — the dashboard depends on them)

    public static func onboardingStep(_ index: Int, id: String, answer: String? = nil) {
        var props: [String: Any] = ["index": index, "id": id]
        if let answer = answer { props["answer"] = answer }
        track("onboarding_step", props)
    }

    public static func onboardingCompleted() {
        track("onboarding_completed")
    }

    public static func paywallShown(_ placement: String) {
        track("paywall_shown", ["placement": placement])
    }

    public static func paywallPlanSelected(_ plan: String) {
        track("paywall_plan_selected", ["plan": plan])
    }

    public static func paywallPurchased(_ plan: String) {
        track("paywall_purchased", ["plan": plan])
    }

    public static func paywallDismissed() {
        track("paywall_dismissed")
    }
}

// MARK: - Internal client

// @unchecked Sendable: all mutable state is confined to `queue`. Required for
// apps building with Swift 6 strict concurrency (first hit: RopeCount).
private final class Client: @unchecked Sendable {

    static let shared = Client()

    // MARK: Constants

    private let endpoint = URL(string: "https://activationpal.com/api/ingest")!
    private let deviceIdKey = "ap_device_id"
    private let firstOpenKey = "ap_first_open_tracked"
    private let attributionKey = "ap_attribution_tracked"
    private let maxPersistedEvents = 500
    private let flushThreshold = 20
    private let batchLimit = 100
    private let flushInterval: TimeInterval = 10
    private let sessionGap: TimeInterval = 30 * 60

    // MARK: State (all mutation on `queue`)

    private let queue = DispatchQueue(label: "com.activationpal.sdk", qos: .utility)
    private var configured = false
    private var appName = ""
    private var apiKey = ""
    private var userId: String?
    private var deviceId = ""
    private var sessionId = ""
    private var context: [String: String] = [:]
    private var buffer: [[String: Any]] = []
    private var isFlushing = false
    private var backgroundedAt: Date?
    private var timer: DispatchSourceTimer?
    private var observers: [NSObjectProtocol] = []

    private let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private lazy var queueFileURL: URL? = {
        guard let base = FileManager.default.urls(for: .applicationSupportDirectory,
                                                  in: .userDomainMask).first else { return nil }
        let dir = base.appendingPathComponent("activationpal", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("queue.json")
    }()

    // MARK: Configure

    func configure(app: String, key: String, userId: String?) {
        // Capture main-thread-flavored context before hopping to the queue.
        let info = Bundle.main.infoDictionary
        let appVersion = info?["CFBundleShortVersionString"] as? String ?? ""
        let build = info?["CFBundleVersion"] as? String ?? ""
        let osVersion = Self.systemVersion()
        let model = Self.deviceModel()
        let locale = Locale.current.identifier
        // The localization the app actually resolved to — differs from `locale`
        // when the device language isn't among the shipped .lproj sets.
        let appLanguage = Bundle.main.preferredLocalizations.first ?? ""
        let timezone = TimeZone.current.identifier
        let installedAt = Self.installDate()

        queue.async {
            guard !self.configured else {
                if let userId = userId { self.userId = userId }
                return
            }
            self.configured = true
            self.appName = app
            self.apiKey = key
            self.userId = userId

            let defaults = UserDefaults.standard
            if let existing = defaults.string(forKey: self.deviceIdKey) {
                self.deviceId = existing
            } else {
                self.deviceId = UUID().uuidString
                defaults.set(self.deviceId, forKey: self.deviceIdKey)
            }

            #if DEBUG
            let env = "debug"
            #else
            let env = Self.isTestFlight() ? "testflight" : "release"
            #endif
            self.context = [
                "platform": "ios",
                "app_version": appVersion,
                "build": build,
                "os_version": osVersion,
                "device_model": model,
                "locale": locale,
                "app_language": appLanguage,
                "timezone": timezone,
                "sdk_version": "3",
                "env": env
            ]
            if let installedAt = installedAt {
                self.context["installed_at"] = self.isoFormatter.string(from: installedAt)
            }

            // App Store storefront country — the pricing-relevant country, which
            // can differ from IP geo. Resolves async; stamps events from then on.
            Task { [weak self] in
                guard let storefront = await Storefront.current else { return }
                self?.queue.async { self?.context["storefront"] = storefront.countryCode }
            }

            self.loadPersistedQueue()

            if !defaults.bool(forKey: self.firstOpenKey) {
                self.append(name: "first_open", props: [:])
                defaults.set(true, forKey: self.firstOpenKey)
            }
            // Token generation can fail transiently. Keep trying on later
            // launches until the token is safely in the persisted event queue.
            if !defaults.bool(forKey: self.attributionKey),
               self.captureAttributionToken() {
                defaults.set(true, forKey: self.attributionKey)
            }
            self.startSession()
            self.installObservers()
            self.startTimer()
            self.flush()
        }
    }

    func setUserId(_ id: String?) {
        queue.async { self.userId = id }
    }

    // MARK: Track

    func track(_ name: String, props: [String: Any]?, origin: String? = nil) {
        var sanitized = Self.sanitize(props)
        // Stamped into props rather than a top-level column: it is rare, and
        // the ingest schema stays untouched.
        if let origin = origin { sanitized["origin"] = origin }
        let ts = isoFormatter.string(from: Date())
        queue.async {
            guard self.configured else { return }
            self.append(name: name, ts: ts, props: sanitized)
        }
    }

    // Must be called on `queue`.
    private func append(name: String, ts: String? = nil, props: [String: Any]) {
        var event: [String: Any] = [
            "event_id": UUID().uuidString,
            "name": name,
            "ts": ts ?? isoFormatter.string(from: Date()),
            "device_id": deviceId,
            "session_id": sessionId
        ]
        if let userId = userId { event["user_id"] = userId }
        if !props.isEmpty { event["props"] = props }
        for (key, value) in context { event[key] = value }

        buffer.append(event)
        if buffer.count > maxPersistedEvents {
            while buffer.count > maxPersistedEvents {
                // The token expires after 24 hours and cannot be minted again
                // once marked queued, so evict ordinary analytics first.
                let index = buffer.firstIndex { ($0["name"] as? String) != "asa_token" } ?? 0
                buffer.remove(at: index)
            }
        }
        persistQueue()
        if buffer.count >= flushThreshold { flush() }
    }

    // Apple Search Ads attribution: the AdServices token is only mintable
    // on-device, so it must be captured here and once — the server resolves it
    // against Apple's attribution API (token is valid 24h). Ads-vs-organic
    // install split depends entirely on this firing at first open.
    // Must be called on `queue`.
    private func captureAttributionToken() -> Bool {
        #if canImport(AdServices)
        if #available(iOS 14.3, *) {
            if let token = try? AAAttribution.attributionToken() {
                append(name: "asa_token", props: ["token": token])
                return true
            }
        }
        #endif
        return false
    }

    // MARK: Sessions

    // Must be called on `queue`.
    private func startSession() {
        sessionId = UUID().uuidString
        append(name: "app_open", props: [:])
    }

    private func installObservers() {
        let center = NotificationCenter.default
        observers.append(center.addObserver(forName: UIApplication.didEnterBackgroundNotification,
                                            object: nil, queue: nil) { [weak self] _ in
            guard let self = self else { return }
            self.queue.async {
                self.backgroundedAt = Date()
                self.flush()
            }
        })
        observers.append(center.addObserver(forName: UIApplication.willEnterForegroundNotification,
                                            object: nil, queue: nil) { [weak self] _ in
            guard let self = self else { return }
            self.queue.async {
                if let backgroundedAt = self.backgroundedAt,
                   Date().timeIntervalSince(backgroundedAt) > self.sessionGap {
                    self.startSession()
                }
                self.backgroundedAt = nil
            }
        })
    }

    // Must be called on `queue`.
    private func startTimer() {
        let source = DispatchSource.makeTimerSource(queue: queue)
        source.schedule(deadline: .now() + flushInterval, repeating: flushInterval)
        source.setEventHandler { [weak self] in self?.flush() }
        source.resume()
        timer = source
    }

    // MARK: Flush

    // Must be called on `queue`.
    private func flush() {
        guard configured, !isFlushing, !buffer.isEmpty else { return }

        let batch = Array(buffer.prefix(batchLimit))
        let body: [String: Any] = ["app": appName, "events": batch]
        guard JSONSerialization.isValidJSONObject(body),
              let data = try? JSONSerialization.data(withJSONObject: body) else {
            // Unserializable events would wedge the queue forever — drop the batch.
            buffer.removeFirst(min(batch.count, buffer.count))
            persistQueue()
            return
        }

        isFlushing = true
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "x-app-key")
        request.httpBody = data

        URLSession.shared.dataTask(with: request) { [weak self] _, response, _ in
            guard let self = self else { return }
            self.queue.async {
                self.isFlushing = false
                if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                    self.buffer.removeFirst(min(batch.count, self.buffer.count))
                    self.persistQueue()
                    #if DEBUG
                    print("[ActivationPal] flushed \(batch.count) event(s)")
                    #endif
                } else {
                    #if DEBUG
                    print("[ActivationPal] flush failed; keeping \(self.buffer.count) event(s)")
                    #endif
                }
            }
        }.resume()
    }

    // MARK: Persistence

    // Must be called on `queue`.
    private func persistQueue() {
        guard let url = queueFileURL,
              JSONSerialization.isValidJSONObject(buffer),
              let data = try? JSONSerialization.data(withJSONObject: buffer) else { return }
        try? data.write(to: url, options: .atomic)
    }

    // Must be called on `queue`.
    private func loadPersistedQueue() {
        guard let url = queueFileURL,
              let data = try? Data(contentsOf: url),
              let pending = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
              !pending.isEmpty else { return }
        buffer = pending.map { event in
            var upgraded = event
            if upgraded["event_id"] == nil { upgraded["event_id"] = UUID().uuidString }
            return upgraded
        } + buffer
        if buffer.count > maxPersistedEvents {
            buffer.removeFirst(buffer.count - maxPersistedEvents)
        }
        #if DEBUG
        print("[ActivationPal] loaded \(pending.count) pending event(s)")
        #endif
    }

    // MARK: Helpers

    private static func sanitize(_ props: [String: Any]?) -> [String: Any] {
        guard let props = props else { return [:] }
        var out: [String: Any] = [:]
        for (key, value) in props {
            switch value {
            case let string as String: out[key] = string
            case let bool as Bool: out[key] = bool
            case let int as Int: out[key] = int
            case let double as Double: out[key] = double
            default: break
            }
        }
        return out
    }

    private static func systemVersion() -> String {
        if Thread.isMainThread { return UIDevice.current.systemVersion }
        return DispatchQueue.main.sync { UIDevice.current.systemVersion }
    }

    private static func deviceModel() -> String {
        var systemInfo = utsname()
        uname(&systemInfo)
        return withUnsafeBytes(of: &systemInfo.machine) { buffer in
            String(decoding: buffer.prefix(while: { $0 != 0 }), as: UTF8.self)
        }
    }

    // TestFlight builds are Release builds with a sandbox receipt — without this
    // they'd pollute production numbers.
    private static func isTestFlight() -> Bool {
        Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"
    }

    // Approximate install date: creation date of the Documents directory.
    // Separates genuine new installs from existing users who updated into an
    // SDK-enabled version (their first_open fires on update day, not install day).
    private static func installDate() -> Date? {
        guard let docs = FileManager.default.urls(for: .documentDirectory,
                                                  in: .userDomainMask).first,
              let attrs = try? FileManager.default.attributesOfItem(atPath: docs.path)
        else { return nil }
        return attrs[.creationDate] as? Date
    }
}
