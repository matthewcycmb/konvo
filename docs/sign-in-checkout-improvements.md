# Sign-in recovery and checkout clarity — September 29, 2026

Implemented locally in the original onboarding. This work does not activate an experiment, change subscription prices or trial duration, or publish an app update. The existing trial explanation and notification page are retained.

## Sign-in

- Added an optional Help button inside the existing Instagram address strip. It explains using an existing Instagram account and returning after checking Passwords, Notes, or email. The explicit reset button opens Instagram's own `/accounts/password/reset/` route. No reset is submitted for the user.
- Help stays closed until tapped, clears when a field takes focus, and is removed on route changes or successful connection. It does not add an onboarding page, timeout, reload, or password field.
- Fixed submission telemetry: a Show password tap previously counted as a login submission if the password input held text. The regression failed against the previous implementation. Submission detection now uses the button's action or native form submission, without inspecting password values.
- A recovery return prompt is withdrawn if Instagram mounts a visible recovery input after the user returns from another app. It cannot remain over the new form.
- The existing passive loading checks and preservation of form/session state remain. Tests cover 30-second login pauses, two-minute recovery pauses, and a five-minute app switch. These do not promise survival after iOS kills the WebKit process.

## Checkout

- The annual card shows the real annual total alongside its monthly equivalent.
- Immediately below the purchase button, the selected plan shows its full localized price and trial charge date when eligible. The trial summary uses one line, without the repeated renewal sentence. Plans without a trial clearly show a charge today and their renewal terms. Plan changes update these terms. (Placement simplified September 30.)
- Cancellation instructions expand in the existing footer. They explain Settings → your name → Subscriptions → Konvo, including Apple's recommendation to cancel at least 24 hours before a trial ends. [Apple guidance](https://support.apple.com/en-us/118428).
- Pending approvals and checkout errors now have visible, localized status messages. Canceling Apple's sheet quietly returns to the plans. Purchases are never automatically retried.
- Both plan cards stay in the checkout footer with the purchase button. On smaller screens the decorative header gives way to the timeline and controls.
- Added `checkout_copy_version: clarity_v1` to rendered original-paywall impressions and correlated checkout events. This identifies the new copy after release; it is not a randomized test or proof of improvement. Native metadata also now retains the existing `expired_inbox_v1` paywall identifier.
- New strings support English, French, Traditional Chinese, and Korean.

## Read-only production checkout audit

The window is September 27 00:00 UTC through September 29 22:00 UTC, build 138, excluding marked test builds and onboarding previews. This is a debugging aggregate over attempts, not a customer conversion funnel. Additional unmarked test traffic is possible.

| Check | Attempts |
| --- | ---: |
| Purchase start with exactly one matching native receive and store request | 196 / 196 |
| Native result and corresponding JavaScript result | 191 |
| Duplicate captured stages | 0 |
| Displayed versus selected price/currency mismatch | 0 |
| Accepted purchase/trial | 49 |
| Canceled | 124 |
| Pending Apple approval | 15 |
| Error | 3 |
| No recorded result at the cutoff | 5 |

The five unresolved requests were 87–475 minutes old. Neither a native result nor a JavaScript result was present at the cutoff. These cannot be classified as cancellations or purchase failures from this evidence. A store request proves RevenueCat was called, not that Apple's sheet was visible. The result totals are attempt counts, so they differ from the earlier user-level funnel.

Existing checkout telemetry preserves event identity and the original timestamp across persistent outbox retries. [PostHog timestamp semantics](https://posthog.com/docs/data/timestamps). No historical events were modified or synthetic production events sent.

## Verification

- `node wrapper/test/test_login_readiness.js`: full injected script with deterministic timers and fixture forms; pause/return, overlay release, recovery states, new-password autofill, Show password distinction, opt-in help, explicit reset routing, no credential capture.
- `node wrapper/test/test_login_navigation.js`: compiled native WebKit diagnostic callbacks, preserving existing delegates and distinguishing cancellation from navigation errors.
- `node wrapper/test/test_checkout.js`: DOM taps through the bridge; displayed amounts/trial eligibility, selected-plan changes, correlated attempt IDs, duplicate tap protection, pending/error messages, cancellation, retry, success.
- `node wrapper/test/test_checkout_native.js`: exact native purchase branch and telemetry outbox compiled against offline fixtures; native outcomes, metadata, persistence, retry identity, deduplication, and concurrent request protection.
- `node wrapper/test/test_checkout_visual.cjs`: isolated Chrome, fabricated account data, blocked network; three phone viewport sizes in light/dark, the actual first-time trial sequence, visible plans/CTA/legal links, expanded cancellation help, French no-trial copy, sign-in help interaction. Focus emulation matches an active browser view.
- `node wrapper/test/test_expired_paywall.js`, `node wrapper/test/test_onboarding_theme.js`, and `node wrapper/test/test_cage.js` passed, covering compatibility with the earlier local changes. The broader wrapper run finished with `ALL CAGE TESTS PASS`.

All verification commands above passed. The login regressions also cover the sanitized saved-account “Continue as…” action, without reading credential values.

A live Instagram password reset and Apple sandbox purchase on a physical iPhone were not performed. A new app build and release are required for users to receive these changes; conversion impact must be measured after release and the full trial window.
