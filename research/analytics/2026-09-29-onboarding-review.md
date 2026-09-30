# Konvo onboarding review — September 29, 2026

Reviewed around 15:00 America/Vancouver (22:00 UTC). Read-only analysis of PostHog and the local application code; no app, experiment, pricing, or dashboard changes made.

## Recommendation

Keep the original first-time onboarding and trial explanation for now. Update the social proof number with wording supported by usage, and give confirmed expired subscribers a separate return-to-Konvo paywall featuring their inbox inside a phone frame. These are focused improvements; the data does not establish that either will increase conversion.

Recommended social proof: **“Join 10,000+ people on Konvo.”** The tracked onboarding cohort already exceeds 10,000 people. It does not establish 10,000 paying subscribers, retained users, or endorsements. If using a downloads-specific claim, reconcile it to App Store Connect first.

## Main acquisition cohort

Source: [build 130 dashboard](https://us.posthog.com/project/569146/dashboard/2140017), especially [page reach](https://us.posthog.com/project/569146/insights/cKBLaP5h) and [overview](https://us.posthog.com/project/569146/insights/86YY5aez).

People whose first tracked welcome since August 1 was on build 130, after its recorded public release at September 27, 14:22:15 UTC. Existing dashboard exclusions remove known tests, onboarding previews, and heuristic review traffic. These are tracked people, not App Store installs. Snapshot taken around September 29, 22:00 UTC.

| Checkpoint | People | Share of starters |
| --- | ---: | ---: |
| Welcome | 10,524 | 100% |
| Opening Instagram sign-in | 10,106 | 96.0% |
| Connected | 7,228 | 68.7% |
| Rendered priced paywall | 6,802 | 64.6% |
| RevenueCat-confirmed trial start | 1,146 | 10.9% |

These are checkpoint reach counts, not a requirement to visit every optional page in order. The dashboard's chronological sign-in progression is 71.5%. Trial starts following a rendered paywall were 1,145 / 6,802 = 16.8%.

The early pages have little observed attrition. Sign-in loses roughly 28.5% of people who reach it; payment is the other major loss. Page counts alone cannot establish why someone left or prove the flow is optimal.

### Login diagnostic

A separate diagnostic frozen at 22:00 UTC counted 2,884 people with a sign-in start but no later recorded connected/inbox event. Of these, 2,808 had a detected login form, 638 a recorded submission, 677 a slow-loading hint, and 605 a login-error event. These groups overlap. The broader connected definition and query snapshot differ slightly from the saved dashboard.

Most missing completions did encounter a form. That argues against assuming every missing login is a frozen loading page. It does not prove voluntary abandonment: backgrounding, password lookup, missing telemetry, errors, and later returns remain possible. Old slow/error heuristics also require validation before treating their counts as confirmed defects. Preserve typed credentials and app-switching; avoid adding forced reloads or short deadlines.

### Checkout diagnostic

Mutually exclusive outcomes after the first rendered paywall, build 130, cutoff 22:00 UTC:

| Outcome, with success taking priority | People |
| --- | ---: |
| No recorded checkout start or purchase result | 3,566 |
| Cancelled, without a later success/error/pending result | 1,831 |
| Purchase or trial accepted | 1,135 |
| Pending, without success | 191 |
| Error, without success or pending | 79 |

Build 130 has no `purchase_started` events in this window. Therefore the first row cannot be called “never tapped purchase.” Someone may have tapped and left before a result was recorded. Pending is not necessarily failure. A purchase accepted here includes a free trial, not just a paid charge.

### Trials are not mature

[Trial status](https://us.posthog.com/project/569146/insights/xE8qcpZL): 618 / 1,146 (53.9%) have renewal disabled; 528 (46.1%) have renewal enabled. All 1,146 are still before their scheduled trial expiry in this cohort. No mature conversion denominator exists yet. Do not report this as 0% paid conversion, or assume all cancellations are permanent losses.

The first seven-day trials from the September 27 release reach their scheduled end around October 4. Review initial paid conversion on October 5–6, then continue tracking later cancellations, billing recovery, refunds, and renewals. Evaluate by trial-start cohort and actual expiry rather than mixing different observation lengths.

## Newer build 138: tracking check

Same cohort definition and exclusions, using build 138 and a September 29, 22:00 UTC cutoff:

| Checkpoint | People |
| --- | ---: |
| Welcome | 376 |
| Sign-in start | 355 |
| Login succeeded | 258 |
| Rendered paywall | 240 |
| Purchase button tapped | 132 |
| Native checkout received | 132 |
| Store purchase requested | 132 |
| Purchase/trial accepted | 47 |

Checkout instrumentation is arriving in production on this build. The identical aggregate start/received/request counts are reassuring, but are not a per-attempt reconciliation or proof that Apple's sheet appeared every time. Purchase outcomes include 95 people with a cancellation, 3 with an error and 11 pending; these overlap with eventual successes and must not be added together.

This smaller, more recent cohort cannot establish a causal improvement over build 130. Its observed paywall-to-accepted rate is 47 / 240 = 19.6%, with a different observation window. Keep reviewing actual paid conversion as trials mature.

## Expired-trial paywall proposal

Recommended layout:

1. **“Your trial has ended.”** Use subscription-specific copy only when the prior trial is confirmed; otherwise “Continue with Konvo.”
2. **“Keep your conversations. Leave the scrolling behind.”**
3. A phone frame showing the user's dark Instagram inbox. Use an available local preview and a graceful fallback; do not make checkout wait for Instagram to load.
4. Existing localized annual/monthly plan choices, clear billing amount and renewal terms.
5. **“Continue with Konvo”**, plus Restore, Terms, and Privacy.

Replace the timeline on this returning-user screen. Keep the trial timeline for eligible first-time subscribers. A returning user already understands the trial; the inbox preview is a reminder of the product's value. This is a design hypothesis, not a measured uplift.

Trigger it only when prior subscription/trial history is known and RevenueCat confirms there is no active entitlement. Cancellation of renewal alone is insufficient: users generally retain access through their trial/paid period, and grace periods may retain access too. See [RevenueCat's cancellation and trial lifecycle](https://www.revenuecat.com/docs/integrations/webhooks/event-flows).

Measure expired-paywall impressions, checkout starts, accepted purchases, and RevenueCat-confirmed reactivations separately from first-time onboarding. The last seven days contain only 8 people with a tracked `lapsed` paywall impression (20 events), so this sample cannot support a reliable conversion comparison. Older purchase-result events lack placement, so the absence of lapsed-labelled results is not proof of zero purchases.

## Source inspection

- `wrapper/dist/proof.png` contains the existing **1000+** artwork. Changing only text in HTML will leave that old number visible. `wrapper/dist/index.html:678` places this image and a localized caption.
- `wrapper/src-tauri/src/cage.js:2974`, `pay(plan)`, selects a trial timeline only when product eligibility supplies trial days. Ineligible returning users already get a non-trial renewal timeline, rather than an unconditional new free trial promise.
- `wrapper/src-tauri/src/cage.js:3037` uses “Your plan ended.” for `lapsedWall`, then reuses the common timeline and plan layout.
- `wrapper/src-tauri/src/cage.js:3717` currently derives the returning-screen label from `localStorage.konvoDone` after entitlement checks. Completed onboarding is not itself verified subscription history. A new expired-trial-specific design should use confirmed history and entitlement state for its label and trigger.
- `wrapper/src-tauri/src/cage.js:3577` includes checkout-attempt tracking and placement in the current source. Production build 138 is emitting the new checkout events.

## Limits

The first-welcome lookback starts August 1; this is not proof of lifetime first use. Person merging, app reinstalls, missing events, the review-traffic heuristic, and outcomes occurring after a build upgrade can affect counts. No controlled test here isolates social proof, the repeated trial explanation, or a personalized expired paywall. Keep the main flow stable while validating these focused changes against paid conversion and reactivation.
