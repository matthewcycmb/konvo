Konvo trial cancellation follow-up, September 26, 2026

Two of the seven canceled trial users continued opening chats hours after cancellation. One other user generated a later app-launch event without a chat opening. All seven had successfully rendered message rows before canceling. These observations do not support treating all seven cancellations as immediate abandonment or inability to load messages.

This is a one-off analysis of the same 11 RevenueCat-confirmed OG/control trial starters from the preceding onboarding audit, using live PostHog queries. The cohort is fixed, not a fresh selection of whoever currently has a trial. Observation ends September 26 at 7:50 p.m. Vancouver time (September 27, 02:50 UTC). All native rows in this extraction report build 126. Seven still have a cancellation event; no trial conversion or uncancellation event was observed for these 11 by the cutoff.

| Anonymous user | Time from trial start to cancellation | Chat openings before cancellation | Chat openings after cancellation | Later behavior |
|---|---:|---:|---:|---|
| T11 | 2 minutes | 9 | 6 | Four later readiness events confirm rendered messages. Chat openings continued about 6.2 hours after cancellation. |
| T10 | 16 minutes | 4 | 7 | All seven later readiness events confirm rendered messages. Chat openings continued about 22.1 hours after cancellation. |
| T09 | 23 minutes | 3 | 0 | No later launch or new chat opening recorded across approximately 41 hours of follow-up. |
| T03 | 30 minutes | 4 | 0 | No later launch or new chat opening recorded across approximately 90 hours of follow-up. |
| T05 | 7 hours 26 minutes | 5 | 0 | One app-launch event about 50.9 hours after cancellation; no later chat opening or inbox-readiness event. Approximately 57 hours observed after cancellation. |
| T07 | 48 hours 53 minutes | 21 | 0 | No later launch or new chat opening; only about seven hours of follow-up. A chat opened 0.215 seconds before the cancellation timestamp and finished rendering 1.208 seconds afterward, which is not evidence of a return visit. |
| T01 | 84 hours 21 minutes | 1 | 0 | No later launch or chat opening recorded across approximately 14 hours of follow-up. |

“Chat openings” counts navigation events, not distinct conversations, messages sent, or confirmed reading. People can open the same conversation repeatedly. Timing is rounded, and native versus RevenueCat timestamps should not establish subsecond causality.

The four cancellations within an hour split evenly: two users continued opening chats later, and two had no later launch/chat-opening events by the cutoff. For the two continuing users, some later chat openings occurred at least 30 minutes after cancellation, alongside subsequent app-launch events. This avoids treating immediate continuation of the original interaction as a later visit.

The comparison group also matters. Of the four trial users without a recorded cancellation:

- T04 had five chat openings with rendered messages, including activity more than a day after starting.
- T06 had 21 chat openings with rendered messages across three UTC dates, including activity more than a day after starting.
- T08 had 19 chat openings with rendered messages across two UTC dates, all within the first 19 hours.
- T02 had no chat-opening event and no later tracked app launch after the initial onboarding. Approximately 93 hours had elapsed since trial start. This person should not be called an engaged user solely because renewal was still enabled.

Technical evidence:

- Ten of the 11 users opened at least one chat after starting their trial. All seven canceled users did so before cancellation.
- There were 105 chat-opening events and 103 chat-readiness events after trial start. All 103 readiness events reported at least one message row. A composer was present on 102 of them. The missing two readiness events follow rapid navigation; absence alone does not establish a failed load.
- Median recorded readiness time was 551 ms. Ninety-six of 103 were under one second. The maximum was 3.072 seconds, for T11 roughly 43 minutes after cancellation. That isolated slower load therefore cannot explain that user's earlier cancellation.
- No `thread_stalled`, `thread_reload`, `stall_hint_shown`, `login_loading_slow`, or product/store failure event was observed for the cohort in the queried interval.
- Four people had classified login errors before starting their trial. All subsequently logged in successfully. Three of these four later canceled. One additional canceled user had a `cage_error` before trial start, then successfully loaded a chat. These earlier errors do not establish a cancellation cause.
- There were no recorded login-error or cage-error events after trial start. Missing telemetry does not prove the app was faultless: the instrumented events do not measure every visual glitch or successful message send.
- All seven RevenueCat cancellation reason fields were `UNSUBSCRIBE`. This identifies the billing action, not the user's motivation or a price objection.

An additional interruption worth reviewing: `review_asked` fired for 10 of the 11 users, approximately 18 seconds to 2.8 minutes after trial start. The source requests a review after the first opened chat and return to the inbox; it no longer waits for multiple usage days. This event confirms that Konvo requested the system review prompt, not that Apple displayed it or the user submitted a rating. There is no causal evidence linking the prompt to cancellation. Moving the request after repeated successful use would be a separate, reasonable experiment.

Interpretation and recommended action:

1. Separate cancellation of renewal from ongoing product use. T10 and T11 show that canceling can coexist with continued use of functioning chats. Avoiding an automatic charge is a plausible explanation, but neither price concerns nor that motivation is proven by the event stream.
2. Keep the seven-day trial while these users reach their scheduled first-charge dates. This investigation provides no evidence that shortening the trial or increasing the price would fix the cancellations.
3. Examine activation and continued use for both canceled and uncanceled users. The five canceled users without later chat openings differ: one has a launch-only return, one had already used chats across three UTC dates, and observation windows vary. Do not label them all immediate abandoners.
4. Add or use voluntary cancellation feedback to learn motives. No messages were sent and no feedback collection was added during this audit.
5. Consider moving the review request later. Continue assessing price with a separate experiment that holds onboarding and trial terms constant.

How the numbers were derived:

The prior audited cohort was reconstructed from its exposure/trial records. Live PostHog event names and relevant properties were checked before querying. Events were joined through resolved PostHog person IDs, then returned under anonymous labels T01–T11. No message text, usernames, conversation IDs, or full URLs were requested.

The extraction used a bounded September 22–27 UTC interval and explicitly paginated 500 + 500 + 28 rows, because the MCP query tool capped each response at 500 rows even when a larger limit was requested. All 1,028 selected rows were processed. The 11 trial starts and seven cancellations match the fixed prior cohort.

`thread_opened` is emitted when the route enters a conversation. `thread_ready` records rendering time, message-row count and composer presence. Neither event proves that a message was sent or read. `app_opened` uses a sessionStorage guard; it is not a complete foreground/resume tracker, so this report does not infer an exact count of visits from launches. Background checks and push setup/registration events were excluded from engagement evidence. The inbox thread-link counter is not used as evidence of an empty inbox because DOM structure can affect it.

PostHog sources:

- https://us.posthog.com/project/569146/dashboard/2117717
- https://us.posthog.com/project/569146/experiments/465606
- Identity and aliasing: https://posthog.com/docs/integrate/identifying-users

Source-code definitions inspected:

- `wrapper/src-tauri/src/cage.js`, `thread_opened` / `thread_ready`, approximately lines 1234–1264.
- `wrapper/src-tauri/src/cage.js`, `app_opened`, approximately lines 3744–3752.
- `wrapper/src-tauri/src/cage.js`, `maybeAskReview`, approximately lines 1138–1153.

Apple's review-prompt guidance recommends waiting for engagement and avoiding onboarding prompts: https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews

Only this report and anonymous summaries were written. No app behavior, pricing, subscription status or PostHog configuration was changed. Customer-ID mappings remain in private temporary files.
