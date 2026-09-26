# Konvo onboarding / annual no-trial experiment

## Current release: 1.9.0 (130)

The original onboarding is now the sole production flow. The personalized A/B
experiment is retired, including for installs with a cached test assignment.
The prototypes and experiment implementation remain here as development history.
See `original-only-2026-09-25/README.md` and
`chat-polish-2026-09-25/README.md` for the current behavior and verification.

The records below describe earlier releases. Device packages, release receipts,
build logs, and raw analytics exports mentioned in those records are local
artifacts and are excluded from Git.

## Historical experiment records

Status: production **1.7.0 (116)** is selected and **WAITING_FOR_REVIEW**, verified after the owner submitted it on September 20, 2026. The PostHog experiment was activated at **2026-09-21 04:13:48 UTC** (September 20, 9:13 p.m. PDT) at the owner's request: 50% original / 50% personalized among eligible new supported installs. Both page-by-page dashboards and paid-conversion comparisons are saved and query-verified, with zero real exposures at setup. Public traffic depends on Apple approval and release; activating PostHog does not release the app. See `posthog-launch-2026-09-20.json` for configuration, insight IDs, QA exclusions and limits.

## Internal preview 1.7.0 (109)

The `onboarding-preview` Cargo feature forces the new flow for internal TestFlight/device QA, including an already-onboarded or entitled install. It preserves Instagram cookies and the original onboarding/cache markers, does not overwrite the production assignment, and does not emit experiment exposure. Preview events carry `is_test_build=true` and `onboarding_preview=true`. Purchases/restores still use RevenueCat and StoreKit; there is no free-access bypass. Relaunching the process permits another preview walkthrough.

Build with `npm run tauri -- ios build --target aarch64 --features onboarding-preview --archive-only --ci`. Export the archive with `ExportOptions-internal-preview.plist` for internal TestFlight only, or the existing development export options for a connected device. This dedicated preview must **not** be promoted to an App Store release. The future production build must omit `--features onboarding-preview`; both OG and new experience remain bundled for the real experiment.

September 19 configuration verification through the Apple API and RevenueCat public SDK endpoint: both offering/package mappings match the table below, and `default` remains current. Apple product `konvo.pro.yearly.notrial` (6813981761) is `READY_TO_SUBMIT`, one year, US$24.99, with zero introductory offers. It is currently group level 3 while existing Pro annual/monthly are level 1; align equivalent access levels before public release. Entitlement attachment and sandbox transaction delivery still need purchase verification.

- Experiment: https://us.posthog.com/project/569146/experiments/465606
- Flag: https://us.posthog.com/project/569146/feature_flags/897359
- Key: `konvo-onboarding-annual-v1`
- Default split: control / test, evenly assigned among eligible new iOS installs.
- Local interactive production view: `preview.html` (mock prices/purchases; no analytics).

## What each person sees

Control preserves the existing bundled quiz and annual-trial/monthly paywall. From build 116, its post-purchase sequence is notifications → confirmation → inbox, with the sender referral page removed. Test uses the same quiz with the reviewed light appearance and reversed screen-time choices, then connected → setup → actual inbox reveal → personalized before/after comparison → optional signature → percentage transition (brief 85% hold) → annual-only no-trial inbox paywall → notification choice → success. Neither flow shows the sender referral page.

This compares **whole experiences**. It cannot establish whether an uplift came specifically from onboarding, design, annual-only choice, or removal of the trial.

The native layer stores one assignment in UserDefaults and uses RevenueCat's app user ID for PostHog identity. It is resolved before the first onboarding impression. Existing onboarded installs are not newly enrolled. Missing/inactive flag, timeout, entitled customer, or invalid offerings keeps the original experience outside the experiment. Both offerings must validate before either arm enrolls. Pausing the flag stops new enrollment; already assigned installs retain their experience. Do not change split/IDs mid-test.

## Required App Store Connect / RevenueCat setup

Read-only verification on September 20 confirmed the RevenueCat test offering maps `$rc_annual` to `konvo.pro.yearly.notrial`. Apple reports ONE_YEAR, READY_TO_SUBMIT, US $24.99 and 175 available territories. Approval, on-device StoreKit delivery, and the Pro entitlement attachment are separate checks. Required configuration:

