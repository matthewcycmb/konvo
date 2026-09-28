# Konvo onboarding review — September 27, 2026

Snapshot: September 27, 21:55 PDT (September 28, 04:55 UTC). Read-only analysis of PostHog events and RevenueCat events delivered to PostHog. No app, offering, flag, or dashboard configuration was changed.

## Finding

The early onboarding has little observed attrition. The largest numerical loss is at subscription acceptance; the next largest is Instagram authentication. The data identifies these locations, but does not establish that price or a loading bug causes either loss.

## Cohort and limits

- 232 tracked first-time onboarding starters on version 1.9.0/build 130, beginning after the public release at September 27, 07:22:15 PDT.
- First recorded welcome since August 1, resolved by PostHog person ID. This measures tracked starters, not App Store installs or proven first-ever users.
- Reused the existing dashboard's test/preview exclusions and Apple-reviewer heuristic. The reviewer heuristic can exclude genuine users, and unmarked tests may remain.
- Counts are frozen at the stated cutoff. People can still return and complete onboarding; these are not final abandonment rates.
- RevenueCat outcomes are joined to the resolved person, with new-trial conversion matched to the same original transaction. Events already delivered to PostHog can lag RevenueCat.
- No cohort attribution events or Reel identifiers establish which users came from the successful Reel.
- Earlier cohorts span different builds/flows. They are not a controlled comparison with today's original onboarding.

## Every tracked page and checkpoint

Counts are unique people reaching each checkpoint; some steps are conditional and an occasional missing event means this is not a strict sequential funnel. In particular, 163 connected users but 162 inbox-reveal events indicates one missing reveal event, not a negative drop-off.

| Page or checkpoint | People |
|---|---:|
| Welcome | 232 |
| Why stop scrolling? | 230 |
| Daily Instagram screen time | 228 |
| Daily messaging time | 227 |
| Adding it up | 227 |
| Years distracted | 227 |
| Instagram vs messaging time | 226 |
| Years back | 225 |
| No Feed, Reels or Explore | 225 |
| Messages stay | 225 |
| Lock Instagram | 225 |
| Social proof / Connect Instagram | 225 |
| Opening Instagram sign-in | 225 |
| Login or verification form detected | 225 |
| Instagram connected | 163 |
| Inbox reveal | 162 |
| Same account. Different app. | 163 |
| Try Konvo free — conditional | 159 |
| Free-trial offer — conditional | 158 |
| Trial reminder — conditional | 148 |
| Paywall requested | 147 |
| Paywall rendered with prices | 146 |
| Apple purchase accepted, including trials | 30 |
| Notification choice answered | 30 |
| Final Continue tapped | 30 |

The last two checkpoints are actions, not separately tracked screen impressions.

## Subscription acceptance

146 people saw the priced paywall; 30 accepted Apple's purchase flow (20.5%). This is not 30 paying customers: acceptance includes free trials and can include restored entitlement.

Mutually exclusive outcomes among those 146:

| Outcome by cutoff | People |
|---|---:|
| At least one accepted purchase | 30 |
| Cancellation, with no accepted purchase | 30 |
| Error, with no accepted purchase | 1 |
| No recorded purchase result | 85 |

114 of the 116 without acceptance first saw the paywall more than an hour before the cutoff. The gap is not mainly explained by users who only just arrived. However, the original flow lacks a reliable checkout-start marker: the 85 cannot be described as people who definitely never tapped purchase.

42 viewers had at least one Apple-sheet cancellation. Twelve also had an accepted result, but the aggregate does not establish event order. Do not call all twelve recovered cancellations.

The only request without a rendered paywall is 1 of 147. Widespread price-loading failure is not supported by this sample.

17 of 163 connected users did not reach a rendered paywall. The most noticeable intermediate loss is free-trial offer to reminder: 158 to 148. That is a smaller opportunity than acceptance itself.

## Instagram authentication

225 reached sign-in and 163 connected (72.4%); 62 had not connected by the cutoff.

