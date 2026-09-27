# Konvo final audit after submission updates

Reviewed September 25, 2026, Vancouver time. No submission fields, images, videos, or public repository files were changed during this audit.

## Verdict

Konvo now presents a strong, credible Next Gen entry. Its clearest advantages are the specific personal problem, a functioning published app, evidence of real downloads, and concrete RevenueCat implementation and debugging decisions. Most earlier presentation problems are resolved. A remaining price contradiction and the private testing instructions are the most worthwhile corrections before considering the submission finished.

This is a qualitative assessment against the [Next Gen criteria](https://revenuecat-shipaton-2026.devpost.com/rules), not an official score, comparison against every eligible entrant, or prediction of a prize.

| Criterion | Assessment | Evidence |
| --- | --- | --- |
| Useful, clear idea | Strong | The tradeoff between keeping Instagram conversations and avoiding feed surfaces is immediately understandable. The personal story explains the intended user. |
| Progress toward a working app | Strong | Published app, visible messaging footage, Screen Time demonstration, public source, and dated build information. |
| Thoughtful RevenueCat use | Strong | The story now explains live prices, trial eligibility, restored purchases, the Pro entitlement, and webhook-informed onboarding decisions. The launch-day product-loading failure is specific evidence of learning. |
| Technical and presentation care | Good, with a few corrections left | Architecture and source documentation are clear. Remaining inconsistencies are identified below. Reliance on Instagram markup remains an acknowledged technical tradeoff. |

## What is verified

- The saved Devpost form shows **SUBMITTED, 5/5 steps done**.
- The public story is now approximately **1,000 words**. It contains the RevenueCat paragraph, preserves the launch debugging lesson, removes the September 31 date and disputed rejection total, and identifies the demo as an earlier build.
- The required icon is **1024 × 1024**. The frameless app screenshot is **1179 × 2556**. All 13 gallery originals were downloaded and visually reviewed.
- Gallery image 3 no longer contains the paying-subscriber placeholder. Its download evidence now says **First-Time Downloads, 1.5K**, rather than using a RevenueCat Active Customers tile as download evidence.
- App Store, website, and GitHub URLs are saved in the public submission links. The App Store and repository URLs are also in their dedicated additional-information fields.
- The RevenueCat project ID and an academic email using the `sd43.bc.ca` domain are populated. The guardian-consent confirmation is checked. The separate consent-form receipt is not independently verified by this audit.
- Other award-specific descriptions remain empty, consistent with a minor entering Next Gen only.
- The public US App Store record still shows **1.8.0**, bundle `com.matthewchan.konvo`, first release August 20, 2026. The story and repository correctly distinguish the newly submitted **1.9.0 (130)** from the live store version.
- GitHub is public, recognizes the MIT license, and its default README directs judges to the [pinned v1.9.0 source](https://github.com/matthewcycmb/konvo/tree/shipaton-2026-v1.9.0). The tagged configuration identifies 1.9.0 and the review guide identifies build 130.
- The optional [TestFlight invitation](https://testflight.apple.com/join/SH37gxDw) opens and does not display a full/closed-beta notice. This does not establish which build a particular device can install.
- The project website returns HTTP 200.

## Remaining corrections, in priority order

### 1. The replacement video still has a price contradiction

The new saved video is [aq84DJg2bcY](https://www.youtube.com/watch?v=aq84DJg2bcY), duration **138 seconds**. Around [1:20](https://www.youtube.com/watch?v=aq84DJg2bcY&t=80s), the large annual-price overlay now says **24.99 USD**, while the caption at the bottom still says **$19.99**. The YouTube transcript also retains $19.99.

The large overlay was corrected, but the caption was not. Make the caption and any corresponding narration/correction agree with the intended annual price. This does not require shortening the video.

### 2. Clarify the private testing instructions

The judge notes offer both TestFlight and the App Store version, then state that the judge will not be charged. That statement needs to apply specifically to TestFlight. Apple's [TestFlight instructions](https://testflight.apple.com/join/SH37gxDw) distinguish free beta purchases from purchases in the App Store version.

Suggested replacement for the opening of the private notes, keeping the existing test-account details below it:

> Please use the TestFlight version to test purchases without real charges: https://testflight.apple.com/join/SH37gxDw
>
> The App Store version uses live subscriptions. Eligible users can start a free trial, which renews at the displayed price unless cancelled.
>
> The demo shows an earlier build. I submitted v1.9.0, build 130, for App Store review on September 25. The matching source and version notes are linked from the repository README.

The TestFlight public description also still says profiles are removed, while the current story says profiles work. Updating that old description would improve consistency, though it is secondary for this submission.

### 3. Finish the traction labels

The revised slide is much better supported. It still says revenue was earned in **21 days**, while the video labels September 21 as **20 days after launch**, and the LinkedIn graph labels a late-August marketing launch. The store's first-release date is August 20. These can refer to different milestones, but the distinction is not explicit.

Use one dated measurement statement, such as “$1,066 gross subscription revenue as of September 21, 2026,” adding the verified currency and actual reporting period. Only use this exact date wording if it matches the dashboard measurement. Alternatively, supply the exact start and end dates for the 21-day claim. The visible dashboard tile itself says “Last 28 days.”

The story's “combined views and impressions” wording is more precise than the video's “organic views.” The slide now says “organic impressions.” Label the combined total consistently if it includes multiple types of social metrics.

### 4. Align the remaining gallery wording with the current story

- Image 6 still says Konvo never sees or stores the password or DMs. Use the more precise wording already in the story: “Your Instagram password and message contents aren't sent to Konvo's servers.”
- Image 7 shows the former referral onboarding screen. The source guide explains that it was removed in v1.9.0. A caption such as “Earlier build: paywall and referral flow. Referral onboarding removed in v1.9.0.” would make that clear directly in the gallery.
- The story's earlier-build note already explains why some demonstration controls differ from the new bottom navigation. Updating all footage is not necessary merely to show that development continued.

### 5. Repair two Markdown headings

The live page displays literal `##` characters for “Challenges we ran into” and “Accomplishments that we're proud of.” Those two lines have leading spaces in the saved Markdown. Start each heading at the first column and save the story. Other headings render normally.

## Video duration and coverage

Keep the chosen **2:18** runtime. The first two minutes include the pitch, evidence of traction, onboarding, the paywall, messaging, architecture, swipe animations, and Screen Time. The final 18 seconds mostly cover future plans and the closing. The [judging explanation](https://www.shipaton.com/blog/how-we-judge-shipaton) makes the first two minutes the required screening window; the important product material is already inside it.

## Scope and practical stopping point

This audit read the live public page, saved project and additional-information fields, all 13 gallery originals, the replacement video's complete transcript, and public preview frames sampled every two seconds across the video. It also checked public video playability metadata, store metadata, the repository landing page and tagged configuration, and the optional TestFlight invitation.

Browser playback did not load reliably in the audit session, so video verification used the transcript and public preview frames. No continuous playback, fresh device installation, real purchase, or new native build was completed in this audit. Earlier targeted source tests remain documented in the repository guide; they were not rerun for this presentation review.

After the price and judge-note corrections, further work should focus on the small consistency fixes above. A new feature, another complete story rewrite, or a last-minute Android build is not needed to strengthen the evidence already presented for Next Gen. No audit can establish the submission's maximum possible score or guarantee a win.