1. In Konvo's existing subscription group, create a separate auto-renewable **one-year** product, e.g. `konvo.pro.yearly.notrial`. Set the intended US base price to **$24.99**, review localized storefront prices, and configure **no introductory offer**. Complete localization/review information and Apple's approval requirements. Keep the existing trial product intact.
2. Import the new product into RevenueCat and attach it to the existing **`Pro` entitlement**.
3. Create offering **`konvo_ab_control_v1`**, with the existing `konvo.pro.yearly` and `konvo.pro.monthly` packages. Preserve their live pricing and trial settings.
4. Create offering **`konvo_ab_annual_no_trial_v1`**, whose **Annual / `$rc_annual`** package contains the new no-intro annual product. The code reads the actual package product ID; the suggested new product ID is not hardcoded.
5. Do not change the current/default offering. Explicit experiment offering selection leaves nonparticipants on the original current offering.
6. Verify each locale's Apple purchase sheet matches the displayed price. The weekly equivalent is the price headline (computed from the live annual price / 52), with the full annual charge immediately below and in the charge-today disclosure. Neither a missing plan nor a trial-bearing product is purchasable through the new no-trial view.

Purchases use the selected RevenueCat package, preserving offering attribution. The native SDK reports custom impressions with the offering object, and stores `konvo_experiment` and `konvo_experiment_variant` subscriber attributes for real enrolled customers. Existing RevenueCat → PostHog integration already supplies subscription lifecycle events; no duplicate webhook was added.

## Personalization

- The app stores the two quiz selections natively before Instagram login, so the answers survive origin changes and relaunches.
- Instagram ranges use the quiz's existing representative values: `<1h=45m`, `1–2h=90m`, `2–3h=150m`, `3–4h=210m`, `>4h=300m`. These are estimates, not exact measured Screen Time.
- The after estimate uses the messaging selection. Unknown answers show a qualitative comparison instead of invented numbers. A messaging estimate larger than total Instagram time produces no claimed reduction.
- The graph, summary values, and percentage use the same calculation. Bars repeat an estimated average; they do not invent measured daily history. The assumption is disclosed.
- Username comes from the authenticated Instagram account lookup and is accepted only when its cached account ID matches the current session. A neutral heading appears while unavailable, and updates when the lookup succeeds. No `@your_username` placeholder ships to users.
- The inbox visual copies current local inbox presentation into a noninteractive in-memory view. Instagram DOM differences may require adaptation; verify on a real account. Missing inbox markup shows a neutral message, not fictional chats.
- Usernames, message content and signature strokes are not sent to PostHog or RevenueCat. Signatures are optional and never saved. On September 20 the owner confirmed the 1,000+ member claim and review stars and requested both restored. Build 111 includes them. Avatar artwork remains illustrative, with alt text identifying it as such.

## Analytics and interpretation

Every native event for an enrolled user carries `experiment_key`, `experiment_variant`, `onboarding_version`, `$feature/konvo-onboarding-annual-v1`, build, platform, and test-build status. Keep existing `variant` separate: it means free/beta/default build mode, not A/B assignment.

PostHog's resolved default exposure event for this experiment is **`$experiment_exposure`**, emitted at the actual onboarding reveal. DEBUG builds do not emit experiment exposure. Do not count local preview events as real customers.

The draft includes:

- Primary: RevenueCat-reported USD revenue per exposed user within 35 days.
- Secondary: the same at 60 days; paywall reach and Instagram login within 7 days; DM opening within 35 days.
- The revenue source includes App Store events with a `revenue` value, so annual trial conversions, direct monthly/annual purchases, future renewals, and any negative refund adjustments are included. App `purchase_result` events are **not** counted as confirmed payments.
- `paywall_viewed` for experiment participants means actual local prices are rendered and the paywall entrance has finished, not a loading screen or attempted presentation. RC custom impressions and `paywall_presented` accompany it.

