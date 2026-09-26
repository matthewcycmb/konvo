# Weekly + special-offer HTML proposal

Requested September 21, 2026. Review `paywall-weekly-offer.html` in a browser.
Rebuild after editing the template: `node wrapper/prototype/build-weekly-offer.cjs`.

## Prices and visual decisions

- The owner confirmed **US$6.99/week**, **US$24.99/year** for the regular annual product, and **US$19.99/year** for the special annual product.
- Regular yearly remains selected by default. Its weekly equivalent is US$0.48. “SAVE 93%” is rounded from `1 - 24.99 / (6.99 * 52)`; it compares annual billing with 52 weekly payments. Both selectable cards and the charge/renewal line update together.
- The offer uses a dark navy background with the existing Konvo blue, cyan gift artwork, a crossed-out US$363.48 comparison (52 × US$6.99), and US$19.99/year. “94% OFF” is rounded down from `1 - 19.99 / (6.99 * 52)`. The visible label explicitly compares 52 weekly payments, not a former annual price. It assumes ongoing renewal at US$19.99/year, not a first-year discount. No “forever”, limited-stock, deadline or free-referral claims were introduced.
- The phone is reduced from 310px to 282px in the standard preview (256px on compact screens), preserving its aspect ratio. The original phone-frame and illustrative member avatars are reused. Inbox content is fictional preview content. Production should continue using the current local authenticated inbox preview.

## Clickable behavior

`Pricing → simulated Apple purchase sheet → Cancel → special annual offer`.
Claiming the offer opens a simulated **US$19.99/year** sheet. Cancelling that sheet stays on the offer. “I’d rather pay full price.” restores the selected regular plan. The offer is automatic only once per walkthrough, so dismissing it does not cause a cancellation loop. Purchases that fail or remain pending do not show it. Successful simulated purchases lead to a confirmation placeholder for the existing notification flow.

The demo is in-memory only. It makes no purchase calls, writes no app data, and sends no PostHog events. It does not change the Swift purchase bridge, original onboarding, bundled production views, RevenueCat offerings, submitted build 116 or running experiment 465606.

## Production work after review

Use real, approved weekly and discounted annual App Store products, attached to the same Pro entitlement, and dedicated RevenueCat packages/offerings. Read localized prices and calculate savings in the same currency; US values here must not be hardcoded into the native paywall. The proposed discounted annual price is a separate recurring product unless the owner instead requests an introductory offer with a later renewal price.

Only the native purchase cancellation result should trigger the special offer, after Apple's sheet has dismissed. Keep cancellation distinct from purchase failure, pending approval, restore failure and a paywall back action. Preserve the notification page after entitlement confirmation. Continue to use RevenueCat as the entitlement source.

Version the experiment when shipping the changed paywall, so the original annual-only treatment and weekly/offer treatment are not pooled as one result. Suggested additional instrumentation is `special_offer_viewed`, `special_offer_dismissed` and existing purchase events carrying the selected actual product, offering and paywall stage. These are proposed additions, not deployed analytics.

Relevant RevenueCat references: [Offerings](https://www.revenuecat.com/docs/offerings/overview), [iOS subscription offers](https://www.revenuecat.com/docs/subscription-guidance/subscription-offers/ios-subscription-offers), [localized price variables](https://www.revenuecat.com/docs/tools/paywalls/creating-paywalls/variables).

## Preview verification

Browser checks confirmed annual/weekly selection updates the purchase sheet and renewal line; cancelling the weekly sheet reveals the annual offer; claiming it opens US$19.99/year; a simulated successful purchase reaches confirmation; a purchase error stays on regular pricing. Both screens fit without internal overflow at the default 390×844 size, a compact 667px height, and responsive previews in 375px, 390px and 430px browser widths. The generated JavaScript passes `node --check`. Real StoreKit purchase behavior has not been changed or tested by this preview.

## September 21 implementation follow-up

At the owner’s request, `$rc_weekly` → `konvo.pro.weeklyy` was saved alongside the existing annual package in `konvo_ab_annual_no_trial_v1`. Native weekly checkout and the personalized two-plan view are implemented, with real localized prices, currency-matched savings, package duration/no-intro validation, weekly purchase analytics and annual fallback when weekly is unavailable. Original onboarding remains annual/monthly. New events carry `personalized_weekly_v2` / `inbox_annual_weekly_v2`; existing flag assignments remain unchanged. Separate the changed build/version from the prior annual-only treatment in analysis. The special-offer page remains a design preview until its real product and checkout are implemented.

## Reference alignment follow-up

The special-offer headline and plan ribbon now read LOWEST PRICE EVER. Its blue/cyan card is upright, larger, and has no bow, ribbon stripe or gift kicker. Removed the subtitle and sentence below the price. The compact comparison label remains inside the card, and the preview documentation retains the 52-week calculation. Recurring annual pricing and the actual 94% comparison are unchanged.

The page heading was subsequently changed to “Your Special Offer” at the owner’s request; the pricing-card ribbon remains LOWEST PRICE EVER.

## Annual-card emphasis and inbox visibility

The annual card now has a centered SAVE 93% badge overlapping its blue top border. The annual billing total sits directly below the weekly equivalent, aligned left, at the owner’s request. The phone and its contents scale together to 86% of the 282px canvas (76% on compact screens), with a shorter bottom fade. Browser checks verified no screen overflow and an unclipped, centered badge at 390×844, 375×667 and 430×932. Annual/weekly selection continues to update the renewal line. These visual changes are in the standalone HTML preview.

## Build 118 app integration

The reviewed layout and cancellation offer are now implemented in the new onboarding. The app uses live Apple prices and RevenueCat’s `konvo_special_offer_v1` annual package. The original onboarding stays intact. Device-build verification and installation status are recorded in `../experiments/build118.json`. The standalone HTML still uses simulated purchases.

## Gift interstitial (source change after build 123)

The current app source inserts `new_gift` between a confirmed regular-plan purchase cancellation and `new_offer`. It shows the requested starry dark background, blue/teal shaking present, and “Open now” button. Opening the gift plays a 420ms lid animation and reveals the existing special offer; Reduce Motion disables the shake and skips the opening delay. No purchase starts when opening the gift. The cancellation sequence remains automatic only once per walkthrough, with errors, pending purchases and restores excluded. If the offer becomes unavailable while the gift is open, the button returns to regular plans.

Use `../experiments/preview.html` → **Gift reveal** (or `preview.html?screen=gift`) to review the exact production views and controller with simulated products. `onboarding-gift.html` is the view source; regenerate the embedded view using `node wrapper/experiments/build-onboarding.cjs`. The older standalone `paywall-weekly-offer.html` proposal still reflects the pre-gift flow.

Analytics adds `special_offer_gift_viewed` and `special_offer_gift_opened`, with `screen_id: new_gift`, `previous_plan`, and `offer_flow_version: gift_v1`. Actual special-offer and RevenueCat paywall impressions occur only after opening the gift. These source changes are not present in previously installed build 123 or uploaded build 122.

## Continue cooldown follow-up (source change after build 124)

Increased the comparison, signature and loading forward-button cooldown from 600ms to 900ms. The production QA HTML uses the same controller. Navigation, special-offer integration, localized pricing and real-browser timer tests passed. The longer cooldown needs a new device build; installed build 124 retains the 600ms timing.
