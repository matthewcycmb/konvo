# Native Stories row

The iPhone navigation adds a Stories tab beside Messages. Startup still uses
`/direct/inbox/`; the onboarding and purchase flows are unchanged.

An explicit Stories tap opens `/?konvo_stories=1`. The wrapper masks home content
before its first paint and reveals Instagram's existing horizontal Stories row.
It keeps the original circles, labels, ring rendering, scroll container, carousel
arrows, DOM nodes and click handlers. There is no replacement grid, heading,
Refresh button, More Stories button or custom loading page. The bottom Messages
tab remains available while Instagram loads.

Instagram owns playback, viewed state and replies. Konvo does not fetch a private
Stories API or maintain another Instagram session. “Friends” means accounts in
Instagram's following Stories tray, not a separate mutual-follow filter. The
underlying home document still loads; its posts and suggestions stay hidden.

## Pull to refresh — September 29, 2026

A deliberate downward pull on Stories home now reloads Instagram's document
using the existing signed-in session and account-scoped Stories intent. The
page stays vertically locked; only a temporary refresh indicator appears.
Horizontal swipes still belong to Instagram's original carousel. Refreshing
does not remove watched Stories or invent a new ordering: Instagram owns both.

The gesture requires 100px downward travel and release. Short, upward, ambiguous
diagonal, cancelled and multi-finger gestures do not reload. Pulling back below
the threshold cancels. A pull starting on a circle must not also open its Story.
Only one refresh can be pending; a local offline signal preserves the loaded
row and shows an offline message. The 12-second indicator reset does not trigger
another request. Viewers, editors, replies, active modals, paywalls and other tabs
cannot initiate a refresh. Changing routes or backgrounding cancels the gesture.

The existing document-start mask applies after reload, so posts remain hidden.
There is no background refresh, private API or native reload timer. Local tests
exercise the actual touch handlers, session intent, offline/modal gates and
cancel/release behavior. Browser checks use touch events on both native tray
structures at three widths in both themes, asserting one reload request,
unchanged row geometry, no accidental Story click and continued feed isolation.
Live Instagram freshness and physical-device feel have not been tested for this
follow-up. It was subsequently built into 2.0.0 (141), verified against the exact
current JavaScript, installed over the existing app and launched on iPhone 16e.
CoreDevice confirms build 141. No App Store Connect upload was performed.

## Isolation and navigation

- Normal home, Following, Reels and Explore routes still redirect to Messages.
- Story intent is scoped to the signed-in account and cleared on leaving Stories.
- Existing subscription/onboarding checks gate the Stories entry.
- Native Story controls must be inside `main`, outside an article, with a label,
  canvas ring and one avatar. Desktop uses UL/LI; iPhone uses direct DIV children
  in a horizontal carousel. Both are recognized. Post author avatars are excluded.
- The own circle is also recognized by its native image file input plus its plus
  glyph or active ring. It has no aria-label or canvas when no Story is active.
  This works without any friends' Stories. An active first circle in a verified
  tray may have a localized caption rather than a username.
- Visibility is granted to individual native Story controls and carousel arrows,
  never the surrounding home container. Responsive hidden copies remain hidden.
- The native player is the smallest container outside `main` containing a Close
  control and Story media. It may be a DIV or SECTION. Containers containing a
  feed, hidden old Close icons, and header-only avatar containers are rejected.
  The native layout is not replaced or repositioned.
- Unknown home markup stays hidden. No timed reload or login interruption occurs.
  Hidden feed media is paused; Story gestures/playback remain enabled.
- Telemetry records readiness, elapsed time and counts, never friend handles,
  Story URLs, images or message text.

## Validation — 2026-09-28

The regression test failed against the previous custom grid and passed after
switching to the native row. It covers Messages-first startup, explicit Stories
entry, original click handlers, carousel controls, opening/closing the native
viewer, media gestures, feed masking, delayed loading, account/access gates and
cleanup when returning to Messages.

```sh
cd wrapper
npm run test:stories
npm run test:stories:visual
npm run test:wrapper:visual
```