**Revenue basis is unverified.** RevenueCat's integration can report revenue with different commission/tax handling. Inspect its PostHog integration configuration and reconcile transactions/refunds against RevenueCat and Apple before calling this net proceeds. Do not automatically subtract another 15% or 30%. Refund coverage must also be verified.

**Do not compare unfinished cohorts.** Metric windows cap follow-up but do not themselves ensure every person has reached that age. The draft currently reports `only_count_matured_users=false`; enable the mature-user setting in PostHog before interpreting day-35/day-60 results, or use `mature-cohorts.hogql.sql` after the first real exposure arrives. That SQL is a prepared report template, not a live result and has not yet been run against experiment data. It deduplicates RC event IDs and retains nonpayers in the denominator. Report per-exposed-user revenue first because onboarding differs; per-paywall-viewer revenue is secondary and can hide upstream drop-off.

## Verification and release checklist

Automated checks cover original onboarding/purchase paths, new selected-range and unknown-answer behavior, source content escaping/privacy, localized price rendering, trial-product rejection, repeated purchase taps, and the full new post-login flow through success. Headless Chrome checks 390×844, 375×667 and 430×932 layouts, including a long username.

Verification on September 19, 2026: original and new JavaScript suites passed, Swift type-checking passed with and without DEBUG, and the complete unsigned ARM64 iOS simulator build succeeded using `npm run tauri -- ios build --debug --target aarch64-sim --no-sign --ci --verbose` (Cargo must be on PATH). Bundle: `src-tauri/gen/apple/build/arm64-sim/Konvo.app`. Existing compiler warnings remain. This confirms compilation, not a signed device build or end-to-end store/payment delivery.

Before launch:

1. Finish the two RevenueCat offerings and Apple product setup above.
2. Produce a successfully compiled, signed build. Production A/B build 1.7.0 (113) was uploaded and processed as VALID; updated build 114 is uploaded, VALID and selected in the 1.7.0 App Store draft. Internal preview 109 was previously uploaded, and device preview build 115 is now installed on Matty16E.
3. On a fresh simulator/device debug build, Xcode launch argument `-KonvoOnboardingVariant test` forces the new flow; `control` forces OG. It affects DEBUG builds only. Use a dedicated test install, and clear its app data before checking genuine enrollment. Store prices must still load; there is no simulated-money purchase bypass.
4. Test real Instagram login, username availability, a real inbox, each quiz option, back/skip/relaunch, and a sandbox purchase, restore, cancellation, pending approval and expired subscription. Verify **no trial** in Apple's test-arm sheet and preserved trial eligibility in control.
5. Verify RevenueCat events join PostHog to the same app user identity; verify offering IDs and check refunds/revenue basis. No live experiment events have been verified yet because the new build and offerings are not live.
6. Exclude test customers, select mature cohorts, then launch the draft from PostHog when the approved build is available. Starting the experiment does not install the code on existing app versions.

Build the embedded view after editing preview source HTML with `node experiments/build-onboarding.cjs` from `wrapper/`. Keep the generated `src-tauri/src/onboarding-views.js` with the code; Rust embeds it directly, so the app has no runtime dependency on the preview directory.

## Build 110 loading fixes (September 20)

- The annual paywall updates in place when native catalog data arrives late. Retry is debounced and automatic retries are bounded; an unavailable catalog never gets invented prices or a fallback trial product.
- Catalog errors distinguish a missing offering, missing annual package, invalid trial/duration configuration, and SDK connection failure. `store_products_ready` / `store_products_failed` carry product/configuration metadata or enumerated errors, never receipts or Instagram content. Preview warm-up requests are labeled test events.
- Inbox capture now waits for content and accepts Instagram div roots as well as `main`. Only visible presentation is copied, with scripts and interaction removed. No captured message content goes into analytics/storage. Missing Instagram content remains a loading/retry state, not a fictional inbox.
- Returning to the live inbox reveal clears the inline white background that previously hid it.
- Test onboarding uses white backgrounds and native safe areas. The underlying Instagram webview uses dark appearance; the in-memory phone preview normalizes neutral surfaces and dark text without inverting photos. OG onboarding remains selectable.
- Automated regression: `test_onboarding_loading.js` covers late catalog delivery and a late div-root inbox, and the integration test covers returning to the inbox reveal. Physical-device inbox verification requires the user's live session; local fixtures are not evidence of real-account rendering.

