// Konvo Wrapper: a caged instagram.com for the things the official
// API can never do — starting new conversations, group chats, and (on iOS)
// DMs for private accounts. Cage rules: no feed, no reels feed, no explore.
// Profiles, stories, and single posts stay reachable — people-shaped
// surfaces, not the algorithm's.

use tauri::utils::config::Color;
use tauri::{Url, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_deep_link::DeepLinkExt;
#[cfg(target_os = "macos")]
use tauri::Manager;

/// Runs at document-start on every page. Block-list, not allow-list: only the
/// actual feed surfaces (home, reels, explore, media viewers, profiles)
/// redirect to the inbox. Login, two-factor, onetap, accounts, and every
/// /direct page are left completely alone, so the auth flow never gets
/// interrupted. Redirect is deferred to the SPA router (assign, not replace
/// at parse time) to avoid blanking.
const CAGE_SCRIPT: &str = concat!(include_str!("onboarding-views.js"), "\n", include_str!("onboarding-experiment.js"), "\n", include_str!("cage.js"));

/// Navigation gate: allow all web navigation so Meta's login / new-device
/// verification chain (which bounces across Meta domains and can hop to
/// external verification like reCAPTCHA) is never cancelled. The *feed* cage
/// is enforced by CAGE_SCRIPT on the main Instagram host, not here — a host
/// allow-list was stranding the login flow on a blank page.
/// "tauri" is the bundled splash page the webview starts on.
fn allowed(url: &Url) -> bool {
    matches!(url.scheme(), "http" | "https" | "about" | "data" | "blob" | "tauri")
}

// Present as Safari for the platform so Instagram's login isn't rejected as
// an unsupported in-app browser. iOS gets the iPhone UA so Instagram serves
// its mobile web layout.
//
// The Version/ token is derived at runtime so it matches the WebKit actually
// rendering the page; the hardcoded 17.4 it replaced was nine major versions
// behind on macOS 26 and would go stale again every release. The Macintosh/
// 10_15_7 and AppleWebKit/605.1.15 tokens are frozen in real Safari too, so
// those stay literal.
//
// NOTE for anyone debugging a login loop here: an `e=1348020` redirect loop
// out of /auth_platform/ is NOT a wrapper problem, and the UA is not the
// lever. It was chased at length on 2026-07-25 and traced to a single stuck
// Instagram account, which failed identically in Safari and in a clean Chrome
// profile on the same machine. A healthy account completes the whole
// new-device flow in this wrapper — reCAPTCHA image challenge, WhatsApp/SMS
// two-factor, "trust this device" — and lands in the inbox. Check the account
// against another browser before touching this code.

/// Version to claim when the installed Safari can't be read.
#[cfg(target_os = "macos")]
const FALLBACK_SAFARI_VERSION: &str = "26.5";

#[cfg(target_os = "macos")]
fn user_agent() -> String {
    let version = std::process::Command::new("defaults")
        .args([
            "read",
            "/Applications/Safari.app/Contents/Info.plist",
            "CFBundleShortVersionString",
        ])
        .output()
        .ok()
        .filter(|out| out.status.success())
        .and_then(|out| String::from_utf8(out.stdout).ok())
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty() && v.chars().all(|c| c.is_ascii_digit() || c == '.'))
        .unwrap_or_else(|| FALLBACK_SAFARI_VERSION.to_string());
    format!(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 \
         (KHTML, like Gecko) Version/{version} Safari/605.1.15"
    )
}

