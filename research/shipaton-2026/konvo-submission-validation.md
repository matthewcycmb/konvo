# Konvo submission: final saved-state validation

**Final recheck:** Both remaining corrections below are now resolved. The privacy slide was removed, and the revenue image now reads “$1000 in gross subscription revenue” with “As of September 21, 2026.” The gallery now contains 12 images. The remainder of this document records the preceding validation state. See the [final competitive assessment](konvo-final-competitive-report.md).

Reviewed September 25, 2026 after the latest gallery, judge-note, heading, and Next Gen-section edits. This report supersedes the remaining-action list in the earlier audit. The submission was inspected without changing any Devpost fields or public assets.

## Result

The submission is complete as far as the visible required fields and public assets establish. Devpost reports **SUBMITTED, 5/5 steps done**. The earlier issues are addressed except for two small pieces of text inside gallery images. These are presentation corrections, not missing submission fields.

## Verified corrections

| Item | Current saved state |
| --- | --- |
| Video price | Private judge notes explicitly correct the annual price to **$24.99 USD** and explain that the narration incorrectly says $19.99. The accepted correction is present; the video itself retains the older narration. |
| Video length and access | The saved video remains `aq84DJg2bcY`, **138 seconds**, nonprivate, with public playability status OK and embedding permitted. The chosen 2:18 runtime is unchanged. |
| Judge access notes | TestFlight purchases are distinguished from the live App Store trial and its renewal. The optional TestFlight link remains saved and opens without a full/closed-beta notice. |
| Headings | Both previously broken headings now render normally. No literal `##` headings remain in the public story. |
| Next Gen explanation | The new section is published between Accomplishments and What we learned. The story is approximately 1,107 words. |
| Revenue period | Gallery image 3 now says “As of September 21, 2026”; its earlier “21 days” headline was removed. The story uses the same as-of date. |
| Downloads evidence | The stats slide retains the App Store “First-Time Downloads, 1.5K” screenshot and no longer contains the paying-subscriber placeholder. |
| Referral screenshot | The old referral panel has been removed from image 7. The replacement shows the RevenueCat paywall alone. No removed-feature explanation is needed in its caption. |
| Captions | The updated founder, product, stats, feedback, onboarding, privacy, and RevenueCat captions are saved in their intended rows. |
| Source version | Public repository README still links to the pinned v1.9.0 judging snapshot and version guide. The snapshot configuration identifies v1.9.0 and bundle `com.matthewchan.konvo`; the guide identifies build 130. |

## Two remaining image-text corrections

### Privacy image, gallery image 6

The caption is correct, but the image itself is unchanged and still says:

> Konvo never sees or stores your Instagram password or DMs.

Replace the headline inside the image with the same precise statement used in the story and caption:

> Your Instagram password and message contents aren't sent to Konvo's servers.

The embedded screenshots also contain older absolute wording. Removing this redundant privacy slide is an alternative if replacing its text would leave those screenshots making the same claim. The current story already explains the privacy boundary.

### Revenue headline, gallery image 3

The updated image currently reads “$1000 in gross subscription” followed by “As of September 21, 2026.” The word “revenue” is missing.

A complete heading consistent with the reported amount and visible dashboard tile is:

> $1,066 in gross subscription revenue
> As of September 21, 2026

The currency is still not explicitly identified. Add its verified currency code if desired; this audit does not infer revenue currency from the subscription-price currency.

## Required fields and links checked

- App icon: **1024 × 1024**, unchanged from the previously verified original.
- Frameless screenshot: **1179 × 2556**, unchanged from the previously verified original.
- All 13 current gallery originals were downloaded and dimension-checked. Images 3 and 7 changed; the other 11 match the prior audit byte-for-byte.
- App Store URL, public repository URL, academic email field, and RevenueCat project ID are populated.
- Academic email domain is `sd43.bc.ca`.
- Guardian-consent confirmation is checked. Separate receipt of the guardian form cannot be verified from this checkbox.
- The repository is public, not archived, and GitHub recognizes its MIT license.
- The public US App Store version remains **1.8.0**. The submitted v1.9.0 review status is distinguished in the story and repository documentation.
- Project website and optional TestFlight invitation are reachable.
- The Next Gen source link remains in its dedicated field; repeating the full build paragraph in judge notes is unnecessary.
- A free trial is sufficient for app access; TestFlight is optional for this Next Gen submission. No new payment flow or additional award-category answers are needed.

## Scope

This is a final submission-validation pass, not a fresh native build, device installation, purchase test, RevenueCat internal eligibility check, or verification of guardian-form receipt. The preceding audit covered the video's full transcript and preview frames; this pass verified the same saved video identity, public metadata, and the newly saved price correction. It did not claim that the narration itself had been replaced.

The existing personal story, Next Gen explanation, shipped product evidence, and RevenueCat implementation make a credible entry. After the two image-text corrections, I would stop revising the presentation unless the app or submission facts change. Prize selection remains the judges' decision.

Sources checked: [Devpost project](https://devpost.com/software/konvo-dm-s-only), saved private submission forms, [video](https://www.youtube.com/watch?v=aq84DJg2bcY), [repository](https://github.com/matthewcycmb/konvo), [pinned source](https://github.com/matthewcycmb/konvo/tree/shipaton-2026-v1.9.0), [App Store](https://apps.apple.com/us/app/konvo-dms-only/id6794756261), and [TestFlight](https://testflight.apple.com/join/SH37gxDw). Requirements interpreted using the [official Next Gen rules](https://revenuecat-shipaton-2026.devpost.com/rules) already reviewed in this session.
