// Exercises the cage's logic against fake Instagram markup. This is the only
// automated check the wrapper has: everything else lives in Instagram's own
// page, which cannot be tested without a device.
//
//   npm install               (once, in wrapper/)
//   npm test                  (from wrapper/: syntax check + both suites)
const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

// The SOURCE file, the same bytes include_str! ships: no extraction step,
// no committed copy, no way for a green suite to describe a stale cage.
const CAGE = fs.readFileSync(__dirname + '/../src-tauri/src/cage.js', 'utf8');
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';

const open = [];
function boot(path, html, opts = {}) {
  const dom = new JSDOM(`<body>${html}</body>`, {
    url: 'https://www.instagram.com' + path,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  // jsdom ignores the userAgent option here, and the cage branches on it.
  Object.defineProperty(dom.window.navigator, 'userAgent',
    { value: opts.ua || IPHONE, configurable: true });
  // The phone's language, as WebKit reports it (fr-FR, ko-KR).
  if (opts.lang) {
    Object.defineProperty(dom.window.navigator, 'language',
      { value: opts.lang, configurable: true });
    Object.defineProperty(dom.window.navigator, 'languages',
      { value: [opts.lang], configurable: true });
  }
  // The paywall's auth gate is the ds_user_id cookie: present for a
  // signed-in user unless the case is explicitly loggedOut. The fetch
  // (the badge poll) never resolves, as before.
  if (!opts.loggedOut) dom.window.document.cookie = 'ds_user_id=1234567';
  // Beta builds prepend window.__konvoBeta=true before the cage runs.
  if (opts.beta) dom.window.__konvoBeta = true;
  if (opts.onboardingPreview) dom.window.__konvoOnboardingPreview = true;
  dom.window.fetch = () => new Promise(() => {});
  // Paywall state, seeded before the cage runs: `paid` is the offline cache a
  // paying user relies on; `bridge` stands in for KonvoStore.swift and gets
  // every postMessage the wall sends, replying via __konvoStoreReply.
  if (opts.paid) dom.window.localStorage.setItem('konvoPaid', '1');
  // Free builds prepend window.__konvoFree=true. welcomed/betaFree are the
  // two markers that mean "this person has already seen the sequence".
  if (opts.free) dom.window.__konvoFree = true;
  if (opts.welcomed) dom.window.localStorage.setItem('konvoWelcomed', '1');
  if (opts.betaFree) dom.window.localStorage.setItem('konvoBetaFree', '1');
  if (opts.seed) for (const k in opts.seed) dom.window.localStorage.setItem(k, opts.seed[k]);
  // The notifications page (Sep 2) shows once per install; walks that are
  // not about it model an install already asked. askNotify: true asks.
  if (!opts.askNotify) dom.window.localStorage.setItem('konvoNotifyAsked', '1');
  if (opts.sseed) for (const k in opts.sseed) dom.window.sessionStorage.setItem(k, opts.sseed[k]);
  if (opts.patch) dom.window.localStorage.setItem('konvoPatch', JSON.stringify(opts.patch));
  if (opts.bridge) dom.window.webkit = { messageHandlers: { konvoStore: {
    postMessage: m => m.cmd === 'onboardingContext' ? dom.window.__konvoStoreReply(m.id, opts.experiment || {}) : opts.bridge(m, dom) } } };
  // jsdom refuses to navigate and locks window.location, so shadow `location`
  // with a recorder. dom.went holds every place the cage tried to send us.
  dom.went = [];
  const q = path.indexOf('?');
  dom.window.__loc = {
    hostname: 'www.instagram.com',
    pathname: q < 0 ? path : path.slice(0, q),
    search: q < 0 ? '' : path.slice(q),
    hash: opts.hash || '',
    href: 'https://www.instagram.com' + path,
    replace: t => dom.went.push(t),
    assign: t => dom.went.push(t),
    reload: () => dom.went.push('reload'),
  };
  dom.window.eval(`(function (location) {${CAGE}})(window.__loc)`);
  open.push(dom);
  return dom;
}
const settle = ms => new Promise(r => setTimeout(r, ms || 1000));
// The cage installs setIntervals; without this node never exits.
process.on('exit', () => open.forEach(d => d.window.close()));

(async () => {
  // 1. Everything feed-shaped stays caged. Home is in the list: in-app posting
  //    is gone, so nothing needs "/" to be reachable, and the feed can no
  //    longer render even behind CSS. The two exemptions — a sent reel (7) and
  //    stories (8) — are each asserted in both directions below.
  const leaks = ['/', '/?variant=following', '/reels/', '/explore/',
    '/someuser/reels/', '/someuser/tagged/'].map(p => [p, boot(p, '')]);
  await settle();
  for (const [p, d] of leaks) {
    assert(d.went.includes('/direct/inbox/'), `${p} must be caged`);
  }

  // 2. What the injected CSS does and does not shut. jsdom will not evaluate
  //    :has(), so assert on the rules themselves.
  const sheets = [...boot('/direct/inbox/', '')
    .window.document.querySelectorAll('style')].map(s => s.textContent).join('');
  assert(!/aria-label="Notifications"/.test(sheets),
    'the notifications heart must stay visible on the phone');
  const deskSheets = [...boot('/direct/inbox/', '', { ua: DESKTOP })
    .window.document.querySelectorAll('style')].map(s => s.textContent).join('');
  assert(!/aria-label="Notifications"/.test(deskSheets),
    'the desktop heart stays - flip-flopped twice, re-added by request 2026-07-31');
  // Avatars used to be inert (pointer-events:none) because profiles were
  // unreachable. Profiles are a deliberate doorway now, and that rule also
  // killed taps on the notes tray - which is built out of avatars - so
  // liking a friend's note did nothing. Avatars must stay TAPPABLE.
  assert(!/pointer-events:\s*none/.test(sheets),
    'avatars must stay tappable - notes are avatars, and profiles are open now');
  assert(!/a:has\(svg\[aria-label="Messages"\]\)/.test(sheets),
    'Messages must stay: it is the only way back to the inbox from a profile');
  assert(/aria-label="New post"/.test(sheets),
    'the + stays hidden: builds 28-29 proved web posting routes through "/" (settled 2026-07-31)');
  //     Doors keyed on English labels stay open on a French phone (live
  //     DOM, Aug 31: "Options", an unlabelled Threads link, "Précédent").
  //     These are their language-proof twins, verified on that DOM.
  assert(/a\[href\^="\/accounts\/settings"\]/.test(sheets), 'the Settings gear by href');
  assert(/a\[href\*="threads\.com"\]/.test(sheets), 'the Threads link by href');
  assert(/html\.im-inbox a:has\(polyline\[points="9\.276 4\.726 2\.001 12\.004 9\.276 19\.274"\]\):not\(\.im-keep-back\)/.test(sheets),
    'the inbox back chevron by its geometry, the same in every locale');
  assert(/a\[href="\/direct\/requests\/"\]/.test(sheets),
    'the Requests tab by href - the English text scan is gone');
  assert(!/hideRequests/.test(CAGE), 'no English text scan for the Requests tab');

  // 3. The nav's Profile entry is an avatar link with no nav ancestor and no
  //     aria-label - only its position outside <main> tells it apart from the
  //     faces that must stay visible.
  const avatar = '<a href="/me/"><img alt="me\'s profile picture"><span>Profile</span></a>';
  const rail = boot('/direct/inbox/', avatar + '<main>' + avatar + '</main>');
  await settle();
  const links = [...rail.window.document.querySelectorAll('a[href="/me/"]')];
  assert(links[0].style.display === 'none', "the nav's Profile entry must be hidden");
  assert(links[1].style.display !== 'none',
    'avatars inside main are content - hiding them leaves a hole in the profile header');

  // 4. Profiles themselves are open now: you cannot message someone you just
  //     met without first reaching their profile.
  const profiles = ['/someuser/', '/some.user_1', '/accounts/edit/',
    '/p/abc/', '/tv/xyz/'].map(p => [p, boot(p, '')]);
  await settle();
  for (const [p, d] of profiles) {
    assert(!d.went.includes('/direct/inbox/'), `${p} must not be caged`);
  }

  // 5. Tapping media in a thread must now REACH Instagram, so the reel someone
  //    sent actually plays. This assertion is the exact inverse of what it used
  //    to be: the swallower that blocked these taps has been deleted. Covers all
  //    three shapes the tap really lands on: the <video>, a poster <img>
  //    thumbnail (what a sent reel renders as), and a transparent overlay
  //    sitting on top of the thumbnail.
  const shapes = {
    video: '<div id="bubble"><video src="r.mp4"></video></div>',
    thumbnail: '<div id="bubble"><img src="poster.jpg"></div>',
    overlay: '<div id="bubble"><div id="hit"><img src="poster.jpg"></div></div>',
  };
  for (const [name, html] of Object.entries(shapes)) {
    const d = boot('/direct/t/123/', html);
    let viewerOpened = false;
    d.window.document.getElementById('bubble')      // Instagram's own handler
      .addEventListener('click', () => { viewerOpened = true; });
    const target = name === 'overlay' ? '#hit' : (name === 'video' ? 'video' : 'img');
    const ev = new d.window.MouseEvent('click', { bubbles: true, cancelable: true });
    d.window.document.querySelector(target).dispatchEvent(ev);
    assert(viewerOpened, `${name}: tap must reach Instagram so the reel plays`);
    assert(!ev.defaultPrevented, `${name}: tap must not be swallowed any more`);
  }

  // ...and ordinary taps in a thread must still work, as they always did.
  const composer = boot('/direct/t/123/', '<div id="send"><span>Send</span></div>');
  let sent = false;
  composer.window.document.getElementById('send').addEventListener('click', () => { sent = true; });
  composer.window.document.querySelector('span').dispatchEvent(
    new composer.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(sent, 'non-media taps in a thread must still work');

  // 5b. A link someone sent goes to the real browser, not nowhere and not
  //     into the cage. Instagram's own links must be left alone, or every
  //     in-app navigation would be handed to Safari.
  const link = boot('/direct/t/123/',
    '<a href="https://canva.link/u471" target="_blank">Untitled design</a>' +
    '<a href="https://www.instagram.com/direct/t/9/" id="own">thread</a>');
  const opened = [];
  link.window.__TAURI_INTERNALS__ = { invoke: (cmd, args) => { opened.push([cmd, args.url]); return Promise.resolve(); } };
  const ext = new link.window.MouseEvent('click', { bubbles: true, cancelable: true });
  link.window.document.querySelector('a[target="_blank"]').dispatchEvent(ext);
  assert(ext.defaultPrevented, 'an external link must not be left to window.open');
  assert.deepStrictEqual(opened, [['plugin:opener|open_url', 'https://canva.link/u471']],
    'the link should have been handed to the real browser');
  const own = new link.window.MouseEvent('click', { bubbles: true, cancelable: true });
  link.window.document.getElementById('own').dispatchEvent(own);
  assert(!own.defaultPrevented, "Instagram's own links must stay in the app");
  assert.strictEqual(opened.length, 1, 'only external links go to the browser');

  // 5c. Mobile DM bubbles and story link stickers use window.open, a silent
  //     no-op in a webview - the tap died there, on device, twice. It must
  //     route out like a click, with Meta's l.instagram.com linkshim
  //     unwrapped so the browser gets the real destination, and identical
  //     back-to-back opens (anchor handler + Instagram's own window.open on
  //     one tap) must collapse into one Safari tab.
  const sticker = boot('/stories/bob/314/', '');
  const stickerOpened = [];
  sticker.window.__TAURI_INTERNALS__ =
    { invoke: (cmd, args) => { stickerOpened.push(args.url); return Promise.resolve(); } };
  sticker.window.open('https://l.instagram.com/?u=https%3A%2F%2Fshop.example%2Fx&e=ATO');
  assert.deepStrictEqual(stickerOpened, ['https://shop.example/x'],
    'a story link sticker must reach the real browser, unwrapped');
  sticker.window.open('https://l.instagram.com/?u=https%3A%2F%2Fshop.example%2Fx&e=ATO');
  assert.strictEqual(stickerOpened.length, 1, 'one tap must not open Safari twice');
  sticker.window.open('https://www.instagram.com/p/abc/');
  assert.strictEqual(stickerOpened.length, 1, "Instagram's own new-tab opens stay in the app");
  assert.strictEqual(sticker.window.__loc.href, 'https://www.instagram.com/p/abc/',
    'an in-app new-tab open must navigate in place instead');

  //     ...and a linkshim-wrapped <a> in a DM goes out unwrapped, not into
  //     the cage as an instagram.com navigation.
  const shim = boot('/direct/t/123/',
    '<a href="https://l.instagram.com/?u=https%3A%2F%2Fnews.example%2Fa" target="_blank">news</a>');
  const shimOpened = [];
  shim.window.__TAURI_INTERNALS__ =
    { invoke: (cmd, args) => { shimOpened.push(args.url); return Promise.resolve(); } };
  const sev = new shim.window.MouseEvent('click', { bubbles: true, cancelable: true });
  shim.window.document.querySelector('a').dispatchEvent(sev);
  assert(sev.defaultPrevented, 'a linkshim anchor must not navigate the webview');
  assert.deepStrictEqual(shimOpened, ['https://news.example/a'],
    'the linkshim must unwrap to the real URL');

  // 6. Regression guard: inbox rows use avatar images as their tap target, so
  //    the media blocker must not reach the conversation list.
  const list = boot('/direct/inbox/', '<div id="row"><img src="avatar.jpg"><span>aliisa</span></div>');
  let openedChat = false;
  list.window.document.getElementById('row').addEventListener('click', () => { openedChat = true; });
  list.window.document.querySelector('img').dispatchEvent(
    new list.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(openedChat, 'tapping a conversation avatar must still open the chat');

  // 7. A reel someone sent is watchable, but only that one. The permalink and
  //    the feed differ by a single letter, so both directions are asserted:
  //    tightening the pattern back to /reels?/ re-cages what a friend sent,
  //    loosening it to /reel/ opens the infinite feed.
  const reel = boot('/reel/Cabc123/', '', { ua: DESKTOP });
  await settle();
  assert(!reel.went.includes('/direct/inbox/'), 'a sent reel must be watchable');
  const feed = boot('/reels/', '', { ua: DESKTOP });
  await settle();
  assert(feed.went.includes('/direct/inbox/'), 'the reels feed must stay caged');

  // ...and there must be no way to swipe, scroll, or arrow out of it into the
  // next one. wheel is the Mac, touchmove is the phone, and neither handler is
  // UA-gated - so the phone gets its own boot rather than a second dispatch
  // against the desktop one.
  const wheel = new reel.window.Event('wheel', { bubbles: true, cancelable: true });
  reel.window.document.body.dispatchEvent(wheel);
  assert(wheel.defaultPrevented, 'scrolling out of a reel must be blocked');

  const phone = boot('/reel/Cabc123/', '', { ua: IPHONE });
  await settle();
  assert(!phone.went.includes('/direct/inbox/'), 'a sent reel must be watchable on the phone too');
  const swipe = new phone.window.Event('touchmove', { bubbles: true, cancelable: true });
  phone.window.document.body.dispatchEvent(swipe);
  assert(swipe.defaultPrevented, 'swiping out of a reel must be blocked');

  // ...and the phone's viewer, which never changes the URL, so it is recognised
  // by a <video> that fills the viewport instead. Confirmed on device: without
  // this, swiping in the phone's player walks into suggested reels. jsdom has no
  // layout, so the rect is stubbed - the height ratio is the whole assertion.
  const player = boot('/direct/t/123/', '<video src="r.mp4"></video>', { ua: IPHONE });
  const vid = player.window.document.querySelector('video');
  vid.getBoundingClientRect = () => ({ height: player.window.innerHeight });
  const flick = new player.window.Event('touchmove', { bubbles: true, cancelable: true });
  let instagramSaw = false;
  player.window.document.body.addEventListener('touchmove', () => { instagramSaw = true; });
  player.window.document.body.dispatchEvent(flick);
  assert(flick.defaultPrevented, 'swiping in the phone player must be blocked');
  assert(!instagramSaw, "the swipe must never reach Instagram's own handler");

  // ...but a small video bubble in a thread is not the player, so the
  // conversation still scrolls past it.
  const bubble = boot('/direct/t/123/', '<video src="r.mp4"></video>', { ua: IPHONE });
  bubble.window.document.querySelector('video').getBoundingClientRect =
    () => ({ height: 120 });
  const past = new bubble.window.Event('touchmove', { bubbles: true, cancelable: true });
  bubble.window.document.body.dispatchEvent(past);
  assert(!past.defaultPrevented, 'a thread with a video clip must still scroll');

  // ...and /reel/ with no code after it is the feed by another name.
  const bare = boot('/reel/', '', { ua: DESKTOP });
  await settle();
  assert(bare.went.includes('/direct/inbox/'), 'bare /reel/ must stay caged');

  // ...and the player must not be silent. Instagram ships it muted; a reel a
  // friend sent is meant to be heard. Small video bubbles in a thread keep
  // Instagram's own muted autoplay, which is what you want scrolling a chat.
  const sound = boot('/direct/t/123/',
    '<video id="big"></video><video id="small"></video><audio id="track"></audio>',
    { ua: IPHONE });
  const big = sound.window.document.getElementById('big');
  const small = sound.window.document.getElementById('small');
  const track = sound.window.document.getElementById('track');
  for (const e of [big, small, track]) e.muted = true;
  big.getBoundingClientRect = () => ({ height: sound.window.innerHeight });
  small.getBoundingClientRect = () => ({ height: 100 });
  track.getBoundingClientRect = () => ({ height: 0 });
  big.dispatchEvent(new sound.window.Event('playing'));
  assert(!big.muted, 'the reel player must be unmuted');
  assert(!track.muted, 'a separate audio stream must be unmuted too');
  assert(small.muted, 'a clip in the thread behind the player must stay muted');

  // ...and muting it by hand must stick, which is why this is driven by media
  // events rather than by sweep.
  big.muted = true;
  sound.window.document.body.appendChild(sound.window.document.createElement('div'));
  await settle(50);
  assert(big.muted, 'unmute must not fight the user muting it back');

  const down = new reel.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
  reel.window.document.body.dispatchEvent(down);
  assert(down.defaultPrevented, 'arrowing to the next reel must be blocked');
  const space = new reel.window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  reel.window.document.body.dispatchEvent(space);
  assert(!space.defaultPrevented, 'space must still pause the video');

  // ...and none of that may leak into a thread, where scrolling back through
  // the conversation is the whole point.
  const thread = boot('/direct/t/123/', '', { ua: IPHONE });
  const scroll = new thread.window.Event('touchmove', { bubbles: true, cancelable: true });
  thread.window.document.body.dispatchEvent(scroll);
  assert(!scroll.defaultPrevented, 'a thread must still scroll');

  // 8. Stories are watchable: viewer and highlights URLs survive on both
  //    platforms. The way out needs no lock of its own — the viewer only walks
  //    people you follow, and its exit lands on "/", which test 1 cages.
  const stories = ['/stories/bob/3141/', '/stories/highlights/17/'].flatMap(p =>
    [[p, boot(p, '', { ua: DESKTOP })], [p, boot(p, '')]]);
  await settle();
  for (const [p, d] of stories) {
    assert(!d.went.includes('/direct/inbox/'), `${p} must be watchable`);
  }

  // 8b. A post page is not the reel player: a tall video post must not trip
  //     the gesture lock, or comments stop scrolling and the desktop's
  //     next/prev arrows through a profile's grid die.
  const post = boot('/p/abc123/', '<video src="v.mp4"></video>', { ua: DESKTOP });
  post.window.document.querySelector('video').getBoundingClientRect =
    () => ({ height: post.window.innerHeight });
  const postWheel = new post.window.Event('wheel', { bubbles: true, cancelable: true });
  post.window.document.body.dispatchEvent(postWheel);
  assert(!postWheel.defaultPrevented, 'a post page must scroll even with a tall video');

  // 9. The phone's notifications doorway. The mobile inbox renders no tab bar
  //    (confirmed by screenshot on device), so the cage injects its own heart
  //    linking to Instagram's activity page - phone-only.
  const heartPhone = boot('/direct/inbox/', '');
  const h = heartPhone.window.document.getElementById('im-heart');
  // /notifications/ on the phone, /accounts/activity/ on the Mac: measured
  // on device - pushing the desktop path made Instagram render
  // /notifications/ anyway, which is what the full page load was for.
  assert(h && h.getAttribute('href') === '/notifications/',
    'the phone inbox must carry the injected heart, pointed at the phone route');
  assert(!boot('/direct/inbox/', '', { ua: DESKTOP }).window.document.getElementById('im-heart'),
    'no heart on the Mac - tried in build 25, reverted same-day');
  const activity = boot('/accounts/activity/', '');
  await settle();
  assert(!activity.went.includes('/direct/inbox/'), 'the activity page must stay reachable');

  // The build-29 /create/story/ probe is gone: tested on device 2026-07-31,
  // Instagram redirected it through "/", so no posting doorway may exist.
  assert(!heartPhone.window.document.getElementById('im-create'),
    'the story probe must stay deleted - the experiment is settled');

  // 10. The paywall sequence. iOS is the paid platform: an unpaid iPhone at
  //     the inbox gets S12 connected -> S12b loader -> perks comparison ->
  //     S13 three-package paywall, on real timers. The Mac never does, a
  //     cached konvoPaid suppresses it with no bridge round-trip, and it
  //     only rises at the inbox, never over a thread.
  // The walkthrough's bridge answers products like production does (Aug
  // 31): the wall no longer paints stand-in money, so a priced S13 needs
  // a live reply. The values are what the assertions below quote.
  const wallFresh = boot('/direct/inbox/', '', { hash: '#konvo=15,distracted', bridge: (m, d) => {
    if (m.cmd === 'products') d.window.__konvoStoreReply(m.id, { ok: true,
      yearly: { price: '$19.99', perWeek: '$0.38', perMonth: '$1.67', savePct: 76, trialDays: 7 },
      monthly: { price: '$6.99' }, lifetime: { price: '$19.99' } });
  } });
  const wallDesk = boot('/direct/inbox/', '', { ua: DESKTOP });
  const wallPaid = boot('/direct/inbox/', '', { paid: true });
  const wallThread = boot('/direct/t/123/', '');
  const wallOut = boot('/direct/inbox/', '', { loggedOut: true });
  const wallBeta = boot('/direct/inbox/', '', { beta: true });
  //     An update must never replay the welcome sequence. The free build
  //     reads konvoWelcomed, but a tester arriving from a beta build has
  //     only konvoBetaFree: the same fact under the other variant's name.
  //     Reading one alone sent every existing tester back through it.
  const wallFreeNew = boot('/direct/inbox/', '', { free: true });
  const wallFreeDone = boot('/direct/inbox/', '', { free: true, welcomed: true });
  const wallFreeFromBeta = boot('/direct/inbox/', '', { free: true, betaFree: true });
  // The connected beat lasts ~1.8s and its start jitters with the nine
  // parallel boots, so a fixed sleep fails short AND long (Aug 17). Poll
  // into the beat; it typically lands within half a second.
  const wdoc = wallFresh.window.document;
  const payText = () =>
    (wdoc.getElementById('im-pay') || {}).textContent || '';
  for (let i = 0; i < 40 && !/Instagram connected\./.test(payText()); i++)
    await settle(100);
  assert(wdoc.getElementById('im-pay'), 'an unpaid iPhone inbox must get the wall');
  assert(/Instagram connected\./.test(payText()),
    'the sequence must open on the connected confirmation');
  assert(!wallDesk.window.document.getElementById('im-pay'),
    'no paywall on the Mac');
  assert(!wallPaid.window.document.getElementById('im-pay'),
    'a cached konvoPaid must suppress the wall without any bridge');
  assert(!wallThread.window.document.getElementById('im-pay'),
    'the wall only rises at the inbox');
  //     The trap this closes: /direct/inbox/ renders for a beat before
  //     Instagram bounces a signed-out visitor, and a wall raised there
  //     takes money from someone who then lands on a login page.
  assert(!wallOut.window.document.getElementById('im-pay'),
    'no verified Instagram session, no paywall - ever');
  //     Beta builds now walk the SAME wall as everyone else - skipping it
  //     produced zero pricing data from eighteen testers. What they get is
  //     an escape hatch, and it exists only in a beta binary: a store build
  //     has no such markup and no handler, so no remote config can conjure
  //     one.
  assert(wallBeta.window.document.getElementById('im-pay'),
    'a beta build must raise the real wall - that is where the pricing data comes from');
  assert(wallFreeNew.window.document.getElementById('im-pay'),
    'a first-run free build must still play the welcome sequence');
  assert(!wallFreeDone.window.document.getElementById('im-pay'),
    'konvoWelcomed must keep the sequence away after an update');
  assert(!wallFreeFromBeta.window.document.getElementById('im-pay'),
    'a tester updating from a beta build must NOT be sent through it again');
  await settle(2600);  // the loader (auth tick + slow cadence + crossfade)
  assert(/Setting up your Konvo/.test(payText()),
    'connected must auto-advance into the honest loader');
  assert(/Friends' stories kept/.test(payText()),
    'every loader line is a real cage rule');
  await settle(5200);  // ~7.6s in: the reveal over the real inbox
  const wtap = act => {
    const el = wdoc.querySelector(`[data-act='${act}']`);
    assert(el, `the ${act} control must exist on the current page`);
    el.dispatchEvent(new wallFresh.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  };
  //     The reveal comes straight off the loader (Aug 22): the wall clears
  //     over the user's own inbox before any pitch.
  assert(wdoc.getElementById('im-pay').classList.contains('im-reveal') &&
    /Your DMs are still here\./.test(payText()),
    'the loader must auto-advance into the reveal');
  wtap('keep');
  await settle(450);
  //     The comparison page is back (Sep 1 evening): eight plain rows,
  //     Instagram | Konvo, row one checked on both sides.
  assert(/Same account\. Different app\./.test(payText()) && /No feed\. Ever\./.test(payText())
    && /Two 5 minute passes a day\. No snooze\./.test(payText()) && /No commitment\. Cancel anytime\./.test(payText()),
    'keep lands on the comparison page');
  assert(!/[—]/.test(payText()) && !/\d+K\+|game changer/.test(payText()),
    'the comparison page carries no em dashes and no invented proof');
  wtap('try');
  await settle(450);
  //     The Cal AI chain (Sep 6, Matthew): the try page shows the live
  //     inbox through a phone window, the reminder page keeps the promise,
  //     then the price page. "Try 7 days for free and reclaim N hours" is
  //     gone, and so is the proof strip on the price page.
  assert(/We want you to try Konvo for free\./.test(payText()) && wdoc.querySelector('#im-pay .imp-win') &&
    wdoc.querySelectorAll("#im-pay .imp-win img.imp-frame[src^='data:image/png']").length === 1,
    'perks hand to the try page: the headline and the phone window with Matthew\'s frame around it, once');
  assert(wdoc.getElementById('im-pay').classList.contains('im-reveal') &&
    wdoc.documentElement.classList.contains('im-mock'),
    'the wall goes clear and Instagram\'s page is scaled into the window');
  assert(/Continue/.test(payText()) && wdoc.querySelector("#im-pay [data-act='try-go']") && !/Skip/.test(payText()) &&
    !wdoc.querySelector('#im-pay .imp-skip, #im-pay .imp-back') && /No Payment Due Now/.test(payText()) && !/\$0\.00|per year/.test(payText()),
    'the try page bottom (Sep 6): the check row and Continue only, no Skip, no chevron, no price line');
  assert(!/reclaim|Try 7 days for free|imp-proof/.test(payText()), 'the impact page is gone');
  wtap('try-go');
  await settle(450);
  assert(/We offer 7 days free so everyone can try Konvo\./.test(payText()) && wdoc.querySelector('#im-pay .imp-acc') &&
    wdoc.querySelector('#im-pay h2 i') && /Continue/.test(payText()) && !/Skip/.test(payText()) &&
    !wdoc.querySelector('#im-pay .imp-skip, #im-pay .imp-back') && /No Payment Due Now/.test(payText()),
    'the offer page (Sep 6): the free days in the accent, everyone in italics, the check row, Continue only');
  assert.strictEqual((payText().match(/So you can stop getting distracted on your phone\./g) || []).length, 1,
    'the offer page speaks to the quiz answer, once (Sep 7)');
  wtap('offer-go');
  await settle(450);
  assert(/You'll get a reminder 2 days before your trial ends\./.test(payText()) && wdoc.querySelector('#im-pay .imp-acc') &&
    wdoc.querySelector("#im-pay img[src^='data:image/png']") && /Continue/.test(payText()) && !/Skip/.test(payText()) &&
    !wdoc.querySelector('#im-pay .imp-skip, #im-pay .imp-back') && /No Payment Due Now/.test(payText()),
    'the reminder page: the 2 days in the accent, Matthew\'s bell, Continue only');
  assert(!wdoc.documentElement.classList.contains('im-mock') && !wdoc.querySelector('[data-im-mock]'),
    'leaving the try page puts Instagram\'s page back');
  wtap('pay');
  await settle(450);   // crossfade
  assert(/Start your 7-day FREE trial to continue\./.test(payText()),
    'Continue for FREE reaches S13, titled for the trial');
  assert(/7 days free, then \$19\.99 per year \(\$1\.67\/mo\)/.test(payText()),
    'the bottom line states the free days and the real yearly charge');
  assert(/7 DAYS FREE/.test(payText()) && /SAVE 76%/.test(payText()) && !/POPULAR|RECOMMENDED|3 DAYS FREE/.test(payText()),
    'the Yearly card: free days on the badge, the live saving under the price; Monthly carries no trial badge');
  assert(/Yearly/.test(payText()) && /Monthly/.test(payText()) && !/Annual/.test(payText()),
    'the plans are called Yearly and Monthly, never Annual');
  const pkY = wdoc.querySelector("#im-pay [data-act='pk-y']"), pkM = wdoc.querySelector("#im-pay [data-act='pk-m']");
  assert(pkY && pkM && (pkY.compareDocumentPosition(pkM) & 4) && pkY.classList.contains('on'),
    'Yearly sits on the left and is preselected');
  assert(pkY.compareDocumentPosition(wdoc.querySelector('#im-pay .imp-tl')) & 2,
    'the timeline sits above the prices');
  assert(/\$1\.67\/mo/.test(payText()) && /\$6\.99\/mo/.test(payText()) && !/Try free/.test(payText()),
    'each card carries its monthly price');
  assert(!wdoc.querySelector("#im-pay [data-act='notready']"),
    'no x on the paywall (Aug 21): the plans are the only choice');
  assert(!wdoc.querySelector("#im-pay [data-act='pk-l']"),
    'no Lifetime card: two plans, wider cards (Aug 21)');
  assert(/Start My 7-Day Free Trial/.test(payText()),
    'the trial CTA names the free days');
  assert(/No Payment Due Now/.test(payText()) && /7 days free, then \$19\.99 per year/.test(payText()),
    'the check row sits above the trial CTA, the price line under it');
  assert(/In 5 Days - Reminder/.test(payText()) && /In 7 Days - Billing Starts/.test(payText()),
    'three nodes only: today, the reminder, billing - the page must fit one screen');
  assert(!/In 12 days/.test(payText()),
    'the fourth node is gone');
  assert(/We'll remind you before your trial ends\./.test(payText()),
    'the reminder promise rides the middle node');

  //     Both packages are side-by-side selectable; each tells its own
  //     truth. Monthly has no trial (ASC, Aug 21 evening).
  wtap('pk-m');
  assert(/Try for \$6\.99 a month, cancel anytime\./.test(payText()),
    'the Monthly story states its price and no trial');
  assert(/Continue with Monthly/.test(payText()) && /No commitment, cancel anytime/.test(payText()) &&
    !/days free, then/.test(payText()),
    'the Monthly CTA promises nothing free');
  assert(/Every month/.test(payText()) && /Renews at \$6\.99/.test(payText()),
    'the Monthly timeline says how much and how often');
  assert(!/forever/i.test(payText()),
    'the word forever is banned copy');
  wtap('pk-y');
  assert(/Start your 7-day FREE trial/.test(payText()) && /In 7 Days - Billing Starts/.test(payText()),
    'flipping back to Yearly must restore the trial story');

  //     Live values beat the stand-ins: a bridge that answers products
  //     reprices the whole page, including a 7-day ASC trial. The paywall
  //     never hardcodes money (locked decision).
  const posted = [];
  const answer = replies => (m, d) => {
    posted.push(m.cmd + ':' + (m.event || m.productId || ''));
    if (m.cmd in replies) d.window.__konvoStoreReply(m.id, replies[m.cmd]);
  };
  const LIVE_PRODUCTS = { ok: true,
    yearly: { price: 'US$39.99', perWeek: 'US$0.77', perMonth: 'US$3.33',
      savePct: 33, trialDays: 7 },
    monthly: { price: 'US$4.99', trialDays: 3 }, lifetime: { price: 'US$99.99' } };
  const live = boot('/direct/inbox/', '', { bridge: answer({
    entitlements: { entitled: false }, notify: { ok: true, granted: true },
    products: LIVE_PRODUCTS,
  }) });
  await settle(8400);
  const ldoc0 = live.window.document;
  const ltap = act => ldoc0.querySelector(`[data-act='${act}']`).dispatchEvent(
    new live.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  // Same route as a real user: perks -> impact -> price.
  ltap('keep');
  await settle(450);
  ltap('try');
  await settle(450);
  ltap('try-go');
  await settle(450);
  ltap('offer-go');
  await settle(450);
  ltap('pay');
  await settle(450);
  const ltext = ldoc0.getElementById('im-pay').textContent;
  assert(/7 days free, then US\$39\.99 per year \(US\$3\.33\/mo\)/.test(ltext),
    'live values must replace the stand-ins');
  assert(/US\$3\.33\/mo/.test(ltext),
    'the card must carry the live monthly equivalent');
  assert(/7 DAYS FREE/.test(ltext),
    'the badge is the live trial length');
  assert(/In 5 Days - Reminder/.test(ltext) && /In 7 Days - Billing Starts/.test(ltext),
    'reminder and billing nodes must follow the live trial length');
  ltap('pk-m');
  const mtext = ldoc0.getElementById('im-pay').textContent;
  assert(/Start your 3-day FREE trial/.test(mtext) && /3 days free, then US\$4\.99 per month/.test(mtext) &&
    /Start My 3-Day Free Trial/.test(mtext) && /In 1 Day - Reminder/.test(mtext) && /In 3 Days - Billing Starts/.test(mtext),
    'a live monthly intro offer renders its own trial story, no rebuild needed');
  assert(posted.includes('products:'),
    'the sequence must ask the bridge for products');
  assert(posted.includes('track:login_succeeded') &&
    posted.includes('track:paywall_viewed'),
    'the funnel events must reach the bridge');

  // A completed purchase keeps notifications and then goes straight to
  // the confirmation. The removed sender referral page cannot reappear.
  const invPosted = [], invMsgs = [];
  const INV_REPLIES = { entitlements: { entitled: false }, products: LIVE_PRODUCTS,
    purchase: { ok: true, entitled: true }, notify: { ok: true, granted: true },
    cageStatus: { supported: true, authorized: false, picked: false, active: false },
    claim: { ok: true, shown: false, entitled: false } };
  const invBridge = (m, d) => {
    invMsgs.push(m);
    invPosted.push(m.cmd + ':' + (m.event || m.productId || ''));
    if (m.cmd in INV_REPLIES) d.window.__konvoStoreReply(m.id, INV_REPLIES[m.cmd]);
  };
  const toSuccess = async (d, tap) => {
    tap('keep'); await settle(450); tap('try'); await settle(450); tap('try-go'); await settle(450); tap('offer-go'); await settle(450); tap('pay'); await settle(450);
    tap('buy-y'); await settle(1300);
  };
  const inv = boot('/direct/inbox/', '', { seed: { konvoHandle: 'matt' }, bridge: invBridge });
  await settle(8400);
  const idoc = inv.window.document;
  const itap = act => idoc.querySelector(`[data-act='${act}']`).dispatchEvent(
    new inv.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const ipage = () => idoc.getElementById('im-pay').textContent;
  itap('keep'); await settle(450); itap('try'); await settle(450); itap('try-go'); await settle(450); itap('offer-go'); await settle(450); itap('pay'); await settle(450);
  assert(!idoc.querySelector("#im-pay [data-act='x']") && !idoc.querySelector('#im-pay .imp-close'),
    'the paywall has no close: a hard gate, as before');
  assert.strictEqual(invPosted.filter(p => p === 'claim:auto').length, 1,
    'the first price paint asks once whether the clipboard holds an invite');
  assert(!/Have an invite|Send Konvo/.test(ipage()), 'no invite door on the price page');
  itap('buy-y'); await settle(1300);
  assert(/You're in\./.test(ipage()) && !/Send Konvo|konvoinstall\.com\/i\//.test(ipage()),
    'a purchase goes straight to confirmation when notifications were already asked');
  assert(!idoc.querySelector("[data-act='inv-send'],[data-act='inv-copy']"),
    'no sender referral controls remain after purchase');
  assert.strictEqual(invMsgs.filter(m => m.event === 'onboarding_completed').length, 1,
    'the purchase completed the sequence once');
  assert(!invMsgs.some(m => m.event === 'invite_page_viewed' || m.cmd === 'invite'),
    'no referral impression or share request occurs');
  itap('done'); await settle(1200);
  assert(!idoc.getElementById('im-pay') && inv.window.localStorage.konvoPaid === '1',
    'Open my messages dismisses confirmation and preserves purchased access');
  // A cached legacy invite:true patch cannot restore the removed page.
  const noInv = boot('/direct/inbox/', '', { patch: { invite: true }, seed: { konvoHandle: 'matt' }, bridge: invBridge });
  await settle(8400);
  const nidoc = noInv.window.document;
  const nitap = act => nidoc.querySelector(`[data-act='${act}']`).dispatchEvent(
    new noInv.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await toSuccess(noInv, nitap);
  assert(/You're in\./.test(nidoc.getElementById('im-pay').textContent) && !/Send Konvo/.test(nidoc.getElementById('im-pay').textContent),
    'even with a legacy invite:true patch, the purchase goes straight to You\'re in');
  //     A friend at the paywall with a link on the clipboard: the bridge
  //     shows the claim sheet, the days are on, and Open my messages ends
  //     the sequence like a purchase.
  const claimMsgs = [];
  const claimBridge = (m, d) => {
    claimMsgs.push(m);
    const replies = { entitlements: { entitled: false }, products: LIVE_PRODUCTS,
      claim: { ok: true, shown: true, entitled: true, method: 'clipboard', expires: Date.now() + 3 * 86400000 } };
    if (m.cmd in replies) d.window.__konvoStoreReply(m.id, replies[m.cmd]);
  };
  const clm = boot('/direct/inbox/', '', { bridge: claimBridge });
  await settle(8400);
  const cldoc = clm.window.document;
  const cltap = act => cldoc.querySelector(`[data-act='${act}']`).dispatchEvent(
    new clm.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  cltap('keep'); await settle(450); cltap('try'); await settle(450); cltap('try-go'); await settle(450); cltap('offer-go'); await settle(450); cltap('pay'); await settle(1200);
  assert(claimMsgs.some(m => m.cmd === 'claim' && m.productId === 'auto'),
    'the price paint asks the bridge about the clipboard');
  assert(claimMsgs.some(m => m.event === 'invite_claimed' && m.props.method === 'clipboard'),
    'a claim reports its method');
  assert(/Your 3 free days are on\./.test(cldoc.getElementById('im-pay').textContent),
    'a claim paints the friend\'s own 3-days page');
  cltap('inv-open'); await settle(1200);
  assert(claimMsgs.some(m => m.event === 'onboarding_completed' && m.props.screen_id === 's15_invite'),
    'Open my messages ends the friend\'s sequence');
  //     The notifications page (Sep 2, Matthew): after the money, before
  //     "You're in", in the Screen Time page's style, once per install.
  //     The system prompt fires only from its button; Not now records a
  //     skip and moves on; a second walk on the same install never sees it.
  const npPosted = [], npHeld = [];
  const npBridge = answer({ entitlements: { entitled: false }, products: LIVE_PRODUCTS,
    purchase: { ok: true, entitled: true }, notify: { ok: true, granted: true },
    cageStatus: { supported: true, authorized: false, picked: false, active: false } });
  const np = boot('/direct/inbox/', '', { askNotify: true, bridge: (m, d) => {
    npPosted.push(m.cmd + ':' + (m.event || m.productId || ''));
    // iOS answers the prompt only when a finger does: the reply is held.
    if (m.cmd === 'notify') { npHeld.push(() => d.window.__konvoStoreReply(m.id, { ok: true, granted: true })); return; }
    npBridge(m, d);
  } });
  await settle(8400);
  const npdoc = np.window.document;
  const nptap = act => npdoc.querySelector(`[data-act='${act}']`).dispatchEvent(
    new np.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const nptext = () => npdoc.getElementById('im-pay').textContent;
  nptap('keep'); await settle(450); nptap('try'); await settle(450); nptap('try-go'); await settle(450); nptap('offer-go'); await settle(450); nptap('pay'); await settle(450);
  nptap('buy-y'); await settle(1300);
  assert(/Enable notifications for messages\?/.test(nptext()) && !/New DMs|heads up/.test(nptext()),
    'a purchase lands on the notifications page: the question alone, no description (Sep 2)');
  assert(/We'll remind you 2 days before your trial ends\./.test(nptext()) && !/You can change this any time/.test(nptext()),
    'a trial buyer reads the reminder promise on the page');
  assert(/Would Like to Send You Notifications/.test(nptext()) && /Allow/.test(nptext()),
    'the page echoes the system dialog, like the Screen Time page');
  assert(!npPosted.some(p => p.startsWith('notify:')), 'the system prompt waits for the button');
  assert(!/You're in\.|Send Konvo/.test(nptext()), 'confirmation waits until after the notification choice');
  nptap('notify-go'); await settle(1200);
  assert(npPosted.includes('notify:7'), 'Turn on notifications fires the prompt with the trial length');
  assert(/Enable notifications for messages\?/.test(nptext()) && npdoc.querySelector("#im-pay [data-act='notify-go']").disabled,
    'the page holds still under the system prompt until iOS answers (Sep 2)');
  assert(!npPosted.includes('track:notify_answered'), 'nothing reports before the answer');
  npHeld.forEach(f => f()); await settle(1200);
  assert(npPosted.includes('track:notify_answered'), 'the answer reports');
  assert(/You're in\./.test(nptext()) && !/Send Konvo/.test(nptext()), 'granting notifications leads directly to confirmation');
  assert.strictEqual(np.window.localStorage.getItem('konvoNotifyAsked'), '1', 'asked once, remembered');
  //     Not now: a skip is recorded, and the sequence still ends.
  const skipMsgs = [];
  const sk = boot('/direct/inbox/', '', { askNotify: true, bridge: (m, d) => { skipMsgs.push(m); npBridge(m, d); } });
  await settle(8400);
  const skdoc = sk.window.document;
  const sktap = act => skdoc.querySelector(`[data-act='${act}']`).dispatchEvent(
    new sk.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  sktap('keep'); await settle(450); sktap('try'); await settle(450); sktap('try-go'); await settle(450); sktap('offer-go'); await settle(450); sktap('pay'); await settle(450);
  sktap('pk-m'); sktap('buy-m'); await settle(1300);
  assert(/We'll remind you 2 days before your trial ends\./.test(skdoc.getElementById('im-pay').textContent),
    'the live monthly plan carries a 3-day trial, so the page keeps the reminder promise');
  sktap('notify-skip'); await settle(1200);
  assert(!skipMsgs.some(m => m.cmd === 'notify'), 'Not now never fires the prompt');
  assert(skipMsgs.some(m => m.event === 'notify_answered' && m.props.granted === false && m.props.skipped === true),
    'a skip reports as not granted, skipped');
  assert(/You're in\./.test(skdoc.getElementById('im-pay').textContent) && !/Send Konvo/.test(skdoc.getElementById('im-pay').textContent), 'skipping notifications after a monthly purchase leads directly to confirmation');
  //     A friend ending a claim sees it once too, then the inbox.
  const nfMsgs = [];
  const nf = boot('/direct/inbox/', '', { askNotify: true, bridge: (m, d) => {
    nfMsgs.push(m);
    const replies = { entitlements: { entitled: false }, products: LIVE_PRODUCTS, notify: { ok: true, granted: true },
      claim: { ok: true, shown: true, entitled: true, method: 'clipboard', expires: Date.now() + 3 * 86400000 } };
    if (m.cmd in replies) d.window.__konvoStoreReply(m.id, replies[m.cmd]);
  } });
  await settle(8400);
  const nfdoc = nf.window.document;
  const nftap = act => nfdoc.querySelector(`[data-act='${act}']`).dispatchEvent(
    new nf.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  nftap('keep'); await settle(450); nftap('try'); await settle(450); nftap('try-go'); await settle(450); nftap('offer-go'); await settle(450); nftap('pay'); await settle(1200);
  nftap('inv-open'); await settle(450);
  const nfText = nfdoc.getElementById('im-pay').textContent;
  assert(/Enable notifications for messages\?/.test(nfText) && /You can change this any time in Settings\./.test(nfText) && !/trial ends/.test(nfText),
    'a friend gets the page once, without the trial promise');
  nftap('notify-go'); await settle(1200);
  assert(nfMsgs.some(m => m.cmd === 'notify' && m.productId === '0') && !nfdoc.getElementById('im-pay'),
    'the prompt fires and the wall goes: the inbox');

  //     The login count is a fact about the session, not the wall (Aug
  //     31): an entitled restorer is dismissed before the wall mounts,
  //     and the old wall-mount tracking missed every one - six silent
  //     sign-ins on build 60 alone. Once per install, wall or no wall.
  const restLog = [];
  const restorer = boot('/direct/inbox/', '', { bridge: (m, d) => {
    if (m.cmd === 'track') restLog.push(m.event);
    if (m.cmd === 'entitlements') d.window.__konvoStoreReply(m.id, { entitled: true });
  } });
  await settle(3400);   // boot verify + several enforce sweeps
  assert(!restorer.window.document.getElementById('im-pay'),
    'an entitled session must never see the wall');
  assert.strictEqual(restLog.filter(e => e === 'login_succeeded').length, 1,
    'the dismissed-wall restorer still counts as a login, exactly once');

  //     Opening a conversation is the only signal that the app was USED
  //     rather than merely launched, so it must fire once per crossing
  //     into a thread and never on the inbox or on a repeat sweep.
  //     enforce() runs on an 800ms interval, so every wait clears one tick.
  const seen = [];
  const threads = boot('/direct/inbox/', '', {
    bridge: m => { if (m.cmd === 'track') seen.push(m.event); } });
  const opens = () => seen.filter(e => e === 'thread_opened').length;
  await settle(900);
  assert(opens() === 0, 'sitting on the inbox must not count as opening a conversation');
  threads.window.__loc.pathname = '/direct/t/12345/';
  await settle(900);
  assert(opens() === 1, 'entering a thread must report exactly one thread_opened');
  await settle(900);
  assert(opens() === 1, 'staying in the same thread must not report again');
  threads.window.__loc.pathname = '/direct/inbox/';
  await settle(900);
  threads.window.__loc.pathname = '/direct/t/98765/';
  await settle(900);
  assert(opens() === 2, 'a second conversation must report again');
  //     The event carries nothing identifying - no thread id, ever.
  assert(!JSON.stringify(seen).includes('12345'),
    'thread_opened must never carry a thread id');

  //     Updating BETWEEN build variants must not replay the sequence. The
  //     keys are written by different builds - konvoWelcomed by the free
  //     one, konvoBetaFree by the beta one - and each used to be invisible
  //     to the other, so a 47->48 update walked the tester back through
  //     "Instagram connected" and the loader.
  const freeToBeta = boot('/direct/inbox/', '', { beta: true, welcomed: true,
    bridge: answer({ entitlements: { entitled: false } }) });
  const betaToFree = boot('/direct/inbox/', '', { free: true, betaFree: true,
    bridge: answer({ entitlements: { entitled: false } }) });
  const plainToBeta = boot('/direct/inbox/', '', { beta: true, paid: true,
    bridge: answer({ entitlements: { entitled: true } }) });
  await settle(3200);
  assert(!freeToBeta.window.document.getElementById('im-pay'),
    'free -> beta must not replay: konvoWelcomed means they have seen it');
  assert(!betaToFree.window.document.getElementById('im-pay'),
    'beta -> free must not replay either');
  assert(!plainToBeta.window.document.getElementById('im-pay'),
    'a paying user is never shown the sequence');

  //     And a paying user on a FRESH install - no cache at all - must not
  //     see a single frame while RevenueCat is still answering.
  const paidReinstall = boot('/direct/inbox/', '', {
    bridge: answer({ entitlements: { entitled: true } }) });
  await settle(1600);
  assert(!paidReinstall.window.document.getElementById('im-pay'),
    'the sequence must wait for the receipt, not start underneath a subscriber');

  //     The BETA build end to end, which is what testers actually walk:
  //     delete step -> impact -> the real price screen -> and the CTA lets
  //     them through to the inbox instead of touching StoreKit, because a
  //     beta cannot complete a purchase and a spinning button strands them.
  const betaEvents = [];
  const betaWalk = boot('/direct/inbox/', '', { beta: true, hash: '#konvo=12',
    bridge: (m, d) => {
      if (m.cmd === 'track') betaEvents.push(m.event);
      // A real device always answers this; without a reply the sequence
      // waits out the entitlement timeout before it starts.
      if (m.cmd === 'entitlements') d.window.__konvoStoreReply(m.id, { entitled: false });
      if (m.cmd === 'notify') d.window.__konvoStoreReply(m.id, { ok: true, granted: true });
      if (m.cmd === 'products') d.window.__konvoStoreReply(m.id, { ok: true,
        yearly: { price: '$19.99', perMonth: '$1.67', savePct: 66, trialDays: 7 },
        monthly: { price: '$4.99' }, lifetime: { price: '$29.99' } });
    } });
  await settle(8400);
  const btw = act => betaWalk.window.document.querySelector(`[data-act='${act}']`)
    .dispatchEvent(new betaWalk.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const btext = () => betaWalk.window.document.getElementById('im-pay').textContent;
  btw('keep');
  await settle(450);
  btw('try');
  await settle(450);
  btw('try-go');
  await settle(450);
  btw('offer-go');
  await settle(450);
  assert(/You'll get a reminder 2 days before your trial ends\./.test(btext()),
    'beta walks the same try and reminder pages');
  btw('pay');
  await settle(450);
  assert(/Start your 7-day FREE trial/.test(btext()) && /\$19\.99/.test(btext()),
    'beta must show the real price screen');
  btw('buy-y');
  await settle(1400);   // no cageStatus answer here: the 900ms fallback confirms
  assert(/You're in\./.test(btext()),
    'the beta CTA must let a tester through without StoreKit');
  btw('done');
  await settle(950);   // dismiss() fades for 850ms before removing the node
  assert(!betaWalk.window.document.getElementById('im-pay'),
    'and Open my messages drops the wall');
  assert(!betaEvents.includes('purchase'),
    'and must never reach StoreKit');
  assert(betaEvents.includes('beta_free_taken'),
    'while still recording which plan was chosen - that tap is the pricing signal');

  //     A trial-ineligible user gets the no-trial Annual story.
  const noTrial = boot('/direct/inbox/', '', { bridge: answer({
    entitlements: { entitled: false }, notify: { ok: true, granted: true },
    products: { ok: true, yearly: { price: '$29.99', perWeek: '$0.58',
      perMonth: '$2.50', savePct: 50 }, monthly: { price: '$4.99' },
      lifetime: { price: '$79.99' } },
  }) });
  await settle(8400);
  // Perks -> impact -> price, as a real user walks it.
  const nttap = act => noTrial.window.document.querySelector(`[data-act='${act}']`)
    .dispatchEvent(new noTrial.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  nttap('keep');
  await settle(450);
  nttap('try');
  await settle(450);
  //     A user with no trial must not be sold one on the way in either:
  //     the try and reminder pages are skipped and the price page paints.
  assert(!noTrial.window.document.querySelector("#im-pay [data-act='try-go']") &&
    !/try Konvo for free|reminder 2 days before/.test(noTrial.window.document.getElementById('im-pay').textContent),
    'no try or reminder page for someone who is ineligible');
  const ntext = noTrial.window.document.getElementById('im-pay').textContent;
  assert(!/days free/i.test(ntext) && !/FREE trial/.test(ntext),
    'no trial may be described when the user is ineligible');
  assert(/Continue with Yearly/.test(ntext) && /In 12 months/.test(ntext),
    'the ineligible Annual story is renewal framing');
  assert(/\$2\.50\/mo/.test(ntext),
    'the ineligible headline prices by the month too');

  //     The #konvo fragment from the onboarding persists into this origin.
  //     Since the motive screen was removed it carries the weekly hours
  //     alone, and what consumes them is the pre-paywall impact screen.
  const quiz = boot('/direct/inbox/', '', { hash: '#konvo=9' });
  await settle(8400);
  assert.strictEqual(quiz.window.localStorage.getItem('konvoQuiz'), '9',
    'the fragment must persist into instagram.com-origin storage');
  const qtap = act => quiz.window.document.querySelector(`[data-act='${act}']`)
    .dispatchEvent(new quiz.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  qtap('keep');
  await settle(450);
  qtap('try');
  await settle(450);
  qtap('try-go');
  await settle(450);
  assert(!/So you can/.test(quiz.window.document.getElementById('im-pay').textContent),
    'no why in the fragment: the offer page carries no personal line');
  qtap('offer-go');
  await settle(450);
  assert(/You'll get a reminder 2 days before your trial ends\./.test(
    quiz.window.document.getElementById('im-pay').textContent),
    'the quiz visitor walks the same chain');

  //     The outcome after the buy tap is recorded (Sep 2): a closed Apple
  //     sheet reports as cancelled and leaves the price page live; a
  //     purchase reports as purchased. Enum only, no error text.
  const prMsgs = [];
  const prBoot = boot('/direct/inbox/', '', { patch: { invite: false }, bridge: (m, d) => {
    prMsgs.push(m);
    const r = { entitlements: { entitled: false }, products: LIVE_PRODUCTS,
      purchase: { ok: false, cancelled: true } }[m.cmd];
    if (r) d.window.__konvoStoreReply(m.id, r);
  } });
  await settle(8400);
  const prdoc = prBoot.window.document;
  const prtap = act => prdoc.querySelector(`[data-act='${act}']`).dispatchEvent(
    new prBoot.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  prtap('keep'); await settle(450); prtap('try'); await settle(450); prtap('try-go'); await settle(450); prtap('offer-go'); await settle(450); prtap('pay'); await settle(450);
  assert.strictEqual(prMsgs.filter(m => m.event === 'paywall_presented').length, 1,
    'ActivationPal gets one impression when the price screen is actually painted');
  prtap('pk-m'); prtap('pk-y');
  assert.strictEqual(prMsgs.filter(m => m.event === 'paywall_presented').length, 1,
    'switching plans must not add paywall impressions');
  prtap('buy-y'); await settle(450);
  const prEv = prMsgs.find(m => m.event === 'purchase_result');
  assert(prEv && prEv.props.result === 'cancelled' && prEv.props.plan === 'annual' && prEv.props.screen_id === 's13_paywall',
    'a closed Apple sheet reports purchase_result cancelled for the plan tapped');
  assert(!JSON.stringify(prEv.props).includes('Error'), 'no error text rides the event');
  assert(!prMsgs.some(m => m.event === 'paywall_exited'),
    'cancelling the Apple sheet leaves the paywall open, so is not a dismissal');
  assert(/Start your 7-day FREE trial/.test(prdoc.getElementById('im-pay').textContent) &&
    !prdoc.querySelector("#im-pay [data-act='buy-y']").disabled,
    'the price page stays, with the button live again');

  //     A trial purchase lands on S14 activation: recap, notification ask
  //     (granted -> reminder set), then Open Konvo drops the wall.
  const buyer = boot('/direct/inbox/', '', { patch: { invite: false }, bridge: answer({
    entitlements: { entitled: false },
    products: LIVE_PRODUCTS,
    purchase: { ok: true, entitled: true },
    notify: { ok: true, granted: true },
    cageStatus: { supported: true, authorized: false, picked: false, active: false },
    cageAuthorize: { authorized: true }, cagePick: { count: 1 }, cageOn: { active: true },
  }) });
  await settle(8400);
  const bdoc = buyer.window.document;
  const btap = act => bdoc.querySelector(`[data-act='${act}']`).dispatchEvent(
    new buyer.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  btap('keep');
  await settle(450);
  btap('try');
  await settle(450);
  btap('try-go');
  await settle(450);
  btap('offer-go');
  await settle(450);
  btap('pay');
  await settle(450);
  assert(!posted.includes('cageOn:'), 'no shield before the purchase');
  btap('buy-y');
  await settle(450);   // crossfade to the Screen Time step
  assert(posted.includes('purchase:konvo.pro.yearly'),
    'the Annual CTA must purchase the yearly product');
  assert(posted.includes('track:purchase_result'), 'a purchase reports its outcome too');
  //     The money ends on the confirmation, never on the Screen Time step
  //     (Sep 1): the block is offered from the inbox, not at purchase.
  const stext = bdoc.getElementById('im-pay').textContent;
  assert(/You're in\./.test(stext) && !/Connect Konvo to Screen Time/.test(stext),
    'a purchase leads to the confirmation, not the Screen Time step');
  assert(posted.includes('notify:7'),
    'the reminder is scheduled with the trial length the moment the purchase lands');
  assert(/We'll remind you 2 days before it ends\./.test(stext),
    'the confirmation promises the reminder in Matthew\'s words (Sep 1)');
  assert(Math.abs(parseInt(buyer.window.localStorage.getItem('konvoTrialEnd'), 10) - (Date.now() + 7 * 86400000)) < 60000,
    'the trial end is remembered for the in-inbox bar');
  assert(posted.includes('track:notify_answered'),
    'the permission answer is tracked, so the grant rate is finally known');
  assert(!posted.includes('cageOn:') && !posted.includes('cageAuthorize:'),
    'nothing touches the shield at purchase');
  assert.strictEqual(buyer.window.localStorage.getItem('konvoDone'), '1',
    'finishing marks the install done, so a lapse later opens on the price');
  btap('done');
  await settle(950);
  assert(!bdoc.getElementById('im-pay'), 'Open my messages drops the wall');
  assert.strictEqual(buyer.window.localStorage.getItem('konvoPaid'), '1',
    'a purchase must fill the offline cache');
  //     The block, from the inbox: the pass button is the lock button
  //     while no shield exists, and opens the Screen Time step.
  assert(bdoc.documentElement.classList.contains('im-lockable') &&
    bdoc.getElementById('im-pass').getAttribute('aria-label') === 'Block Instagram',
    'a payer without a shield gets the lock button in the inbox');
  bdoc.getElementById('im-pass').dispatchEvent(
    new buyer.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(300);
  const lockText = bdoc.getElementById('im-pay').textContent;
  assert(/Connect Konvo to Screen Time, securely\./.test(lockText) && !/One last step/.test(lockText),
    'the lock button opens the Screen Time step, worded for the inbox');
  btap('cage-setup-go');
  await settle(600);
  assert(posted.indexOf('cageOn:') > posted.indexOf('purchase:konvo.pro.yearly'),
    'the shield arms after the purchase and the pick');
  const ptext = bdoc.getElementById('im-pay').textContent;
  assert(/You're protected\./.test(ptext) && /Instagram is blocked\./.test(ptext) &&
    /Your DMs remain available through Konvo\./.test(ptext),
    'the last page says protected, blocked, DMs through Konvo');
  const scheck = bdoc.querySelector("#im-pay path[stroke-dasharray='24']");
  assert(scheck && /im-draw/.test(scheck.getAttribute('style') || ''),
    'the checkmark must draw itself in');
  assert(!bdoc.querySelector('#im-pay [data-act]'), 'the last page has nothing to tap');
  assert(!bdoc.documentElement.classList.contains('im-lockable') &&
    bdoc.documentElement.classList.contains('im-caged'),
    'the lock button becomes the pass button once the shield is up');
  await settle(3600);   // 2.4s hold + the .8s fade, with slack
  assert(!bdoc.getElementById('im-pay'), 'the last page fades into the inbox on its own');
  assert(posted.includes('track:onboarding_completed'),
    'completing the funnel must be tracked');


  //     Monthly through its own card and product.
  const monthlyBuy = boot('/direct/inbox/', '', { patch: { invite: false }, bridge: answer({
    entitlements: { entitled: false }, notify: { ok: true, granted: true },
    products: LIVE_PRODUCTS,
    purchase: { ok: true, entitled: true },
  }) });
  await settle(8400);
  const mtap = act => monthlyBuy.window.document.querySelector(`[data-act='${act}']`)
    .dispatchEvent(new monthlyBuy.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  mtap('keep');
  await settle(450);
  mtap('try');
  await settle(450);
  mtap('try-go');
  await settle(450);
  mtap('offer-go');
  await settle(450);
  mtap('pay');
  await settle(450);
  mtap('pk-m');
  mtap('buy-m');
  await settle(1400);   // no cageStatus answer: the 900ms fallback confirmation
  assert(posted.includes('purchase:konvo.pro.monthly'),
    'the Monthly CTA must purchase konvo.pro.monthly');
  assert(/You're in\./.test(
    monthlyBuy.window.document.getElementById('im-pay').textContent),
    'a bridge that never answers cageStatus still confirms - true for monthly too');
  assert(posted.includes('notify:3'),
    'the monthly buyer is asked too, with its own trial length (Sep 1)');
  assert(/We'll remind you 2 days before it ends\./.test(monthlyBuy.window.document.getElementById('im-pay').textContent),
    'a monthly trial gets the same promise');

  //     RevenueCat's paywall on the price step (Sep 1): with the patch on
  //     and a bridge that reports a purchase, Continue never paints the
  //     injected price screen; without a paywall in the offering, it does.
  const rcBuy = boot('/direct/inbox/', '', { patch: { rcPaywall: true, invite: false }, bridge: answer({
    entitlements: { entitled: false }, products: LIVE_PRODUCTS,
    rcPaywall: { ok: true, result: 'purchased', entitled: true, productId: 'konvo.pro.yearly' },
    notify: { ok: true, granted: true },
  }) });
  const rcNone = boot('/direct/inbox/', '', { patch: { rcPaywall: true }, bridge: answer({
    entitlements: { entitled: false }, notify: { ok: true, granted: true }, products: LIVE_PRODUCTS,
    rcPaywall: { ok: false, result: 'no_paywall', entitled: false },
  }) });
  await settle(8400);
  const rcTap = (d, act) => d.window.document.querySelector(`[data-act='${act}']`).dispatchEvent(
    new d.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  rcTap(rcBuy, 'keep'); rcTap(rcNone, 'keep');
  await settle(450);
  rcTap(rcBuy, 'try'); rcTap(rcNone, 'try');
  await settle(450);
  rcTap(rcBuy, 'try-go'); rcTap(rcNone, 'try-go');
  await settle(450);
  rcTap(rcBuy, 'offer-go'); rcTap(rcNone, 'offer-go');
  await settle(450);
  rcTap(rcBuy, 'pay'); rcTap(rcNone, 'pay');
  await settle(1400);
  assert(posted.includes('rcPaywall:'),
    'the price step asks the bridge for RevenueCat\'s paywall when the patch says so');
  const rbText = rcBuy.window.document.getElementById('im-pay').textContent;
  assert(/You're in\./.test(rbText) && !/Start your 7-day FREE trial/.test(rbText),
    'a purchase on RevenueCat\'s paywall lands on the confirmation without painting the injected price screen');
  assert(/Free until/.test(rbText) && posted.includes('notify:7'),
    'the purchased product rides back so the recap and the reminder still happen');
  assert(posted.includes('track:rc_paywall'), 'the RevenueCat result is tracked');
  assert(/Start your 7-day FREE trial/.test(rcNone.window.document.getElementById('im-pay').textContent),
    'no paywall in the offering: the injected price screen is the floor');

  //     The verdict beats the cache in both directions.
  const lapsed = boot('/direct/inbox/', '', { paid: true, bridge: answer({
    entitlements: { entitled: false }, notify: { ok: true, granted: true },
    restore: { ok: true, entitled: true },
    products: { ok: true,
      yearly: { price: '$19.99', perWeek: '$0.38', perMonth: '$1.67', savePct: 76, trialDays: 7 },
      monthly: { price: '$6.99' }, lifetime: { price: '$19.99' } },
  }) });
  await settle(9600);
  const ldoc = lapsed.window.document;
  assert(ldoc.getElementById('im-pay'),
    'a lapsed subscription must bring the wall back despite the cache');
  ldoc.querySelector("[data-act='keep']").dispatchEvent(
    new lapsed.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(450);
  ldoc.querySelector("[data-act='try']").dispatchEvent(
    new lapsed.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(450);
  ldoc.querySelector("[data-act='try-go']").dispatchEvent(
    new lapsed.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(450);
  ldoc.querySelector("[data-act='offer-go']").dispatchEvent(
    new lapsed.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(450);
  ldoc.querySelector("[data-act='pay']").dispatchEvent(
    new lapsed.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(450);
  ldoc.querySelector("[data-act='restore']").dispatchEvent(
    new lapsed.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(posted.includes('restore:'), 'Restore Purchases must reach the bridge');
  await settle(1400);
  assert(/You're in\./.test(ldoc.getElementById('im-pay').textContent),
    'a successful restore runs the tail (here the fallback confirmation)');
  ldoc.querySelector("[data-act='done']").dispatchEvent(
    new lapsed.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(950);
  assert(!ldoc.getElementById('im-pay'), 'and the wall drops');
  //     A lapsed subscriber on an install that already finished the
  //     sequence (Aug 22) opens on the price and nothing else: no
  //     "Instagram connected", no loader, no pitch.
  const lapsedLog = [];
  const lapsedDone = boot('/direct/inbox/', '', { paid: true, bridge: (m, d) => {
    d.window.localStorage.setItem('konvoDone', '1');
    lapsedLog.push(m.cmd === 'track' ? 'track:' + m.event : m.cmd);
    const r = { entitlements: { entitled: false }, notify: { ok: true, granted: true }, products: LIVE_PRODUCTS }[m.cmd];
    if (r) d.window.__konvoStoreReply(m.id, r);
  } });
  await settle(1200);
  const lddoc = lapsedDone.window.document;
  assert(lddoc.getElementById('im-pay') &&
    /Yearly/.test(lddoc.getElementById('im-pay').textContent) &&
    /US\$39\.99/.test(lddoc.getElementById('im-pay').textContent),
    'a lapsed install must open straight on the paywall with live prices');
  assert(!/Instagram connected/.test(lddoc.getElementById('im-pay').textContent),
    'and never replay the connected page');
  assert(/Your plan ended\./.test(lddoc.getElementById('im-pay').textContent) &&
    /Instagram is unblocked until you pick a plan\./.test(lddoc.getElementById('im-pay').textContent),
    'the lapsed wall says why it is there');
  assert(!lddoc.querySelector("#im-pay [data-act='notready']") && !lddoc.querySelector("#im-pay [data-act='done']"),
    'and offers no way past it but a plan or Restore');
  assert(lapsedLog.includes('track:paywall_viewed') && !lapsedLog.includes('track:inbox_reveal_viewed'),
    'the paywall is what gets tracked, not the pitch');
  const reinstalled = boot('/direct/inbox/', '', { bridge: answer({
    entitlements: { entitled: true },
  }) });
  await settle();
  assert(!reinstalled.window.document.getElementById('im-pay'),
    'a reinstalling subscriber must never see the wall');
  assert.strictEqual(reinstalled.window.localStorage.getItem('konvoPaid'), '1',
    'the launch verdict must refill the offline cache');

  //     Login friction: the stages are Instagram's own routes. Each must
  //     report once per document, never on the interval sweep, and never
  //     for a signed-in visit - that is navigation, not friction.
  const stages = [];
  const stageBridge = m => {
    if (m.cmd === 'track' && m.event === 'login_step') stages.push(m.props.stage);
  };
  const chal = boot('/challenge/', '', { loggedOut: true, bridge: stageBridge });
  await settle(900);
  assert.deepStrictEqual(stages, ['challenge'],
    'a logged-out challenge page must report login_step:challenge once');
  await settle(900);
  assert.deepStrictEqual(stages, ['challenge'],
    'the interval sweep must not repeat the stage');
  const twofa = boot('/accounts/login/two_factor/', '',
    { loggedOut: true, bridge: stageBridge });
  await settle(900);
  assert.deepStrictEqual(stages, ['challenge', 'two_factor'],
    'two_factor must win over its /accounts/login prefix');
  const plainLogin = boot('/accounts/login/', '',
    { loggedOut: true, bridge: stageBridge });
  await settle(900);
  assert.deepStrictEqual(stages, ['challenge', 'two_factor', 'login'],
    'the plain login page must report as its own stage');
  const signedChal = boot('/challenge/', '', { bridge: stageBridge });
  await settle(900);
  assert.deepStrictEqual(stages, ['challenge', 'two_factor', 'login'],
    'a signed-in challenge visit must not report');

  //     The search-mode back arrow (Aug 24): hidden by the cage's CSS, its
  //     rect is zeros, so it is found by structure - same subtree as the
  //     search input - and tagged .im-keep-back on the sweep.
  const searchHtml = `<header><a href="/"><svg aria-label="Back"></svg></a></header>
    <div><div><a href="#back"><svg aria-label="Back"></svg></a><input type="text" placeholder="Search"></div></div>`;
  const searchPage = boot('/direct/inbox/', searchHtml, { bridge: () => {} });
  await settle(1000);
  const sdoc2 = searchPage.window.document;
  assert(sdoc2.querySelector("a[href='#back']").classList.contains('im-keep-back'),
    'the arrow beside the search input must be tagged to survive the hiding');
  assert(!sdoc2.querySelector("header a").classList.contains('im-keep-back'),
    'the header escape arrow must stay hidden');
  //     The same two arrows on a French phone: no "Back" label anywhere,
  //     only the chevron geometry. Tagging must still find the search one.
  const PL = '<polyline points="9.276 4.726 2.001 12.004 9.276 19.274"></polyline>';
  const searchFr = `<header><div role="button"><svg aria-label="Précédent">${PL}</svg></div></header>
    <div><div><a href="#back"><svg aria-label="Précédent">${PL}</svg></a><input type="text" placeholder="Rechercher"></div></div>`;
  const searchPageFr = boot('/direct/inbox/', searchFr, { bridge: () => {} });
  await settle(1000);
  const sdocFr = searchPageFr.window.document;
  assert(sdocFr.querySelector("a[href='#back']").classList.contains('im-keep-back'),
    'the French search arrow must be tagged by geometry, not by an English label');
  assert(!sdocFr.querySelector("header div").classList.contains('im-keep-back'),
    'the French header escape arrow must stay hidden');
  //     Message Requests (user report, Sep 5): the page is pushed over the
  //     inbox like a thread and its arrow goes BACK to the inbox, so no
  //     inbox rule may hide it. Counting the route as the inbox did.
  const reqHtml = `<header><a href="/direct/inbox/"><svg aria-label="Back">${PL}</svg></a><h1>Message requests</h1></header>`;
  const reqPage = boot('/direct/requests/', reqHtml, { bridge: () => {} });
  await settle(600);
  const rqdoc = reqPage.window.document;
  const rSheets = [...rqdoc.querySelectorAll('style')].map(x => x.textContent).join('\n');
  const backRules = rSheets.match(/html\.im-inbox[^{,]*?(Back|9\.276)[^{,]*/g) || [];
  assert(backRules.length >= 6, 'the inbox back-arrow rules are still there for the inbox itself');
  assert(!rqdoc.documentElement.classList.contains('im-inbox') &&
    !backRules.some(r => rqdoc.querySelector('header a').matches(r.trim())),
    'the Message Requests page is not the inbox: its back-to-inbox arrow stays visible');

  //     Login drop-off detail (Aug 23): taps by label, submits, the error
  //     Instagram shows (as an enum, never its text), and going to the
  //     background with the page up. Nothing typed ever leaves the page.
  const detail = [];
  const loginHtml = `<form id="f"><input name="username" value="alex.chen"><input name="password" type="password" value="hunter2">
    <button type="submit">Log in</button></form><a href="/accounts/password/reset/">Forgot password?</a>
    <button>Continue as alex.chen</button><div id="errbox"></div>`;
  const lp = boot('/accounts/login/', loginHtml, { loggedOut: true, bridge: m => {
    if (m.cmd === 'track') detail.push([m.event, m.props]);
  } });
  await settle(900);
  const ldoc2 = lp.window.document;
  const lclick = el => el.dispatchEvent(new lp.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  lclick(ldoc2.querySelector('a'));
  lclick(ldoc2.querySelectorAll('button')[1]);
  //     The Passwords-key hint: shown once on the first login field focus,
  //     gone on submit.
  //     Named before focus is read: a freshly inserted field is hinted by
  //     the observer, without waiting for the sweep.
  const late = ldoc2.createElement('input'); late.name = 'username'; late.type = 'text';
  ldoc2.getElementById('f').appendChild(late);
  await settle(50);
  assert.strictEqual(late.getAttribute('autocomplete'), 'username',
    'a field that appears late must be named at once, not on the next sweep');
  //     The hint waits for Instagram's logo to lay out; with none in this
  //     fixture it appears after the retry cap, still untapped.
  assert(!ldoc2.getElementById('im-keytip'),
    'no hint while the logo could still appear');
  await settle(4200);
  assert(/Press \u201CPasswords\u201D above your keyboard and search Instagram to find your account\./.test(
    (ldoc2.getElementById('im-keytip') || {}).textContent || ''),
    'landing on the sign-in form must show the Passwords-key hint, untapped');
  ldoc2.querySelector('input[name=username]').dispatchEvent(new lp.window.Event('focusin', { bubbles: true }));
  ldoc2.querySelector('input[name=password]').dispatchEvent(new lp.window.Event('focusin', { bubbles: true }));
  assert.strictEqual(ldoc2.querySelectorAll('#im-keytip').length, 1, 'the hint shows once, not per field');
  //     Instagram's Log in is a React button, not a form submit (Sep 1):
  //     the tap with a filled password is the submit, and the native
  //     submit right after it is the same attempt, counted once.
  ldoc2.querySelector('input[name=password]').value = 'hunter2';
  ldoc2.getElementById('f').insertAdjacentHTML('beforeend', '<button type="button" id="loginbtn">Log in</button>');
  ldoc2.getElementById('loginbtn').dispatchEvent(new lp.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  ldoc2.getElementById('f').dispatchEvent(new lp.window.Event('submit', { bubbles: true, cancelable: true }));
  assert(!ldoc2.getElementById('im-keytip'), 'submit takes the hint down');
  ldoc2.getElementById('errbox').innerHTML =
    '<p role="alert" id="slfErrorAlert">Sorry, your password was incorrect. Please double-check your password.</p>' +
    '<div role="dialog"><h3>Something went wrong</h3><p>Please try again.</p><button>Try again</button></div>';
  await settle(900);
  Object.defineProperty(ldoc2, 'visibilityState', { value: 'hidden', configurable: true });
  ldoc2.dispatchEvent(new lp.window.Event('visibilitychange'));
  const names = detail.map(d => d[0]);
  assert(names.includes('login_step'), 'the stage still reports');
  const taps = detail.filter(d => d[0] === 'login_tap').map(d => d[1].label);
  assert.deepStrictEqual(taps, ['forgot password?', 'continue as', 'log in'],
    'taps report their label, and a saved-login button loses the name');
  const sub = detail.find(d => d[0] === 'login_submitted');
  assert(sub && sub[1].stage === 'login' && sub[1].attempt === 1, 'a submit reports the stage and attempt');
  const err = detail.find(d => d[0] === 'login_error');
  //     Two attempts by now: the saved-login "Continue as" tap with a
  //     filled password counts (it IS a login attempt), then the Log in tap.
  assert(err && err[1].error === 'wrong_password' && err[1].submits === 2,
    'an Instagram error reports as an enum with the submit count');
  assert.strictEqual(detail.filter(d => d[0] === 'login_error').length, 2,
    'each distinct error reports once, not on every sweep');
  assert(detail.some(d => d[0] === 'login_error' && d[1].error === 'generic'),
    'the phone page\'s error dialog (role=dialog) is seen and classified');
  assert.strictEqual(detail.filter(d => d[0] === 'login_submitted').length, 2,
    'the Log in tap and the native submit that follows it are one attempt (two with the earlier Continue as)');
  const left = detail.find(d => d[0] === 'login_left');
  assert(left && left[1].stage === 'login' && left[1].submits === 2 && typeof left[1].seconds === 'number',
    'backgrounding with the page up reports where and after how many tries');
  const blob = JSON.stringify(detail);
  assert(!/alex\.chen|hunter2|double-check/.test(blob),
    'nothing typed and no error text may ever reach the bridge');
  //     Build 91 behavior, kept on purpose (Sep 1): NO ServiceWorker*
  //     stubs of any kind. Builds 92/93 defined the class globals and
  //     navigator.serviceWorker to "fix" a boot crash; on device, build
  //     91's cage.js boots fine WITHOUT them, and defining them made
  //     Instagram feature-detect service-worker support and route every
  //     chat's message load through a worker that never runs (chats hung,
  //     zero network). Matthew pinned it; the differential run proved it.
  const swBoot = boot('/direct/inbox/', '');
  await settle(300);
  assert.strictEqual(typeof swBoot.window.ServiceWorkerRegistration, 'undefined',
    'no ServiceWorkerRegistration stub: defining it broke chat loading (build 92/93 regression)');
  assert.strictEqual(typeof swBoot.window.navigator.serviceWorker, 'undefined',
    'no navigator.serviceWorker stub: its presence made Instagram take the broken SW path');

  //     A dialog that greets the page (cookie consent) with nothing
  //     submitted is not an error: it fired login_error {other, submits: 0}
  //     within 4s on the very first build 90 device (Sep 1).
  const cookieEvents = [];
  const cookiePage = boot('/accounts/login/', '<div id="cb"></div><input name="username"><input name="password" type="password">',
    { loggedOut: true, bridge: m => { if (m.cmd === 'track') cookieEvents.push(m.event); } });
  await settle(1500);
  cookiePage.window.document.getElementById('cb').innerHTML =
    '<div role="dialog"><p>Allow the use of cookies in this browser?</p><button>Allow all cookies</button></div>';
  await settle(1200);
  assert(!cookieEvents.includes('login_error'),
    'a dialog on an untouched login page (cookie consent) must not report as a login error');
  //     The sign-in sheet (Sep 1): Safari's in-app sheet, drawn by Konvo
  //     around Instagram's own page so the session stays in this webview.
  //     Strip bound to the live URL, footer says whose page it is, Done
  //     reveals Konvo's own page, the reset route has a way back, and the
  //     black band above is native (appearance "black"). Nothing typed
  //     leaves the page through any of it.
  const sheetMsgs = [];
  const sheetPage = boot('/accounts/login/', loginHtml, { loggedOut: true,
    bridge: m => sheetMsgs.push(m) });
  const sdoc = sheetPage.window.document;
  //     The rise is a class for the first 700ms of the document.
  await settle(100);
  assert(sdoc.documentElement.classList.contains('im-rise'), 'the first arrival rises like a presented sheet');
  await settle(800);
  assert(!sdoc.documentElement.classList.contains('im-rise'), 'the rise class leaves once the animation is over');
  const sclick = sel => sdoc.querySelector(sel).dispatchEvent(
    new sheetPage.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const acts = () => sheetMsgs.filter(m => m.cmd === 'track' && m.event === 'login_sheet').map(m => m.props.act);
  const looks = () => sheetMsgs.filter(m => m.cmd === 'appearance').map(m => m.productId);
  assert(sdoc.getElementById('im-sheet'), 'a signed-out login page gets the sheet');
  assert(sdoc.documentElement.classList.contains('im-sheet'), 'the page is pushed down under the strip');
  assert.strictEqual(sdoc.querySelector('#im-sheet .ims-host').textContent, 'instagram.com',
    'the strip shows the real host');
  assert.strictEqual(sdoc.querySelector('#im-sheet .ims-path').textContent, '/accounts/login/',
    'the strip shows the real path');
  assert(/Instagram's own page/.test(sdoc.getElementById('im-sheet-foot').textContent) &&
    /Konvo never reads your password/.test(sdoc.getElementById('im-sheet-foot').textContent),
    'the footer says whose page it is');
  assert.deepStrictEqual(looks(), ['black'], 'the sheet asks native for the black band once');
  //     No Done and no Konvo page behind the sheet (Matthew, build 99 on
  //     device: "no idea why this is here"); Instagram's own Forgot
  //     password is the reset route.
  assert(!sdoc.querySelector('#im-sheet [data-act="done"]') && !sdoc.getElementById('im-connect'),
    'no Done button and nothing behind the sheet');
  assert(sdoc.body.contains(sdoc.getElementById('im-sheet')) && sdoc.body.contains(sdoc.getElementById('im-sheet-foot')),
    'the strip and footer live inside the body');
  assert(/@keyframes ims-rise/.test([...sdoc.querySelectorAll('style')].map(s => s.textContent).join('')) &&
    /prefers-reduced-motion:reduce/.test([...sdoc.querySelectorAll('style')].map(s => s.textContent).join('')),
    'the rise is a CSS animation, gated on the motion preference');
  sclick('[data-act="reload"]');
  assert(sheetPage.went.includes('reload'), 'the reload button reloads Instagram\'s page');
  assert.deepStrictEqual(acts(), ['reload'], 'every sheet action reports as one event with an enum');
  assert(!/alex\.chen|hunter2/.test(JSON.stringify(sheetMsgs)),
    'the sheet never sends what is typed');
  //     The key tip is anchored to the page, not the viewport (build 99
  //     on device: the keyboard scrolled the form up under a fixed tip).
  await settle(4300);
  assert(/position:absolute/.test((sdoc.getElementById('im-keytip') || {}).getAttribute('style') || ''),
    'the key tip scrolls with Instagram\'s page');
  //     The session appearing mid-page (Instagram logs in without a full
  //     load) takes the sheet down and hands the look to the phone.
  sdoc.cookie = 'ds_user_id=1234567';
  await settle(900);
  assert(!sdoc.getElementById('im-sheet') && !sdoc.documentElement.classList.contains('im-sheet'),
    'a session cookie takes the sheet down');
  assert.deepStrictEqual(looks(), ['black', 'auto'], 'the band goes with the sheet');
  //     The reset page: the footer changes its line, and coming back to
  //     the app (from the email) offers the way back to sign in.
  const resetMsgs = [];
  const resetPage = boot('/accounts/password/reset/', '<input name="email_or_username">',
    { loggedOut: true, bridge: m => resetMsgs.push(m) });
  await settle(900);
  const rsdoc = resetPage.window.document;
  assert(/Reset it here, then come back and sign in\./.test(rsdoc.getElementById('im-sheet-foot').textContent),
    'the reset page footer says what to do');
  assert(resetMsgs.some(m => m.event === 'login_step' && m.props.stage === 'reset'),
    'arriving on the reset page is a login step');
  assert(!rsdoc.getElementById('im-reset-bar'), 'no way-back bar until the app comes back');
  Object.defineProperty(rsdoc, 'visibilityState', { value: 'hidden', configurable: true });
  rsdoc.dispatchEvent(new resetPage.window.Event('visibilitychange'));
  Object.defineProperty(rsdoc, 'visibilityState', { value: 'visible', configurable: true });
  rsdoc.dispatchEvent(new resetPage.window.Event('visibilitychange'));
  assert(rsdoc.getElementById('im-reset-bar') && /Reset done\?/.test(rsdoc.getElementById('im-reset-bar').textContent),
    'coming back to the reset page offers the way back');
  rsdoc.querySelector('#im-reset-bar [data-act="reset_return"]').dispatchEvent(
    new resetPage.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(resetPage.went.includes('/accounts/login/'), 'Sign in goes back to the login');
  assert(resetMsgs.some(m => m.event === 'login_sheet' && m.props.act === 'reset_return'),
    'the way back reports');
  //     Not for a signed-in visit, not on a Mac, not on the inbox; and a
  //     new document with a session clears the band the last one asked for.
  const signedSheet = boot('/accounts/login/', loginHtml, { bridge: () => {} });
  const macSheet = boot('/accounts/login/', loginHtml, { loggedOut: true, ua: DESKTOP, bridge: () => {} });
  const inboxSheet = boot('/direct/inbox/', '', { bridge: () => {} });
  const afterMsgs = [];
  const afterSheet = boot('/direct/inbox/', '', { sseed: { konvoSheet: '1' }, bridge: m => afterMsgs.push(m) });
  //     The pages after the first (reset, challenge) are the same sheet,
  //     already up: no second rise.
  const secondPage = boot('/accounts/password/reset/', '<input name="email_or_username">',
    { loggedOut: true, sseed: { konvoSheet: '1' }, bridge: () => {} });
  await settle(900);
  assert(secondPage.window.document.getElementById('im-sheet') &&
    !secondPage.window.document.documentElement.classList.contains('im-rise'),
    'the second page of the chain keeps the sheet up without rising again');
  assert(!signedSheet.window.document.getElementById('im-sheet'), 'no sheet over a signed-in visit');
  assert(!macSheet.window.document.getElementById('im-sheet'), 'no sheet on the Mac');
  assert(!inboxSheet.window.document.getElementById('im-sheet'), 'no sheet on the inbox');
  assert(afterMsgs.some(m => m.cmd === 'appearance' && m.productId === 'auto') &&
    !afterSheet.window.sessionStorage.getItem('konvoSheet'),
    'the document after the login clears the band');

  //     Keychain AutoFill (Aug 23): the sweep names the fields for iOS.
  //     Instagram ships them as autocomplete="on", which the keyboard
  //     ignores; username / current-password is what surfaces the saved
  //     password. The two-factor code field gets one-time-code.
  assert.strictEqual(ldoc2.querySelector('input[name=username]').getAttribute('autocomplete'), 'username',
    'the username field must be named for AutoFill');
  assert.strictEqual(ldoc2.querySelector('input[name=password]').getAttribute('autocomplete'), 'current-password',
    'the password field must be named for AutoFill');
  ldoc2.querySelector('input[name=username]').setAttribute('autocomplete', 'on');
  await settle(900);
  assert.strictEqual(ldoc2.querySelector('input[name=username]').getAttribute('autocomplete'), 'username',
    'a re-render that puts "on" back is corrected on the next sweep');
  const tfa = boot('/accounts/login/two_factor/', '<input name="verificationCode" inputmode="numeric" autocomplete="on">',
    { loggedOut: true, bridge: () => {} });
  await settle(900);
  assert.strictEqual(tfa.window.document.querySelector('input').getAttribute('autocomplete'), 'one-time-code',
    'the two-factor code field must offer the SMS code');
  //     The Passwords-key hint is an iOS keyboard affordance: a Mac build
  //     must never show it over the login form (1.3.0).
  const macLogin = boot('/accounts/login/', loginHtml, { loggedOut: true, ua: DESKTOP, bridge: () => {} });
  await settle(4600);
  assert(!macLogin.window.document.getElementById('im-keytip'),
    'the Passwords hint must not appear on macOS');
  const signedLoginDetail = boot('/accounts/login/', loginHtml, { bridge: m => {
    if (m.cmd === 'track' && /^login_(tap|submitted|error|left)$/.test(m.event)) detail.push(['SIGNED', m.event]);
  } });
  await settle(900);
  signedLoginDetail.window.document.getElementById('f').dispatchEvent(
    new signedLoginDetail.window.Event('submit', { bubbles: true, cancelable: true }));
  assert(!detail.some(d => d[0] === 'SIGNED'), 'a signed-in visit to the login route reports no detail');

  //     Session rescue: a logged-out login page asks native for the
  //     cookie snapshot ONCE, and a restored snapshot goes back to the
  //     inbox. WebKit loses cookies on a force-quit soon after login
  //     (a tester relogged every launch, Aug 17); this is the healer.
  const rescueLog = [];
  const rescued = boot('/accounts/login/', '', { loggedOut: true,
    bridge: (m, d) => {
      rescueLog.push(m.cmd === 'track' ? 'track:' + m.event : m.cmd);
      if (m.cmd === 'cookieRestore')
        d.window.__konvoStoreReply(m.id, { restored: true, n: 7 });
    } });
  await settle(1900);
  assert(rescued.went.includes('/direct/inbox/'),
    'a restored session must return to the inbox');
  assert(rescueLog.includes('track:session_restored'),
    'the rescue must be visible in analytics');
  assert.strictEqual(
    rescueLog.filter(c => c === 'cookieRestore').length, 1,
    'the interval sweep must not re-ask for the snapshot');
  const noSnap = boot('/accounts/login/', '', { loggedOut: true,
    bridge: (m, d) => {
      if (m.cmd === 'cookieRestore')
        d.window.__konvoStoreReply(m.id, { restored: false });
    } });
  await settle(900);
  assert(!noSnap.went.includes('/direct/inbox/'),
    'no snapshot means the login page is genuine; stay put');
  const signedLogin = boot('/accounts/login/', '', {
    bridge: m => { if (m.cmd === 'cookieRestore')
      assert.fail('a signed-in login visit must not trigger the rescue'); } });
  await settle(900);

  //     inbox_ready reports what a fresh sign-in actually finds: the
  //     thread count once the inbox settles, and how long that took.
  const ready = [];
  const tready = [];
  const inboxed = boot('/direct/inbox/',
    '<a href="/direct/t/111/">a</a><a href="/direct/t/222/">b</a>' +
    '<a href="/someone/">profile</a><span id="me">matthew_c</span>' +
    '<div role="group">a message</div><div role="textbox"></div>',
    { bridge: m => {
        if (m.cmd === 'track' && m.event === 'inbox_ready') ready.push(m.props);
        if (m.cmd === 'track' && m.event === 'thread_ready') tready.push(m.props);
        if (m.cmd === 'cookieSave') ready.saves = (ready.saves || 0) + 1;
        if (m.cmd === 'review') ready.reviews = (ready.reviews || 0) + 1;
      } });
  // jsdom rects are all zero; give the username element a real one so the
  // title finder (and the identity capture riding on it) can see it.
  inboxed.window.document.getElementById('me').getBoundingClientRect =
    () => ({ width: 100, top: 40 });
  await settle(2600);   // the settle detector caps at 2s before reporting
  assert.strictEqual(ready.length, 1, 'the settled inbox must report once');
  assert.strictEqual(ready[0].threads, 2,
    'only conversation rows count as threads');
  assert(typeof ready[0].ms === 'number' && ready[0].ms >= 0,
    'the time to settle must ride along');
  assert(!JSON.stringify(ready).includes('111'),
    'inbox_ready must never carry a thread id');
  //     The reminder promise, kept without a notification permission
  //     (Sep 1): two days before the trial ends the settled inbox shows a
  //     sheet once a day; never when the end is further away.
  const INBOX_FIX = '<a href="/direct/t/111/">a</a><span id="me">matthew_c</span><div role="group">a message</div>';
  const barEvents = [];
  const nearEnd = boot('/direct/inbox/', INBOX_FIX, { paid: true,
    seed: { konvoTrialEnd: String(Date.now() + 1.5 * 86400000) },
    bridge: m => { if (m.cmd === 'track') barEvents.push(m.event + ':' + JSON.stringify(m.props)); } });
  const farEnd = boot('/direct/inbox/', INBOX_FIX, { paid: true,
    seed: { konvoTrialEnd: String(Date.now() + 5 * 86400000) } });
  const seenToday = boot('/direct/inbox/', INBOX_FIX, { paid: true,
    seed: { konvoTrialEnd: String(Date.now() + 1.5 * 86400000), konvoTrialBarDay: new Date().toDateString() } });
  await settle(2600);
  const bar = nearEnd.window.document.getElementById('im-pass-sheet');
  assert(bar && /Your trial ends in 2 days\./.test(bar.textContent) && /cancel anytime in Settings/.test(bar.textContent),
    'two days out, the inbox shows the trial reminder sheet');
  assert(barEvents.some(e => e.startsWith('trial_bar_shown:') && e.includes('"days_left":2')),
    'the sheet is tracked with the days left');
  assert.strictEqual(nearEnd.window.localStorage.getItem('konvoTrialBarDay'), new Date().toDateString(),
    'shown once a day');
  bar.querySelector('.im-x').dispatchEvent(new nearEnd.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(!nearEnd.window.document.getElementById('im-pass-sheet'), 'OK dismisses it');
  assert(!farEnd.window.document.getElementById('im-pass-sheet'), 'five days out, no sheet');
  assert(!seenToday.window.document.getElementById('im-pass-sheet'), 'already shown today, no sheet');
  //     Identity rides the first settle: the cookie id plus the handle the
  //     title finder located. Captured once per install, never again.
  assert(ready.saves >= 1,
    'a settled inbox must hand the cookies to native for safekeeping');
  assert.strictEqual(ready[0].$set.ig_user_id, '1234567',
    'the first settle must set the Instagram id');
  assert.strictEqual(ready[0].$set.ig_username, undefined,
    'the handle never goes to PostHog (Sep 3): the id is the only identity');
  assert(!ready.reviews && inboxed.window.localStorage.konvoUseDays === '1'
    && !inboxed.window.localStorage.konvoReviewAsked,
    'a first-day inbox never asks for a rating (5.6.3): it only counts the day');

  //     The rating ask waits for the third distinct day of settled use,
  //     then fires once and never again (moved out of onboarding Aug 27,
  //     App Review 5.6.3).
  const revLog = [];
  const dayThree = boot('/direct/inbox/', '<div role="row">a message</div>', {
    paid: true,
    seed: { konvoUseDays: '2', konvoLastDay: 'not-today' },
    bridge: m => {
      if (m.cmd === 'review') revLog.push(1);
      if (m.cmd === 'track' && m.event === 'review_asked') revLog.asked = true;
    } });
  await settle(2600);
  assert.strictEqual(dayThree.window.localStorage.konvoUseDays, '3',
    'the third distinct day is counted at the first settle');
  assert.strictEqual(revLog.length, 0,
    'but the inbox merely loading is not the moment (Sep 1): no chat read yet');
  //     The moment: a chat opened, then back to the inbox - the app just
  //     did its job. Same day three, so the gate is already open.
  dayThree.window.__loc.pathname = '/direct/t/31/';
  await settle(900);
  assert.strictEqual(revLog.length, 0, 'never inside a chat');
  dayThree.window.__loc.pathname = '/direct/inbox/';
  await settle(2600);
  assert.strictEqual(revLog.length, 1,
    'back at the inbox after a chat on day three asks for the rating, once');
  assert(revLog.asked, 'the ask reports itself');
  assert.strictEqual(dayThree.window.localStorage.konvoReviewAsked, '1',
    'and the flag stops any repeat');
  //     Day one, same walk, a paying user: asks (Sep 2, Matthew: the day
  //     gate is gone; the moment is in, a chat read, back at the inbox).
  const dayOneLog = [];
  const dayOne = boot('/direct/inbox/', '', { paid: true,
    bridge: m => { if (m.cmd === 'review') dayOneLog.push(1); } });
  await settle(2600);
  assert.strictEqual(dayOneLog.length, 0, 'the inbox loading alone is still not the moment');
  dayOne.window.__loc.pathname = '/direct/t/32/';
  await settle(900);
  dayOne.window.__loc.pathname = '/direct/inbox/';
  await settle(2600);
  assert.strictEqual(dayOneLog.length, 1,
    'a chat-and-back on day one asks once the person is in');
  //     The same walk with nobody in (no purchase, no trial, no friend's
  //     days) never asks.
  const outLog = [];
  const outsider = boot('/direct/inbox/', '', { welcomed: true,
    bridge: m => { if (m.cmd === 'review') outLog.push(1); } });
  await settle(2600);
  outsider.window.__loc.pathname = '/direct/t/33/';
  await settle(900);
  outsider.window.__loc.pathname = '/direct/inbox/';
  await settle(2600);
  assert.strictEqual(outLog.length, 0, 'no purchase, no trial, no days: no rating ask');

  //     Page errors report with their message, capped at three a session.
  //     (The stall detector that lived here was removed Aug 31: its
  //     message-row probe never matched Instagram's real markup, so it
  //     reloaded and flagged healthy chats.)
  const errLog = [];
  const errFix = boot('/direct/t/9/', '', { bridge: m => {
    if (m.cmd === 'track') errLog.push(m.event); } });
  await settle(900);
  for (let i = 0; i < 5; i++) {
    errFix.window.dispatchEvent(
      new errFix.window.ErrorEvent('error', { message: 'boom ' + i }));
  }
  assert.strictEqual(errLog.filter(e => e === 'cage_error').length, 3,
    'page errors report with their message, capped at three a session');

  //     No stand-in money (Aug 31): a wall whose products call fails
  //     shows a priceless loading page - the fallback numbers painting
  //     while Apple's sheet charged the real localized price was a field
  //     bug. The retry lands and the wall repaints itself in the user's
  //     own currency.
  let allowProducts = false;
  const lateP = boot('/direct/inbox/', '', { hash: '#konvo=15', bridge: (m, d) => {
    if (m.cmd === 'products') d.window.__konvoStoreReply(m.id, allowProducts
      ? { ok: true,
          yearly: { price: 'A$34.99', perWeek: 'A$0.67', perMonth: 'A$2.92', savePct: 71, trialDays: 7 },
          monthly: { price: 'A$9.99' }, lifetime: { price: 'A$34.99' } }
      : { ok: false });
  } });
  const lpdoc = lateP.window.document;
  const lpText = () => (lpdoc.getElementById('im-pay') || {}).textContent || '';
  const lptap = act => {
    const el = lpdoc.querySelector(`#im-pay [data-act='${act}']`);
    if (el) el.dispatchEvent(new lateP.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  };
  // The silent bridge delays the mount behind the 2.5s entitlement
  // timeout, so fixed sleeps race the sequence: poll for each button.
  const lpwalk = async (act) => {
    for (let i = 0; i < 60 && !lpdoc.querySelector(`#im-pay [data-act='${act}']`); i++) await settle(200);
    lptap(act); await settle(450);
  };
  await lpwalk('keep');
  await lpwalk('try');
  await lpwalk('try-go');
  await lpwalk('offer-go');
  await lpwalk('pay');
  assert(/Loading your plans/.test(lpText()) && !/\$/.test(lpText()),
    'a wall without live prices shows the loading page and not one dollar sign');
  allowProducts = true;
  await settle(3200);   // the 2.5s retry answers and repaints
  assert(/A\$34\.99/.test(lpText()) && /A\$9\.99/.test(lpText()),
    "the retry repaints the paywall in the user's own currency");
  inboxed.window.__loc.pathname = '/direct/t/111/';
  // The 800ms route tick plus the 180ms quiet window: the crossing can
  // take up to ~1.1s to report, so the wait is generous on purpose.
  await settle(1600);
  //     Opening a chat reports how long the switch took to settle - the
  //     "way slower to text" complaint needs a number before any fix.
  assert.strictEqual(tready.length, 1, 'a settled thread must report once');
  assert(typeof tready[0].ms === 'number' && tready[0].ms >= 0,
    'the switch time must ride along');
  assert.strictEqual(tready[0].rows, 1,
    'thread_ready must wait for real message rows, not a quiet skeleton');
  assert.strictEqual(tready[0].composer, true,
    'thread_ready says whether the message box rendered (Sep 7): rows 0 alone cannot tell empty from stuck');
  inboxed.window.__loc.pathname = '/direct/inbox/';
  await settle(2600);
  assert.strictEqual(ready.length, 2, 'returning to the inbox must report again');
  assert(!ready[1].$set, 'identity is captured once per install, not per settle');

  //     A crossing mid-settle abandons the old page's report: settle()
  //     cancels its predecessor, so an inbox the user bounced off never
  //     reports, and only the thread actually reached does.
  const cx = [];
  const crossing = boot('/direct/inbox/', '<div role="group">m</div>',
    { bridge: m => { if (m.cmd === 'track') cx.push(m.event); } });
  // Cross synchronously, the same tick the inbox settle started: a settle
  // needs 180ms of quiet to complete, so this is always mid-settle, with
  // no timer race for a loaded machine to lose.
  crossing.window.__loc.pathname = '/direct/t/77/';
  crossing.window.dispatchEvent(new crossing.window.Event('popstate'));
  await settle(1500);
  assert(!cx.includes('inbox_ready'),
    'a crossing mid-settle must abandon the inbox report');
  assert.strictEqual(cx.filter(e => e === 'thread_ready').length, 1,
    'the thread the user actually reached must report exactly once');

  //     The DM composer must autocorrect: Instagram ships it off, the
  //     cage flips it on, and only in a thread - the inbox search box is
  //     not ours to retrait.
  const dmbox = boot('/direct/t/123/',
    '<div id="cmp" role="textbox" contenteditable="true"' +
    " autocorrect='off' autocapitalize='off' spellcheck='false'></div>");
  await settle(900);
  const cmp = dmbox.window.document.getElementById('cmp');
  assert.strictEqual(cmp.getAttribute('autocorrect'), 'on',
    'the composer must get autocorrect back');
  assert.strictEqual(cmp.getAttribute('autocapitalize'), 'sentences',
    'sentence capitalization comes with it');
  assert.strictEqual(cmp.getAttribute('spellcheck'), 'true',
    'spellcheck comes with it');
  const searchbox = boot('/direct/inbox/',
    '<div id="q" role="textbox" autocorrect="off"></div>');
  await settle(900);
  assert.strictEqual(
    searchbox.window.document.getElementById('q').getAttribute('autocorrect'),
    'off', 'outside a thread the cage must leave textboxes alone');

  //     The block (Aug 16 order): the loader hands a supported paid build
  //     straight to the Screen Time connect page, BEFORE perks or price.
  //     Its button walks authorize -> pick -> shield -> notify, the
  //     confirmation hands over to perks, and the paywall follows.
  const cageLog = [];
  //     A paying user's reinstall (Aug 21): entitled, but the shield is
  //     gone with the old install. The wall rises once with the Screen Time
  //     step alone, arms on the pick, says "You're protected", and leaves. An
  //     entitled user whose shield is up sees nothing.
  const reLog = [];
  const reinstall = boot('/direct/inbox/', '', { bridge: (m, d) => {
    reLog.push(m.cmd === 'track' ? 'track:' + m.event +
      (m.props && m.props.via ? ':' + m.props.via : '') : m.cmd);
    const r = {
      entitlements: { entitled: true },
      cageStatus: { supported: true, authorized: false, picked: false, active: false },
      cageAuthorize: { authorized: true }, cagePick: { count: 1 },
      cageOn: { active: true }, notify: { granted: true },
    }[m.cmd];
    if (r) d.window.__konvoStoreReply(m.id, r);
  } });
  await settle(1200);
  const rdoc = reinstall.window.document;
  assert(!rdoc.getElementById('im-pay'),
    'an entitled user with no shield gets no wall on launch (Sep 1): the block is opt-in');
  assert(rdoc.documentElement.classList.contains('im-lockable') &&
    !rdoc.documentElement.classList.contains('im-caged'),
    'but the lock button is there');
  assert(!reLog.includes('track:cage_pitch_viewed'), 'and nothing is pitched unasked');
  rdoc.getElementById('im-pass').dispatchEvent(
    new reinstall.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(300);
  assert(rdoc.getElementById('im-pay') &&
    /Connect Konvo to Screen Time/.test(rdoc.getElementById('im-pay').textContent) &&
    reLog.includes('track:cage_pitch_viewed:button') && reLog.includes('track:block_button_tapped'),
    'the lock button opens the Screen Time step, and only that');
  assert(!/Instagram connected/.test(rdoc.getElementById('im-pay').textContent),
    'no connected/loader beat for a payer');
  const rtap = act => rdoc.querySelector(`[data-act='${act}']`).dispatchEvent(
    new reinstall.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  //     The close (Sep 1): back to the inbox unblocked, lock button still
  //     there, nothing native touched; the page can be reopened.
  rtap('cage-close');
  await settle(950);
  assert(!rdoc.getElementById('im-pay') && reLog.includes('track:cage_setup_closed:button') &&
    !reLog.includes('cageAuthorize') && !reLog.includes('cageOn') &&
    rdoc.documentElement.classList.contains('im-lockable'),
    'close leaves the inbox as it was and keeps the lock button');
  rdoc.getElementById('im-pass').dispatchEvent(
    new reinstall.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(300);
  assert(/Connect Konvo to Screen Time/.test(rdoc.getElementById('im-pay').textContent),
    'and the lock button opens it again');
  rtap('cage-setup-go');
  await settle(600);
  assert(reLog.includes('cageOn') && reLog.includes('track:cage_enabled'),
    'the pick must arm the shield for a payer');
  assert(/You're protected\./.test(rdoc.getElementById('im-pay').textContent),
    'the payer ends on "You\'re protected", not the sell');
  assert(!/No commitment/.test(rdoc.getElementById('im-pay').textContent),
    'a payer must never see the paywall');
  await settle(3600);
  assert(!rdoc.getElementById('im-pay'), 'the wall leaves on its own');
  const shielded = boot('/direct/inbox/', '', { bridge: (m, d) => {
    const r = { entitlements: { entitled: true },
      cageStatus: { supported: true, authorized: true, picked: true, active: true } }[m.cmd];
    if (r) d.window.__konvoStoreReply(m.id, r);
  } });
  await settle(1200);
  assert(!shielded.window.document.getElementById('im-pay'),
    'an entitled user whose shield is up sees no wall at all');
  const cageReplies = {
    entitlements: { entitled: false },
    products: LIVE_PRODUCTS,
    cageStatus: { supported: true, authorized: false, picked: false, active: false },
    cageAuthorize: { authorized: true },
    cagePick: { count: 1 },
    cageOn: { active: true },
    notify: { granted: true },
  };
  const caged = boot('/direct/inbox/', '', { beta: true, bridge: (m, d) => {
    cageLog.push(m.cmd === 'track' ? 'track:' + m.event : m.cmd);
    if (m.cmd in cageReplies) d.window.__konvoStoreReply(m.id, cageReplies[m.cmd]);
  } });
  await settle(8400);
  const cdoc = caged.window.document;
  const cactap = act => cdoc.querySelector(`[data-act='${act}']`).dispatchEvent(
    new caged.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  //     The Screen Time step no longer precedes the sell (Aug 22): the
  //     loader lands on the reveal, and nothing native runs before the
  //     money.
  assert(!cageLog.includes('track:cage_pitch_viewed') && !cageLog.includes('cageAuthorize'),
    'no Screen Time pitch and nothing native before the purchase');
  assert(cdoc.getElementById('im-pay').classList.contains('im-reveal'),
    'the loader must clear the wall to show the real inbox');
  assert(/Instagram connected/.test(cdoc.getElementById('im-pay').textContent) &&
    /Your DMs are still here\./.test(cdoc.getElementById('im-pay').textContent) &&
    /Keep Instagram like this/.test(cdoc.getElementById('im-pay').textContent),
    'the reveal carries the pill, the headline and the keep button');
  assert(cageLog.includes('track:inbox_reveal_viewed'), 'the reveal is tracked');
  cactap('keep');
  await settle(450);
  assert(!cdoc.getElementById('im-pay').classList.contains('im-reveal'),
    'keep must make the wall opaque again');
  assert(/Same account\. Different app\./.test(cdoc.getElementById('im-pay').textContent),
    'keep hands over to the comparison page');
  cactap('try');
  await settle(450);
  cactap('try-go');
  await settle(450);
  cactap('offer-go');
  await settle(450);
  assert(/You'll get a reminder 2 days before your trial ends\./.test(cdoc.getElementById('im-pay').textContent),
    'then the try and reminder pages: setup first, sell second');
  cactap('pay');
  await settle(450);
  assert(!cageLog.includes('cageOn'),
    'reaching the paywall still must not arm the shield');
  cactap('betafree');
  await settle(450);
  assert(!cageLog.includes('track:cage_pitch_viewed') &&
    /You're in\./.test(cdoc.getElementById('im-pay').textContent),
    'the sequence ending well (here the beta grant) ends on the confirmation, not the Screen Time step');
  assert(!cageLog.includes('cageOn'), 'the grant alone does not arm');
  cactap('done');
  await settle(950);
  assert(!cdoc.getElementById('im-pay'), 'the beta unlock drops the wall');
  assert(cdoc.documentElement.classList.contains('im-lockable'),
    'and leaves the lock button in the inbox');
  cdoc.getElementById('im-pass').dispatchEvent(
    new caged.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(300);
  assert(cageLog.includes('track:cage_pitch_viewed') &&
    /Connect Konvo to Screen Time, securely\./.test(cdoc.getElementById('im-pay').textContent),
    'the lock button opens the Screen Time step');
  assert(cdoc.querySelector("[data-act='cage-close']") &&
    !/Not now/.test(cdoc.getElementById('im-pay').textContent),
    'the page carries a close (Sep 1): the user opened it, the user can leave it');
  cactap('cage-setup-go');
  await settle(600);
  const ci = s => cageLog.indexOf(s);
  assert(ci('cageAuthorize') > -1 && ci('cagePick') > ci('cageAuthorize') &&
    cageLog.lastIndexOf('notify') > ci('cagePick') && ci('cageOn') > cageLog.lastIndexOf('notify'),
    'cage setup must run authorize, pick, notify, then arm, in order (the purchase-time ask is an earlier notify)');
  assert(cageLog.includes('track:cage_enabled'), 'the arming is reported');
  assert(/You're protected\./.test(cdoc.getElementById('im-pay').textContent),
    'and end on the protected page');
  assert(cdoc.documentElement.classList.contains('im-caged'),
    'the pass button arms in the same session the shield goes up');
  await settle(3600);   // the protected page holds 2.4s, then the .8s fade
  assert(!cdoc.getElementById('im-pay'),
    'the protected page drops the wall');

  //     A paid purchase arms it too, and a connect-then-decline never does.
  const armLog = [];
  const armReplies = Object.assign({}, cageReplies, {
    purchase: { ok: true, entitled: true } });
  const armed = boot('/direct/inbox/', '', { patch: { invite: false }, bridge: (m, d) => {
    armLog.push(m.cmd);
    if (m.cmd in armReplies) d.window.__konvoStoreReply(m.id, armReplies[m.cmd]);
  } });
  await settle(8400);
  const adoc = armed.window.document;
  const atap = act => adoc.querySelector(`[data-act='${act}']`).dispatchEvent(
    new armed.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  atap('keep');
  await settle(450);
  atap('try');
  await settle(450);
  atap('try-go');
  await settle(450);
  atap('offer-go');
  await settle(450);
  atap('pay');
  await settle(450);
  assert(!armLog.includes('cageOn') && !armLog.includes('cageAuthorize'),
    'a paid build must not touch the shield before purchase either');
  atap('buy-y');
  await settle(450);
  assert(!armLog.includes('cageOn') && /You're in\./.test(adoc.getElementById('im-pay').textContent),
    'a purchase ends on the confirmation; nothing arms');
  atap('done');
  await settle(950);
  adoc.getElementById('im-pass').dispatchEvent(
    new armed.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(300);
  atap('cage-setup-go');
  await settle(600);
  assert(armLog.indexOf('cageOn') > armLog.indexOf('purchase'),
    'a successful purchase, then the pick from the inbox, arms the shield');
  assert(/You're protected\./.test(adoc.getElementById('im-pay').textContent),
    'the protected page follows the arming');

  //     The free build's ending: Continue on perks runs the tail. With no
  //     bridge (this harness, the Mac) there is no shield to set up, so
  //     the plain confirmation stands in and Open my messages ends it.
  const freeEnd = boot('/direct/inbox/', '', { free: true });
  await settle(8400);
  const edoc = freeEnd.window.document;
  const etap = act => edoc.querySelector(`[data-act='${act}']`).dispatchEvent(
    new freeEnd.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(!/Choose a plan next/.test(edoc.getElementById('im-pay').textContent),
    'the free build\'s reveal promises no plan');
  etap('keep');
  await settle(450);
  assert(/Free\. Nothing to cancel\./.test(edoc.getElementById('im-pay').textContent),
    'the free build\'s comparison page promises nothing to cancel');
  etap('welcomed');
  await settle(1300);   // finish's 900ms fallback
  assert(/You're in\./.test(edoc.getElementById('im-pay').textContent)
    && edoc.querySelector("#im-pay path[stroke-dasharray='24']"),
    'the free ending must show the drawn check before the inbox');
  etap('done');
  await settle(950);
  assert(!edoc.getElementById('im-pay'), 'Open my messages must drop the wall');
  assert.strictEqual(freeEnd.window.localStorage.getItem('konvoWelcomed'), '1',
    'the free ending still marks the sequence done');

  //     Without iOS 16 the connect page never renders: the loader lands
  //     on perks exactly as the flow ran before the block existed.
  const oldLog = [];
  const oldios = boot('/direct/inbox/', '', { beta: true, bridge: (m, d) => {
    oldLog.push(m.cmd === 'track' ? 'track:' + m.event : m.cmd);
    const r = { entitlements: { entitled: false }, notify: { ok: true, granted: true }, products: LIVE_PRODUCTS,
      cageStatus: { supported: false } };
    if (m.cmd in r) d.window.__konvoStoreReply(m.id, r[m.cmd]);
  } });
  await settle(8400);
  const odoc = oldios.window.document;
  const otap2 = act => odoc.querySelector(`[data-act='${act}']`).dispatchEvent(
    new oldios.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  otap2('keep');
  await settle(450);
  assert(/Same account\. Different app\./.test(odoc.getElementById('im-pay').textContent),
    'an unsupported bridge still reaches the comparison page through the reveal');
  otap2('try');
  await settle(450);
  otap2('try-go');
  await settle(450);
  otap2('offer-go');
  await settle(450);
  assert(/You'll get a reminder 2 days before your trial ends\./.test(odoc.getElementById('im-pay').textContent),
    'and continue into the reminder page');
  assert(!oldLog.includes('track:cage_pitch_viewed'),
    'no connect event when the page never rendered');

  //     Apple's consent dialog sits over the page and never resolves in
  //     this boot; taps underneath must not re-fire the chain (eleven
  //     cage_authorized in a row on one device, Aug 17).
  const mashLog = [];
  const mashed = boot('/direct/inbox/', '', { beta: true, bridge: (m, d) => {
    mashLog.push(m.cmd);
    if (m.cmd === 'cageAuthorize') return;
    if (m.cmd in cageReplies) d.window.__konvoStoreReply(m.id, cageReplies[m.cmd]);
  } });
  await settle(8400);
  const mdoc = mashed.window.document;
  const mact = act => mdoc.querySelector(`[data-act='${act}']`)
    .dispatchEvent(new mashed.window.MouseEvent('click',
      { bubbles: true, cancelable: true }));
  // The connect page is opened from the inbox's lock button (Sep 1).
  for (const a of ['keep', 'try', 'try-go', 'offer-go', 'pay', 'betafree']) { mact(a); await settle(450); }
  mact('done');
  await settle(950);
  mdoc.getElementById('im-pass').dispatchEvent(
    new mashed.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(300);
  assert(mdoc.querySelector("[data-act='cage-setup-go']"), 'the lock button opened the connect page');
  const mgo = () => mact('cage-setup-go');
  mgo(); mgo(); mgo();
  await settle(200);
  assert.strictEqual(mashLog.filter(c => c === 'cageAuthorize').length, 1,
    'taps while the consent dialog is up must not re-fire the chain');

  //     The pass sheet follows the phone: light is the default palette,
  //     dark lives only under the media query (hardcoded dark looked
  //     wrong on a light-mode phone, Aug 17).
  assert(CAGE.includes('#im-pass-card{width:100%;background:rgba(242,242,247'),
    'the pass card must default to the light palette');
  // The dark values must appear AFTER the media query opens (the CSS is
  // one concatenated string; source-order stands in for cascade scope).
  assert(CAGE.indexOf('@media (prefers-color-scheme: dark){') <
    CAGE.indexOf('#im-pass{background:rgba(38,38,38') &&
    CAGE.indexOf('#im-pass{background:rgba(38,38,38') > -1,
    'the dark palette must live under the media query');

  //     The daily passes: visible only when caged, reason before unlock,
  //     five minutes then a spare minute, then tomorrow. The relock is
  //     DeviceActivity's job and is device-only; the contract here is
  //     the sheet's choreography.
  const passLog = [];
  const passed = boot('/direct/inbox/', '', { beta: true, welcomed: true,
    bridge: (m, d) => {
      passLog.push(m.cmd === 'track'
        ? 'track:' + m.event + (m.props && m.props.mins ? ':' + m.props.mins : '')
        : m.cmd);
      const r = {
        entitlements: { entitled: false }, notify: { ok: true, granted: true },
        cageStatus: { supported: true, authorized: true, picked: true,
          active: true, passAvailable: true, passMins: 5, passesLeft: 2 },
        cagePass: { granted: true },
      };
      if (m.cmd in r) d.window.__konvoStoreReply(m.id, r[m.cmd]);
    } });
  await settle(1200);
  const pdoc = passed.window.document;
  const ptap = el => el.dispatchEvent(
    new passed.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(pdoc.documentElement.classList.contains('im-caged'),
    'an active cage must mark the page');
  ptap(pdoc.getElementById('im-pass'));
  await settle(200);
  assert(/Why do you want to unlock Instagram/.test(
    pdoc.getElementById('im-pass-card').textContent),
    'the pass sheet must open with the reason question');
  assert(pdoc.querySelector("#im-pass-card .im-pr[data-r='post']"),
    'posting a picture or Reel must be an offered reason');
  //     Feedback lives on the pass card (Sep 1): one tap opens the native
  //     UserJot sheet through the bridge and closes the card.
  assert(pdoc.querySelector('#im-pass-card .im-fb'),
    'the pass card must carry the feedback entry');
  ptap(pdoc.querySelector('#im-pass-card .im-fb'));
  await settle(200);
  assert(passLog.includes('feedback') && passLog.includes('track:feedback_opened'),
    'the feedback tap must reach native and report itself');
  assert(!pdoc.getElementById('im-pass-card'), 'and the card closes behind it');
  ptap(pdoc.getElementById('im-pass'));
  await settle(200);
  const unlock = pdoc.querySelector('#im-pass-card .im-go');
  assert(unlock.disabled, 'Unlock must wait for a reason');
  assert(/Unlock for 5 mins/.test(unlock.textContent),
    'the first pass of the day is the five');
  assert(/Unlocks left: 2 \(5 mins each\)/.test(
    pdoc.getElementById('im-pass-card').textContent),
    'the fine print counts both unlocks');
  ptap(pdoc.querySelector("#im-pass-card .im-pr[data-r='story']"));
  assert(!unlock.disabled, 'a reason arms Unlock');
  ptap(unlock);
  await settle(200);
  assert(passLog.includes('cagePass'), 'Unlock must ask the bridge for the pass');
  assert(passLog.includes('track:pass_used:5'),
    'the pass must be tracked with its length');
  assert(!pdoc.getElementById('im-pass-sheet'), 'a granted pass closes the sheet');
  //     The spare minute follows the five, then the day is spent.
  ptap(pdoc.getElementById('im-pass'));
  await settle(200);
  assert(pdoc.querySelector('#im-pass-card .im-go').textContent.trim()
    === 'Unlock for 5 mins',
    'the second pass of the day is another five (two fives, Aug 21)');
  assert(/Unlocks left: 1 \(5 mins\)/.test(
    pdoc.getElementById('im-pass-card').textContent),
    'the fine print counts the remaining pass');
  ptap(pdoc.querySelector("#im-pass-card .im-pr[data-r='story']"));
  ptap(pdoc.querySelector('#im-pass-card .im-go'));
  await settle(200);
  assert(passLog.filter(c => c === 'track:pass_used:5').length === 2,
    'both passes must be tracked as five minutes');
  ptap(pdoc.getElementById('im-pass'));
  await settle(200);
  assert(/No pass left today/.test(
    pdoc.getElementById('im-pass-card').textContent),
    'after the spare minute the day is spent');

  //     The sequence speaks the phone's language (Aug 31): same keys in
  //     every table, every T() key present, no em dashes, and a French
  //     phone walks French from the connected beat to the paywall CTA with
  //     the real price. Every event it sends carries the language tag.
  const I18N = eval('(' + CAGE.match(/var I18N = (\{[\s\S]*?\n  \});/)[1] + ')');
  const LANGS = ['fr', 'zh', 'ko'];
  const keysOf = l => Object.keys(I18N[l]).sort().join('\n');
  assert(LANGS.every(l => keysOf(l) === keysOf('fr')),
    'every language must carry exactly the same keys');
  let tkeys = 0;
  for (const m of CAGE.matchAll(/\bT\(((?:"[^"]*"\s*\+\s*)*"[^"]*")/g)) {
    const key = m[1].match(/"([^"]*)"/g).map(q => q.slice(1, -1)).join('');
    assert(I18N.fr[key] !== undefined, `T() key without a translation: ${key}`);
    tkeys++;
  }
  assert(tkeys > 80, 'the whole sequence must go through T(), saw ' + tkeys);
  for (const l of LANGS) for (const [k, v] of Object.entries(I18N[l]))
    assert(!/—/.test(v) && v.length, `bad ${l} entry for: ${k}`);
  const wallFr = boot('/direct/inbox/', '', { hash: '#konvo=15,attention', lang: 'fr-FR',
    bridge: (m, d) => {
      if (m.cmd === 'track') d.langs = (d.langs || []).concat(m.props.lang);
      if (m.cmd === 'products') d.window.__konvoStoreReply(m.id, { ok: true,
        yearly: { price: '$19.99', perWeek: '$0.38', perMonth: '$1.67', savePct: 76, trialDays: 7 },
        monthly: { price: '$6.99' }, lifetime: { price: '$19.99' } });
    } });
  const frdoc = wallFr.window.document;
  const frText = () => (frdoc.getElementById('im-pay') || {}).textContent || '';
  for (let i = 0; i < 40 && !/Instagram connecté\./.test(frText()); i++)
    await settle(100);
  assert(/Instagram connecté\./.test(frText()) && /Tes DM et tes stories sont prêts\./.test(frText()),
    'the connected beat must open in French');
  await settle(2600);
  assert(/Préparation de ton Konvo/.test(frText()) && /Stories de tes amis conservées/.test(frText()),
    'the loader must be French');
  await settle(5200);
  assert(/Tes DM sont toujours là\./.test(frText()) && /Garder Instagram comme ça/.test(frText()),
    'the reveal sheet must be French');
  const frtap = act => frdoc.querySelector(`[data-act='${act}']`)
    .dispatchEvent(new wallFr.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  frtap('keep');
  await settle(450);
  assert(/Même compte\. Autre appli\./.test(frText()) && /Pas de fil\. Jamais\./.test(frText()),
    'the comparison page must be French');
  frtap('try');
  await settle(450);
  assert(/On veut que tu essaies Konvo gratuitement\./.test(frText()) && /Continuer/.test(frText()) && !/Passer/.test(frText()),
    'the try page is French');
  frtap('try-go');
  await settle(450);
  assert(/On offre 7 jours gratuits pour que tout le monde puisse essayer Konvo\./.test(frText()) &&
    /Pour que tu retrouves ton attention\./.test(frText()), 'the offer page is French, its personal line too');
  frtap('offer-go');
  await settle(450);
  assert(/Tu recevras un rappel 2 jours avant la fin de ton essai\./.test(frText()) && /Continuer/.test(frText()) && !/Passer/.test(frText()),
    'the reminder page is French');
  frtap('pay');
  await settle(450);
  const ft = frText();
  assert(/Commence ton essai GRATUIT de 7 jours pour continuer\./.test(ft),
    'the paywall headline must be French');
  assert(/7 jours gratuits, puis \$19\.99 par an \(\$1\.67\/mois\)/.test(ft),
    'the bottom line must carry the real price in French');
  assert(/Commencer mes 7 jours gratuits/.test(ft), 'the CTA must be French');
  assert(/7 JOURS GRATUITS/.test(ft) && /\$1\.67\/mois/.test(ft) && /\$6\.99\/mois/.test(ft) && /Annuel/.test(ft) && /Mensuel/.test(ft),
    'the cards must carry French units and names around the live numbers');
  assert(/Dans 5 jours : rappel/.test(ft) && /Dans 7 jours : début de la facturation/.test(ft) && /sauf si tu annules avant/.test(ft),
    'the timeline must be French');
  assert(/Restaurer/.test(ft) && !/\bRestore\b|\bToday\b|\bYearly\b|\bMonthly\b|Billing|cancel anytime/.test(ft),
    'no English may survive on the French paywall');
  assert(!/\.\./.test(ft) && !/sept\./.test(ft),
    'French dates use the long month: "7 sept." plus our period read "7 sept.." on device');
  assert(wallFr.langs && wallFr.langs.length && wallFr.langs.every(l => l === 'fr-FR'),
    'every event carries the phone language tag');

  //     The store answers with the two products on sale and no lifetime
  //     (konvo.pro.lifetime is MISSING_METADATA in App Store Connect, so
  //     no real user ever receives it). That reply must paint the real
  //     prices, not the pending page: requiring lifetime held 46 of 46
  //     store users of 1.3.0 on "Loading your plans" (Sep 1).
  const twoLog = [];
  const twoOnly = boot('/direct/inbox/', '', { hash: '#konvo=9', bridge: (m, d) => {
    twoLog.push(m.cmd);
    if (m.cmd === 'products') d.window.__konvoStoreReply(m.id, { ok: true,
      yearly: { price: '$24.99', perWeek: '$0.48', perMonth: '$2.08', savePct: 79, trialDays: 7 },
      monthly: { price: '$9.99' } });
  } });
  const twoDoc = twoOnly.window.document;
  const twoText = () => (twoDoc.getElementById('im-pay') || {}).textContent || '';
  for (let i = 0; i < 40 && !/Instagram connected\./.test(twoText()); i++) await settle(100);
  await settle(7800);
  const twoTap = act => twoDoc.querySelector(`[data-act='${act}']`)
    .dispatchEvent(new twoOnly.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  twoTap('keep'); await settle(450);
  twoTap('try'); await settle(450); twoTap('try-go'); await settle(450); twoTap('offer-go'); await settle(450);
  twoTap('pay'); await settle(450);
  assert(!/Loading your plans/.test(twoText()),
    'two real prices must never leave the wall on the pending page');
  assert(/7 days free, then \$24\.99 per year/.test(twoText()) && /\$9\.99\/mo/.test(twoText()),
    'the wall paints the live yearly and monthly prices without a lifetime product');
  assert(twoLog.filter(c => c === 'products').length === 1,
    'and does not keep re-fetching what it already has');

  //     The block nudge (Sep 1): once, on a later day, on the first return
  //     from a chat; never the first day, never with a shield up.
  const nudgeLog = [];
  const nudgeReplies = { entitlements: { entitled: true },
    cageStatus: { supported: true, authorized: false, picked: false, active: false },
    cageAuthorize: { authorized: true }, cagePick: { count: 1 },
    cageOn: { active: true }, notify: { granted: true } };
  const nudgeBoot = (opts, log) => boot('/direct/inbox/', '', Object.assign({ bridge: (m, d) => {
    if (log) log.push(m.cmd === 'track' ? 'track:' + m.event +
      (m.props && m.props.choice ? ':' + m.props.choice : '') : m.cmd);
    if (m.cmd in nudgeReplies) d.window.__konvoStoreReply(m.id, nudgeReplies[m.cmd]);
  } }, opts));
  const nudged = nudgeBoot({ seed: { konvoUseDays: '1', konvoLastDay: 'not-today' } }, nudgeLog);
  await settle(2600);
  const ndoc = nudged.window.document;
  assert(!ndoc.getElementById('im-pass-sheet'), 'the inbox loading is not the moment');
  nudged.window.__loc.pathname = '/direct/t/41/';
  await settle(900);
  nudged.window.__loc.pathname = '/direct/inbox/';
  await settle(2600);
  assert(ndoc.getElementById('im-pass-sheet') &&
    /Ready to lock the Instagram app\?/.test(ndoc.getElementById('im-pass-card').textContent),
    'day two, back from a chat: the nudge');
  assert(nudgeLog.includes('track:block_nudge_shown'), 'the nudge reports itself');
  ndoc.querySelector('#im-pass-card .im-x').dispatchEvent(
    new nudged.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(100);
  assert(!ndoc.getElementById('im-pass-sheet') && !ndoc.getElementById('im-pay') &&
    nudged.window.localStorage.konvoBlockNudged === '1' && nudgeLog.includes('track:block_nudge:later'),
    'Not now closes it for good and opens nothing');
  const dayOneN = nudgeBoot({});
  await settle(2600);
  dayOneN.window.__loc.pathname = '/direct/t/42/';
  await settle(900);
  dayOneN.window.__loc.pathname = '/direct/inbox/';
  await settle(2600);
  assert(!dayOneN.window.document.getElementById('im-pass-sheet'), 'no nudge on the first day');
  const blockLog = [];
  const blockN = nudgeBoot({ seed: { konvoUseDays: '1', konvoLastDay: 'not-today' } }, blockLog);
  await settle(2600);
  blockN.window.__loc.pathname = '/direct/t/43/';
  await settle(900);
  blockN.window.__loc.pathname = '/direct/inbox/';
  await settle(2600);
  blockN.window.document.querySelector('#im-pass-card .im-block').dispatchEvent(
    new blockN.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(300);
  assert(/Connect Konvo to Screen Time/.test(
    (blockN.window.document.getElementById('im-pay') || {}).textContent || ''),
    'Block Instagram from the nudge opens the Screen Time step');
  assert(blockLog.includes('track:block_nudge:block'), 'and the choice is reported');

  //     Every animation the wall declares must have its keyframes: the
  //     loader ring shipped without im-spin for ten days and never turned.
  for (const name of (CAGE.match(/animation:([a-z-]+)/g) || [])
    .map(a => a.slice(10)).filter(n => n !== 'none')) {
    assert(CAGE.includes('@keyframes ' + name),
      `animation "${name}" must have matching @keyframes`);
  }

  console.log('ALL CAGE TESTS PASS');
  process.exit(0);
})();
