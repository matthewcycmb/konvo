# Shipaton 2026 Next Gen — Konvo v1.9.0

## Submission identity

| Item | Value |
| --- | --- |
| iPhone version | 1.9.0 |
| Build | 130 |
| Bundle ID | `com.matthewchan.konvo` |
| App-source commit | `dc3871a4942f46afa303bcba073ac15c21716ea5` |
| Pinned judging snapshot | [`shipaton-2026-v1.9.0`](https://github.com/matthewcycmb/konvo/tree/shipaton-2026-v1.9.0) |
| License | [MIT](../LICENSE) |

Matthew submitted v1.9.0 for App Store review on September 25, 2026. This records submission status as reported by the developer; it is not a claim that Apple has approved the update. The public store listing showed v1.8.0 when this guide was prepared. The tagged snapshot preserves the v1.9.0 source for review even if development continues.

The repository's older `main` application tree identifies itself as v1.6.0 and also serves the existing automatic desktop-release workflows. The iPhone submission is the tagged snapshot above. The root repository link on Devpost remains a valid entry point because its README directs judges here.

## What changed since the older source and demo

- Messages, Notifications, Profile, and the Instagram lock/pass control share a persistent bottom bar. It hides inside conversations and fullscreen media.
- Conversation transitions retain the outgoing inbox while the destination renders. Profile navigation uses account-scoped identity, and authenticated pages restore the phone's appearance.
- The original onboarding is selected for all users. Cached experiment assignments and preview flags cannot enable the retired personalized flow.
- RevenueCat purchases explicitly use the `konvo_ab_control_v1` offering, with `konvo.pro.yearly`, `konvo.pro.monthly`, and the `Pro` entitlement. Prices and introductory-offer eligibility come from the store through RevenueCat.
- Notification permission remains in onboarding. The sender referral screen shown in older screenshots has been removed; existing invite-claim code remains available in the repository.
- Screen Time selection is restricted to one explicitly chosen app, with shared pass policy and protection against stale monitoring callbacks.
- ActivationPal receives allowlisted onboarding/paywall/product events through a dedicated adapter.

Earlier demo/gallery captures may show the older floating controls or referral screen. They illustrate earlier app iterations, not an assertion that those exact screens remain in build 130. Feed removal, Instagram messaging, and RevenueCat-backed access remain the core of the submitted app.

## Where to review the implementation

| Concern | Source |
| --- | --- |
| Feed redirects, inbox controls and onboarding/paywall UI | [`cage.js`](../wrapper/src-tauri/src/cage.js) |
| Web-view host and bundled script composition | [`lib.rs`](../wrapper/src-tauri/src/lib.rs) |
| Purchases, restoring access, trial eligibility, navigation and notifications | [`KonvoStore.swift`](../wrapper/src-tauri/gen/apple/Sources/instamessages-wrapper/KonvoStore.swift) |
| Original pre-login onboarding | [`wrapper/dist/index.html`](../wrapper/dist/index.html) |
| Version/build metadata | [`tauri.conf.json`](../wrapper/src-tauri/tauri.conf.json) and [`project.yml`](../wrapper/src-tauri/gen/apple/project.yml) |
| Screen Time pass policy | [`PassPolicy.swift`](../wrapper/src-tauri/gen/apple/Shared/PassPolicy.swift) |
| Analytics event allowlist | [`KonvoActivationAnalytics.swift`](../wrapper/src-tauri/gen/apple/Sources/instamessages-wrapper/KonvoActivationAnalytics.swift) |

## Get the matching source

```sh
git clone --branch shipaton-2026-v1.9.0 --single-branch https://github.com/matthewcycmb/konvo.git
cd konvo
shasum -a 256 -c docs/SHIPATON_2026_V1_9_0.sha256
npm ci
npm --prefix wrapper ci
```

A tag checkout is intentionally detached from moving development branches. The checksums cover the principal application source, metadata and dependency files. Follow the [README's build instructions](../README.md#build-and-run) for local development and iPhone signing. A contributor must supply their own Apple team/capabilities and RevenueCat configuration; signing credentials and private server keys are not part of the source submission.

## Verification recorded September 25, 2026

- All checked application source files in the snapshot match the committed v1.9.0 development tree.
- The locally retained distribution export identifies the app and all three extensions as v1.9.0 (130), with bundle `com.matthewchan.konvo` for the app.
- `cage.js` and `onboarding-views.js` occur byte-for-byte in the distribution executable. The retired `onboarding-experiment.js` differs by one trailing space outside a string literal; no behavior-changing difference was found in that script comparison.
- `KonvoStore.swift`, `cage.js`, and the onboarding HTML match the source hashes recorded for tested build 129, which was packaged as v1.9.0 (130) with release metadata changes.
- The bridge contract, release-stability suite, original-onboarding/native-offering policy suite, and all seven contributor-setup tests pass in the isolated judging checkout.

This documentation update does not change the app's implementation, rebuild a signed binary, or independently establish Apple's review decision. Live Instagram responses, actual store purchases, and iOS enforcement remain device/service behaviors beyond the isolated regression fixtures.

The historical `scripts/verify-ipa.py` checks older UI expectations and is not the build-130 acceptance procedure. The checks above, source checksums, and targeted regression suites identify what was actually verified for this snapshot.
