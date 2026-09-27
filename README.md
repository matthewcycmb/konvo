# Konvo: DMs Only

Instagram with only the messages. Konvo is an iPhone app (also on the Mac App Store) that opens straight to your Instagram inbox. The feed, Reels and Explore never load. You sign in on Instagram's own login page inside the app; Konvo never sees your password or your messages, because it is Instagram's website in a caged web view, not a client that talks to Instagram on your behalf.

App Store: https://apps.apple.com/app/id6794756261. Site: https://konvoinstall.com. Built by Matthew Chan, a high school student, July to September 2026. MIT licensed.

## Shipaton 2026 Next Gen: review v1.9.0 (build 130)

**The submitted iPhone app is Konvo 1.9.0, build 130**, submitted for App Store review on September 25, 2026. The public store listing showed 1.8.0 when these notes were prepared; submission for review does not establish approval or public availability.

- **[Browse the pinned v1.9.0 source](https://github.com/matthewcycmb/konvo/tree/shipaton-2026-v1.9.0)**
- [Version differences, implementation map, and verification](https://github.com/matthewcycmb/konvo/blob/shipaton-2026-v1.9.0/docs/SHIPATON_2026_V1_9_0.md)
- [Current README and build instructions](https://github.com/matthewcycmb/konvo/blob/shipaton-2026-v1.9.0/README.md#build-and-run)
- [MIT license](https://github.com/matthewcycmb/konvo/blob/shipaton-2026-v1.9.0/LICENSE)

The app source is commit `dc3871a4942f46afa303bcba073ac15c21716ea5`; the `shipaton-2026-v1.9.0` tag adds review documentation and source checksums. To check out the submission:

```sh
git clone --branch shipaton-2026-v1.9.0 --single-branch https://github.com/matthewcycmb/konvo.git
```

This repository's default `main` application tree still identifies itself as v1.6.0 and serves the existing automatic desktop-release workflows. **Use the tagged source above for the iPhone submission.** Its guide describes the current navigation, original onboarding, explicit RevenueCat offering, and differences from earlier demo screens.

<details>
<summary>Historical main-branch documentation (v1.6.0 desktop-release baseline)</summary>

The material below describes the older `main` tree. Follow the tagged v1.9.0 documentation above for the submitted iPhone app.

## Why it exists

I deleted Instagram for two weeks and the urge to scroll went away. Then I reinstalled it to answer friends and found fifteen unread messages. Deleting was no longer an option, and every screen time app I had tried failed the same way: a fifteen-minute unlock opens the whole app, so the fifteen minutes went to Reels. Konvo removes the surfaces instead of rationing them. The messages stay; the feed does not exist.

## How it works

One WKWebView on instagram.com, hosted by Tauri 2, with a script injected at document start on every page. There is no Konvo backend for anything you read or write.

- `wrapper/src-tauri/src/cage.js` is the product. It runs before Instagram's own code and does four jobs: the cage (below), the onboarding wall drawn over the inbox, the paywall, and analytics through the native bridge.
- `wrapper/src-tauri/src/lib.rs` embeds the script (`CAGE_SCRIPT`), sets a Safari user agent so Instagram's login accepts the web view, and allows all web navigation so Meta's login, two-factor and challenge pages are never cut off (`allowed()`).
- `wrapper/src-tauri/gen/apple/Sources/instamessages-wrapper/KonvoStore.swift` is the native side of the bridge (`window.webkit.messageHandlers.konvoStore`): RevenueCat purchases and entitlements, Screen Time, the cookie snapshot, notifications, the share sheet.
- `wrapper/src-tauri/gen/apple/{ShieldConfig,ShieldAction,ActivityMonitor}` are the Screen Time extensions behind the optional lock button.
- `wrapper/dist/index.html` is the pre-login onboarding (quiz, privacy pages), in English, French, Traditional Chinese and Korean.
- `app/`, `lib/`, `public/` are the Next.js site on Vercel: the landing page, the privacy policy, the invite landing page and API, the unread-message push heartbeat, and the cage patch file.
- `extension/` is a Chrome extension of static redirect rules (Manifest V3, no scripts).

### The cage

Blocking is a URL block-list, not an allow-list: an allow-list stranded people on Meta's login chain, so the rule is "bounce the feed surfaces, leave everything else alone". Five rules in `cage.js` (`var FEED`):

```
/^\/$/                                        home feed
/^\/reels(\/|$)/                              Reels tab
/^\/reel\/?$/                                 bare /reel
/^\/explore(\/|$)/                            Explore
/^\/[A-Za-z0-9._]+\/(reels|tagged|saved)(\/|$)/   a profile's scrolling tabs
```

Anything matching is sent to `/direct/inbox/`. Thirty-nine CSS selectors hide doorways that Instagram draws inside allowed pages (the inbox back chevron, Message Requests, the New post and Create entries, and language-proof variants verified on a French phone). Deliberately open, because they are conversation material and not a feed: stories viewing, profiles, a single post (`/p/<code>`), the single-reel permalink (`/reel/<code>/`), and the notifications heart. In-app copy says exactly this: "Feed, Reels and Explore are now hidden. Stories, profiles and notifications still work."

When Instagram changes its markup, `public/cage-patch.json` on the site is the repair channel: the app fetches it at every document start, caches the last good copy, and accepts three keys, `hide` (selectors), `css` (a raw string) and `block` (regex sources appended to the list). Data only; remote JavaScript is not supported. A fix is live within about a minute, with no app release. One Instagram A/B variant ships a Content Security Policy that blocks this fetch; those users get the baked-in rules until the next release.

### What broke and what changed

The paywall reads live prices from the RevenueCat offering (`products` in `KonvoStore.swift`). Until 1.4.0, `pricesReady()` in `cage.js` waited for three products, and the third, a lifetime purchase, had never been approved in App Store Connect, so the real store never returned it. Development builds read a local StoreKit file that still had it, which is why the bug never showed on my phone and hung the paywall on "Loading your plans" for every store user on the busiest day of the launch. The fix in 1.4.0 (`prod()` and `pricesReady()`, `cage.js`) requires only the products that are sold; `wrapper/test/test_cage.js` boots a wall whose products reply has no lifetime entry and asserts the prices render.

The second lesson came from data. The Screen Time block used to arm at the moment of purchase; trials were being cancelled within minutes, so the block became opt-in from the inbox. Cancels did not move. The RevenueCat webhook events land in PostHog on the same person as the app's own events, and that join showed cancels clustering in the first ten minutes regardless of the block. 1.5.0 answered that instead: a reminder promise before the trial ends, a notifications page after purchase, and a clear next step after the money.

### RevenueCat

- `Purchases.configure` with the public SDK key, anonymous app user id, entitlement `Pro`, offering `current`, packages `konvo.pro.yearly` (7-day trial) and `konvo.pro.monthly`.
- `products`: localized prices, per-week and per-month framing, the honest saving against twelve months of monthly, and `trialDays` only when `checkTrialOrIntroDiscountEligibility` says the person is eligible.
- `purchase`: cancelled, pending (Ask to Buy) and error branches; `restore`; `entitlements` from cached customer info so an offline launch keeps working.
- RevenueCat Paywalls (`RevenueCatUI`) can be switched on remotely through the patch file for a test, with no release.
- The invite loop: every buyer can send a link; a friend who pastes it at their paywall gets three free days through a RevenueCat promotional entitlement granted by the site (`app/api/invite`), three friends per link, then the paywall. The RevenueCat secret key lives only on the server.
- Webhooks go to PostHog and share the person with the app's events, which is how the decisions above were made.

## Data that leaves the phone

- Never: your Instagram password (the code only checks that the field is non-empty before counting a login attempt), your messages, your contacts.
- To PostHog: named events with the build number, network type, platform, phone language and onboarding variant; a random RevenueCat anonymous id as the person; and, once, your Instagram account's numeric id so returning devices can be told apart. The username is not sent.
- To RevenueCat: what its SDK needs to sell and restore a subscription.
- To UserJot: feedback you type into the feedback board, under the same anonymous id.
- To the site: your Instagram username only if you send an invite link (it is the invite code) and a device push token if you allow notifications, both keyed to the anonymous id.
- On the phone only: a snapshot of your Instagram session cookies (Application Support, protected until first unlock) so a force-quit does not sign you out and the background unread check can run. Instagram's own unread count endpoint is called with the session, with the same headers the website uses; nothing else of Instagram's is read.

Full policy: https://konvoinstall.com/privacy.

## Build and run

Use Node 24 and Python 3.10 or newer (the verification script is tested with Python 3.12). Native builds also need macOS, the full Xcode installation with iOS support, and stable Rust installed through rustup. Follow [Tauri's prerequisites](https://v2.tauri.app/start/prerequisites/) to finish the Xcode and Rust setup.

Install dependencies from the repository root. The site and native wrapper have separate npm lockfiles; both need their own install. The Python environment is only for the IPA verification tool.

```sh
git clone https://github.com/matthewcycmb/konvo.git
cd konvo
npm ci
npm --prefix wrapper ci
python3 -m venv .venv
.venv/bin/python -m pip install -r wrapper/scripts/requirements.txt
```

RevenueCat, RevenueCatUI, Superwall, and UserJot are declared in the committed Xcode project and resolved through Swift Package Manager. Cargo resolves the Rust dependencies. `node_modules`, downloaded SDKs, signing credentials, and generated build output do not belong in the repository.

### Website

From the repository root:

```sh
npm run dev
```

Open http://localhost:3000. The landing page runs without environment variables. To run the invite API and push heartbeat, copy `.env.example` to `.env.local` and supply credentials for your own services.

### iPhone

A signed device build needs an Apple developer team and provisioning profiles that support the app's Family Controls, App Groups, and Push Notifications capabilities. A free Personal Team is not sufficient for all of these capabilities. Next Gen judges can evaluate the video and source without signing an iPhone build; the JavaScript tests below also run without an Apple account.

The committed signing values belong to the original app. To build under your own team:

1. In `wrapper/src-tauri/tauri.conf.json`, set `identifier` and `bundle.iOS.developmentTeam` to your app identifier and team.
2. Open the committed `wrapper/src-tauri/gen/apple/instamessages-wrapper.xcodeproj` in Xcode. Update Signing & Capabilities for the iOS app and its three extensions, using unique bundle identifiers under your team. Keep the matching values in `project.yml` and each target's `Info.plist` and entitlements file in sync. Editing `project.yml` alone does not change the existing Xcode project.
3. Register an App Group for your team and replace `group.com.matthewchan.konvo` in the entitlements, `project.yml`, and `Shared/KonvoShared.swift`. Keep the background refresh identifier in the app's `Info.plist`, `project.yml`, and `KonvoStore.swift` consistent if you rename it.
4. Configure your own RevenueCat app, `Pro` entitlement, and current offering with `konvo.pro.yearly` and `konvo.pro.monthly`. Update the public SDK key in `KonvoStore.swift`. The product identifiers must match your store configuration. Real sandbox purchases require matching products and a sandbox tester in your App Store Connect account.

Build from `wrapper` after installing dependencies above:

```sh
cd wrapper
rustup target add aarch64-apple-ios
PATH="$HOME/.cargo/bin:$PATH" npm run tauri -- ios build --export-method debugging --ci
../.venv/bin/python scripts/verify-ipa.py 0 src-tauri/gen/apple/build/arm64/Konvo.ipa
scripts/install-dev.sh YOUR_DEVICE_UDID --keep
```

The scripts locate this checkout from their own file paths, so the clone can have any name or location. The verifier checks a release IPA against this checkout's version, UI, and local Rust build artifacts; run it after building in the same checkout. It does not download or build the app. Use `--help` for its arguments. The installer reads the bundle identifier from the IPA, preserves app data with `--keep`, and can install another export with `KONVO_IPA=/path/to/Konvo.ipa`. Omitting `--keep` uninstalls the existing app first and resets its data.

Launching from Xcode with the committed scheme uses the local `Konvo.storekit` test products. An exported development IPA uses Apple's sandbox instead; the StoreKit file does not set production prices. The App Store upload scripts are maintainer release tools, not part of contributor setup.

### Mac

From `wrapper`, after installing dependencies above:

```sh
PATH="$HOME/.cargo/bin:$PATH" npm run tauri -- build --bundles app
```

Mac and Windows builds also run in `.github/workflows/`.

## Tests

After dependency installation, run these from the repository root:

```sh
python3 -m unittest discover -s wrapper/test -p 'test_setup.py'  # setup scripts, no device needed
cd wrapper
node test/test_bridge.js        # the bridge protocol, seconds
node test/test_onboarding.js    # screen order, language tables, no em dashes, seconds
node test/test_cage.js          # the cage in jsdom, about ten minutes
```

`test_cage.js` boots a page at each feed path ('/', '/reels/', '/explore/', a profile's reels tab, posts, stories) and asserts the bounce or the wall, then walks the onboarding, the paywall (including the missing-lifetime case), the login sheet, the identity capture and the rating prompt. Run it on an idle machine; one timing test flakes under load. Fixtures are hand-written, so a selector that only ever matched a fixture is not verified: every selector that gates behaviour was checked on a real phone before shipping.

## Known limits

- Stories, profiles, single posts and the single-reel permalink are reachable by design. Konvo removes the feed surfaces; it is not a content blocker.
- The cage depends on Instagram's markup for its hides. URL rules are stable; selectors are repaired through the patch file.
- One Instagram A/B variant blocks the patch fetch (see above).
- There is no crash reporter. The cage records a `cage_error` event for exceptions it catches.
- Login attempts are counted from taps on Instagram's Log in button while the password field is non-empty; one-tap "Continue as" logins are not counted as attempts.
- The Mac app has no Screen Time lock and sends no analytics.

## Layout

```
app/ lib/ public/ components/   Next.js site (Vercel); public/cage-patch.json is the repair channel
extension/                      Chrome extension, static redirect rules
wrapper/                        the app: Tauri 2 host, cage.js, Swift bridge, Screen Time extensions, tests, scripts
docs/agents/                    notes for coding agents working in this repo
```

</details>