#[cfg(target_os = "ios")]
fn user_agent() -> String {
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 \
     (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
        .to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let tauri_builder = tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        // Links friends send in DMs: the cage hands them to the real browser
        // rather than opening them inside the app, which has no tabs, no back
        // button, and no business rendering canva.link.
        .plugin(tauri_plugin_opener::init());
    // Native notifications are macOS-only: the Mac app keeps running while
    // hidden, so its webview can watch for unread DMs. iOS suspends the
    // webview on background, so there is nothing there to register.
    #[cfg(target_os = "macos")]
    let tauri_builder = tauri_builder.plugin(tauri_plugin_notification::init());
    // WebKit kills the webview's content process under memory pressure while
    // the app is backgrounded (routinely on iOS, rarely on macOS). Nobody
    // recovers from that by default: reopening the app found a webview with
    // no renderer behind it and showed a permanent black void - no splash,
    // no logo, nothing to tap. Intermittent by nature, because it needs iOS
    // to have evicted the process while suspended. reload() relaunches the
    // content process at the current URL, so a signed-in user lands straight
    // back in the inbox; CAGE_SCRIPT re-injects on the new document.
    #[cfg(any(target_os = "macos", target_os = "ios"))]
    let tauri_builder = tauri_builder.on_web_content_process_terminate(|webview| {
        let _ = webview.reload();
    });
    tauri_builder
        .setup(|app| {
            // Dedicated internal TestFlight/device preview. Never enabled for an
            // App Store release; the production experiment stays independently gated.
            #[cfg(all(target_os = "ios", feature = "onboarding-preview"))]
            unsafe {
                if let Some(cls) = objc2::runtime::AnyClass::get(c"KonvoStore") {
                    let _: () = objc2::msg_send![cls, enableOnboardingPreview];
                }
            }
            // Start on the bundled splash, not on instagram.com directly.
            // instagram.com begins with a network round-trip, and until its
            // response arrives there is no document for CAGE_SCRIPT to paint
            // into — which showed as a dead black window on every cold
            // launch. The splash paints from disk on the first frame, then
            // navigates; the in-page boot overlay takes over seamlessly at
            // instagram's document-start.
            // The konvo-beta cargo feature marks a tester build. Testers now
            // walk the REAL funnel and see the REAL paywall - skipping both
            // taught us nothing: 18 testers produced zero onboarding and zero
            // pricing data. What the flag buys them is a "Free during beta"
            // button on the wall, so nobody is charged.
            //
            // The safety is structural, not a switch someone has to remember:
            // the bypass is compiled in ONLY under this feature, so a store
            // build does not contain it and no remote config can conjure it.
            // The cage-patch can still switch it OFF mid-beta
            // ({"betaFree": false}) if a build ever leaks.
            // A feature, not an env var: xcodebuild rebuilds the script
            // phase env from build settings, so an env var dies before
            // cargo; --features rides the tauri CLI all the way through.
            let cage: std::borrow::Cow<str> = if cfg!(feature = "onboarding-preview") {
                format!("window.__konvoOnboardingPreview=true;try{{window.__konvoOnboardingPreview=sessionStorage.konvoPreviewCompleted!==\"1\";}}catch(e){{}}\n{CAGE_SCRIPT}").into()
            } else if cfg!(feature = "konvo-beta") {
                format!("window.__konvoBeta=true;\n{CAGE_SCRIPT}").into()
            } else if cfg!(feature = "konvo-free") {
                format!("window.__konvoFree=true;\n{CAGE_SCRIPT}").into()
            } else {
                CAGE_SCRIPT.into()
            };
            let builder = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::App("index.html".into()),
            )
            .initialization_script(cage.as_ref())
            // Sets both the window and the webview. On the Mac this is what
            // stopped the white -> black launch flash. On iOS this color is
            // what shows between documents - the splash hands off to
            // instagram.com and the webview has nothing to paint until the
            // response arrives - so it must match the light funnel around
            // it, or every relaunch flashes a black hole inside the white
            // letterbox. The letterbox itself is the root view, painted
            // with dynamic systemBackground in the block below.
            .background_color(if cfg!(target_os = "ios") {
                Color(255, 255, 255, 255)
            } else {
                Color(0, 0, 0, 255)
            })
            .on_navigation(|url| allowed(url));

            // Only Apple platforms get an override. WebView2 on Windows
            // already reports a genuine Edge-on-Windows UA, so the old shared
            // constant had the Windows build claiming to be Safari on a Mac.
            #[cfg(any(target_os = "macos", target_os = "ios"))]
            let builder = builder.user_agent(&user_agent());

            #[cfg(desktop)]
            let builder = builder
                .title("Konvo")
                .inner_size(1100.0, 760.0);

            let window = builder.build()?;

            // iOS: wry builds the WKWebView at the parent view's full frame, so
            // the layout viewport spans the status bar and the home indicator —
            // Instagram's header paints under the clock, where the system owns
            // the pixels and the back arrow can't be tapped.
            //
            // This has to be fixed here rather than in CAGE_SCRIPT. Instagram
            // sizes its shell in vh, which always resolves to the full screen,
            // so no padding or height we set on an ancestor can reclaim the
            // space; the webview itself has to be smaller. Constraints against
            // the safe-area guide resolve at layout time, unlike safeAreaInsets,
            // which still reads zero this early in setup.
            #[cfg(target_os = "ios")]
            {
                use objc2::runtime::{AnyObject, Bool};
                use objc2::msg_send;

                let _ = window.with_webview(|webview| unsafe {
                    let wk: *mut AnyObject = webview.inner().cast();
                    let vc: *mut AnyObject = webview.view_controller().cast();
                    let root: *mut AnyObject = msg_send![vc, view];
                    // Preview always starts on the white onboarding hero, including safe areas.
                    #[cfg(feature = "onboarding-preview")]
                    {
                        let _: () = msg_send![vc, setOverrideUserInterfaceStyle: 1isize];
                        let white: *mut AnyObject = msg_send![objc2::class!(UIColor), whiteColor];
                        let _: () = msg_send![root, setBackgroundColor: white];
                    }
                    let guide: *mut AnyObject = msg_send![root, safeAreaLayoutGuide];

                    // Hand sizing to Auto Layout; wry set a flexible
                    // autoresizing mask that would otherwise fight these.
                    let _: () = msg_send![
                        wk,
                        setTranslatesAutoresizingMaskIntoConstraints: Bool::NO
                    ];

                    let pin = |a: *mut AnyObject, b: *mut AnyObject| {
                        let c: *mut AnyObject = msg_send![a, constraintEqualToAnchor: b];
                        let _: () = msg_send![c, setActive: Bool::YES];
                    };
                    pin(msg_send![wk, topAnchor], msg_send![guide, topAnchor]);
                    pin(msg_send![wk, bottomAnchor], msg_send![guide, bottomAnchor]);
                    pin(msg_send![wk, leadingAnchor], msg_send![guide, leadingAnchor]);
                    pin(msg_send![wk, trailingAnchor], msg_send![guide, trailingAnchor]);

                    // The letterbox above and below the pinned webview is
                    // this root view. systemBackground is dynamic, so it
                    // tracks whatever appearance the view controller is in.
                    let sysbg: *mut AnyObject =
                        msg_send![objc2::class!(UIColor), systemBackgroundColor];
                    let _: () = msg_send![root, setBackgroundColor: sysbg];

                    // No appearance pin at launch (Aug 16): the whole
                    // onboarding follows the system scheme now, so the
                    // first frame is the phone's appearance for everyone.
                    // The S5-S7 dark stretch still pins via the bridge.

                    // The webview's own background (visible between
                    // documents, e.g. splash -> instagram.com) follows the
                    // same dynamic color as the letterbox, so neither path
                    // ever flashes the wrong shade.
                    let _: () = msg_send![wk, setOpaque: Bool::NO];
                    let _: () = msg_send![wk, setBackgroundColor: sysbg];
                    let _: () = msg_send![wk, setUnderPageBackgroundColor: sysbg];

                    // Long-press never pops Safari's link preview sheet.
                    // Back-swipe and tap-to-dismiss are native gestures in
                    // KonvoStore.swift: WebKit's own back-forward swipe
                    // animates a stale snapshot over Instagram's SPA and
                    // glitches on handoff, so it stays off. Dragging the
                    // chat down also slides the keyboard away, like the
                    // native app.
                    let _: () = msg_send![wk, setAllowsLinkPreview: Bool::NO];
                    let sv: *mut AnyObject = msg_send![wk, scrollView];
                    // UIScrollViewKeyboardDismissMode.interactive = 2
                    let _: () = msg_send![sv, setKeyboardDismissMode: 2i64];

                    // The paywall's StoreKit bridge. KonvoStore.swift (in
                    // gen/apple/Sources) implements WKScriptMessageHandler;
                    // registering it here exposes it to CAGE_SCRIPT as
                    // window.webkit.messageHandlers.konvoStore. Looked up by
                    // name, not linked: a binary built without the Swift
                    // file simply has no bridge, and the paywall's
                    // entitlement check no-ops instead of crashing.
                    if let Some(cls) = objc2::runtime::AnyClass::get(c"KonvoStore") {
                        let config: *mut AnyObject = msg_send![wk, configuration];
                        let ucc: *mut AnyObject = msg_send![config, userContentController];
                        let handler: *mut AnyObject = msg_send![cls, new];
                        let name: *mut AnyObject = msg_send![
                            objc2::class!(NSString),
                            stringWithUTF8String: c"konvoStore".as_ptr()
                        ];
                        let _: () = msg_send![ucc, addScriptMessageHandler: handler, name: name];
                    }
                });
            }

            // macOS: the red × hides the window instead of quitting, so the
            // app stays in the Dock and reopens instantly (⌘Q still quits).
            #[cfg(target_os = "macos")]
            {
                let hide_target = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = hide_target.hide();
                    }
                });

                // Menu bar icon: one click brings the hidden window back, the
                // same job as the Dock icon but always on screen. No menu —
                // the only action Konvo has is "show me my messages".
                // tray.png is a template image (black + alpha, generated
                // monochrome bubble): macOS recolors it to match the menu bar
                // theme, like every system icon. The colored app icon was
                // tried first and read as noise next to the monochrome row.
                let tray_target = window.clone();
                tauri::tray::TrayIconBuilder::new()
                    .icon(tauri::image::Image::from_bytes(include_bytes!(
                        "../icons/tray.png"
                    ))?)
                    .icon_as_template(true)
                    .on_tray_icon_event(move |_, event| {
                        if let tauri::tray::TrayIconEvent::Click { .. } = event {
                            let _ = tray_target.show();
                            let _ = tray_target.set_focus();
                        }
                    })
                    .build(app)?;
            }

            #[cfg(all(debug_assertions, desktop))]
            window.open_devtools();

            // instamessages://open           → just bring the app forward.
            // instamessages://dm/<username>  → and jump to that DM composer.
            // In `scheme://host/path`, the first segment is the *host*, not the
            // path — so branch on it. Anything unrecognized surfaces the window
            // where it was rather than being read as a username.
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    if url.scheme() != "instamessages" {
                        continue;
                    }
                    let user = match url.host_str().unwrap_or("") {
                        "dm" => url.path().trim_start_matches('/').to_string(),
                        _ => String::new(),
                    };
                    // Restore first: the macOS close button only hides the
                    // window, so "running but invisible" is the steady state
                    // and set_focus alone can't be relied on to reveal it.
                    #[cfg(desktop)]
                    let _ = window.show();
                    if !user.is_empty() && user.chars().all(|c| c.is_alphanumeric() || c == '.' || c == '_') {
                        let _ = window.eval(&format!(
                            "location.href='https://www.instagram.com/m/{}'",
                            user
                        ));
                    }
                    let _ = window.set_focus();
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Konvo")
        .run(|_app, _event| {
            // Dock icon click while the window is hidden → bring it back.
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = _event {
                if let Some(w) = _app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
        });
}