- A tappable login form was recorded for 224/225, including 61/62 non-completers.
- Konvo's loading overlay cleared for all 225; median 0.58 seconds, 95th percentile 2.19 seconds across recorded clear events.
- Login form readiness: median 1.18 seconds, 95th percentile 7.59 seconds across recorded login-stage events.
- Successful authentication took a median 41 seconds from entering sign-in; its 95th percentile was 7 minutes 40 seconds. Longer successful sessions support allowing time for password lookup and recovery.
- 70 people encountered at least one detected login error; 55 ultimately connected, 15 had not.
- Of the 62 non-completers, 44 had no detected error or slow-loading signal. The reasons they stopped remain unknown.
- 39 people had password-reset-stage activity; 25 connected and 14 had not.

Slow-loading signals require care: 37 of the 44 affected people triggered them on password-reset pages with no recognized form. Only seven were flagged at the login stage. Code inspection shows readiness detection uses a narrow set of input selectors, so a reset page may be usable without matching them, or may legitimately display instructions rather than a form. This is a measurement concern to verify, not proof of 37 frozen reset pages.

Submission tracking also misses some successful paths: 45 successful users had no recorded submission. Thus the 49 non-completers with no submission event cannot safely be classified as refusing to log in.

## Trial outcomes are immature

26 confirmed new trials were recorded: 11.2% of starters and 17.8% of paywall viewers. Thirteen (50%) had renewal turned off by the cutoff. Eleven cancelled within one hour: 42.3% of all trials, or 84.6% of the thirteen cancellers.

All 26 remain before their scheduled trial expiry. Cancellation disables renewal; it does not establish that they stopped using Konvo or cannot later resubscribe. Ten of the thirteen cancellers had rendered a chat before cancelling. No full 24-hour post-cancellation observation is available yet.

The 30 native accepted results and 26 new trial starts are different measures. An aggregate RevenueCat revenue row included an annual conversion belonging to a different original transaction from the new trial, so it was not attributed as conversion of today's new trial. There is no mature trial-to-paid rate to judge yet.

## Recommended next steps

1. Keep the early quiz and notification step stable: 97.0% reach sign-in, and all 30 accepted purchasers completed the remaining tracked steps.
2. Add a checkout-start event to the original paywall, tied to the actual product, displayed localized price, currency, trial eligibility, and eventual outcome. This distinguishes presentation rejection from Apple-sheet abandonment and callback loss.
3. Test one simplification of the existing original purchase flow: combine repetitive trial explanation/reminder screens into the paywall's existing trial timeline. Keep price, trial duration, renewal terms, and reminder commitment clear. Do not simultaneously change price, onboarding design, and trial policy; that would prevent identifying the reason for any improvement. The current data does not prove that a lower price will improve revenue.
4. Verify password-reset readiness detection and error handling. Preserve input and allow switching to Notes/password managers; do not add forced reloads or short login deadlines.
5. Review this cohort after trial expiry plus a reporting buffer, using confirmed paid conversion, revenue per starter, refunds, and continued messaging. Treat trial-start uplift alone as incomplete evidence.

## Sources

- [Live build 130 dashboard](https://us.posthog.com/project/569146/dashboard/2140017)
- [Page/checkpoint insight](https://us.posthog.com/project/569146/insights/cKBLaP5h)
- [Overview](https://us.posthog.com/project/569146/insights/86YY5aez)
- [Login health](https://us.posthog.com/project/569146/insights/AZmMm0n0)
- [Checkout](https://us.posthog.com/project/569146/insights/daH8GYxn)
- [Trials](https://us.posthog.com/project/569146/insights/xE8qcpZL)

Live insights will move after this snapshot. Diagnostic breakdowns were read-only SQL queries using the same saved cohort and fixed cutoff. PostHog's governed metric catalog was consulted and had no matching metric; these diagnostics were not saved as governed metrics. [PostHog's funnel guidance](https://posthog.com/docs/product-analytics/funnels#tips-for-analyzing-funnels) also distinguishes where a funnel loses users from investigating why.