Build 110 installed and launched on Matty16E. Native `store_products_ready` confirmed the real no-trial annual package in CAD at 2026-09-20 20:39:51 UTC. Full automated tests, entitled-install preview, signature, exact embedded sources, and phone layout checks passed. No TestFlight upload or purchase was made for build 110.

## Build 111 mockup alignment (September 20)

- The preview hero pins native light appearance before its first frame; test assignment also explicitly requests light before revealing the hero.
- Only the calculating / years-lost / comparison / time-saved stretch uses dark styling in the quiz. The post-login real inbox reveal has a separate dark appearance (including its bottom sheet and native safe areas); leaving it restores white onboarding around the dark embedded inbox.
- Personalized username styling stays blue on first render and when the username arrives asynchronously. The real chosen ranges still drive both chart columns and summary figures; a compact disclosure opens the estimation assumptions.
- Restored verified review stars and the 1,000+ member sections at the owner's explicit confirmation. Restored the animated paywall member count.
- Price card uses the live weekly equivalent as the headline and the live full annual price immediately underneath; the charge-today disclosure remains. Restored the cancel line, shield, reassurance copy, CTA arrow, and single-row legal links.
- Regression `test_onboarding_theme.js` walks the actual quiz handlers through white → dark calculation/years/comparison/saved → white. Existing pricing/loading and purchase-flow tests cover the localized values and no-trial guard.

Build111 archive, signature, exact embedded source and test suites verified. After the iPhone16e reconnected, build111 installed successfully and launched at 17:30 PDT on September20. Existing app data was preserved. The timing-sensitive quiz suite passed on rerun after a system-clock discontinuity.

## Build 112 paywall reveal and inbox presentation (September 20)

- Loading retains the 85% pause, holds the completed checkmark for 650 ms, then fades out. The paywall reveals its heading, member count, inbox, annual card, reassurance and purchase area in stages over approximately 1.85 seconds. Purchase controls and impressions wait for the reveal to finish; back navigation cancels it. Reduce Motion skips the staged animation and enables valid prices immediately.
- Removed unused empty-error space and reduced bottom padding, lowering the pricing area by 25 CSS pixels at the iPhone 16e's 390 × 750 usable viewport. More of the inbox remains visible above a shorter white fade, with legal links still fully on screen.
- Added a dark layer behind the transparent iPhone frame to cover the gap between the image's inside edge and the inbox surface.
- Preserved computed transforms and stacking in the noninteractive inbox copy. A local browser reproduction previously placed three transformed Notes at the same x coordinate; the fixed copy keeps their separate positions. Inbox presentation stays local and is never sent to analytics.
- Focused module, late-loading and flow integration suites passed. `npm run test:paywall:visual` runs isolated Chrome with a fabricated inbox and no external requests. It covers transformed Notes, 390 × 750 / 375 × 623 / 430 × 838 layouts, the 85% pause, delayed purchase/impression availability, completion, back cancellation and Reduce Motion. This does not inspect a real Instagram session.

Build 112 (1.7.0) passed signed archive and exact embedded-source verification, then installed and launched on Matty16E at 17:56 PDT on September 20. Existing app data was preserved. No TestFlight upload or public experiment launch was performed. See `build112.json` for validation details.

## Build 114 shorter reveal and Continue cooldown (September 20)

- Replaced the staged 1.85-second paywall entrance with a 500 ms fade and 10 px upward movement. A valid purchase becomes available after 520 ms, when the reveal has completed. The loader keeps its 85% pause, with a shorter 250 ms completed checkmark and 180 ms fade out. Reduce Motion still bypasses the animation.
- Forward controls on comparison, signature and loading wait 600 ms after each screen arrives. Repeated taps cannot immediately skip the next screen. Back remains responsive, signature drawing remains usable, and detached controls cannot change a later stage. The timer is cancelled on navigation or teardown; screen readers receive the temporary disabled state.
- Module regression demonstrates that arrival taps, carried-over taps and stale controls are ignored. Integration checks pass for production enrollment and entitled-install preview. Isolated Chrome checks pass for the shorter reveal, forward cooldown, purchase/impression timing, reduced motion, transformed Notes and all three existing viewport sizes.
- Read-only App Store Connect verification confirmed `konvo.pro.yearly.notrial` costs US$24.99 in USA and CA$34.99 in CAN. The app continues to display StoreKit's localized price and calculated weekly equivalent; no storefront pricing was changed.

