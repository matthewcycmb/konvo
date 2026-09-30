# Expired-trial inbox paywall — September 29, 2026

The original onboarding now says **Join 10,000+ people on Konvo**, with a live, localized caption and count instead of the old raster artwork. The existing attributed reviews remain.

Returning subscribers with verified expired access see **Don't lose your inbox**, their inbox inside the existing iPhone frame, localized annual/monthly prices, renewal disclosure, Continue with Konvo, Restore, and policy links. First-time subscribers keep the original trial timeline.

## Access and rendering

- RevenueCat's active Pro entitlement takes precedence, including cancelled renewal with time remaining and grace periods.
- Expired trial/subscription copy requires previous Pro history and an expired entitlement. Completed onboarding alone never selects the new screen.
- An unavailable receipt returns unknown and preserves a subscriber's existing offline cache.
- A receipt arriving after the initial timeout can switch to the returning screen; delayed onboarding timers cannot overwrite it.
- The existing inbox capture is shared with this screen. It strips scripts, forms, controls, handlers, links, and identifiers. Content exists only in memory and is never included in analytics or local storage.
- The preview does not transform or move Instagram's live document. A short bounded retry can fill a late inbox; pricing and purchases remain usable with fallback copy.
- `paywall_presented`, `purchase_started`, `purchase_result`, and the native impression use `paywall_id=expired_inbox_v1`, with `placement=lapsed` on tracking events. Plan switches do not duplicate impressions.

## Verification

- `node wrapper/test/test_expired_paywall.js`: active/unknown/expired entitlement handling, restored access, delayed receipt, original onboarding fallback, plan switching, localized billing, purchase correlation, safe inbox capture, and loading fallback.
- `node wrapper/test/test_access_status_native.js`: compiles and executes the exact native access-status function with RevenueCat fixtures, including active access, grace, expiration, and offline errors.
- `node wrapper/test/test_expired_paywall_visual.cjs`: actual source rendered in isolated Chrome, fabricated inbox, network blocked; 375×623, 390×750, and 430×838 in light/dark. Checks plan text colors, phone space, CTA and legal visibility, no overflow, plus social-proof/review spacing.
- The main wrapper regression suite remains the release gate. No store upload or physical-device purchase is performed by these tests.

Result: all wrapper regression checks completed successfully, including the original cage walkthrough, updated onboarding assertions, and onboarding theme checks. The new native access-status tests and all visual checks passed. Rendered previews are in `research/analytics/previews-2026-09-29/`. Physical-device verification and an App Store build/upload were not part of this change.
