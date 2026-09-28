# Checkout tracking and recovery verification — September 27, 2026

The original onboarding, repeated trial explanation/reminder pages, prices, and trial policy are preserved. This change adds checkout observability and corrects password-recovery diagnostics/handling. It requires a new iOS binary; build 130 already on the App Store cannot acquire these changes remotely.

## Checkout event contract

| Event | Meaning |
|---|---|
| `purchase_started` | Original paywall buy tap accepted by the JS handler, before calling the native bridge. |
| `checkout_received` | Native purchase handler received the request, before looking up the offering. |
| `checkout_store_requested` | Valid package selected and RevenueCat's purchase method is about to be called. This is NOT proof Apple's sheet became visible. |
| `checkout_result` | Native result: purchased, cancelled, pending, not_entitled, or error. Does not rely on delivery of a JS callback. |
| `purchase_result` | Existing JS callback outcome, retained for historical dashboards and enriched with the same attempt ID. |

Use `checkout_attempt_id` to join the steps; do not add native and JS results together as separate conversions. Count distinct attempts or people, and continue using RevenueCat subscription events for confirmed trial starts and paid revenue. A purchased/entitled outcome does not prove a new paid transaction.

The tap/result snapshot includes product ID, plan, offering, screen, paywall, placement, localized displayed price, numeric amount when available, currency, eligible trial days, and trial eligibility. Native events retain displayed metadata separately from the actual selected RevenueCat package/price. No extra eligibility network request delays checkout. Early native errors include a fixed failure stage; SDK errors include only their numeric code in analytics, never raw error text.

The original paywall blocks duplicate taps and plan changes while a purchase is outstanding. A later retry gets a new attempt ID. Native code also prevents overlapping purchase requests. There is no purchase timeout that could start a second charge while Apple's first purchase remains pending.

The five correlated checkout events use a persistent, serial native outbox. Transient network failures, HTTP 408/429, and server errors retry with backoff; original event UUID, timestamp, identity, build, and payload remain unchanged. Relaunch resumes persisted events. Permanent 4xx responses are discarded so an invalid event does not block later events; storage is bounded to 500 events. Uninstalling the app, prolonged permanent rejection, or force termination before persistence can still lose telemetry. Analytics retry never retries a purchase.

PostHog's [capture API](https://posthog.com/docs/api/capture#single-event) accepts an original timestamp; its [event deduplication guidance](https://posthog.com/docs/data/events#event-deduplication) explains retaining event identity during retransmission.

## Password-reset findings and changes

Live inspection of Instagram's `/accounts/password/reset/` page in Chrome found a visible `type="text"` input with no `name` or `autocomplete` attribute. No identifier was entered and no reset was submitted. The previous readiness selector did not recognize this field. A regression fixture using the shipped cage reproduced the missed readiness signal before the fix.

- Recovery-specific selectors now recognize text/email/phone/password/code inputs, including unnamed text fields. Visibility and hit testing still gate readiness.
- A recovery page with no input is recorded as `login_reset_state: no_input`, not `login_loading_slow`. It could be instructions/confirmation or an unrecognized/loading state; this is deliberately not a reset-success event. Ready recovery controls produce `login_reset_state: form_ready`.
- Visible but obstructed recovery inputs can still report `login_loading_slow`; a usable form is not a loading problem.
- New-password forms retain `autocomplete="new-password"` instead of being incorrectly rewritten as current-password fields.
- Returning from another app while a recovery input is still visible no longer adds the floating "Reset done?" prompt over that active form. Field-free recovery pages retain the manual return-to-login option. The prompt is removed when SPA navigation leaves recovery.
- Passive diagnostics do not reload, clear, submit, focus, or abandon the form. Stage transitions reset stage timing; background time is excluded.

## Historical comparison requested by Matthew

The repeated trial chain appears in commit `4823a36` on September 6 (build 104). September 2 predates that implementation.

Exploratory first-hour comparison using first tracked welcomes since August 1, the existing dashboard exclusions, and a fixed September 27 21:55 PDT cutoff:

| Cohort | Starters | Connected | Paywall requested | Native acceptance proxy | RC trial starts |
|---|---:|---:|---:|---:|---:|
| Builds 100–101, September 1–5 | 129 | 84 | 71 | 15 | 10 |
| Build 130, September 27, at least one hour observed | 228 | 159 | 144 | 29 | 26 |

Recorded trials/starters are 7.8% versus 11.4%; native acceptance/starters are 11.6% versus 12.7%. This is compatible with improvement, not proof the trial screens caused it. Traffic mix, login flow, build, and instrumentation differ. The earlier native proxy is `onboarding_completed` at `s13_paywall` (can include restoration); current acceptance also uses `purchase_result`. Older paywall events count requests rather than confirmed rendered prices. The original test/reviewer filters cannot guarantee removal of unmarked historical tests. No controlled experiment isolated these screens. Keep them while collecting the new checkout evidence.

## Verification

- `node wrapper/test/test_checkout.js`: shipped original paywall, real DOM taps, recorded start before native bridge, exact localized metadata, annual eligibility, monthly no-trial, unique retry IDs, duplicate tap/callback protection, cancellation/pending/error/success.
- `node wrapper/test/test_checkout_native.js`: shipped native recorder/outbox and exact purchase-switch branch compiled with offline sinks; catalog failures, SDK outcomes, correlation, actual package metadata, concurrent request guard, exclusion of private fields, persistence, identical retry payloads, rate limit/server-error recovery, relaunch, and poison-event isolation. Sends no real purchases or PostHog events.
- `node wrapper/test/test_login_readiness.js`: shipped cage, unnamed reset field, blocked/hidden controls, no-input state, new-password autofill, 30-second login lookup and two-minute reset lookup, input preservation, no automatic navigation, background timing, manual reset prompt lifecycle.
- `node wrapper/test/test_login_navigation.js`: preservation of existing WebKit delegates, navigation error versus cancellation, and diagnostic scoping.
- Full `npm test` in `wrapper` passed, including original onboarding, trial chain, paywalls, chat, bridge, and theme regressions. The later reset-prompt adjustment also passed the focused login test.
- The complete native Swift sources passed an arm64 iOS 15 typecheck against the installed iOS 26.5 SDK and the project's pinned RevenueCat/Superwall dependencies. Existing deprecation/concurrency warnings remain.
- An installable app was not packaged: direct Xcode invocation reached the Rust phase and required Tauri's CLI helper address file. The separate iOS typecheck verified the full changed Swift bridge after that packaging limitation. No build/version was incremented, uploaded, or installed.

These are controlled regressions plus live public-page inspection. A full password reset, physical-iPhone app switch, and real Apple sandbox purchase were not performed in this task. Do not claim production event delivery is verified until an updated build emits these events and PostHog ingestion is checked.