Build 114 passed the signed archive, App Store export and exact embedded-source checks. Apple accepted the upload without errors and processed it as VALID; it is selected for version 1.7.0, PREPARE_FOR_SUBMISSION, with MANUAL release. No App Review submission, external TestFlight distribution or public experiment launch was performed. A device-signed export from the same archive passed source verification and was installed and launched on Matty16E at 19:28 PDT on September 20, without an uninstall.

## Build 115 device onboarding preview (September 20)

Production build 114 was correctly installed but could select the original system-themed flow. For reviewing the latest new onboarding on the owner's phone, build 115 uses the existing `onboarding-preview` feature. It forces the new white welcome, preserves the intentionally dark inbox and calculation pages, and includes build 114's 500 ms reveal and 600 ms forward cooldown. No application behavior source changed between 114 and 115; the difference is the preview feature and build number. Preview events remain test-only, and the stored production assignment is preserved.

The production 114 archive is retained at `store114/Konvo.xcarchive`, and 114 remains selected in the App Store draft. Build 115 is device-only and must not be uploaded as an App Store release. Its signed archive, exact embedded source, preview override, theme sequence and entitled-install integration passed. CoreDevice confirms installation on Matty16E; launch was blocked by the locked phone and then a lost device connection. See `build115.json`.

## Return to original onboarding for purchase QA (September 20)

The owner requested the other onboarding/paywall and a reset of their specified sandbox tester. Konvo was absent when the phone reconnected. The previously verified device export of 114 was installed and launched; CoreDevice confirmed 1.7.0 (114). The original flow is the fallback while the public experiment is inactive. Preview 115 remains available as a separate device artifact.

Apple accepted the exact tester's purchase-history reset through the v2 sandbox API with HTTP 201. This API supports creating the reset request but does not expose a GET status for it; completed purchase-history propagation has not been independently verified. The owner was asked to sign out and back in to the Sandbox Apple Account on the phone to clear its cached history before purchasing again. No sandbox purchase was made, and no RevenueCat customer, public flag, offering, price, or App Store selection was changed.

## Build 116 removes the sender referral page (September 20)

Removed the original flow's "Send Konvo to 3 friends" screen, share/copy controls and navigation. A purchase still leads to the notifications choice, then "You're in" and the inbox. The notifications markup and allow/skip handlers are byte-for-byte unchanged. Previously shared links remain redeemable; authenticated username lookup for the new onboarding is preserved.

Both onboarding variants remain bundled without the forced-preview feature. This production build is authorized for the existing internal Friends and External Friends TestFlight groups. The owner will handle App Store review and any expedited-review request. See `build116.json` for actual upload/distribution status and `testflight116-whats-new.txt` for the beta testing notes.


## Live PostHog onboarding analytics (September 20)

- Original: https://us.posthog.com/project/569146/dashboard/2117717
- Personalized: https://us.posthog.com/project/569146/dashboard/2117718

Each dashboard contains the shared A/B conversion comparison, all tracked quiz pages, its exact post-login page sequence, the notification/final-confirmation action funnel, and a RevenueCat D35 paid-conversion comparison. Page funnels are ordered, seven-day unique-person funnels. Trial-only explainer screens and previously answered notification prompts are optional. The paid funnel attributes the arm at Welcome and follows the same person to an App Store initial paid purchase or trial conversion with revenue > 0 within 35 days; it does not require native experiment properties on RevenueCat events.

Both dashboards and experiment exposures exclude nine known prerelease identities (builds 109–116 observed before the recorded QA cutoff), explicit preview/debug traffic, and the existing project test filter. New unmarked TestFlight identities cannot be distinguished automatically by build 116 and need manual QA exclusion. No project-wide test filter was changed. The native flag request provides eligibility/schema but not build, so analytics apply the additional build >= 116 restriction; this is not a native build-specific flag condition.

