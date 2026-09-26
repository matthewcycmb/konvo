# Build 127: original onboarding and wrapper stability

Requested scope: restore the original onboarding for everyone; highest Instagram-use choices first; stabilize bottom navigation, chat transitions, shared media, read styling, and Instagram app blocking. This work does not upload or submit a build.

## Implemented

- Bundled onboarding immediately selects original; native offering is explicitly `konvo_ab_control_v1` (annual trial/monthly). Cached personalized assignments and preview variants cannot activate the retired flow. Existing subscribers keep their entitlements. Notification permission page remains; the sender referral page remains removed.
- Screen-time choices: 5+ hours, 4–5, 3–4, 2–3, 1–2, under 1 hour, Not sure. French, Traditional Chinese and Korean labels updated. These remain self-reported estimates. This question scrolls on compact phones so the last option stays reachable.
- Fixed bottom bar holds Messages, Notifications, Profile and Instagram lock/pass. It remains consistent across inbox/profile/activity, hides in chats and fullscreen media, and has equal touch targets. Uses Instagram's own navigation links when present, otherwise a normal navigation; removes fabricated router state and the 500ms forced-reload heuristic.
- Thread entry no longer translates the entire WKWebView over Instagram's paint. Fresh pre-navigation snapshots remain available for back gestures.
- Removed 1.07 root chat zoom, which also scaled fullscreen media opened without changing the thread URL.
- Scoped the message font-weight override to chats. Inbox read/unread styling and actual unread dots remain Instagram-owned. No fake read receipts or hidden dots.
- Screen Time accepts exactly one explicit app, no categories/websites. Both app and monitor enforce the same policy. Migration clears unsafe/missing saved restrictions owned by Konvo. Turning blocking off invalidates monitoring before stopping it, so late callbacks cannot reapply the shield.
- On iOS 26+, public WKWebView Screen Time state triggers release of Konvo's own shield if web content becomes blocked while the cage is active. This pauses the Instagram block rather than bypassing OS limits. The lock UI and an explanatory alert update together. Other apps' or system restrictions are untouched.
- Existing passive login-readiness diagnostics and password-lookup preservation are included. Original events keep `onboarding_version=original`; build 127 adds `onboarding_experiment_retired=true`. Preview/debug events retain their test markers.

## PostHog change (verified September 25, 2026)

- Experiment 465606 ended at 19:57:54 UTC with conclusion `stopped_early`: owner product decision, not a statistically established winner.
- Flag 897359 / `konvo-onboarding-annual-v1` disabled at 19:58:00 UTC; definition re-read with `active=false` and experiment `is_running=false`.
- Historical events, metrics and dashboards retained. Older binaries may keep locally cached personalized assignments until updated.
- Current `https://konvoinstall.com/cage-patch.json` returned `{}`; no remote Superwall/RevenueCat layout override is enabled.

## Verification

Build 1.8.0 (127) archived successfully. Deep/strict signature verification passed. The app and all three extensions report build 127. The archive contains the exact final `cage.js` and the compressed original-onboarding HTML including the compact-phone fix. Full `npm test`, native login/Screen Time tests, browser rendering checks and `git diff --check` passed. See `verification.json` and copied logs for artifact details. Browser rendering uses disposable Chrome with synthetic inbox content and blocked HTTP; it is not evidence of Instagram's production server behavior. Native Screen Time tests execute shipped migration/apply/clear and extension callback code against isolated preferences and a fake OS store. They verify our policy and state transitions, not enforcement by iOS.

## Remaining live-device checks

1. Open a genuinely unread conversation, allow its contents to become visible, return to the inbox, and verify the unread dot clears without a reload. Compare with Instagram if it persists. Persistent dots were not reproduced in an authenticated inspectable session, so do not mark the server read-receipt issue resolved.
2. Pick only Instagram in Screen Time. Confirm Instagram's native app is shielded while Konvo remains usable; test a pass and relock. If iOS propagates blocking to web content, verify the iOS 26 recovery releases only Konvo's shield. App tokens are opaque, so the picker instructions matter; code cannot identify Instagram by inspecting a token.
3. On device, check rapid inbox/chat/back transitions, shared reel playback, bottom navigation and the last inbox row/composer with the keyboard. The automated browser check verifies geometry, not live Instagram markup or WKWebView animation timing.

The build is for device QA until these checks are complete. No App Store Connect upload or submission is part of this update task.