The isolated Chromium checks run the shipped script before the fixture body is
parsed. They pass at 320, 390 and 430 pixels in light/dark mode: original DOM
identity and geometry are preserved, circles stay in one horizontally scrollable
row, duplicate responsive trays remain hidden, posts never paint, the native
player stays interactive, and all five bottom tabs remain accessible. Shared
navigation checks also pass at 375/390/430 pixels.

## iPhone loading regression

Build 132's empty Stories page was reproduced over the USB WebKit inspector on
an iPhone 16e running iOS 26.6.2. Instagram's document was complete, and eight
Stories with eight decoded avatar images were present, but all eight were hidden.
The selector expected `main ul > li > [role=button]`; the actual iPhone carousel
uses direct DIV children. The initial tests copied the desktop structure, so
emulating an iPhone user agent did not cover the real server-rendered mobile DOM.

Opening a native Story exposed the same assumption in the viewer: mobile uses a
DIV portal, and an earlier Close icon remains in the hidden old home document.
The previous `querySelector(...).closest("section")` selected the wrong boundary.
Both mobile patterns now have regression tests that failed before the fixes and
pass afterward. Rendering checks cover both platform structures at three phone
widths in both themes, including hidden duplicate Close icons and feed isolation.

A temporary, memory-only diagnostic on the actual phone revealed all eight
native circles without showing posts. The corrected player detection revealed
the native video, Close button and reply controls. Video time advanced from 0 to
1.098 seconds while unpaused, and the native Close button returned to Stories.
No messages were sent, account storage was not changed, and these diagnostic
classes are discarded when the app process restarts.

Build 133 was then signed, verified against the exact tested JavaScript, installed
over the existing app and launched on the iPhone 16e. The USB inspector initially
reported `/direct/inbox/`. On the unmodified installed app, eight native Story
controls and avatars were visible, with no custom page and no visible feed. A
five-second observation confirmed the native photo Story viewer became visible,
stayed visible and closed back to the eight-circle row. Returning through the
Messages tab cleared the mask; an actual WebKit screenshot confirmed the inbox
and conversations rendered normally. No temporary visibility probes remained.
The native mobile/desktop regression and 12 layout/theme cases, plus shared
navigation/media visual checks, passed. Video advancement was measured in the
pre-install device probe described above; the post-install sampled Story was a
photo, so it is not recorded as a second video-playback measurement.

Device acceptance: Messages opens first; Stories shows only Instagram's native
circles at the top; horizontal scrolling, photo/video playback, pause, reply,
close and return to Messages work. Posts must remain hidden during transitions.
Check slow/no network, light/dark mode and account switching as well.

## Own Story viewing and creation

The native own circle is retained, including its file input and original event
handlers. Konvo does not clone it, add an uploader, call a private posting API,
or publish automatically. Existing own Stories use Instagram's native viewer.
Instagram's current iPhone web picker accepts AVIF, JPEG and PNG photos; this is
not a promise of native Instagram's full video/effects creation feature set.

The Story composer at `/create/story/` preserves the account-scoped Stories
return intent. The old home remains masked during navigation. Only the native
canvas editor (SECTION, direct canvas layers, header toolbar, share footer) and
its dialogs are revealed. Discard or Instagram's successful-share return to `/`
reopens the native Stories row, with feed content still hidden. General post
creation controls remain hidden. Camera and photo-library purpose text includes
Story photos as well as conversations.

Device inspection confirmed the native file-change handler processes an image
locally and navigates to the editor; uploading is a separate Share action. A
generated blue test image opened the actual native editor on iPhone 16e. Close
showed Instagram's Keep/Discard dialog, and the temporary draft was discarded.
Nothing was posted. No real photo library image was read. Regression tests cover
the own circle with no friend Stories, original input/handler preservation, an
active translated own circle, native viewer, editor, discard dialog, return
intent, hidden posts and cleanup. Rendering checks cover all 12 layout/theme/
width combinations, plus the shared navigation layout.

Build 134's signed app was checked for the exact tested embedded JavaScript,
matching extension versions, and updated camera/photo-library descriptions, then
installed over build 133 on iPhone 16e. CoreDevice confirms 1.9.0 (134). The USB
WebKit connection dropped after installation, so the native editor inspection
above predates installation; a final on-device check of the new visibility and
return behavior is pending reconnection. Actual publishing was not tested.