The connected/setup loader has no separate page impression. Notification choice and the final success CTA have action events, but neither page has a standalone view event. Dashboards label these accurately instead of inferring impressions. Privacy/referral sender pages are absent from both funnels.

All eight saved insight queries and the experiment exposure/metric queries ran successfully with zero participants. End-to-end production attribution is still awaiting real users. RevenueCat revenue basis/refund coverage remains unverified; the existing D35/D60 metrics retain that warning and currently include immature users. Wait for mature cohorts before comparing revenue or declaring a winner. The experiment evaluates the complete onboarding/paywall experience.


## Build 117 weekly option (September 21)

At the owner’s request, the personalized paywall now offers the existing `konvo.pro.weeklyy` App Store product alongside annual. RevenueCat offering `konvo_ab_annual_no_trial_v1` was updated and verified with `$rc_weekly` and the unchanged `$rc_annual`; `default` and the original control offering are unchanged. Apple’s weekly product remains Ready to Submit, US$6.99 / CA$9.99, one week, no introductory offer, attached to Pro in RevenueCat. Its review screenshot still needs replacement with the actual weekly paywall before submission.

The native bridge validates annual/weekly package types, matching one-year/one-week durations, positive prices and absence of introductory offers at checkout. The paywall uses live localized values and compares savings only within the same currency; annual stays selected by default. Missing weekly metadata leaves annual available, and a selected weekly plan is never silently replaced with annual at checkout. Cancellation, pending and errors preserve the selected plan. The original notification and purchase completion flow remains in place.

The inbox phone is narrower while retaining its aspect ratio. The separate special-offer HTML now compares US$19.99/year with 52 × US$6.99 = US$363.48 and explicitly labels that comparison; it is not a former annual price. The special-offer checkout is still a prototype, not part of native build 117.

New build events use `onboarding_version=personalized_weekly_v2` and `paywall_id=inbox_annual_weekly_v2`, with the selected annual/weekly plan and exact product ID. Existing feature flag assignments are preserved. Before any public rollout, analyze this version separately from the old annual-only treatment; this device test does not launch a new public experiment. `build117.json` records verification and the actual sandbox status. Device preview uses `onboarding-preview` and emits test-only analytics; do not submit that preview archive to App Review.

## Build 118 reviewed paywalls (September 21)

The new onboarding now includes the reviewed annual/weekly layout: proportionally smaller live inbox preview, centered savings badge across the annual card’s top border, and full annual billing immediately below the weekly equivalent. Original onboarding remains bundled with its annual-trial/monthly plans; both flows retain the notification page and omit the sender referral page.

A confirmed StoreKit cancellation of a regular plan opens the dark special annual offer once per walkthrough, only when its live catalog entry is valid and cheaper than regular annual in the same currency. Pending purchases, errors and restores do not trigger it. Declining returns to the previously selected regular plan. Cancelling the offer sheet stays on the offer. Checkout and navigation are locked while a purchase is pending in StoreKit. Successful offer purchases use the existing Pro entitlement and completion flow. The offer has the larger annual card, Claim Your Special Offer button and I’d rather pay full price action, without the removed renewal paragraph; its annual billing amount remains displayed.

Read-only catalog checks confirmed `konvo_special_offer_v1` / `$rc_annual` / `konvo.pro.yearly.special`, with Pro entitlement, US$19.99 and CA$24.99 per year, no introductory offer, and Apple status Ready to Submit. Weekly remains Ready to Submit. Regular annual and weekly offerings were not changed. Native code loads StoreKit-localized prices; weekly comparison totals are calculated with the product’s currency formatter. Native checkout independently validates the special offering, product, annual duration, no trial, lower price, and prior cancellation eligibility. Missing special-offer metadata leaves regular checkout available.

Events use `personalized_weekly_offer_v3`, regular paywall `inbox_annual_weekly_v3`, and offer paywall `inbox_special_annual_v3`. Purchase events carry the actual offering and product; offer views and dismissals are separate. Existing assignments and live experiment settings remain unchanged. The requested device build uses `onboarding-preview`, preserving cookies and stored control assignment while forcing the latest new flow for QA. Preview events remain excluded from production exposure.

