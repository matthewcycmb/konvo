# Konvo build 130 analytics

Dashboard: https://us.posthog.com/project/569146/dashboard/2140017

Created September 26, 2026, Vancouver time. **Activated September 27 after public release of Konvo 1.9.0 / build130.** The saved cutoff is **2026-09-27 14:22:15 UTC (07:22:15 Vancouver)**, verified against [Apple's Canadian lookup metadata](https://itunes.apple.com/lookup?id=6794756261&country=ca&entity=software). Matthew confirmed build130; the local archive verification also identifies 1.9.0 (130). Apple's public lookup exposes the version and release timestamp, not the build number. The US lookup still showed 1.8.0 during verification, so this is not a claim of simultaneous worldwide availability.

The dashboard now has 18 saved views. At 16:50 UTC on September 27, fresh queries showed 18 tracked onboarding starters, 15 inbox reveals, 13 rendered paywalls (72.2%), and three final onboarding actions. These are provisional live counts, not download counts. No trial had a mature conversion window.

## Saved release setting

1. Open the dashboard.
2. At the top, open **Konvo 130 public launch UTC**, now saved as **2026-09-27 14:22:15**.
3. Only if correcting the actual public release timestamp, enter it as `YYYY-MM-DD HH:MM:SS` in **UTC**, click **Update**, then **Save filters / Save these changes as the dashboard default**. Update alone is temporary. The reusable SQL variable default and the 15 SQL insights' saved variable values were also set to this release timestamp.
4. Check that the START HERE result says **PUBLIC COHORT ENABLED** and displays the correct timestamp. Reload the dashboard to confirm the override persists. The native funnel charts read the saved dashboard variable, so save the change before comparing them with the SQL charts.

Use public availability, not submission or approval time when the release is held manually. Do not enter a test date to make the customer charts populate. To preview tests, use the clearly labeled QA tile. The timestamp can also be applied by an agent using the variable ID and code name in the configuration JSON.

Keep the normal dashboard date picker at **No date range override** when comparing all charts. It can narrow native funnels but does **not** change these SQL cohort definitions. They follow the lifetime cohort acquired on build 130 after the launch timestamp. The daily table groups acquisition dates in Vancouver. Revenue and usage follow that cohort afterward. Changing the launch timestamp changes cohort membership; it is not a reporting-period picker.

## What is included

| Saved view | Purpose |
| --- | --- |
| START HERE | Explicit pre-launch/live state and selected release timestamp |
| Overview | Starters, rendered paywall rate, both trial-start rates, Apple acceptance, completion, paid people, cancellations, mature trial conversion |
| Daily acquisition chart | Starters, rendered paywalls and trials by Vancouver acquisition date |
| Every onboarding page | 25 tracked screens/actions, counts, percentage of starters and progression from the named checkpoint |
| Native quiz funnel | Full-width blue bars for all 13 required quiz screens and inbox reveal; people, previous-step conversion/drop-off and time between steps |
| Native main funnel | Matching blue bars for Welcome, inbox reveal, perks, rendered paywall and final completion |
| Native trial-offer branch | Separate ordered funnel for Try Konvo free, offer, reminder and rendered paywall; screen progression, not confirmed trial starts |
| Daily acquisition table | Counts, percentages and how many people still have an open seven-day onboarding window |
| Trial lifecycle | Renewal on/off while still active, converted, expired, billing problems and unresolved outcomes |
| Mature trial conversion | Conversion by scheduled expiry +24h and +14d, each using only fully observed trials |
| After cancellation | Cancellation within an hour, chat before cancellation, chat 1–24h and 24–48h afterward |
| Trial activation/return | Rendered chat in hours 0–24, 24–48 and days 7–8, with mature denominators |
| Checkout | Paywall request/render events, plan taps, Apple purchase outcomes and restoration events |
| Revenue by product | Confirmed paying people, trial/direct purchase events, USD gross and negative adjustments |
| Friction | Login errors, slow login hints, chat stalls and chat-render p50/p95 milliseconds |
| Tracking quality | Native acceptance without RC confirmation after 24h, missing paywall renders and known screen-view gaps |
| D35/D60 economics | Mature starter-to-paid rate and revenue per tracked starter, explicitly not per App Store download |
| QA activity | Unfiltered build130 event inventory, including tests and Apple review |

## Cohort and counting rules

- A starter is a resolved PostHog person whose first recorded `onboarding_screen_viewed` with `screen_id=s1` is on build `130`, after public launch. The history lookup starts August 1, before the app's known launch. This is a **tracked-onboarding** cohort, not App Store download counts.
- Pre-release starters remain excluded after release, even if they reopen or repeat onboarding. Users whose first Welcome was on an older build are also excluded. People without a recorded Welcome cannot enter this acquisition cohort.
- Explicit `is_test_build`/`onboarding_preview` traffic and known prerelease experiment QA are excluded at person level. The existing project reviewer heuristic is preserved: native US events from Cupertino or without subdivision data. That heuristic is imperfect and can exclude genuine users. Unmarked new test identities after public launch cannot be distinguished reliably with current properties.
- Onboarding page and checkout events must be on build130 and within seven days of the initial Welcome. Newer cohorts are provisional until that window closes.
- RevenueCat first trials must start within seven days of that Welcome. Revenue and subscription follow-up are not filtered by a build property: RC events do not carry one. They join through resolved person identity. Events are deduplicated by `insert_id`, falling back to event UUID.
- Trial outcomes join the same person **and original transaction ID** as the first qualifying trial. Trial cancellation turns off renewal; it is not immediate expiry or proof of abandonment. Uncancellation is taken into account.
- Paid conversion is confirmed by RevenueCat, not by native `purchase_result=purchased`. Native purchase success includes a free trial and can also involve restored entitlement.
- Mature conversion includes only trials whose scheduled expiry plus the specified follow-up is in the past. The numerator is conversion by that same deadline. Billing recovery can change the longer-window result. Blank rates mean there is no eligible denominator.
- Cancellation/return and trial-return views use content-free `thread_ready` with `rows > 0` as evidence that a chat rendered. They include later builds for the original acquisition cohort. They do not measure messages sent or distinct conversations, and absent events do not prove abandonment. Background checks do not count as usage.
- Revenue is USD gross according to the previously verified RevenueCat integration setting. Do not multiply it again by the currency of the original transaction. The dashboard separates positive gross from negative adjustments; these are not Apple proceeds, profit, MRR, or calendar-month revenue.
- RevenueCat download-to-paid and revenue-per-install benchmarks have different denominators from this dashboard's tracked starters. The D35/D60 view labels that distinction.

## Exact tracked flow

The sequence was checked against `wrapper/dist/index.html`, `wrapper/src-tauri/src/cage.js` and build130's saved source verification. Build130 packages the build129 application code with version metadata 1.9.0 (130). The old experiment treatment and removed referral pages are not included.

| # | Page or action | Event / screen |
| --- | --- | --- |
| 1 | Welcome: Instagram without Feed, Reels or Explore | `onboarding_screen_viewed`, `s1` |
| 2 | Why do you want to stop scrolling? | `onboarding_screen_viewed`, `s2c` |
| 3 | Daily Instagram screen time | `onboarding_screen_viewed`, `s3` |
| 4 | Daily messaging time | `onboarding_screen_viewed`, `s4` |
| 5 | Adding it up | `onboarding_screen_viewed`, `s4b` |
| 6 | Years distracted on your phone | `onboarding_screen_viewed`, `s5` |
| 7 | Instagram time vs messaging time | `onboarding_screen_viewed`, `s6` |
| 8 | Years Konvo could help you get back | `onboarding_screen_viewed`, `s7` |
| 9 | No Feed. No Reels. No Explore. | `onboarding_screen_viewed`, `s8a` |
| 10 | Your messages stay | `onboarding_screen_viewed`, `s8b` |
| 11 | Lock the app when you are ready | `onboarding_screen_viewed`, `s8c` |
| 12 | Social proof / Connect Instagram | `onboarding_screen_viewed`, `s9t` |
| 13 | Opening Instagram sign-in | `onboarding_screen_viewed`, `s11` |
| 14 | Instagram login / verification | `login_form_detected`; proxy, not all third-party challenge pages |
| 15 | Connected / preparing inbox | `login_succeeded`; proxy that may be missing when a session resumes |
| 16 | Your real inbox reveal | `inbox_reveal_viewed` |
| 17 | Same account. Different app. | `perks_viewed` |
| 18 | Try Konvo free | `try_viewed`; conditional on trial eligibility |
| 19 | Free-trial offer | `offer_viewed`; conditional on trial eligibility |
| 20 | Trial reminder | `reminder_viewed`; conditional on trial eligibility |
| 21 | Paywall requested / prices loading | `paywall_viewed`, `s13_paywall`; not yet a rendered offer |
| 22 | Annual/monthly paywall with prices | `paywall_presented`, `paywall_id=original`, `placement=onboarding` |
| 23 | Apple purchase accepted | `purchase_result`, `result=purchased`; action, not proof of payment |
| 24 | Notifications choice answered | `notify_answered`; optional action, not a page impression |
| 25 | You are in: final Continue tapped | `onboarding_completed`, `screen_id=s14_success`; action |

The page-reach view is intentionally not a strict 25-step funnel. Optional trial pages must not block counting someone who legitimately skipped them. Its checkpoint progression counts people with both first markers in timestamp order, divided by people at that named checkpoint. The native quiz view requires all 13 quiz steps in order, then ends at inbox reveal. The main funnel also starts from the exact first Welcome. Both use a seven-day conversion window and previous-step percentages. The separate trial-offer funnel restricts every event to the same cohort's first seven days on build130, then measures the ordered eligible-offer screens and rendered paywall. It does not measure trial starts.

All steps within each native chart are required. The initial optional-step configuration could show more people at a later required step than at a skipped optional step, producing percentages over 100% and negative drop-off. Separating the conditional branch fixes that denominator problem. Login proxies, loading, native purchases and notification actions remain in the detailed checkpoint/outcome views.

## Tracking limits

- Notifications and success pages have no separate impression events in build130. Their actions are labeled honestly. Separate page views would require a future app release; they cannot be backfilled.
- `onboarding_completed` also fires at the paywall. Only `s14_success` counts as final onboarding completion here.
- OG `paywall_viewed` can fire before products render. The paywall rate uses `paywall_presented` with the onboarding placement instead.
- The OG flow has no reliable checkout-start event. It is not possible to compute checkout-start abandonment from `purchase_result` alone.
- Optional Screen Time setup is outside the required onboarding funnel. Its existing events remain visible in the QA inventory.
- PostHog native foreground tracking is incomplete. D1/D7 are explicitly chat-return measures, not complete app-use retention.
- First-page timestamps are client events and subscription confirmations are server events. Rare device clock skew or identity mismatches can affect linked funnel attribution; the tracking-quality view helps flag discrepancies.

## Verification and files

Before release, all 17 original saved insights were executed with the blank launch setting and correctly returned no customer cohort. The QA tile returned real build130 activity. Historical cancellation/usage checks were labeled separately and were not added to customer charts. Those original verification snapshots are retained.

After release, the variable default, dashboard override and all 15 SQL insight defaults were saved with the public release time. Fresh status, overview, revenue and native-funnel results confirmed live data. The three final native charts were rerun after separating the conditional trial branch; their counts were monotone and all percentages stayed between 0% and 100%. Persisted dashboard metadata confirmed the release setting and 18 tiles.

- `konvo-build130-dashboard.json`: complete insight definitions and shared variable metadata.
- `konvo-build130-created.json`: saved insight, short-link and tile IDs.
- `konvo-build130-verification.json`: aggregate query results, including the explicitly labeled historical validation.
- `konvo-build130-release-2026-09-27.json`: release source, saved setting, final layout and fresh live validation results.
- `konvo-build130-native-funnels.json`: current three native chart definitions, retaining the earlier prelaunch verification separately.

No application code, pricing, existing experiment dashboards, or live subscription configuration was changed.

## Native funnel display update

The three native funnel charts appear immediately below START HERE. Their vertical blue bars follow the reference screenshot, with page labels, person counts, previous-step conversion/drop-off percentages and conversion timing. The detailed 25-checkpoint table remains below. Production charts now use the saved public release cutoff.

A separate, clearly labeled QA preview is available at https://us.posthog.com/project/569146/insights/1XX0DzR4 . It displays existing prerelease test activity only, so the chart can be inspected before launch. Its fixed September 25 cutoff is limited to that preview and does not enable the customer cohort.

Native funnels cannot resolve SQL variable placeholders directly. Their first-step HogQL filter reads the same persisted launch timestamp from `system.dashboards.variables` for dashboard 2140017. This preserves one saved launch setting for both native and SQL charts.
