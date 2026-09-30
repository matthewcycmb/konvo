# Notes replies and Story transitions — September 29, 2026

## Reproduced on iPhone 16e

The native Notes reply is a fixed `role=presentation` portal on the inbox URL,
not a conversation route. Its contenteditable field occupied y=688–734 points
in a 390×763 webview. Konvo's 64-point tab bar began at y=699 and had a much
higher stacking level. Hit-testing the field's center returned a tab instead
of the field. Hiding navigation only on conversation URLs missed this case.

A frame probe also observed seven frames with a mounted Story video hidden by
Konvo's Stories guard before the player was marked visible. The native player
was waiting for the same 100ms debounce used for scanning the home tray.

## Changes

- Navigation responds to visible native reply portals before paint, including
  portals reused by Instagram. Hidden retained portals do not suppress tabs.
  The original composer, draft, keyboard and send handler remain Instagram's.
- Story player visibility updates in the DOM mutation callback, before paint.
  The slower tray scan is kept out of this path.
- A previously verified player shell stays visible while Instagram replaces
  photo/video nodes. It is released when removed, hidden or no longer on a
  Story route. Hidden copies and containers containing feed content are rejected.
- Instagram's native cube transition briefly mounts two panes. Both verified
  panes remain visible; choosing only the first player hid incoming media.
- Stories still uses Instagram's original controls, horizontal scrolling and
  playback. Feed posts remain masked; no custom player or media API was added.

## Verification

Both new regression tests failed before their corresponding fixes and passed
afterward: `test_note_reply.js` and `test_story_transitions.js`. Existing Stories,
announcement, tab routing, chat handoff, appearance and profile routing tests
also passed.

Isolated browser checks cover Note composer hit-testing at 375/390/430px and
Story rendering, touch scrolling and feed isolation at 320/390/430px in both
themes, with mobile and desktop Instagram markup. The Story suite also checks
visibility at the next animation frame and preservation through media gaps.

On the phone, a temporary preview using the source functions made the native
Note field directly tappable with the tab bar hidden. The sampled Story preview
had zero wrapper-hidden media frames across 75 Story frames. One synthetic
native forward tap returned to the tray; this is not evidence of four successful
consecutive Story advances or a universal frame-rate improvement. No messages,
replies, likes or Stories were sent.

Build 139 was signed, checked for exact tested JavaScript, installed over the
existing app, and confirmed by CoreDevice. Its permanent Notes fix passed live
hit-testing with no preview active. A three-Story interaction test then exposed
a second Story case: 17 frames of incoming video hidden while the outgoing
photo pane remained mounted during Instagram's 3D cube animation. DOM geometry
showed both panes present, with only the outgoing pane marked visible.

The added overlapping-pane regression failed before the second correction and
passed afterward. The corrected preview completed three opens and three native
forward taps, with two explicit closes and one native return to the tray. It
had zero wrapper-hidden media frames across 374 Story frames. This fixes
visibility; maximum frame gaps were similar (86/87ms), so it is not evidence
that all Instagram rendering/network latency has disappeared.

## Final installed build: 2.0.0 (140)

The signed app and all three extensions have matching versions. Verification
confirmed the executable contains the exact tested JavaScript. Installation
preserved existing app data; CoreDevice confirmed version 2.0.0, build 140.

On the installed app, with no preview active:

- Notes: tab bar hidden, center-point hit-testing returns the native reply field.
- Stories: three opens and three forward taps completed without test errors;
  two explicit closes and one native return restored the tray.
- Zero hidden-media frames across 355 sampled Story frames. The frame probe
  does not establish universally smooth rendering or remove Instagram's network
  latency; this measurement confirms the masking defect no longer reproduces.
- Temporary probes removed and the app returned to Messages. No messages,
  replies, likes or Stories were sent.

No App Store Connect upload was performed.

## Follow-up: keep the inbox stationary when opening a Note

The user reported that opening a Note itself moves the whole screen, before
tapping the reply field. The initial fix coupled tab visibility to the body's
64px bottom spacer and duplicate Instagram navigation suppression. Hiding the
tabs removed that spacer. In a scrolled local inbox fixture, body height fell
from 1187px to 1123px and scrollY was clamped from 564px to 500px, moving the
background behind the fixed reply sheet.

The route now controls the layout space independently from button visibility.
A visible reply portal hides only the buttons; it preserves both the spacer
and suppression of duplicate native navigation. Conversation and Story viewer
routes still release the tab layout normally. No viewport resizing, forced
scrolling, focus interception or keyboard behavior was added.

The new geometry regression and spacer regression both failed before this
correction. They pass afterward: opening and closing the fixed Note portal
preserves background geometry and scroll position at 375/390/430px, and the
composer receives taps. Hidden/reused portals, draft preservation, tab routing,
chat handoff, Stories, announcement handling and Story transitions also pass.

This follow-up was tested only with isolated local fixtures, as requested
without USB. It has not been installed on the phone or uploaded. Real iOS
keyboard behavior and Instagram's live sheet animation were not re-tested.

After the user reconnected the phone, the follow-up was built into 2.0.0 (141)
alongside Stories pull-to-refresh and tab feedback. The signed executable was
verified against the exact current JavaScript, then installed over the existing
app and launched on iPhone 16e. CoreDevice confirms version 2.0.0, build 141.
This verifies deployment, not a new live Notes/keyboard interaction test.
