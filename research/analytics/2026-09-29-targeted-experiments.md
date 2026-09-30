# Targeted experiments after the onboarding review

These are recommendations, not activated experiments. The social-proof update and expired-access inbox paywall are implemented separately. Other apps' reported improvements are hypotheses for Konvo, not expected uplifts.

## 1. Keep the trial timeline; test reassurance close to checkout

Blinkist designer Jaycee Day reported a 23% conversion increase after addressing complaints about the seven-day trial and forgotten charges. [Original report](https://uxplanet.org/how-solving-our-biggest-customer-complaint-at-blinkist-led-to-a-23-increase-in-conversion-b60ad514134b). The publicly accessible [Growth.Design account](https://growth.design/case-studies/trial-paywall-challenge) describes the timeline/reminder treatment and identifies the outcome as trial signups. This is a company case study, not a guarantee or evidence that adding more repeated explanation screens always helps.

For Konvo, retain the existing first-time explanation. Test the placement and prominence of the real charge date, localized total, cancellation instructions, and reminder information immediately before Apple checkout. Promise a notification only when the app can actually deliver it; an in-app reminder is not equivalent for someone who never reopens Konvo. Do not add another full page as part of this test.

Primary outcome: paid conversion per eligible paywall viewer after the complete trial window. Secondary: checkout start, accepted trial, cancellation timing, refunds, and notification permission. Do not select a winner using trial starts alone.

## 2. Improve sign-in recovery, preserving password lookup

Baymard's observed ecommerce usability sessions found substantial abandonment around password-reset email problems, including 18.75% among the relevant returning-account test participants. [Research](https://baymard.com/research-articles/password-requirements-and-password-reset). This is not an Instagram experiment, and that percentage is not a forecast for Konvo.

Konvo's September 29 analysis found most uncompleted logins had encountered a form. Test concise help at the point of difficulty: Instagram's own password-reset route, clarification that this is the existing Instagram account, and a clear way to resume after visiting Passwords, Notes, or email. Preserve form/session state and allow long pauses. Avoid forced reloads or a sign-in countdown. Do not invent a Konvo-specific password form or try to change Instagram's password rules.

Primary outcome: completed Instagram sign-in within 24 hours of sign-in start; report immediate completion separately. Guardrails: resets completing, form preservation, navigation errors, and no increase in lockouts. Existing tracking heuristics need validation before calling every error event a real defect.

## 3. Test a targeted offer only after enough expired users return

Adapty's Feeld case study reports region-dependent results for plans and win-back offers, and says standard pricing sometimes outperformed introductory discounts over 90 days. [Case study](https://adapty.io/case-studies/feeld/). It is a vendor/customer report without enough public detail to assume the same effect size or pricing response for Konvo.

First collect clean results for the new expired-inbox paywall. Then compare the regular annual offer with a clearly disclosed returning-user annual offer for verified eligible expired users. Keep the first-time price and onboarding stable during this experiment. Stratify by storefront/currency and prior subscription history; no blanket global price reduction based on checkout cancellations alone.

Primary outcome: revenue per eligible expired-paywall viewer, plus reactivation and 30/90-day retention/refunds. The earlier review found only eight recent people with a tracked lapsed-wall impression, so this test does not yet have an adequate sample.

## Order and decision discipline

First confirm the current release's per-attempt checkout tracking, then test checkout reassurance or sign-in recovery one at a time. Use stable per-user assignment and a concurrent control. Choose the minimum worthwhile improvement and sample size before launch, and wait through the trial window. The September 27 cohort's first seven-day trials mature around October 4; an October 5–6 review is an initial check, not the end of revenue follow-up.