Build 135 subsequently verified the native row and own photo input on the
connected iPhone. Tab switches now retain Instagram's loaded document; the old
home MAIN stays masked during replacement. Repeated Messages/Stories switches
were approximately 106/119 ms with no visible feed articles across the sampled
frames. See [navigation-smoothness.md](navigation-smoothness.md) for measurements,
fallback behavior and the remaining Instagram data-loading delays.

The Stories home page removes the body's bottom-tab padding and hides the root
vertical scrollbar. On iPhone the padding made a 763-point page's body scroll to
827 points, producing an unnecessary right-edge indicator. With the scoped rule,
body scroll/client heights are both 763. The initial horizontal check assigned
`scrollLeft` directly; it did not verify a finger swipe. Other screens retain
their normal padding and scroll indicators.

## Finger scrolling regression

The iPhone's native horizontal overflow container remained `visibility:hidden`
under the feed mask, while its Story controls were explicitly visible. Tapping
and assigning `scrollLeft` worked, but a real touch drag did not. This predated
the vertical-scrollbar rules. The touch-based browser reproduction failed with
the shipped code, then passed after revealing only the verified horizontal
scroll container. Its descendants remain individually masked, so this does not
expose other home content. Container markers are removed when leaving Stories.

The visual regression now dispatches a touch start, a sequence of touch moves
and a touch end, then asserts that the native scroll offset changed. It covers
both desktop-list and iPhone-DIV structures at 320/390/430px in both themes,
alongside the existing feed isolation, player, editor and navigation checks.

On the connected iPhone 16e, a temporary preview of the same visibility rule
restored scrolling in both directions, with native momentum/bounce. The
recording observed the row moving to 1,928px and returning to zero, with no
cancelled events, no visible feed articles and no vertical body overflow.
Version 2.0.0 (137) was then signed and installed with the exact tested script.
After relaunch, inspection confirmed the permanent native-scroller marker,
visible overflow container, no temporary preview and no vertical scrollbar.

## Instagram announcement and vertical page lock

The connected iPhone reproduced Instagram's "The messaging tab has a new look"
modal on Stories home. The feed mask hid its pixels while Instagram retained
the active modal. Its native OK callback removed it without navigation or a
document reload. Stories now acknowledges only this identified, single-action
informational dialog. Recognition uses the observed locale-independent inbox
sprite or both exact English sentences. Dialogs with forms, inputs, links or
multiple actions are excluded, as are login and other non-Stories routes. A
WeakSet prevents repeat clicks while Instagram handles the callback. The new
regression test failed before the fix and passes after it.

Dismissing the popup released Instagram's scroll lock. Its mobile rule
`._ar44 ._ar45 { overflow-y: visible !important }` beat the wrapper's original
one-class body rule, allowing the hidden feed's tall layout to scroll. The
Stories-home body lock now has sufficient specificity, with vertical
overscroll disabled. Story viewers/editors and other tabs retain their own
scrolling. The browser fixture reproduces Instagram's competing rule and tall
hidden feed: a vertical touch moved the body 226px before the fix and stays at
zero afterward; horizontal finger swipes still move the native carousel.

The user confirmed on the iPhone that dismissal restores smooth interaction,
and then confirmed that the vertical-lock preview blocks up/down scrolling
while left/right Story scrolling works. The 12 layout/theme gesture cases,
Stories/announcement unit tests, navigation tests and syntax checks pass. The
full pre-existing regression suite passed on build 137 before these narrowly
scoped announcement/vertical-scroll changes; build 138 contains both fixes.

After installing build 138, the phone opened Messages first. Entering Stories
showed no announcement, a visible native horizontal scroller, body overflow
`hidden`, both vertical offsets at zero, no right scrollbar and no temporary
preview. Replaying the captured announcement markup with a local removal
callback inside the installed WebKit page invoked that callback exactly once;
the temporary replay was then removed. This tests the shipped detector on the
phone; the real Instagram acknowledgement callback was verified separately
before the build, as described above.
