# Login readiness investigation — September 24, 2026

## Findings and limits

The three suspected loading cases in the September 24 audit are signals, not
confirmed root causes. One repeatedly reloaded without a recorded submission;
one took about 12.4 seconds to reach the login route and had no form hint before
leaving; one had no Instagram-side login events after the handoff. The historical
events cannot tell whether a field was visible, covered, or usable. A native
`bg_check: no_session` only means no saved session was available; it is not a
network failure.

A controlled reproduction found a wrapper issue: the boot overlay waited for
`window.load` (or its existing 20-second fallback), even when usable login inputs
were already on the page. The regression holds `window.load` and executes the
shipped cage script. It failed before the readiness fix and passes after it.
This demonstrates the possible failure mechanism, not that it caused all three
historical cases.

One apparent dropout was already authenticated and reached the inbox reveal.
The old once-per-install `login_succeeded` latch missed that explicit onboarding
handoff. It is an existing-session connection, not an unsuccessful login.
Historical raw events have not been rewritten or fabricated.

## Behavior

- Visible, enabled login/code inputs clear Konvo's boot overlay without waiting
  for the entire page to load. Hit testing is released immediately during the
  fade. Invisible inputs do not clear it.
- `login_form_ready` additionally checks that the input can receive a tap; fields
  covered by Instagram's own dialog are not yet reported as ready.
- Loading diagnostics are passive. There is no new timeout, retry, page reload,
  focus change, input clearing, or overlay shown when returning from Passwords.
  Background time does not count toward the foreground loading threshold.
- An explicit onboarding handoff can emit one connection event for an existing
  Instagram session. Ordinary authenticated launches do not emit new onboarding
  conversions.
- Native callbacks retain the existing WebKit navigation delegate and handlers.
  Only explicit onboarding handoffs open the native diagnostic window; connection
  completion closes it. No navigation decision is changed.

## Events and interpretation

These events use the existing native PostHog pipeline, including experiment
variant and build properties. New diagnostics contain only timings, booleans,
fixed stage/domain categories and numeric error codes. They do not contain field
values, passwords, page text, or full URLs.

| Event | Interpretation |
| --- | --- |
| `login_handoff_started` | Native navigation requested for an explicit onboarding handoff. |
| `login_navigation_started` / `login_navigation_finished` | Main-frame WebKit navigation callbacks. Finishing navigation does not prove a usable form. |
| `login_navigation_failed` | WebKit provisional/committed navigation error, with sanitized domain/code and duration when available. |
| `login_navigation_cancelled` | Cancelled navigation, separated from failures; redirects can produce this. |
| `login_form_detected` | First visible, enabled login/code field per stage/document. |
| `login_overlay_cleared` | Overlay released; reason is visible field, load, already loaded, or existing fallback. |
| `login_form_ready` | A visible field passed hit testing; document elapsed time and stage foreground time are separate. |
| `login_loading_slow` | No tappable field after 8 seconds in the foreground for that stage. A diagnostic threshold only; `form_detected` helps distinguish an absent form from an obstruction. |
| `login_left` | Document became hidden, with readiness state and `reason: page_hidden`. This is not proof of abandonment. |
| `login_resumed` | Return to the document, including time away and prior readiness. |
| `login_succeeded` | Includes `returning_user` (prior local connection history) and `connection_type`: `interactive_login`, `existing_session`, or `session_present`. The last means no observed interactive login or previous local history. |

Do not infer unwillingness to sign in from a hidden document, missing submission,
or a short pause. A normal 20–30 second password lookup is compatible with all
three. Interpret the new signals together after release; they cannot retrospectively
resolve missing historical visibility/error evidence.

## Verification and release

- `node wrapper/test/test_login_readiness.js` executes the complete cage with a
  deterministic clock and fixture layout/hit testing. Covers delayed load,
  hidden/covered fields, 30 seconds backgrounded plus 30 seconds foregrounded,
  preservation of typed values, no navigation on pauses, stage-specific timing,
  interactive/returning handoffs, event deduplication and no input capture.
- `npm run test:login:native` (inside `wrapper`) compiles the shipped native
  handlers with an offline event sink and exercises Objective-C callback dispatch.
  Covers forwarding existing callbacks, inheritance, repeat installation,
  cancellation versus failure, privacy, and scoping to the active login webview.
- Native helper code is typechecked against the iOS SDK.
- The complete existing `npm test` suite passed, including the wrapper, original
  onboarding, personalized annual/weekly/special-offer flows, bridge contract,
  loading/handoff regressions, and theme sequence. The focused login regression
  also passed and is now included in `npm test` for subsequent runs.

The fix and new diagnostics require a new app build. They are not included in
the previously uploaded build 126. No build has been uploaded or installed as
part of this change. These are controlled regression tests, not a live Instagram
login on a physical iPhone; Instagram/network delays remain outside this fix.
