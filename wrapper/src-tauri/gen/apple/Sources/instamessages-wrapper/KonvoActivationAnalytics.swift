import Foundation

/// Maps Konvo's web/native signals to ActivationPal's fixed vocabulary.
/// Keep this allowlist small: bridge properties can contain private Instagram data.
final class KonvoActivationAnalytics {
    static let shared = KonvoActivationAnalytics()
    private let lock = NSLock()
    private let defaults: UserDefaults
    private let emit: (String, [String: Any]) -> Void
    private var paywallVisible = false
    private let completedKey = "konvo.activationpal.onboardingCompleted"

    init(defaults: UserDefaults = .standard,
         emit: @escaping (String, [String: Any]) -> Void = { ActivationPal.track($0, $1) }) {
        self.defaults = defaults
        self.emit = emit
    }

    // Ordered by the actual flow, not lexicographically (s4b follows s4).
    private static let steps = [
        "s1", "s2c", "s3", "s4", "s4b", "s5", "s6", "s7",
        "s8a", "s8b", "s8c", "s9t", "s10", "s10b", "s11",
        "s12_connected", "s12d_reveal", "s12d_perks", "s12e_try",
        "s12f_offer", "s12g_reminder"
    ]
    private static let stepEvents: Set<String> = [
        "onboarding_screen_viewed", "login_succeeded", "inbox_reveal_viewed",
        "perks_viewed", "try_viewed", "offer_viewed", "reminder_viewed"
    ]
    // Ten product events. Never forward arbitrary props, error strings or handles.
    private static let productEvents: [String: [String]] = [
        "login_started": [], "login_succeeded": [], "inbox_ready": [],
        "thread_opened": [], "notify_answered": ["granted", "skipped", "trial"],
        "cage_enabled": [], "pass_used": ["mins"],
        "invite_sent": [], "invite_claimed": ["method"], "feedback_opened": []
    ]

    private static func plan(_ value: String?) -> String? {
        switch value {
        case "annual", "yearly", "konvo.pro.yearly": return "yearly"
        case "monthly", "konvo.pro.monthly": return "monthly"
        case "lifetime", "konvo.pro.lifetime": return "lifetime"
        default: return nil
        }
    }

    func record(_ event: String, _ props: [String: Any] = [:]) {
        lock.lock()
        defer { lock.unlock() }
        if Self.stepEvents.contains(event),
           let id = props["screen_id"] as? String,
           let index = Self.steps.firstIndex(of: id) {
            emit("onboarding_step", ["index": index, "id": id])
        }
        if let keys = Self.productEvents[event] {
            emit(event, props.filter { keys.contains($0.key) })
        }
        switch event {
        case "onboarding_completed":
            // The web flow reports both entitlement unlock and its final button.
            guard !defaults.bool(forKey: completedKey) else { return }
            defaults.set(true, forKey: completedKey)
            emit("onboarding_completed", [:])
        case "paywall_presented":
            guard !paywallVisible else { return }
            paywallVisible = true
            emit("paywall_shown", ["placement": props["placement"] as? String ?? "onboarding"])
        case "plan_selected", "native_plan_selected":
            guard let plan = Self.plan(props["plan"] as? String) else { return }
            emit("paywall_plan_selected", ["plan": plan])
        case "native_purchase_completed":
            guard let plan = Self.plan(props["plan"] as? String) else { return }
            paywallVisible = false
            emit("paywall_purchased", ["plan": plan])
        case "paywall_exited":
            guard paywallVisible else { return }
            paywallVisible = false
            emit("paywall_dismissed", [:])
        default: break
        }
    }
}
