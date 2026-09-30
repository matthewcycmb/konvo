# Navigation delay investigation — 2026-09-28

## Release decision — main-tab swipes disabled

At the owner's request, both left-to-right and right-to-left main-tab gestures
are disabled. Their touch listeners are not registered. The bottom-tab buttons,
press feedback and haptics remain; chat-opening transitions, native back on
pushed pages, Story carousel gestures and pull-to-refresh retain their behavior.
The implementation history below describes earlier builds, including installed
build 147; a new build is required to deliver this setting to a phone.

Verification passed: tab routing, Notes reply, haptic feedback, disabled gestures
on all four pages, delayed route commits, Stories rendering/refresh/player
transitions and chat handoff. Isolated Chrome touch checks passed at 375, 390
and 430px widths. Test fixture observers are disconnected before closing jsdom
windows, avoiding a teardown-only callback after the document is destroyed.


## Main-tab swipes — September 29, 2026

Swipe left-to-right on a main page to choose the previous adjacent tab:
own Profile → Notifications → Stories → Messages. Swipe right-to-left for the
next adjacent tab: Messages → Stories → Notifications → own Profile. Bottom buttons still
select any tab. There is no wraparound; the lock remains a sheet action. The gesture uses the existing buttons and native
Instagram router, preserving Stories masking and account identity checks.

Short, diagonal, vertical, multi-finger and cancelled gestures do not navigate.
Horizontal carousels, the Story row, Notes, post media, focused fields, active
reply sheets and modals keep their own gestures. Threads, Story viewers/editors,
Message Requests and other people's profiles retain their existing navigation.
Native edge-back is disabled on these four main pages to prevent competing
history navigation; it remains available on pushed pages.

A committed swipe covers the outgoing content while the destination settles,
then slides that outgoing snapshot rightwards for 160ms over the live destination.
Readiness requires the target route/tab and retirement of the source's rendered
content, followed by two paint frames. A URL change alone is insufficient.
Background DOM mutations do not restart a quiet timer before the slide. The bottom 64pt
tab bar and WKWebView layout stay fixed. Reduce Motion skips the slide. A new
tab tap, backgrounding or failed route releases the cover. Navigation waits at
most 900ms before cancelling an unready transition; a separate native 1.6s cleanup prevents
a lost JavaScript signal from leaving a snapshot stuck. These timers never
reload Instagram. The animation begins on release, not continuously under the
finger; Instagram still owns destination data loading.

Tests cover all six forward/back transitions, untouched outward swipes at the
first/last tab, direction reversals, no wrapping, button selection, one navigation
and one animation per swipe, interruption, keyboard/modal exclusions and
stale-router cleanup. Actual browser touch events pass at 375/390/430px. Story carousel
touches and pull-refresh pass across both native DOM structures and both themes.
The isolated UIKit probe verifies both directions, unchanged webview geometry,
an uncovered tab bar and cancellation/timeout cleanup. It caught delayed first
slide cleanup with a synchronous snapshot update; using already-painted pixels
passed the same check. Device deployment and acceptance are recorded below.

The preceding two-way version, build 2.0.0 (142), was signed, checked for the exact tested JavaScript and
matching app/extension versions, installed over the existing app on iPhone 16e,
and launched. CoreDevice confirms build 142; existing data was preserved.
The post-install inspector connection dropped, and CoreDevice reported the
phone connected over the local network while the USB device list was empty.
The automated live-device swipe probe has not run yet; reconnection/manual
acceptance is pending. No App Store Connect upload was performed.

### One-way swipe follow-up — build 143

The left-to-right-only change passed the focused tab, Notes, Story and chat
handoff suites. Browser touch tests passed at 375/390/430px, including ignored
right-to-left swipes and all three back transitions. The 12 Story rendering
cases passed, covering horizontal scrolling, vertical lock, pull-refresh,
feed isolation and player gestures. Native transition code was unchanged.

Build 2.0.0 (143) compiled and was signed successfully. The install copy was
verified to embed the exact tested JavaScript, with all three extensions using
the matching build number. The first wireless installation attempts failed while the device disconnected.
When it reappeared, build 143 was installed over the existing app and launched
on iPhone 16e; CoreDevice confirms 2.0.0 (143). App data was preserved. USB
inspection was unavailable during that installation. The follow-up below
measured this build after the cable was reconnected.

### Faster back swipes — build 144

Reproduced on the USB-connected iPhone 16e with build 143. Synthetic touch
events exercised the real Instagram tab buttons, router and native bridge;
no conversations or message content were inspected. Across six transitions,
the route changed within 19–56ms, but the reveal command waited 207–481ms
(median 244.5ms), before the separate 200ms UIKit slide. A busy destination
produced 17 DOM mutation batches and the longest delay. There were no document
reloads, moved-bar frames or visible feed-article frames in these samples.

