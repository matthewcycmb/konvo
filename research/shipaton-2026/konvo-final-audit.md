# Konvo — final submission review

Reviewed September 25, 2026 (Vancouver). This review covers the live Devpost story, saved submission form, all 13 original gallery images, the complete YouTube transcript and selected video frames, the current public repository, and the live US App Store metadata. It is not a fresh native build or an internal RevenueCat verification. No Devpost fields were changed.

## Assessment

Konvo has a credible Next Gen case: a specific problem experienced by its intended user, a shipped app, visible evidence of traction, and an implemented RevenueCat integration. The remaining opportunities are primarily presentation, consistency, and making the technical work easy to assess. This is a qualitative assessment, not an official score or a prediction of winning.

The [Next Gen rules](https://revenuecat-shipaton-2026.devpost.com/rules) assess idea/usefulness, progress toward a working app, thoughtful RevenueCat use, and technical/product/presentation care.

| Criterion | Current evidence | Best improvement |
| --- | --- | --- |
| Idea and usefulness | Clear personal problem: keeping conversations while removing feed surfaces. User feedback in gallery. | Keep the personal story, but reach the solution sooner. |
| Working app | Live store listing, demo footage, public source with build instructions. | Align the public source with the version demonstrated and submitted. |
| RevenueCat use | Native purchase/restore/entitlement handling; trials, referral access, and analytics described in source. | Explain the implementation and the reasons behind the monetization choices in the Devpost story. |
| Technical choices and presentation | Clear architecture and a useful launch-day debugging lesson. | Remove placeholders, reconcile prices and timelines, and shorten repeated narration. |

## Submission completeness

- Devpost currently reports **SUBMITTED — 5/5 steps done**.
- The original uploaded app icon is **1024 × 1024**.
- The replacement original frameless screenshot is **1179 × 2556**. The earlier asset issue is fixed.
- The App Store URL is in the public links and the dedicated submission field. Apple's US listing identifies bundle `com.matthewchan.konvo`, version `1.8.0`, first release August 20, 2026.
- The required RevenueCat project ID is populated. The form currently asks for the project ID, not a separate bundle ID.
- The Next Gen repository field links to [matthewcycmb/konvo](https://github.com/matthewcycmb/konvo). GitHub reports the repository as public and detects its MIT license.
- The student email field is populated. Its domain is listed as Coquitlam School District 43 in [JetBrains/swot](https://github.com/JetBrains/swot/blob/master/lib/domains/ca/bc/sd43.txt).
- The guardian-consent confirmation is checked. This does not let me independently confirm receipt of the separate consent form.
- The video is unlisted and playable without signing in; duration is **138 seconds**. The rules recommend less than two minutes, and screeners are required to watch only the first two minutes. This is a presentation issue, not a missing video.
- Other prize-category answers are empty. That is appropriate for a minor entering Next Gen only.

## Prioritized changes

### 1. Finish the traction slide

[Gallery image 3](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/005/385/632/datas/original.png) still says **“X paying subscribers.”** Replace it with a verified number and date, or remove the bullet. Do not substitute a trial count for paying subscribers.

The RevenueCat screenshot on this slide shows **1,532 Active Customers**. That is useful evidence, but it is not a store download count. [RevenueCat's definitions](https://www.revenuecat.com/docs/dashboard-and-metrics/overview) distinguish customer activity, active trials, paid subscriptions, and gross revenue. If retaining the “1,500+ downloads” claim, support it with the corresponding App Store Connect metric. Label revenue currency and the reporting period.

The LinkedIn screenshot says “impressions,” while parts of the story and video say “views.” Use the measured label for each platform, or explicitly explain a combined total. The existing testimonials and revenue evidence are worth keeping.

### 2. Reconcile the annual price

At approximately **1:20**, the video overlay says **19.99 USD/year**, while the paywall displayed in the same frame says **$24.99/year**. Gallery images 5 and 7 also show $24.99. Explain if these are different currencies or pricing versions; otherwise update the stale price. The explanation should be visible where the numbers appear.

### 3. Align the repository and app version

The public main-branch snapshot reviewed is commit `2574b181f42699b3018925a7cc91159891d474e5`. Its `wrapper/src-tauri/tauri.conf.json` identifies version **1.6.0**, while the live App Store listing is **1.8.0**.

This mismatch alone does not prove a rule violation or that core functionality is missing. However, Next Gen judges use the repository as primary evidence. Publish the actual source corresponding to the submitted app, or clearly document the judging snapshot and what differs. Merely changing the version string would not address a source mismatch.

### 4. Recut the demo to 1:59 or less

The [current video](https://www.youtube.com/watch?v=fCVteHBwoz0) contains useful footage. Its main walkthrough begins around 1:00; the backstory occupies much of the preceding section. The paywall is discussed around 1:13–1:23, technical implementation around 1:35, and Screen Time around 1:52. The final 19 seconds are mainly future plans and the closing.

Suggested edit: show the working inbox in the first 20–30 seconds, compress the backstory, keep a readable purchase/entitlement demonstration, and close by 1:59. Enlarge the phone recordings within the video: some are narrow and surrounded by substantial blank space. Keep captions and avoid speeding up the entire recording merely to meet the target.

The [organizer's judging explanation](https://www.shipaton.com/blog/how-we-judge-shipaton) makes the first two minutes particularly important.

### 5. Add a concise RevenueCat section to the story

The public story is approximately **1,431 words**. Inspiration and lessons together account for roughly half of it. The existing [repository README](https://github.com/matthewcycmb/konvo#revenuecat) explains monetization much more concretely than Devpost does.

A factual starting point, based on the public source, is:

> RevenueCat powers Konvo's monthly and annual subscriptions. The app loads localized prices from its current offering, checks eligibility for the annual plan's seven-day trial, and uses the Pro entitlement to unlock access. It also handles purchase cancellation, pending purchases, and restoring purchases. The referral flow grants three days of access through RevenueCat promotional entitlements, and RevenueCat webhook events feed into PostHog to help me understand cancellations and improve onboarding.

Confirm that this describes the build you are submitting. Follow it with your actual reasons for choosing subscriptions, the trial, and referral access. Keep the specific launch-day paywall failure and fix; it demonstrates learning. Reduce repeated motivational statements to make room.

### 6. Make a final consistency pass

- Change **“September 31st”** to the intended real date.
- The story says **four App Store rejections**; the video says **six**. Clarify the time period or use one verified total.
- The story says **108 builds**; the video says **101**. Date the earlier snapshot or reconcile them.
- The video says **42 rules**; the story mentions **five URL rules and 39 CSS rules**. Use the correct count for the demonstrated version, or simply describe the two mechanisms.
- The video labels September 21 as **20 days after launch**; the gallery refers to **21 days**, its LinkedIn chart marks a late-August launch, and Apple's first-release date is August 20. Distinguish initial store release from public marketing launch and state the exact period used for revenue.
- Replace the statement that every LinkedIn viewer encountered the paywall with the narrower observed fact: launch traffic exposed a paywall-loading failure, and users contacted you about it. Impressions are not app visits.
- Keep the founder voice, but remove distracting exaggerations such as “a billion engineers.” Replace general claims about all teenagers or all screen-time apps with your own experience and evidence.
- Consider the more precise privacy wording “Konvo does not send your Instagram password or message contents to Konvo's servers,” rather than suggesting the app's web view is technically incapable of accessing displayed content. Keep this consistent with the actual implementation and privacy policy.

## Optional polish

The new frameless screenshot passes the dimensions check. For a stronger promotional image, a tidy demonstration account and a normal battery indicator would look more finished than the current 5% battery screenshot. Preserve authentic app behavior and avoid exposing private conversations.

Your preferred Times Square artwork is still captioned “Apple screenshot #1” rather than explicitly marked as preferred. That is optional and does not affect submission completeness. If you want to communicate a preference, identify the exact image in the additional notes; the organizers must confirm the final creative selection.

Keep attention on these submission changes. The current review does not suggest that you need to build Android or add another major feature before the deadline to demonstrate the Next Gen criteria.
