# Matthew's portfolio: existing material and answers

Prepared from this conversation on September 26, 2026. This is a handoff for the separate portfolio session, not a new live analytics audit. Do not ask Matthew to repeat established details. Keep missing facts distinct from verified public material and self-reported experiences.

## Start here

Matthew Chan is 16, in Grade 11 in Vancouver, expecting to graduate in 2028. His preferred public styling of his name is still a choice, but his name itself is already known. The portfolio should show who he is, how he developed, and evidence of building, attracting users, earning revenue and learning from decisions. Konvo is the main case study. He wants a personal scrolling timeline, strong typography, real artifacts, restrained mobile-friendly motion, reduced-motion support and easily updated content. Keep core content accessible without requiring an animation to finish.

His goal is preparation for the Horowitz Andreessen Academy. The admissions/program statements in his prompt are user-provided research leads, not newly verified findings. Check https://theacademysf.com/admissions, https://theacademysf.com/faq and https://theacademysf.com/about before advising on eligibility. Do not assume the 2027 fellowship fits a 2028 graduation, or that the proposed fall 2028 program is approved.

## Public links

- Website: https://konvoinstall.com
- App Store: https://apps.apple.com/us/app/konvo-dms-only/id6794756261
- Devpost story and screenshot gallery: https://devpost.com/software/konvo-dm-s-only
- Demo, 2 minutes 18 seconds: https://www.youtube.com/watch?v=aq84DJg2bcY
- Public repository: https://github.com/matthewcycmb/konvo
- Versioned judging source: https://github.com/matthewcycmb/konvo/tree/shipaton-2026-v1.9.0
- LinkedIn: https://www.linkedin.com/in/matthew-chan-12546339b/
- Instagram: https://www.instagram.com/matthewasherelol/
- Previously supplied optional TestFlight invitation: https://testflight.apple.com/join/SH37gxDw (recheck availability before relying on it).

These links were collected in the prior review; this handoff does not claim all were freshly reopened. The public demo shows an earlier build. Its narration says $19.99 annually, while Matthew's latest confirmed pricing in this conversation is $24.99 USD yearly and $7.99 USD monthly, with a seven-day annual trial for eligible users. Do not reuse the old narration as current pricing. Preserve the existing 2:18 demo; Matthew explicitly chose not to shorten it.

## Files and visual material to inspect

All paths below are relative to `/Users/matthewchan/Instamessages` unless stated otherwise.

- `research/portfolio/assets/konvo-september-21-results-collage.png`: unchanged copy of the public stats image inspected previously. It contains the RevenueCat $1,066 tile, App Store first-time-download tile, and LinkedIn content analytics. This is a promotional collage, not a raw dated analytics export.
- `research/portfolio/assets/konvo-public-feedback-collage.png`: unchanged copy of public feedback screenshots. Original posts and permission/context should guide reuse of identifiable comments.
- `marketing/app-store-redesign/README.md`, `index.html`, `overview.jpg`, and `exports/`: three explored marketing directions and fifteen exports. The README explicitly calls them design-review exports. These are not automatically shipped work or RevisionDojo before-and-after evidence.
- `marketing/app-store-redesign/references/konvo-*.png`: earlier Konvo store references. The Opal and Cal AI images alongside them are other products, not Matthew's work.
- `public/app.png`, `public/phone-thread.webp`, `public/laptop-mock.png`, `public/mock-inbox.png`, and icon files: product/website imagery to inspect. A mockup is not proof of live customer activity.
- `wrapper/experiments/chat-slide-2026-09-25/README.md` and `wrapper/experiments/chat-polish-2026-09-25/README.md`: documented implementation and verification of chat transitions, including before/after behavior. Inspect associated screenshots privately first because internal captures may expose actual accounts or conversations. Do not attribute these dated fixes to a particular friend's or designer's feedback without evidence.
- The public Devpost gallery includes founder imagery. No separate collection of childhood photos or Roblox artifacts has been supplied in this conversation.

For already-written context, read `research/shipaton-2026/konvo-blog-narrative.md` and `konvo-blog-evidence-notes.md`. The former is an assistant-edited draft approved only to the extent supported by Matthew's accounts, not a published article or verbatim interview transcript. Its three dashboard-image slots remain unfilled. The editor requested a continuous narrative, precise implementation details, dated screenshot evidence and clarification of paid subscriptions versus trials.

## Contributions and real decisions

Matthew presents Konvo as his solo, AI-assisted product. His accounts establish ownership of the problem choice, product and onboarding decisions, testing, responding to feedback, App Store submissions, pricing choices and public launch/marketing. Do not turn that into a claim that he manually authored every line or had no help. He reported discovering AI coding through Antigravity and later using Claude Code; Codex-assisted work is also documented in this workspace. Exact tool-by-tool contribution attribution has not been established.

