import Foundation

// Shared by the app and the relock extension. Website/category restrictions
// can also cover Konvo's Instagram web content; require a deliberate app pick.
enum CageSelectionPolicy {
    static func isSafe(applications: Int, categories: Int, domains: Int) -> Bool {
        applications == 1 && categories == 0 && domains == 0
    }
}

// The pass policy, whole and in one place: how many unlocks a day, how
// long each is, and every number the schedule needs. The smear this
// replaces put "2 passes" in five sites across three languages, and the
// staleness backstop tuned for the long pass was six times too generous
// for the spare (architecture review, Aug 21). `lengthsMinutes` IS the
// policy; everything else derives from it. Change the product by editing
// that one line.
enum PassPolicy {
    /// Minutes of Instagram per pass, in the order they are granted.
    static let lengthsMinutes = [5, 5]

    static var perDay: Int { lengthsMinutes.count }

    /// Apple rejects DeviceActivity schedules under 15 minutes; 16 keeps
    /// a margin over the minimum (exactly-15 was in the first cut when
    /// the relock never fired on device, Aug 16). The warning boundary,
    /// end minus (interval - length), is what actually relocks: wall
    /// clock, proven reliable in the field where the usage threshold
    /// never fired at all (Aug 17).
    static let intervalMinutes = 16

    /// The length of the next pass, or nil when the day is spent.
    static func minutes(afterUsed used: Int) -> Int? {
        used >= 0 && used < perDay ? lengthsMinutes[used] : nil
    }

    static func warningMinutes(for length: Int) -> Int {
        intervalMinutes - length
    }

    /// Belt-and-braces relock on next app launch, per pass: the pass
    /// length plus a minute of grace, instead of one constant tuned for
    /// the longest pass.
    static func backstopSeconds(for length: Int) -> Double {
        Double((length + 1) * 60)
    }

    /// A name per pass: stopMonitoring fires the OLD session's end
    /// callback, and an unnamed session's ghost re-shielded one second
    /// after the spare unlocked (field test, Aug 17). The monitor
    /// extension discards boundaries whose activity is not current.
    static func activityName(afterUsed used: Int) -> String {
        "konvoPass\(used + 1)"
    }

    /// Every name a pass might monitor under, including the legacy
    /// pre-named-session name, for stopMonitoring sweeps.
    static var allActivityNames: [String] {
        ["konvoPass"] + (1...perDay).map { "konvoPass\($0)" }
    }
}