Build 118 compiled and exported successfully. All four bundles, exact bundled JavaScript, forced-preview marker and deep strict signature verification passed. Original regression suites, annual/weekly/offer integration tests and browser layout checks passed. The device installation attempt failed with CoreDevice/NWError 60; the phone is paired but unreachable, with no iPhone detected over USB. The verified IPA is `device118/Konvo.ipa`. Installation and real sandbox confirmation remain pending; no App Store/TestFlight upload was performed.

## Version 1.8.0, build 119 — upload only

At the owner’s request, the verified build 118 implementation was rebuilt as production 1.8.0 (119), without `onboarding-preview`, `konvo-beta` or `konvo-free`. Both onboarding flows remain included, and the existing experiment assignment behavior is unchanged. App and all three extension versions, exact bundled JavaScript, distribution entitlements and deep strict code signing were verified.

Uploaded successfully to App Store Connect with delivery UUID `ec59af37-61f8-4e6f-9939-6070ce2cb1cf`. Apple reported no upload errors. A later read-only check confirmed Apple processing is VALID for version 1.8.0 (119). No App Review or beta review submission, release selection, tester-group changes or experiment configuration changes were made. Artifact: `store119/Konvo.ipa`; verification and delivery status: `build119.json`.

## Build 120 installed on iPhone 16e

Built 1.8.0 (120) with `onboarding-preview` so the owner can review the new flow directly. Runtime implementation matches uploaded production build 119. Exact bundled sources, all four bundle versions, forced-preview flag and signing were verified. CoreDevice reported successful installation on Matty16E. The phone disconnected after installation, so automatic launch and the subsequent installed-app metadata query could not complete. The app can be opened directly on the phone. Build 119 remains the unchanged App Store Connect upload; no additional upload or review submission was made.

## Build 121 loading fixes (September 21)

The owner reported a slow "Opening Instagram sign-in" handoff and a loading banner over an already-visible inbox. A replay of the shipped scripts reproduced two app-side failures: the sign-in flow issued both a native request and a second browser navigation 1.2 seconds later while the old document remained alive; the reveal detector did not recognize a div-based inbox without h1/h2/thread anchors. A separate late-response test confirmed that detection stopped after 15 seconds and never removed its recovery message when content subsequently arrived.

Native navigation now remains the sole request when the bridge accepts it. Browser navigation remains the fallback for an unavailable bridge, and the handoff offers a manual retry after eight seconds. The inbox detector accepts visible avatar/text rows with button/link/list/row semantics, excludes Konvo overlays and hidden content, and continues checking after showing the slow-response recovery action. The same detector supplies the paywall's local inbox preview. No Instagram service-worker, session, cookie, or authentication behavior was changed.

`test_onboarding_handoff.js` and `test_inbox_reveal_loading.js` exercise the actual shipped handoff and CAGE reveal. The late-price/inbox test also exercises the snapshot with div-based message rows. These fixtures are local reproductions, not a captured live Instagram DOM or a substitute for the physical-phone retest. Build/signing/install outcomes are recorded in `build121.json`.

Build 121 archived and exported successfully. Exact current JavaScript, compiled sign-in HTML (including retry translations), all four version numbers, deep strict signatures and device provisioning passed verification. The full regression run passed CAGE/bridge/purchase checks; the bundled onboarding suite passed after adding missing retry translations and replacing its 100ms assignment wait with a bounded readiness wait. The theme regression passed. Installation failed because CoreDevice could not locate the paired iPhone 16e (error 1011). The final verified package is `device121/Konvo.ipa`; installation and physical-device retesting remain pending. No App Store upload or submission was performed for this fix.

## Version 1.8.0, build 122 — latest onboarding and enrollment fix

At the owner's request, the current source was rebuilt for production as 1.8.0 (122). It includes the annual/weekly paywall, cancellation special offer, personalized onboarding, sign-in/inbox loading fixes, and the PostHog v2 flag-response correction. Both onboarding flows remain included. Preview, beta, and free-access overrides are absent; existing assignments and live experiment settings are unchanged.

