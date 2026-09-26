// Exercises the bundled onboarding page (wrapper/dist/index.html): the
// once-per-install gate, the Mac bypass, the full v2 walk (S1 -> S3 ranges
// -> S4 ranges -> S5/S6/S7 dark impact -> S8a/S8b -> proof and login) with the
// sheet's disclosed math, the S4 gating rule, the tap lock that stops
// spam-throughs, and the once-per-install flag being set at the login
// handoff, not later. The S2 motive screen was removed on Aug 11.
//
//   node test_onboarding.js          (jsdom already installed for test_cage)
//
// Same trick as test_cage.js: jsdom locks window.location, so the page's
// scripts are extracted from the markup and run with a shadowed `location`
// recorder. dom.went holds every place the page tried to navigate.
const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const HTML = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
const SCRIPTS = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
assert.strictEqual(SCRIPTS.length, 3,
  'expected the branch script, the Mac welcome script and the flow script');

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';
const INBOX = 'https://www.instagram.com/direct/inbox/';

const open = [];
function boot(opts = {}) {
  const dom = new JSDOM(HTML, {
    url: 'https://tauri.localhost/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  Object.defineProperty(dom.window.navigator, 'userAgent',
    { value: opts.ua || IPHONE, configurable: true });
  // The phone's language, as WebKit reports it (fr-FR, zh-CN, ko-KR).
  if (opts.lang) {
    Object.defineProperty(dom.window.navigator, 'language',
      { value: opts.lang, configurable: true });
    Object.defineProperty(dom.window.navigator, 'languages',
      { value: [opts.lang], configurable: true });
  }
  if (opts.onboarded) dom.window.localStorage.konvoOnboarded = '1';
  if (opts.onboardingPreview) dom.window.__konvoOnboardingPreview = true;
  if (opts.macWelcomed) dom.window.localStorage.konvoMacWelcomed = '1';
  // The bridge mock splits streams: appearance changes and funnel events.
  dom.appearance = [];
  dom.events = [];
  dom.tracked = [];
  dom.nav = [];
  dom.opened = [];
  dom.window.webkit = { messageHandlers: { konvoStore: {
    postMessage: m => {
      if (m.cmd === 'appearance') dom.appearance.push(m.productId);
      if (m.cmd === 'track') {
        dom.events.push(m.event);
        dom.tracked.push(m);
      }
      // The login handoff goes through native: a page-driven navigation to
      // instagram.com is a universal link on iOS and opens the Instagram
      // APP instead, stranding the user outside Konvo.
      if (m.cmd === 'onboardingExperiment') setTimeout(() => dom.window.__konvoStoreReply(m.id, opts.experiment || {variant:'control',enrolled:false}), 10);
      if (m.cmd === 'onboardingAnswers') dom.answers = JSON.parse(m.productId);
      if (m.cmd === 'go') dom.nav.push(m.productId);
      if (m.cmd === 'open') dom.opened.push(m.productId);
      if (m.cmd === 'review') dom.reviews = (dom.reviews || 0) + 1;
      // The receipt check at the splash: answered unless the test wants a
      // silent bridge; `entitled` makes this a paying user's reinstall.
      if (m.cmd === 'entitlements' && !opts.silent) setTimeout(() =>
        dom.window.__konvoStoreReply(m.id, { entitled: !!opts.entitled }), 30);
    } } } };
  dom.went = [];
  dom.window.__loc = { replace: t => dom.went.push(t) };
  for (const s of SCRIPTS) {
    dom.window.eval(`(function (location) {${s}})(window.__loc)`);
  }
  open.push(dom);
  return dom;
}
const settle = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(check) {
  const deadline = Date.now() + 2000;
  while (!check() && Date.now() < deadline) await settle(20);
  assert(check(), 'mock native onboarding assignment must resolve');
}
process.on('exit', () => open.forEach(d => d.window.close()));

(async () => {
  const preview = boot({onboarded:true,entitled:true,onboardingPreview:true,experiment:{variant:'test',enrolled:true}});
  await settle(200);
  assert(!preview.window.document.documentElement.classList.contains('experiment-new'));
  assert(preview.window.document.documentElement.classList.contains('onboard'));
  assert.equal(preview.window.localStorage.konvoOnboarded, '1', 'preview preserves original onboarding state');
  assert.equal(preview.nav.length, 0, 'preview does not skip the quiz for an existing subscriber');
  assert.equal(preview.appearance[0], 'auto', 'original preview follows system appearance');
  assert.equal(preview.appearance.at(-1), 'auto', 'cached preview assignment cannot pin the retired theme');
  // 1. The Mac gets ONE welcome screen on a fresh install - never the phone
  //    quiz, and never again after the first run. Before this, a Mac user
  //    double-clicked Konvo and landed on an Instagram login with no context.
  const mac = boot({ ua: DESKTOP });
  const macAgain = boot({ ua: DESKTOP, macWelcomed: true });
  const again = boot({ onboarded: true });
  await settle(200);
  assert.deepStrictEqual(mac.went, [], 'a fresh Mac must stay on the welcome screen');
  assert(mac.window.document.documentElement.classList.contains('macwelcome'),
    'a fresh Mac must show the welcome screen');
  assert(!mac.window.document.documentElement.classList.contains('onboard'),
    'the Mac must never get the phone quiz');
  mac.window.document.getElementById('macgo').click();
  assert.deepStrictEqual(mac.went, [INBOX], 'Continue must hand the Mac to the inbox');
  assert.strictEqual(mac.window.localStorage.konvoMacWelcomed, '1',
    'the Mac flag must be set before leaving, or a quit mid-navigation replays it');
  assert.deepStrictEqual(macAgain.went, [INBOX],
    'a returning Mac must go straight to the inbox');
  assert(!macAgain.window.document.documentElement.classList.contains('macwelcome'),
    'a returning Mac must not see the welcome screen again');

  // 2. Once per install, hard requirement: the flag short-circuits every
  //    later launch into today's splash behavior, and unpins appearance.
  assert.deepStrictEqual(again.went, [INBOX],
    'an onboarded iPhone must go straight to the inbox');
  assert.deepStrictEqual(again.appearance, ['auto'],
    'a returning iPhone must hand appearance to the phone immediately');

  // 2b. A paying user's reinstall (Aug 21): the receipt answers at the
  //     splash, the quiz is skipped, and the hop to Instagram is native.
  const payer = boot({ entitled: true });
  const silent = boot({ silent: true });
  await settle(200);
  assert(payer.window.document.documentElement.classList.contains('holding'),
    'a paying user must stay on the splash, never the quiz');
  assert(!payer.events.includes('onboarding_screen_viewed'),
    'a paying user must not count as an onboarding view');
  assert.strictEqual(payer.window.localStorage.konvoOnboarded, '1',
    'the skip must set the once-per-install flag');
  assert.deepStrictEqual(payer.nav, [INBOX],
    'the payer hop must go through the native load, never a page navigation');
  assert(payer.appearance.includes('auto'),
    'a payer hands appearance to the phone like a returning user');
  assert(silent.window.document.documentElement.classList.contains('holding'),
    'a silent bridge holds the splash while the receipt is checked');
  await settle(2000);
  assert(!silent.window.document.documentElement.classList.contains('holding'),
    'a bridge that never answers must not lock a new user out of onboarding');
  assert.strictEqual(silent.went.length, 0, 'and must not navigate anywhere');

  // 3. A fresh iPhone stays, on S1.
  const d = boot();
  const doc = d.window.document;
  await waitFor(() => !doc.documentElement.classList.contains('holding'));
  assert(doc.documentElement.classList.contains('onboard') &&
    !doc.documentElement.classList.contains('holding'),
    'a new user gets the quiz once the receipt says not entitled');
  assert(d.events.includes('onboarding_screen_viewed'),
    'and the hero view is counted once it is shown');
  assert.strictEqual(d.went.length, 0, 'a fresh install must not navigate away');
  assert(doc.getElementById('s1').classList.contains('on'), 'S1 must be showing');

  const experimental = boot({experiment:{variant:'test',enrolled:true}});
  await waitFor(() => !experimental.window.document.documentElement.classList.contains('holding'));
  assert(!experimental.window.document.documentElement.classList.contains('experiment-new'), 'Cached test replies cannot reactivate the retired onboarding');
  assert.strictEqual(experimental.window.document.querySelector('#s3 .opt').dataset.m, '360');
  assert.deepStrictEqual([...doc.querySelectorAll('#s3 .opt[data-m]')].map(e => e.dataset.m), ['360','270','210','150','90','45','150'], 'Instagram ranges descend, with unknown last');

  // 4. The whole walk with the sheet's own example numbers (2 h 30 m total,
  //    10-20 messaging): 7 years lost, 6 back. Every wait sits past the tap
  //    lock (600ms per slide, longer on the reveals).
  const tap = sel => {
    const el = doc.querySelector(sel);
    assert(el, sel + ' must exist');
    el.click();
  };
  tap('#s1 [data-next]');                       // Get started
  assert(doc.getElementById('s2c').classList.contains('on'),
    'Get started must land on the why question - personal first (Aug 21)');
  assert(!doc.getElementById('s2'), 'the motive screen must be gone from the document');
  assert(!doc.getElementById('s1b'), 'the email screen must be gone from the document');
  await settle(1100);
  tap("#s2c .opt[data-why='attention']");
  await settle(1400);
  assert(doc.getElementById('s3').classList.contains('on'),
    'the why question hands to screen time');
  const why = d.tracked.find(m => m.event === 'quiz_answered' && m.props.question === 'why');
  assert(why && why.props.answer === 'My attention span is cooked',
    'the why answer must be tracked with its label');
  await settle(1100);
  tap("#s3 .opt[data-m='150']");                // 2 - 3 hours
  await settle(1400);                           // 250ms beat + slide + lock
  assert(doc.getElementById('s4').classList.contains('on'),
    'screen-time ranges must auto-advance too - no Continue on option screens');
  assert(!doc.querySelector('#s4 .opt.sel'),
    'S4 must arrive with nothing selected - a pre-selection with no Continue button is a dead end');
  await settle(1100);
  tap("#s4 .opt[data-m='20']:not([data-est])"); // 10 - 20 mins
  await settle(400);                            // past the 250ms beat only
  assert(doc.getElementById('s4b').classList.contains('on'),
    'messaging must advance straight into the calculating beat');
  assert.strictEqual(doc.getElementById('p-time').textContent,
    '2 h 30 m a day on Instagram', 'the loader must echo the slider answer');
  assert.strictEqual(doc.getElementById('p-msg').textContent,
    'About 20 minutes messaging', 'the loader must echo the range answer');
  await settle(3400);                           // the calculating sequence
  assert(doc.getElementById('s5').classList.contains('on'),
    'the calculating beat must auto-advance into the dark reveal');
  assert(doc.querySelector('#s4b .pill:last-child').classList.contains('done'),
    'every calculating pill must complete before the reveal');
  assert.strictEqual(doc.getElementById('years-lost').textContent, '7 years',
    '150 min over full days across 60 years is 6.25, and the figure rounds up');
  assert.deepStrictEqual(d.appearance, ['dark'],
    'entering S5 must pin the letterbox dark');

  //    The tap lock: S5 just appeared, so an immediate tap (a spammer, or a
  //    ghost tap from the previous screen) must NOT advance.
  doc.getElementById('s5').click();
  assert(doc.getElementById('s5').classList.contains('on'),
    'a tap during the reveal dwell must be ignored - no spamming through');
  await settle(2600);                           // past the S5 dwell
  doc.getElementById('s5').click();             // Tap to continue
  assert(doc.getElementById('s6').classList.contains('on'),
    'after the dwell the same tap must advance');
  assert.strictEqual(doc.getElementById('col-now-v').textContent, '2 h 30 m / day');
  assert.strictEqual(doc.getElementById('col-dm-v').textContent, '20 m / day');
  await settle(1500);                           // past the S6 dwell
  tap('#s6 [data-next]');                       // See what changes
  assert(doc.getElementById('s7').classList.contains('on'));
  assert.strictEqual(doc.getElementById('years-back').textContent, '6 years',
    '130 protectable minutes is 5.42 years, and the figure rounds up');
  await settle(1900);                           // past the S7 dwell
  tap('#s7 [data-next]');                       // See what stays
  assert(doc.getElementById('s8a').classList.contains('on'));
  assert.strictEqual(d.appearance[d.appearance.length - 1], 'auto',
    'leaving the dark stretch must hand appearance back to the phone');
  await settle(1100);
  tap('#s8a [data-next]');                      // Next
  assert(doc.getElementById('s8b').classList.contains('on'));
  await settle(1100);
  tap('#s8b [data-next]');                      // Next
  assert(doc.getElementById('s8c').classList.contains('on'),
    'the pass hero must follow: users must learn the five-minute unlock exists');
  assert(/Lock the app when you’re ready/.test(doc.getElementById('s8c').textContent)
    && doc.querySelector('#s8c img[src="pass-hero.png"]'),
    'the pass hero must show the sheet mockup');
  await settle(1100);
  tap('#s8c [data-next]');                      // Continue
  //     The social-proof screen (Sep 1): laurels around the count, real
  //     quotes verbatim with first names, no stars, then direct login. The
  //     "Where did you hear about Konvo" screen that used to sit here is
  //     gone (Sep 1, Matthew's call: nobody dropped there, he did not want
  //     to ask it).
  assert(doc.getElementById('s9t').classList.contains('on'),
    'the tour hands straight to the proof screen');
  assert(!doc.getElementById('s2a') && !/Where did you hear/.test(HTML),
    'the attribution screen is gone from the document');
  assert(!doc.getElementById('s8d') && !doc.getElementById('s8e'),
    'the studies and founder pages are gone (Aug 21)');
  assert(doc.querySelector('#quotes .laurel img[src="proof.png"]'), 'the laurel block is the proof image');
  assert(doc.querySelector('#s9t .foot > #signin') && !doc.querySelector('#s9t .next'),
    'the proof screen ends on the standard full-width button like every other screen');
  assert(/@keyframes proof-bloom/.test(HTML) && /prefers-reduced-motion: no-preference/.test(HTML) &&
    /#s9t\.on \.b4 \{ animation-name: proof-drop-r; animation-delay: 1\.2s \}/.test(HTML),
    'the reveal is a staggered animation, gated on the motion preference');
  assert.strictEqual(doc.getElementById('proof-cap').textContent, 'users love Konvo');
  assert.strictEqual(doc.querySelectorAll('#quotes .bubble').length, 4, 'four bubbles around the laurels');
  assert(/Really smart approach/.test(doc.getElementById('quotes').textContent)
    && /Muhammad/.test(doc.getElementById('quotes').textContent)
    && doc.querySelector('#quotes .bubble b'),
    'quotes are verbatim excerpts with a first name and an emphasised phrase');
  assert(!/[★⭐]|\d\.\d ?\//.test(doc.getElementById('s9t').textContent),
    'no rating figures in the text');
  assert(!doc.getElementById('s10') && !doc.getElementById('s10b'),
    'both standalone privacy steps are removed');
  assert.strictEqual(doc.getElementById('signin').textContent, 'Continue with Instagram');
  tap('#signin');
  assert.strictEqual(d.nav.length, 0, 'a tap during the proof reveal must not start login');
  assert(!d.window.localStorage.konvoOnboarded, 'the early tap must not mark onboarding complete');
  const policy = doc.getElementById('onboarding-privacy');
  assert.strictEqual(policy.href, 'https://konvoinstall.com/privacy');
  tap('#onboarding-privacy');
  assert.deepStrictEqual(d.opened, [policy.href], 'privacy opens in the native browser sheet');
  assert(doc.getElementById('s9t').classList.contains('on') && !d.window.localStorage.konvoOnboarded,
    'reading privacy must preserve the onboarding screen and completion flag');
  assert(!d.events.includes('login_started'), 'reading privacy must not count as a login start');
  // Browser fallback retains the real link; it must not replace the quiz.
  const native = d.window.webkit;
  delete d.window.webkit;
  const policyClick = new d.window.MouseEvent('click', { bubbles: true, cancelable: true });
  policy.dispatchEvent(policyClick);
  assert(!policyClick.defaultPrevented && policy.target === '_blank',
    'without native, privacy uses a separate browser tab');
  d.window.webkit = native;
  assert.strictEqual(d.reviews || 0, 0, 'no rating request during onboarding');
  await settle(1600);
  tap('#signin');
  tap('#signin');
  assert.strictEqual(d.window.localStorage.konvoOnboarded, '1',
    'Sign-in must set the once-per-install flag at the handoff, not at the paywall');
  assert(d.nav.length === 1 && d.nav[0].startsWith(INBOX + '#konvo='),
    'the handoff must go through NATIVE navigation and carry the weekly hours');
  assert(Number(d.nav[0].split('=')[1].split(',')[0]) >= 1,
    'weekly hours floor at 1 so the pre-paywall screen never says zero');
  assert(d.nav[0].endsWith(',attention'),
    'the handoff carries the why answer after the hours (Sep 7): the offer page speaks to it');
  assert.deepStrictEqual(d.went, [],
    'the page must not navigate itself: that is the universal link that opens Instagram');
  assert(doc.getElementById('s11').classList.contains('on'),
    'the handoff spinner must be the last thing shown');
  assert.strictEqual(d.events.filter(e => e === 'login_started').length, 1,
    'repeated taps must not duplicate login starts');
  assert.strictEqual(d.tracked.find(m => m.event === 'login_started').props.screen_id, 's9t',
    'login attribution points to the actual screen, not the removed privacy step');
  assert.strictEqual(d.answers.instagramMinutes, 150);
  assert.strictEqual(d.answers.messagingMinutes, 20);
  assert.strictEqual(d.answers.instagramUnknown, false);
  assert.strictEqual(d.answers.messagingUnknown, false);
  const quiz = d.tracked.filter(m => m.event === 'quiz_answered');
  assert(quiz.length === 3, 'all three quiz answers must be tracked (screen time, messaging, why)');
  assert(quiz.every(m => m.props.answer && m.props.answer.length),
    'each quiz_answered must carry the chosen option label as answer');
  assert(!d.events.includes('attribution'),
    'no attribution event any more: the screen is gone (Sep 1)');
  assert(d.events.includes('onboarding_screen_viewed'),
    'screen views must be tracked');

  // 5. The gating rule: a 15-minute total disables every messaging range it
  //    cannot contain (including the 20-minute "I don't know" estimate).
  const one = boot();
  const od = one.window.document;
  const otap = sel => od.querySelector(sel).click();
  otap('#s1 [data-next]');
  await settle(1100);
  otap("#s2c .opt[data-why='present']");
  await settle(1400);
  otap("#s3 .opt[data-m='45']");                // < 1 hour: the lowest range
  await settle(1400);
  const opts = [...od.querySelectorAll('#s4 .opt')];
  assert(opts.length > 0, 'S4 must offer messaging ranges');
  for (const o of opts) {
    const over = +o.dataset.m > 45;
    assert.strictEqual(o.hasAttribute('disabled'), over,
      `messaging range ${o.dataset.m} must be ${over ? 'disabled' : 'available'} under a 1 hour total`);
  }
  const alive = od.querySelector('#s4 .opt:not([disabled])');
  alive.click();
  await settle(6300);                           // beat + calculating + S5 dwell
  assert(/years$/.test(od.getElementById('years-lost').textContent),
    'the projection must render a years figure at the minimum');
  od.getElementById('s5').click();
  await settle(1500);
  const dm = od.getElementById('col-dm-v').textContent;
  assert(/^\d+ m \/ day$/.test(dm), 'the messaging column must show the chosen range');
  otap('#s6 [data-next]');
  await settle(1900);
  const back = od.getElementById('years-back').textContent;
  assert(/^\d+ years$/.test(back),
    'years back must render from the minimum answers, as a whole number');
  assert(parseFloat(back) > 0, 'years back must never be zero - the sentence would read as nothing to gain');
  otap('#s7 [data-next]');
  await settle(1100);
  otap('#s8a [data-next]');
  await settle(1100);
  otap('#s8b [data-next]');
  await settle(1100);
  otap('#s8c [data-next]');
  await settle(1600);                            // the proof reveal's dwell
  otap('#signin');
  assert(one.nav[0].startsWith(INBOX + '#konvo=') && one.nav[0].endsWith(',present'),
    'the handoff carries the hours and the why even from the minimum answers');

  // 9. The funnel speaks the phone's language (Aug 31). The table is
  //    complete (same keys in fr/zh/ko, every T() key and every visible
  //    text node covered, no em dashes), a French phone repaints the markup
  //    AND the JS-built numbers, the analytics enum stays English whatever
  //    the screen says, zh-CN reads Traditional, and an unknown language
  //    is plain English, untouched.
  const I18N = eval('(' + HTML.match(/var I18N = (\{[\s\S]*?\n  \});/)[1] + ')');
  const LANGS = ['fr', 'zh', 'ko'];
  const keysOf = l => Object.keys(I18N[l]).sort().join('\n');
  assert(LANGS.every(l => keysOf(l) === keysOf('fr')),
    'every language must carry exactly the same keys');
  for (const m of SCRIPTS[2].matchAll(/\bT\("([^"]+)"/g))
    assert(I18N.fr[m[1]] !== undefined, `T() key without a translation: ${m[1]}`);
  for (const l of LANGS) for (const [k, v] of Object.entries(I18N[l]))
    assert(!/—/.test(v) && v.length, `bad ${l} entry for: ${k}`);
  const en = boot();
  await settle(100);
  const BRANDS = new Set(['Konvo', 'TikTok', 'Instagram', 'LinkedIn', 'App Store']);
  const tw = en.window.document.createTreeWalker(
    en.window.document.getElementById('flow'), 4);
  let tn, covered = 0;
  while ((tn = tw.nextNode())) {
    const k = tn.nodeValue.replace(/\s+/g, ' ').trim();
    if (!k || BRANDS.has(k) || tn.parentElement.id) continue;   // ids = JS-owned
    if (tn.parentElement.closest('#quotes')) continue;           // verbatim quotes stay as written
    assert(I18N.fr[k] !== undefined, `markup text without a translation: ${k}`);
    covered++;
  }
  assert(covered > 40, 'the walker must have seen the whole funnel, saw ' + covered);
  const fr = boot({ lang: 'fr-FR' });
  const fdoc = fr.window.document;
  await settle(100);
  assert.strictEqual(fdoc.documentElement.lang, 'fr');
  assert.strictEqual(fdoc.querySelector('#s1 h1').textContent,
    I18N.fr['Instagram without the Feed, Reels or Explore.'],
    'the hero headline must repaint in French');
  assert(!/Get started/.test(fdoc.getElementById('flow').textContent),
    'no English button may survive on a French phone');
  assert(fr.tracked.length && fr.tracked.every(m => m.props.lang === 'fr-FR'),
    'every event carries the phone language tag');
  const ftap = sel => fdoc.querySelector(sel).click();
  ftap('#s1 [data-next]');
  await settle(1100);
  ftap("#s2c .opt[data-why='attention']");
  await settle(1400);
  const fwhy = fr.tracked.find(m => m.event === 'quiz_answered');
  assert.strictEqual(fwhy.props.answer, 'My attention span is cooked',
    'the quiz enum must stay English on a French phone, or the PostHog tiles break');
  await settle(1100);
  ftap("#s3 .opt[data-m='150']");
  await settle(1400);
  await settle(1100);
  ftap("#s4 .opt[data-m='20']:not([data-est])");
  await settle(400);
  assert.strictEqual(fdoc.getElementById('p-time').textContent,
    '2 h 30 par jour sur Instagram', 'the JS-built loader line must be French');
  assert.strictEqual(fdoc.getElementById('p-msg').textContent,
    'Environ 20 minutes en messages');
  await settle(3400);
  assert.strictEqual(fdoc.getElementById('years-lost').textContent, '7 ans',
    'the reveal number must carry its French unit');
  const zh = boot({ lang: 'zh-CN' });
  const de = boot({ lang: 'de-DE' });
  await settle(100);
  assert.strictEqual(zh.window.document.querySelector('#s1 h1').textContent,
    I18N.zh['Instagram without the Feed, Reels or Explore.'],
    'a Simplified Chinese phone reads Traditional, not English');
  assert.strictEqual(de.window.document.documentElement.lang, 'en');
  assert(/Get started/.test(de.window.document.getElementById('flow').textContent),
    'an unsupported language is plain English');

  console.log('ALL ONBOARDING TESTS PASS');
  process.exit(0);
})();
