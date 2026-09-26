import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings

// Relocks Instagram when the three-minute pass expires, with Konvo dead in
// the background: iOS runs this extension at DeviceActivity boundaries.
// The threshold event fires at three minutes of actual Instagram use; the
// interval end (16 minutes; Apple's schedule minimum is 15) is the
// backstop. Selection comes from the app group because this process has
// no other channel to the app.
//
// Every callback also reports to PostHog directly (URLSession; the app is
// not running to do it for us). Added Aug 16 after the first field test
// where the relock never came and nothing could say why: monitor_started
// proves iOS launches us, relock's `via` says which boundary fired, and
// relock_blind means we ran but could not read the selection - each a
// different bug.
class KonvoActivityMonitor: DeviceActivityMonitor {
    override func intervalDidStart(for activity: DeviceActivityName) {
        report("cage_monitor_started", ["via": "start"])
    }

    // The real three-minute arm since Aug 17: the schedule's end-minus-13
    // warning lands exactly three minutes after the pass starts. Wall
    // clock, not usage - the field test proved the usage threshold below
    // never fires (3+ minutes of real Instagram, no event), while the
    // time-based boundaries fire on the second.
    override func intervalWillEndWarning(for activity: DeviceActivityName) {
        relock(via: "warning", activity: activity)
    }

    override func eventDidReachThreshold(
        _ event: DeviceActivityEvent.Name, activity: DeviceActivityName
    ) {
        relock(via: "threshold", activity: activity)
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        relock(via: "interval", activity: activity)
    }

    private func relock(via: String, activity: DeviceActivityName) {
        let defaults = KonvoShared.groupDefaults
        // A boundary from a pass that is no longer current is the ghost
        // that killed the spare minute (Aug 17): stopMonitoring fires the
        // old session's intervalDidEnd, which re-shielded one second
        // after the new pass unlocked. Reported, never acted on.
        if let current = defaults?.string(forKey: KonvoShared.keyPassName),
           current != activity.rawValue {
            report("cage_relock_stale", ["via": via])
            return
        }
        // Boundaries after the first relock (warning fires, then interval
        // end 13 minutes later) are idempotent noise. Skip only on
        // positive evidence a relock already ran; an unreadable flag must
        // still fall through so a broken app group stays visible below.
        if via != "warning",
           defaults?.object(forKey: KonvoShared.keyPassActive) as? Bool == false {
            return
        }
        guard let data = defaults?.data(forKey: KonvoShared.keySelection),
              let selection = try? JSONDecoder().decode(
                FamilyActivitySelection.self, from: data)
        else {
            report("cage_relock_blind", ["via": via])
            return
        }
        let store = ManagedSettingsStore(named: .init(KonvoShared.cageStoreName))
        guard CageSelectionPolicy.isSafe(applications: selection.applicationTokens.count,
            categories: selection.categoryTokens.count, domains: selection.webDomainTokens.count) else {
            store.clearAllSettings()
            defaults?.set(false, forKey: KonvoShared.keyPassActive)
            report("cage_relock_invalid_selection", ["via": via])
            return
        }
        store.shield.webDomains = nil
        store.shield.webDomainCategories = nil
        store.shield.applicationCategories = nil
        store.shield.applications = selection.applicationTokens.isEmpty
            ? nil : selection.applicationTokens
        defaults?.set(false, forKey: KonvoShared.keyPassActive)
        report("cage_relock", ["via": via])
    }

    private func report(_ event: String, _ props: [String: Any]) {
        KonvoShared.capture(event, props)
    }
}