Cause: the reveal debounced *all* body mutations for 80ms and then waited two
paint frames. Notes, badges and unrelated content could restart the debounce
long after the destination was usable. The fix schedules two paint frames once
when the target route is reached; subsequent mutations cannot postpone them.
The route/visibility checks, cancellation and 900ms failure cleanup remain.
The native slide is now 160ms, with a matching 180ms repeat-gesture guard.

A regression exercises the actual swipe handler with continuous DOM updates.
It failed on the old implementation and passes with the fix. Its broad 500ms
budget tolerates host load while detecting a reveal starved until the 900ms
fallback. The native UIKit probe measured 0.2s before the change (failed the
new duration check) and 0.16s afterward (passed), while preserving direction,
fixed webview/tab geometry, and cancellation/timeout cleanup. The focused tab/Notes/Stories/chat suites passed. Browser touch tests passed
at all three phone widths, and all 12 Story rendering/gesture cases passed.
The first Chrome launch failed during simulator startup; the same checks
passed after shutting the simulator down. Build 144 was verified against the exact tested JavaScript and native source,
installed over the existing app on iPhone 16e (preserving data), and launched.
CoreDevice confirms version 2.0.0 (144). A second, redundant archive/export
stage was stopped after the signed install bundle had been copied and verified;
no App Store Connect upload was performed.

The same on-device six-swipe probe then measured reveal requests at
202, 76, 38, 34, 79 and 53ms (median 64.5ms), versus
207, 280, 228, 481, 258 and 231ms (median 244.5ms) on build 143.
That is about 74% less median waiting before requesting the animation.
The first post-install Notifications route itself took 159ms; the wrapper
revealed it 43ms later. Network/cache state differs between runs, so these
samples are not a guarantee for every Instagram page. The change removes
Konvo's restartable wait rather than accelerating Instagram's data loading.

All six destinations were correct, used the same loaded document, kept the
tab bar fixed, and showed zero visible feed-article frames in the probe.
The largest web-frame gap was 63ms (previously 62ms); the clear measured gain
is response latency, not a demonstrated frame-rate gain. Native duration was
separately verified at 160ms in UIKit. Temporary phone instrumentation was
removed; real-finger feel/visual acceptance was requested from the user.

### Live destination handoff — build 145

The user identified the remaining lag during the slide after release. A physical
swipe on build 144 requested the native reveal 27ms after touchend. A 26-second
USB Instruments sample across six synthetic swipes recorded no animation hitches
or potential main-thread hangs over 33ms. This small sample does not prove all
future swipes are hitch-free.

A targeted on-device probe found a different failure in all six transitions:
at `tab-reveal`, the selected tab and sampled visible nodes still belonged to
the source page. Those source nodes were replaced within 80ms. Instagram's URL
had changed before its React page committed. The second native screenshot froze
that stale content throughout the slide, then exposed the newer page at removal.
The earlier latency measurements established quicker bridge calls, not correct
visual readiness.

The readiness check now tracks rendered source elements, including reused MAIN
and retained hidden route trees. Feed-guard visibility masking alone cannot pass
the check. Unknown or stalled markup cancels the cover after the existing 900ms
limit; it never forces a stale slide or reloads the page. Native animation now
moves only the outgoing screenshot, using a transparent cover over the live
WKWebView. The incoming page can continue rendering throughout the 160ms slide.

The asynchronous URL-before-DOM regression failed on build 144's implementation
and passes after this change, including unrelated mutations, reused/replaced
MAIN, role=main, hidden retained pages, masking and stalled navigation. A native
pixel test changes the destination after the slide begins and samples newly
exposed pixels mid-slide: the previous incoming-snapshot behavior fails, while
the live destination passes. Direction, fixed tab/webview geometry, cancellation
and timeout checks also pass. The test slows only its own presentation layer to
sample reliably; production duration remains 160ms.

Focused tab, Notes, Stories and chat handoff suites pass. Browser touch/layout
checks pass at 375/390/430px, and all 12 light/dark Story layout cases pass.
One Story test initially compared horizontal position while claiming to test
vertical lock; residual carousel momentum moved X by one pixel with unchanged
Y/size. Its vertical assertion now checks Y and dimensions, retaining the
independent horizontal finger-scrolling assertion.

Build 2.0.0 (145) is signed and verified to contain the exact tested JavaScript
and matching app/extension versions. It was installed over the existing app on
iPhone 16e, preserving its data, and launched successfully. CoreDevice confirms
version 2.0.0 (145), process 8497. Installation used the available paired-device
connection; the USB device list was empty and WebKit inspection unavailable.
The post-fix live-device swipe check remains pending. No temporary probes were
injected in this installation session, and no App Store upload was performed.

### Restore forward swipes — build 146

