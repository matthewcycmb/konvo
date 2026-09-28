# Early trial usage — September 27, 22:42 PDT

Read-only PostHog analysis of RevenueCat-confirmed trial starts among first-time build 130 onboarding starters after public release. Uses the existing acquisition cohort/test exclusions documented in the earlier September 27 review, refreshed to September 28 05:42 UTC. There are now 28 trials; the earlier 21:55 PDT snapshot had 26.

| Latest subscription renewal status | Trials | Rendered a chat after trial start | Rendered a chat at least one hour after trial start | App-launch event at least one hour after trial start |
|---|---:|---:|---:|---:|
| Enabled | 15 | 14 | 4 | 4 |
| Disabled | 13 | 10 | 0 | 2 |

All 13 disabled-renewal subscriptions had a cancellation event; none had a chat render at least one hour after cancellation by the cutoff. The two later launches in that group are not evidence of later conversation use.

Equal-observation-window cross-check:

- First hour: 26 trials have a complete first hour observed, with 22 rendering a chat (12/13 renewal-enabled and 10/13 disabled). Two younger trials are excluded from this denominator.
- Hours 1–6: 19 trials have a full six hours observed, with 3 rendering a chat during hours 1–6 (3/7 renewal-enabled and 0/12 disabled).
- No trial has a complete 24–48-hour return window yet. No trial has reached its scheduled expiry plus a 24-hour reporting buffer.
- The first recorded trial started September 27 at 10:04:48 PDT and expires October 4 at 10:04:48 PDT. The latest included trial started September 27 at 22:05:53 PDT and expires October 4 at 22:05:53 PDT.
- No matched trial conversion, billing issue, post-trial-start thread-stall event, or post-trial-start login-error event was observed. Absence of these events does not prove bug-free usage.

`thread_ready` with `rows > 0` confirms a loaded conversation, not sending or reading a message. `thread_opened` independently shows later openings for the same four renewal-enabled users and none in the disabled group. Continuous use of an already-open conversation need not produce another opening/readiness event. `app_opened` has a sessionStorage latch and does not enumerate all foreground resumes.

Interpretation: there is evidence of some continued early chat use, and weak observed repeat chat use among today's early cancellers. Do not yet classify them as abandoned or treat cancellation as a price objection. The previous September 26 audit of an older 11-person cohort observed two of seven cancellers opening chats hours later, so cancellation cannot universally stand in for product abandonment.

Next checks use already-shipping events: fixed-window chat return (24–48 hours, days 3–4), usage across separate days before expiry, and same-subscription RevenueCat conversion/expiry/billing outcomes after trial expiry. Only include users whose whole window has elapsed, as described in [PostHog retention](https://posthog.com/docs/product-analytics/retention#retention-calculation-options). Price, trust, and feature objections remain hypotheses unless feedback or a controlled test distinguishes them.

Data source: [build 130 PostHog dashboard](https://us.posthog.com/project/569146/dashboard/2140017). The split above is an additional read-only SQL diagnostic, not a newly saved dashboard tile. No app or analytics configuration was changed.

## Requested checks rerun — September 27, 22:53 PDT

All four read-only queries completed with a fixed September 28 05:53 UTC cutoff: early usage, D1/D3/D7 retention, trial outcome maturity, and current subscription state. The current cohort contains 29 confirmed trials.

| Renewal status | Trials | Loaded a chat after starting | Chat loaded at least one hour after starting | Chat loaded at least one hour after cancellation |
|---|---:|---:|---:|---:|
| Enabled | 15 | 14 | 4 | 0 |
| Disabled | 14 | 10 | 0 | 0 |

All 29 remain before their scheduled trial expiry. Renewal cancellation does not remove current trial access.

Complete observation windows:

| Check | Users meeting the condition | Eligible trials |
|---|---:|---:|
| Loaded chat in first hour | 22 | 26 |
| Loaded chat during hours 1–6 | 3 | 22 |
| Loaded chat during first 24 hours | Pending | 0 |
| D1 return: hours 24–48 | Pending | 0 |
| D3 return: hours 72–96 | Pending | 0 |
| D7 return: days 7–8 | Pending | 0 |
| Paid conversion by trial expiry + 24h | Pending | 0 |
| Paid conversion by trial expiry + 14d | Pending | 0 |

Among trials with six complete hours observed, hours 1–6 chat activity is 3/9 with renewal enabled and 0/13 with renewal disabled. These small groups show weak observed early repeat usage among cancellers; they do not establish why users cancelled, abandoned the product, or refused its price. Do not label the pending metrics 0%.

The earliest complete D1 window becomes available September 29 at about 10:05 a.m. PDT; the earliest complete D3 window becomes available October 1 at about 10:05 a.m. PDT. The earliest trial-expiry-plus-24h outcome becomes available October 5 at about 10:05 a.m. PDT. Later starters become eligible later; October 5–6 is the useful initial paid-conversion review period for today's cohort.

This rerun changed only this local report. No app settings, dashboard configuration, pricing, or customer subscriptions were modified, and no future scheduled task was created.
