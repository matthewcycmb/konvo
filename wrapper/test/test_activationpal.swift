// Offline semantic tests. Compile with KonvoActivationAnalytics.swift; the
// SDK stub below deliberately prevents test traffic from reaching production.
import Foundation

enum ActivationPal {
    static func track(_ name: String, _ props: [String: Any]) {
        fatalError("Tests must inject their event sink")
    }
}

@main
struct ActivationAnalyticsTests {
    static func main() {
        let suite = "konvo.analytics.tests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        var events: [(String, [String: Any])] = []
        let analytics = KonvoActivationAnalytics(defaults: defaults) { events.append(($0, $1)) }

        analytics.record("onboarding_screen_viewed", ["screen_id": "s1"])
        analytics.record("onboarding_screen_viewed", ["screen_id": "s4b"])
        analytics.record("onboarding_screen_viewed", ["screen_id": "unknown"])
        assert(events.count == 2 && events[0].1["index"] as? Int == 0)
        assert(events[1].1["index"] as? Int == 4)
        analytics.record("onboarding_completed")
        analytics.record("onboarding_completed")
        let relaunched = KonvoActivationAnalytics(defaults: defaults) { events.append(($0, $1)) }
        relaunched.record("onboarding_completed")
        assert(events.filter { $0.0 == "onboarding_completed" }.count == 1)

        events.removeAll()
        analytics.record("paywall_viewed", ["variant": "rc"])
        analytics.record("rc_paywall", ["result": "no_paywall"])
        assert(events.isEmpty, "An attempted native presentation is not an impression")
        analytics.record("paywall_presented", ["placement": "lapsed"])
        analytics.record("paywall_presented", ["placement": "lapsed"])
        analytics.record("plan_selected", ["plan": "annual"])
        analytics.record("plan_selected", ["plan": "unknown"])
        for result in ["cancelled", "pending", "error", "not_entitled", "purchased"] {
            analytics.record("purchase_result", ["result": result, "plan": "annual"])
        }
        analytics.record("rc_paywall", ["result": "restored"])
        assert(events.map { $0.0 } == ["paywall_shown", "paywall_plan_selected"])
        assert(events[0].1["placement"] as? String == "lapsed")
        assert(events[1].1["plan"] as? String == "yearly")
        analytics.record("native_purchase_completed", ["plan": "konvo.pro.yearly"])
        analytics.record("paywall_exited")
        assert(events.last!.0 == "paywall_purchased", "Successful purchase is not a dismissal")
        assert(events.filter { $0.0 == "paywall_purchased" }.count == 1)
        analytics.record("paywall_presented", ["placement": "onboarding"])
        analytics.record("paywall_exited")
        analytics.record("paywall_exited")
        assert(events.filter { $0.0 == "paywall_dismissed" }.count == 1)

        events.removeAll()
        analytics.record("pass_used", ["mins": 5, "reason": "private free text", "handle": "private"])
        analytics.record("thread_opened", ["message": "private", "thread_id": "private"])
        analytics.record("invite_sent", ["handle": "private", "url": "private"])
        analytics.record("login_error", ["error": "private"])
        analytics.record("app_opened") // SDK owns app_open and first_open.
        assert(events.count == 3)
        assert(events[0].1.count == 1 && events[0].1["mins"] as? Int == 5)
        assert(events[1].1.isEmpty && events[2].1.isEmpty)
        print("ActivationPal semantic tests passed")
    }
}
