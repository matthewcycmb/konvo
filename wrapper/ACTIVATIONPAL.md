# ActivationPal — Konvo

App slug: `konvodmsonly`. The public ingest key is configured in `KonvoStore.swift`.
No secret or webhook signing key belongs in the app.

## Integration

`src-tauri/gen/apple/Sources/instamessages-wrapper/ActivationPal.swift` is the
unmodified official, dependency-free Swift SDK downloaded September 15, 2026:
<https://activationpal.com/sdk/ActivationPal.swift>.
Both new Swift files are in the app target's checked-in Xcode project. The
existing `Sources` entry in `project.yml` also includes them after regeneration.

At `didFinishLaunching`, Konvo configures RevenueCat first, then ActivationPal
with `Purchases.shared.appUserID`. The native analytics bridge refreshes this
identity before forwarding events. Network delivery happens natively, outside
Instagram's CSP. PostHog remains connected.

The SDK owns `first_open`, `app_open`, Apple Search Ads attribution, batching,
disk persistence, and `debug` / `testflight` / `release` environment tagging.
An existing user updating into this SDK can generate `first_open`; it is not an
exact App Store download count. The SDK also supplies an approximate install date.

## Event semantics

| ActivationPal event | Source |
| --- | --- |
| `onboarding_step` | Visible onboarding screens, indexed from zero in flow order; also connected/reveal/perks/trial/offer/reminder screens |
| `onboarding_completed` | First existing Konvo completion signal per install, persisted natively; this means access unlocked, before optional notification/invite screens |
| `paywall_shown` | Actual web price-page rendering or native presentation completion; placement distinguishes onboarding, lapsed, RevenueCat, Superwall |
| `paywall_plan_selected` | Explicit web plan change, or purchase CTA with a resolved native product; yearly is normalized to `yearly` |
| `paywall_purchased` | Successful native RevenueCat purchase with active Pro access; includes starting a free trial, not necessarily a charge |
| `paywall_dismissed` | Visible paywall exits without a purchase, including restored/gift/beta access; cancelling Apple's purchase sheet while the paywall stays visible is not dismissal |

Native RevenueCat/Superwall paywalls report the committed plan at purchase start;
their intermediate plan-card browsing is not exposed through these callbacks.
Restores, pending purchases, errors, and duplicate JS purchase-result signals
never emit `paywall_purchased`. Revenue and trial billing outcomes come from the
server webhook, not this client event.

Ten product events are allowlisted: `login_started`, `login_succeeded`,
`inbox_ready`, `thread_opened`, `notify_answered`, `cage_enabled`, `pass_used`,
`invite_sent`, `invite_claimed`, and `feedback_opened`.
Only notification booleans, granted pass minutes, and invite claim method are
forwarded as properties. Messages, handles, Instagram IDs, free text, URLs,
and raw errors are excluded. `cage_enabled` requires native confirmation.

## Local checks

```sh
cd wrapper
npm test
xcrun swiftc -module-cache-path /tmp/konvo-ap-module-cache \
  src-tauri/gen/apple/Sources/instamessages-wrapper/KonvoActivationAnalytics.swift \
  test/test_activationpal.swift -o /tmp/konvo-ap-tests
/tmp/konvo-ap-tests
```

The Swift semantic test injects an offline event sink; it sends no analytics.
For device delivery, run a DEBUG build and look for
`[ActivationPal] flushed N event(s)`, then verify the same device's `env=debug`
events in ActivationPal's live feed or `get_events` API. A flush confirms ingest
acceptance; it does not by itself verify the dashboard or RevenueCat webhook.

### Verification performed September 15, 2026

- `npm test`: bridge, cage, and onboarding suites passed on the final JS changes.
- Offline Swift analytics tests passed. All app Swift sources type-checked for
  iOS 15 against the cached RevenueCat/Superwall/UserJot modules.
- An isolated DEBUG simulator app using the unmodified SDK sent `first_open`,
  `app_open`, and `integration_smoke_test`. The SDK logged successful flushes of
  2 and 1 events (HTTP 200); the persisted queue was empty afterward.
  Test user: `activationpal-sdk-smoke-test`; device:
  `DBB63EE0-3789-4E50-9A3A-BA88295C5640`. Filter the feed to `env=debug` to find it.
  This checks SDK ingest, not Konvo's entire running purchase flow.
- The full Konvo simulator archive failed compiling RevenueCatUI when the Mac
  ran out of disk space. This attempt's debug build output was removed; the
  existing release archive was preserved. No app was uploaded or released.
- Dashboard receipt and the RevenueCat webhook are not yet verified: account
  access, the app-specific webhook URL, and signing-secret setup are still needed.

## Account setup still required

Follow <https://activationpal.com/docs/revenuecat.md> in the authenticated
RevenueCat and ActivationPal dashboards:

1. Copy **this app's** webhook URL from ActivationPal settings.
2. Add a RevenueCat webhook for Konvo's iOS store app, Production, all event types.
3. Enable HMAC signing. Save its signing secret in ActivationPal settings only.
4. Confirm a real delivery changes ActivationPal from **secret saved** to
   **verified**, and check `rc_*` events joined to the SDK RevenueCat user ID.

The public `ap_pk_` key cannot configure or authenticate this webhook and cannot
read the dashboard. Verification through the agent API needs an account-scoped
`ap_sk_` key or its MCP connection: <https://activationpal.com/docs/agent-api.md>.
Do not create real purchases just to verify the webhook; the next legitimate
production lifecycle event can verify it.

RevenueCat webhook setup and dashboard receipt must be verified separately before
claiming the full integration is live. Existing App Store installs need an app
update containing this SDK.
