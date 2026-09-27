Konvo onboarding and pricing audit, September 26, 2026

Recommendation: keep the original onboarding, emphasize the annual plan with its seven-day trial, and keep monthly available. A higher annual price is worth testing, but the existing experiment does not establish a profitable price increase. It changed onboarding and payment terms together, stopped early, and its trials have not reached their first charge.

Analysis cutoff: September 26, 2026, 7:29 p.m. Vancouver time (September 27, 02:29 UTC). Event timestamps at or after that cutoff are excluded, including one future-dated trial-conversion event encountered during the audit.

The experiment was activated September 20 at 9:13 p.m. Vancouver time (September 21, 04:13:48 UTC), and stopped September 25 at 12:57 p.m. Vancouver time. Its recorded conclusion is `stopped_early`. The first eligible exposure remaining after the existing QA exclusions was September 22. Activating the experiment did not itself release a working app build.

Sources inspected live:

- https://us.posthog.com/project/569146/experiments/465606
- https://us.posthog.com/project/569146/dashboard/2117717
- https://us.posthog.com/project/569146/dashboard/2117718
- https://app.revenuecat.com/projects/cce508b7/overview
- https://app.revenuecat.com/projects/cce508b7/integrations/posthog

The comparison of recorded experiment participants:

| Outcome by the cutoff | Original: annual trial + monthly | Personalized: upfront annual + weekly + special offer |
|---|---:|---:|
| Unique exposed people | 33 | 44 |
| Instagram login succeeded | 22 (66.7%) | 22 (50.0%) |
| Reached a ready paywall | 20 (60.6%) | 22 (50.0%) |
| App recorded an accepted purchase or trial | 12 (36.4%) | 3 (6.8%) |
| RevenueCat confirmed trial starts | 11 (33.3%) | 0 |
| RevenueCat confirmed paying customers | 0, trials immature | 2 (4.5%) |
| Confirmed trial starts / paywall viewers | 11/20 (55.0%) | Not applicable to upfront offers |
| Confirmed paid customers / paywall viewers | Not mature | 2/22 (9.1%) |
| Attributed gross revenue, USD | $0 so far | $42.98 |

Percentages use exposed people unless the row explicitly names another denominator. These are people who entered the recorded experiment, not App Store downloads. Five had Welcome events before experiment activation, so this table is not a strictly first-install cohort.

Each arm has one accepted app-side transaction without a matching RevenueCat trial-start or initial-paid-purchase event for that PostHog person. Those two acceptances are not counted as confirmed customers. They require transaction/identity or sandbox reconciliation. Both acceptance events report build 122; that alone does not prove they were tests. Do not change the confirmed counts to 12 trials or 3 paying customers.

All 11 confirmed control trials are annual. Their scheduled first charges run from September 29 at 5:48 p.m. through October 2 at 11:03 a.m. Vancouver time. No control trial is seven days old at the audit cutoff. The $0 versus $42.98 comparison therefore cannot decide the revenue winner.

Seven of the 11 trial starters have a recorded cancellation of renewal, or 63.6%. Four of those seven canceled within an hour of starting. These are cancellations of auto-renewal while trial access can remain active, not refunds or proof that the user immediately lost access. The other four have no recorded cancellation in the available event stream; they are not guaranteed future payers. One of the two paid treatment subscribers also canceled renewal without an observed negative revenue adjustment in this cohort.

A fixed first-24-hours check produces the same 11 trial starts and two paid treatment customers. OG had 22 logins and 20 paywall viewers in that window; treatment had 21 and 21. The extra treatment login/paywall visit occurred later. This confirms the early acceptance difference is not simply caused by one arm having more days of observation, but does not make trial starts comparable to paid purchases.

Weekly was actually available in the treatment: 22 people had a paywall event with `weekly_available=true`, four selected weekly, and no weekly checkout-start or confirmed weekly purchase was recorded. Nine people started the regular annual checkout, and one started the special annual offer checkout; those counts can overlap. This supports keeping annual prominent in this version. It does not test a weekly plan with a three-day trial: the observed weekly offer charged upfront, and annual was the default.

The broader original-onboarding cohort since activation:

| Outcome | First-ever tracked Welcome in this period, original flow |
|---|---:|
| People | 99 |
| Instagram login succeeded | 68 (68.7%) |
| Reached paywall | 62 (62.6%) |
| Confirmed annual trial starts | 15 (15.2% of starters; 24.2% of paywall viewers) |
| Confirmed direct monthly purchasers | 1 |
| Trial-to-paid conversions from these new trials | 0, still immature |
| Recorded cancellation among trial starters | 9/15 |

