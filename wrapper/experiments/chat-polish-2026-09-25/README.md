# Chat, profile and appearance — 1.8.0 (129)

## Diagnosis

- Live iPhone 16e inspection found the legacy `konvoMe` value was `Notifications`. The original profile resolver accepted arbitrary short page headings as usernames. A regression fixture reproduced navigation to `/Notifications/`.
- A live read-conversation trace showed the destination DOM changed 29 ms before the native route report. The composer and 34 message groups appeared another 343 ms after the slide started. Build 128 therefore animated a partial page and finished before the chat was ready.
- Notifications was dark during live inspection. The earlier light screenshot was not reproduced in that session. A separate failing regression showed that a signed-in user with the completed-onboarding flag but no subscription cache did not restore native system appearance on a new document.
- The account-info endpoint returned HTTP 429 on the device. The profile fix uses Instagram's existing inbox account switcher, verified from the live DOM, and performs no additional account API requests.

## Changes

- Capture the outgoing inbox before Instagram routes a conversation, keep it visible during the DOM replacement, then slide the rendered chat in over 0.22 seconds. The JS wait is capped at 650 ms and the native cover has an independent one-second release. Backgrounding and cancelled navigation release the cover.
- Scope cached usernames to the current Instagram account. Use the inbox account-selector heading and chevron, never arbitrary page text. If an account identity is unavailable, return to the inbox to resolve it and resume the profile tap.
- Share appearance state between login and onboarding and restore the phone's appearance on authenticated documents, including users without a purchase cache.

## Before-build verification

- Real UIKit + WKWebView simulator test: deliberately replaced the inbox with an incomplete white page for 350 ms. The outgoing snapshot stayed above it; the slide settled by 300 ms, preserved the viewport, and removed temporary views. Back-gesture echo and direct-tab tests passed.
- Chat handoff fixture: prepare precedes routing, delayed composer holds the slide, only one push is emitted, cancelled navigation releases the snapshot.
- Profile fixtures: corrupt old cache, account-scoped cache, real inbox heading shape, Notifications, and recovering a missing account identity.
- Live updated profile handler: reached the user's own profile; the account-specific cache matched; Edit profile was present; dark mode and dark page background remained active.
- Appearance fixture: system mode restored on inbox, profile, and notifications; the build-128 baseline failed the completed-onboarding/no-purchase-cache case.
- Browser rendering passed at 375, 390 and 430 points: stable four-button navigation, composer clearance, distinct read/unread styling and uncropped shared media.

All regression suites listed in `regression-results.json` passed before archiving. The signed archive contains matching current source, version 1.8.0 (129) for the app and its three extensions, and passed deep/strict signature verification. Build 129 is installed and launched on the iPhone 16e with existing app data preserved. The post-install live smoke test is pending a USB reconnection; the pre-build physical-device and simulator results above are complete. Instagram network response times remain external; the change covers the partial render, rather than claiming network latency has disappeared.