The user accepted build 145's swipe and requested the same behavior in the other
direction. Right-to-left now advances to the next main tab, mirroring the
existing back swipe. Both use the same source-content readiness check, two
paint frames, 160ms native outgoing-page animation, and 180ms cooldown. Native
animation code is unchanged from build 145; its `next` branch already moves
the outgoing page left over the live destination.

The initial horizontal direction locks the gesture; reversing past its start
or retreating below the threshold does not navigate. There is no wrap past
Messages/Profile, and the lock button remains a sheet rather than a page.
Stories/Notes carousels, media, reply sheets, focused inputs and pushed routes
retain their own gestures. Tests now exercise six routed transitions and
asynchronous URL-before-DOM commits in both directions.

The forward-route regression fails against the previous one-way handler and
passes after this update. Tab/Notes, Stories and chat handoff suites pass, as do
browser touch checks at 375/390/430px and all 12 Story layout/gesture cases.
Build manifests confirm the native animation and onboarding source hashes match
the user-approved build 145 exactly.

The signed build 2.0.0 (146), including three matching extensions and the exact
tested embedded JavaScript, was installed over Konvo on iPhone 16e and launched.
CoreDevice confirms version/build 2.0.0 (146), process 8508. Existing app data
was preserved. USB WebKit inspection was unavailable, so no on-device automated
gesture probe ran; physical acceptance of the new forward swipe remains pending.

### Div-only inbox recognition — build 147

The user reported right-to-left lag on build 146. A USB probe on the iPhone 16e
reproduced Messages → Stories changing URL in 23ms, then sending `tab-cancel`
at exactly 900ms, with no `tab-reveal`. The other forward transitions revealed
at 84/172ms and the three backward transitions at 123/213/130ms. All six retained
the document, held the bar fixed and showed no feed articles. Web frame gaps
were similar across directions (46–68ms); the clear asymmetry was the 900ms
fallback when leaving Messages.

Read-only layout inspection confirmed the inbox had zero `main`/`role=main`
elements and a visible DIV app root. The readiness detector required a main,
making readiness impossible for that source layout. Returning to Messages
worked because its source was Stories, which has a main. The shared UIKit slide
duration was not the cause of this reproduced pause.

The detector now recognizes rendered native inbox content inside a body-level
DIV tree, excluding Konvo-owned UI. It still waits for the old content to retire;
URL changes alone cannot start the slide. Roots without their own layout box
(display:contents) do not bypass that requirement. The existing hidden-source,
background mutation, cancellation and 900ms recovery behavior remain covered.
Native animation source is unchanged.

New regressions fail on build 146 and pass after the fix, including a retained
DIV app root, asynchronous route commits and display:contents. Browser touch
tests now start with a div-only inbox at three widths. Focused tab/Notes,
Stories and chat handoff checks pass. The previous synthetic inbox used main,
which explains why its forward swipe tests missed the real-device layout.

Build 2.0.0 (147) was signed, verified against the tested embedded JavaScript,
installed over the existing iPhone 16e app and launched (PID 8602). Both the
post-launch and repeated six-swipe USB runs completed without cancellations,
reloads, moving-bar frames, visible feed-article frames or backgrounding.
Messages → Stories requested its slide at 474ms after launch and 341ms in the
repeat; the remaining repeated forward transitions took 97/138ms and backward
ones 130/177/139ms. The permanent 900ms timeout/abrupt reveal is removed. These
measurements do not establish identical loading time across pages: Stories
still had a longer pre-slide wait, and the initial run had a 181ms web-frame
gap (repeat maximum 83ms). Native slide code/duration remains unchanged.

An intermediate temporary annotation comparison was unusable and was excluded
from the results. Inspector attachment also briefly timed out during the warm
check; after recovery the complete repeat above succeeded. All temporary phone
observers were removed, and Konvo was returned to Messages. No messages or
Stories were posted, no account data was reset, and no store upload occurred.

## Tab feedback follow-up — September 29, 2026

Bottom tabs now compress subtly during a press and return with a short spring
curve. The selected highlight has a soft inset edge in both themes. Navigation
still runs immediately; feedback adds no timer or animation gate to routing.
Reduce Motion removes the scale and transitions, and keyboard focus remains
visible. The original tab layout and tap target sizes are retained at rest.

A committed selection uses the existing native light-impact haptic bridge.
Dragging away, tapping the current tab, a disabled lock or an already-pending
profile lookup does not vibrate. There is no new native dependency. Local tests
verify one bridge request per eligible tap and immediate route delegation;
browser input checks verify compression, restored geometry and Reduce Motion
at three phone widths. Physical haptic feel still needs device verification.
This follow-up was subsequently built into 2.0.0 (141), verified against the exact
current JavaScript, installed over the existing app and launched on iPhone 16e.
CoreDevice confirms build 141. No App Store Connect upload was performed.

## Reproduced on iPhone 16e, build 134