This broader cohort includes 32 first-time control participants and 67 unenrolled OG users across old builds, fallback assignments, and the period after the experiment stopped. It overlaps the experiment table and must not be added to it or treated as another randomized arm. It excludes users whose first tracked Welcome predates activation and people later observed in the treatment arm. The confirmed monthly payment contributed $9.05 gross USD. App-side acceptance was recorded for 19 people, but only 16 have a confirmed new trial or direct payment in this cohort.

Historical context: among 113 production RevenueCat customers whose first observed September trial had at least eight complete days of follow-up, 38 converted within eight days (33.6%); 39 had converted by the audit cutoff (34.5%). This is an earlier, separate cohort, not the experiment's eventual conversion rate. The eight-day window includes one day beyond the usual seven-day trial and can still miss later billing recovery.

RevenueCat's 2026 report gives median trial-to-paid conversion of 37.4% for 5–9-day trials and 25.5% for trials of four days or less. Konvo's earlier cohort is in the vicinity of the former, with different measurement windows, customer geography and app mix. These are cross-app benchmarks, not causal evidence that changing trial length changes Konvo's revenue. Do not compare the 33.3% experiment trial-start rate with a trial-to-paid benchmark: their denominators differ.

https://www.revenuecat.com/state-of-subscription-apps

A useful next pricing experiment would compare $24.99/year against $34.99/year, both with the same seven-day trial, same original onboarding, same monthly alternative and same annual default. Randomize eligible new users concurrently and preserve existing subscribers' prices. Keep traffic sources balanced and specify localized prices; the treatment's observed USD-denominated storefront prices varied, so USD currency alone is not a US-storefront filter.

At $34.99 versus $24.99, annual revenue per eligible visitor breaks even if the paid annual conversion rate retains 71.4% of baseline, a 28.6% relative decline. This simplified calculation assumes comparable refunds, fees, geography and product mix. It is not a forecast. Evaluate actual gross revenue less refunds per assigned user at the same age, ideally D35 with a D60 follow-up for monthly renewals. Trial starts alone are not the success metric. The present 77-person experiment with two confirmed payers is insufficient evidence for a general price increase.

The US App Store listing inspected during this audit shows annual $24.99, monthly $6.99, weekly $6.99, and special annual $19.99. This differs from the previously discussed $7.99 monthly figure. The public listing is supporting catalog evidence; verify the live purchase sheet/product configuration before setting up the next price test. Source:
https://apps.apple.com/us/app/konvo-dms-only/id6794756261

OG already opens the paywall with annual selected (`goPay()` calls `pay("y")` in `wrapper/src-tauri/src/cage.js`). Annual emphasis is therefore already partly implemented. Retaining monthly gives users an alternative commitment without making weekly the main offer.

The next product investigation should examine why trial users cancel renewal so quickly: whether they actually use messages, encounter a failure, understand the trial and renewal price, or decide the app is not useful enough. Cancellation timing alone does not establish the reason or show that shortening the trial would help.

Method and limitations:

- Read-only queries; no prices, offerings, experiments, dashboards or app code were changed.
- Used `$experiment_exposure` for assignment, with first valid exposure before experiment end, not current person properties or raw event counts. No included person had conflicting exposure variants.
- Applied the saved experiment's prerelease/preview exclusions at the person level, excluding 14 known identities, plus its existing event-level Apple-review/test geography filter for native events. Unmarked TestFlight/review identities may remain. The same project geography rule should not be applied blindly to server-originated RevenueCat events.
- Initial build 116 did not parse PostHog v2 flag responses properly and persisted OG fallback assignments. Those users were not retroactively labeled control. Actual included treatment exposures identify `personalized_weekly_offer_v3`; the experiment's older title saying annual-only/no-trial is incomplete.
- Joined native and RevenueCat events using PostHog's resolved person IDs. Deduplicated RevenueCat events by `insert_id`, with person/time/event fallback where absent. Limited subscription events to App Store events. Allowed a two-second timing tolerance around native exposure for cross-system timing.
- First-time broader OG cohort means first tracked Welcome, not a verified first App Store download. Event loss, reinstall identities and incomplete aliasing can affect counts.
- RevenueCat's live integration is set to Gross revenue. Its sandbox API-key field has no configured-key indicator, unlike the production key. RevenueCat's overview was explicitly in production mode. Two treatment payments were also visible in its production transaction table.
- RevenueCat documents that PostHog's `revenue` field is always USD, while `currency` is the original transaction currency. The gross $42.98 is the sum of the two attributed payment events, not MRR or net proceeds. Source: https://www.revenuecat.com/docs/integrations/third-party-integrations/posthog
- The live overview separately showed 32 active trials, 62 active subscriptions and $1,082 revenue for Last 28 days. Those are whole-app dashboard totals, not experiment outcomes, and the revenue period is not calendar September. They should not replace cohort denominators.
- Aggregate query definitions and summaries are retained alongside this report. Customer-level rows and browser session material were kept only in temporary local files, not in this report or repository exports.
