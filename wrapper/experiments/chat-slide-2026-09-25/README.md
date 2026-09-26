# Chat opening slide — build 128

Build 127 routed every thread push through the `push-silent` branch in KonvoStore. A chat therefore replaced the inbox immediately. Build 128 restores the normal native slide for chat pushes and increases the forward duration from 0.20 to 0.32 seconds. Bottom-tab navigation and back-gesture handling retain their behavior.

The zoom correction, stable bottom navigation, original-only onboarding, Screen Time changes, and login handling from build 127 are retained.

## Verification

`test/test_chat_transition_native.js` extracts the actual Swift navigation dispatcher and transition function, compiles them into a temporary UIKit app, and runs them against a local WKWebView on the iOS simulator. It uses synthetic content and no Instagram account. The temporary app is uninstalled after each run.

- Before: thread position was 0 at both 80 ms and 180 ms; the expected slide assertion failed.
- After: thread position was 264.24 points at 80 ms, 113.10 at 180 ms, and 0 at 550 ms. View frame and snapshot cleanup passed. Gesture echo suppression and direct bottom-tab navigation passed.
- `node wrapper/test/test_release_stability.js` passed: stable viewport, read styling, bottom controls, and chat composer clearance.

Run with a booted simulator:

```sh
KONVO_TEST_SIMULATOR=<simulator-udid> npm --prefix wrapper run test:chat:native
```

This verifies the native slide, not Instagram network loading or rendering of every live conversation. The signed archive passed `codesign --verify --deep --strict`; the app and all three extensions have version 1.8.0 (128). Device tools verified build 128 installed on Matty16E (iPhone 16e), and launch succeeded. Installation updated the existing app without uninstalling it.