The bottom-tab handler delegated to a native Instagram link when present, then
fell back to `location.assign`. The mobile inbox rendered no native links for
the other tabs. Opening Notifications therefore replaced the entire document,
restarted Instagram's application, and discarded its in-memory navigation state.
Stories also deliberately reloaded in both directions to prevent an old home
feed from flashing during React's asynchronous route replacement.

Measurements used USB WebKit inspection, real tab handlers, document time origin,
rendered content markers and decoded-image counts. Sampling is approximately
120 ms; these are individual observations, not a controlled network benchmark.
The measurements do not read message text or Story content.

- Messages → Notifications, normal build 134 tap: new document by 254 ms,
  application shell by 854 ms, notification rows by 2,386 ms.
- Same destination using Instagram's existing router: same document, shell by
  128 ms, notification rows by 1,330 ms. Cache/network conditions may differ.
- Notifications → Messages through a native link: same document, rows by 640 ms.
- Profile → already-loaded Messages: same document, rows by 158 ms.
- Messages → Stories, build 134: new document by 251 ms, nine native Story
  controls by 1,563 ms. Background home content continued loading afterward.
- Already-read chat: destination route at 31 ms, composer and message groups at
  526 ms, native slide request at 552 ms. The wrapper added about 26 ms after the
  usable shell. The existing 220 ms native slide is unchanged. Three web frames
  exceeded 35 ms during this sample; the largest gap was 82 ms.

## Change

Tab navigation still prefers Instagram's native links, limited to the same
origin. If a link is absent, it uses Instagram's already-initialized navigation
adapter (`browserHistory_DO_NOT_USE`, with a live Comet dispatcher). This is the
router used by Instagram's own Story creation flow, not raw `history.pushState`
with invented state. Missing/changed/uninitialized/throwing adapters fall back to
a normal document load. No timer reloads a healthy slow navigation.

Stories uses the same router. Before leaving, the exact old home MAIN is masked
until its old articles and Story controls leave the DOM. The cleanup observer
disconnects when its work is done; hidden responsive/previous trees are excluded.
Reusing the MAIN for new content releases the mask. Returning to Stories clears
the old mask only after the document's Stories guard is active again.

Tabs provide immediate pressed feedback and declare `touch-action: manipulation`.
Tapping the current tab, including a trailing-slash equivalent, does nothing.
Messages remains the launch destination. Chat handoff, login, onboarding, purchase
behavior and read-state handling are unchanged.

There are no extra hidden webviews or background requests to preload messages.
Instagram continues to own its data cache, read state and freshness. Its server
latency and first-time data loads remain outside Konvo's control.

## Regression checks

`test_tab_navigation.js` failed against build 134's routing and passes after the
fix. It exercises the shipped tab handlers: missing links, native-link priority,
external same-path links, uninitialized/missing/throwing router fallback, Stories
departure before DOM replacement, reused MAIN cleanup and repeated-tab taps.
Stories rendering covers native desktop/mobile structures at 320/390/430 pixels
in both themes, including a stale hidden home tree and an asynchronous departure
without exposing its feed. Shared navigation, chat handoff, profile resolution
and appearance checks pass.

## Installed build 135

The signed 1.9.0 (135) app and all three extensions were verified, including an
exact byte match of the tested embedded JavaScript, installed over the existing
app, and launched on iPhone 16e. The full archive/export also succeeded.

On the unmodified installed build, all tested tab routes retained the same
document time origin. Messages remained the launch destination.

| Device check | Observed readiness |
| --- | ---: |
| First Notifications list | 1,842 ms (shell at 394 ms) |
| Notifications → loaded Messages | 184 ms |
| First Stories visit | 1,777 ms |
| Repeated Messages → Stories | 106 ms |
| Stories → loaded Messages | 119 ms |
| Stories → own Profile | 415 ms |
| Repeated Notifications list | 1,560 ms (shell at 143 ms) |

First Stories loading did not improve in this sample versus build 134's 1,563 ms;
Instagram's initial data fetch still dominates. The repeat-visit result and
unchanged document time origin confirm the benefit of retaining loaded state.
Notifications still requests fresh data on repeated visits. These small samples
do not establish a universal percentage speedup.

Frame-by-frame checks observed zero visible feed articles across 176 frames
leaving Stories and 180 frames entering it again. The old-home mask and its
cleanup completed, nine native Story controls were visible, and the own-circle
photo input remained present. No custom Story UI was introduced.

The final read-chat sample showed composer/messages at 293 ms and exactly one
slide request at 320 ms (27 ms later), with a maximum web frame gap of 47 ms.
The chat animation itself was not modified; network/cache conditions differ
from the earlier sample, so this is a regression check, not an attributed chat
speedup. No messages or Stories were posted. The phone was returned to Messages
and the temporary timing probes were removed.