The full `npm test` suite passed, including annual/weekly/special-offer integration, original onboarding, theme sequence, inbox behavior, and loading regressions. All twelve native PostHog response cases passed. The exported IPA contains the exact current bundled HTML and JavaScript and the compiled enrollment fix. Version numbers on the app and all three extensions, deep strict signatures, and App Store provisioning profiles passed verification. The source snapshot and SHA-256 are recorded in `build122.json` and `store122/verification.json`.

Apple accepted the upload with no errors, delivery UUID `8ad047c3-e46c-4524-af2c-063fc0c25700`. A read-only App Store Connect check confirmed processing is VALID for version 1.8.0, build 122. No App Review/beta review submission, release selection, or tester-group change was performed. The enrollment fix only reaches customers after the new build is released; users with existing fallback assignments retain their original experience.


## Build 122 installed on iPhone 16e

The production archive already uploaded as 1.8.0 (122) was exported with development signing for the owner’s iPhone 16e. Exact bundled sources, the compiled PostHog fix, all four version numbers, strict signing and device provisioning were verified. CoreDevice confirmed installation of 1.8.0 (122) on Matty16E and successful launch. This export preserves production A/B behavior; it does not force preview onboarding or reset app data. App Store Connect was unchanged. See `device122/verification.json` and `device122/installation.json`.


## Build 123 forces the new onboarding on the owner’s phone

The owner clarified that the device should always show the new onboarding after production build 122 followed its A/B assignment into the original flow. Build 123 uses the existing `onboarding-preview` feature with the exact latest source from build 122, including the PostHog parsing fix and annual/weekly/special-offer paywalls. The preview integration test passed for an already-onboarded, entitled user. Exact packaged sources, the forced-preview marker, all four version numbers, strict signing and iPhone 16e provisioning were verified. This device-only preview is excluded from production experiment results and was not uploaded to App Store Connect.

The iPhone disconnected during the initial install attempts. After the owner unlocked it, CoreDevice successfully installed build 123, confirmed version 1.8.0 (123), and launched the app with the new onboarding forced on. The verified IPA is `device123/Konvo.ipa`; see `build123.json` and `device123/installation.json` for the confirmed outcome.


The same verified build 123 preview was also installed and launched successfully on the owner’s iPhone 13. All four profiles include that phone, and CoreDevice confirmed 1.8.0 (123). See `device123/installation-iphone13.json`.

## Version 1.8.0, build 126 — final onboarding upload

At the owner's request, the exact app source tested as device build 125 was archived and exported for App Store distribution as 1.8.0 (126). This includes the gift introduction and animation, annual/weekly/special-offer purchase flows, 900ms forward cooldown, loading fixes, and native PostHog v2 enrollment correction. Both onboarding variants remain available through production A/B assignment. Preview, beta and free-access overrides are absent. All six release source hashes match build 125.

Exact packaged HTML and JavaScript, compiled gift/cooldown/enrollment markers, the app and three extension versions, App Store provisioning, and deep strict signatures passed verification. Thirteen native enrollment guard cases passed, including a captured live v2 PostHog response. Read-only PostHog checks confirmed the active 50/50 flag, matching experiment exposure configuration, and compatible dashboard filters. Existing telemetry includes a build 122 exposure and build 125 preview screen events through the personalized comparison, loader, paywall, gift and offer. Preview traffic is excluded from production results. The full production funnel for 126 requires eligible users after release; prior persisted fallback assignments are retained. Revenue-accounting accuracy was not established by this onboarding audit.

Apple accepted the upload with no errors, delivery UUID `3bb40b98-fdb0-480e-8f44-8f0ffb26ab23`. A read-only App Store Connect check confirmed processing is VALID for 1.8.0 (126); the receipt is recorded in `build126.json` and `store126/apple-processing.json`. The 1.8.0 submission remains in Prepare for Submission with build 122 selected, so the owner must replace that selection with 126 before submitting. No App Review/beta review submission, version-build selection, release, tester-group change or live experiment mutation was performed. The owner will select and submit the build. Artifacts and verification evidence are in `store126/`.