Implementation detail is documented in `wrapper/src-tauri/src/lib.rs` and `cage.js`: Tauri/Rust hosting WKWebView, document-start scripts, CSS rules matching links and icon labels, feed-path redirection to the inbox, and a cached JSON channel for updated rules. Swift bridges RevenueCat and native functionality. Instagram changes remain an external dependency, and the remote patch does not resolve every change.

Two strong supplied stories:

1. He deleted Instagram for two weeks, felt less urge to scroll, and returned to 15+ unread messages. At school people mostly communicate through Instagram. Do not rewrite this as a clinically established cure for addiction.
2. He gave Konvo to ten friends. One asked for it to feel closer to native Instagram, prompting swipe/chat-transition work. His own words: “I was really shocked when I heard about this feedback because never in my life I’d ever thought of that.” He explained that he had removed Instagram from his phone while building Konvo and was no longer noticing its original feel. Clean grammar lightly, keeping the meaning.

He estimates 60% of his time went into onboarding during the first 73 builds. This is a personal estimate, not tracked hours. He confirmed six App Store rejections and September 1 as the public launch/promotion date. Keep that distinct from the initial store release.

Another documented learning story: his paywall waited for an unapproved lifetime product; a local StoreKit test file hid the error. Real users hit “Loading your plans.” He reports fixing it in build 82 by waiting only for products actually sold, then obtaining expedited review. Detailed narrative already exists in the blog draft and public Devpost story.

His dad encouraged outreach to around 50 people, including a designer associated with RevisionDojo. This was newly supplied in the portfolio brief. The designer's exact role, messages, particular changes and before/after artifacts are not verified here. Do not merge that person with the friend who requested swiping.

## Results: use evidence and accurate labels

The latest dated results supplied here remain **September 21, 2026**, not September 26 live metrics.

| Metric | Existing evidence and limits |
| --- | --- |
| 1,500+ downloads | Matthew's dated report; the public collage shows App Store Connect “First-Time Downloads” rounded to 1.5K. Obtain the original reporting dates/exact count if publishing a precise chart. Downloads are not active users. |
| $1,066 gross revenue | Matthew's dated report; the RevenueCat tile shows $1,066 with “Last 28 days” selected. Absolute filter dates and currency are not visible. He said “I think it's USD,” so USD remains unconfirmed. Do not label this profit, MRR or a September 1–21 total. |
| 20 testers | Self-reported, including the earlier account of testing with ten friends. No roster/export or precise reporting date supplied. |
| 54 trials / 49 active subscriptions | Older draft values. It is unresolved whether 49 includes trials; do not publish as 49 paying subscribers or treat 54/49 as a conversion funnel. |
| Organic reach | Prior report: 300,000+ combined views/impressions; another draft: 500,000+. Platforms, periods and reconciliation are incomplete. A collage shows 227,098 LinkedIn aggregate content impressions, which does not prove that one post received that total. Matthew separately reported 210,000+ impressions for his LinkedIn launch post; obtain its post-specific analytics for publication. |

Raw RevenueCat, App Store Connect and PostHog data, test accounts, private messages, subscription identifiers and unredacted internal screenshots are for private verification by default. Publish selected redacted evidence, not credentials or full customer/account details. Do not request passwords in chat.

Shipaton Next Gen status is **submitted**, not finalist or winner. The earlier audit observed “SUBMITTED, 5/5 steps done.” No Shippies nomination or award has been established either. The separate Shippies conversation produced an inquiry email draft, not a sent message or nomination confirmation.

## Other chapters still lacking artifacts

Matthew supplied these facts in his portfolio brief; no supporting links or files were established here:

- At 12, Roblox pumpkin-head accessories and approximately 500,000 Robux. Never convert this into cash earnings.
- Discovery of AI coding during the final two weeks of Grade 10 programming; more than 50 projects/prototypes in roughly two months afterward. Do not call these fifty launched products.
- Hackathon wins: competition names, exact placements, team members and personal contributions still needed. Do not substitute the Shipaton submission as a win.
- Coding content, later Pokémon content, and approximately 5,500 followers: platform and measurement date still needed.
- Upfront-payment versus free-trial experiments: prices, dates, sample sizes, funnel definitions and concurrent versus sequential design still unresolved. Do not claim a causal revenue lift or a randomized A/B test.

## How the next session should proceed

Inspect these materials before interviewing. Ask at most five necessary questions at once, focusing on remaining evidence, not repeating the supplied story. Matthew strongly dislikes repeatedly supplying the same information. Gather exact personal language for new moments, and identify interpretation as interpretation.

Voice: direct, casual, contractions, occasional natural emphasis such as “JUST”, “!!” and “lol”; no em dashes, AI/startup jargon, invented achievements or polished adult-founder persona. Use his supplied line: “I always JUST wanted to check my Instagram messages, but ended up scrolling.”

Keep code changes for the portfolio session. Respect unrelated ongoing edits in this repository. Read its AGENTS.md and applicable installed Next.js documentation before coding. For a local browser preview, the available browser skill is relevant; no image-generation skill is needed merely to reuse real screenshots. Never generate fabricated analytics, testimonials or historical artifacts.
