// Execute the shipped cage with a held window.load and a deterministic clock.
// Layout/hit testing is supplied by the fixture; this is not a live Instagram test.
const fs = require('fs'), assert = require('assert'), {JSDOM} = require('jsdom');
const source = fs.readFileSync(__dirname + '/../src-tauri/src/cage.js', 'utf8');
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
function boot({form = true, hidden = false, covered = false, returning = false, handoff = false, signedIn = false,
  route = '/accounts/login/', markup} = {}) {
  const dom = new JSDOM('<body>' + (markup !== undefined ? markup : form ? '<main><input name="username"><input type="password"><button>Log in</button></main>' : '') + '</body>', {
    url: 'https://www.instagram.com/accounts/login/', runScripts: 'outside-only', pretendToBeVisual: true
  });
  const w = dom.window, d = w.document, events = [], navigation = [], jobs = new Map(), observers = [];
  const Observer = w.MutationObserver;
  w.MutationObserver = class extends Observer {constructor(fn) {super(fn); observers.push(this);}};
  let now = 100000, sequence = 0, visibility = 'visible';
  Object.defineProperty(w.navigator, 'userAgent', {value: IPHONE});
  Object.defineProperty(d, 'readyState', {get: () => 'loading'});
  Object.defineProperty(d, 'visibilityState', {get: () => visibility});
  w.Date.now = () => now;
  w.setTimeout = (fn, ms = 0) => {const id = ++sequence; jobs.set(id, {fn, at: now + ms}); return id;};
  w.setInterval = (fn, ms) => {const id = ++sequence; jobs.set(id, {fn, at: now + ms, every: ms}); return id;};
  w.clearTimeout = w.clearInterval = id => jobs.delete(id);
  const listen = w.addEventListener.bind(w);
  w.addEventListener = (type, fn, options) => {if (type !== 'load') listen(type, fn, options);};
  w.fetch = () => new Promise(() => {});
  const loc = {hostname: 'www.instagram.com', pathname: signedIn ? '/direct/inbox/' : route,
    search: '', hash: handoff ? '#konvo=15,distracted' : '', href: 'https://www.instagram.com/accounts/login/',
    assign: value => navigation.push(value), replace: value => navigation.push(value), reload: () => navigation.push('reload')};
  w.__loc = loc;
  if (returning) w.localStorage.konvoLoginTracked = '1';
  if (signedIn) {d.cookie = 'ds_user_id=1234567; path=/'; w.localStorage.konvoPaid = '1';}
  if (hidden && d.querySelector('main')) d.querySelector('main').style.display = 'none';
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    const off = !!this.closest('[hidden]') || (this.closest('main') && this.closest('main').style.display === 'none');
    return {x: 20, y: 140, left: 20, top: 140, right: off ? 20 : 260, bottom: off ? 140 : 180, width: off ? 0 : 240, height: off ? 0 : 40};
  };
  d.elementFromPoint = () => {
    const overlay = d.getElementById('im-boot');
    return overlay && overlay.style.pointerEvents !== 'none' ? overlay : covered ? d.body : d.querySelector('input');
  };
  w.webkit = {messageHandlers: {konvoStore: {postMessage: m => {
    if (m.cmd === 'track') events.push({event: m.event, props: {...m.props}});
    if (m.cmd === 'onboardingContext') w.__konvoStoreReply(m.id, {enrolled: false});
    if (m.cmd === 'entitlements') w.__konvoStoreReply(m.id, {entitled: signedIn});
  }}}};
  w.eval(`(function(location){${source}})(window.__loc)`);
  async function advance(ms) {
    const end = now + ms;
    await Promise.resolve();
    while (true) {
      const next = [...jobs].filter(([,j]) => j.at <= end).sort((a,b) => a[1].at-b[1].at)[0];
      if (!next) break;
      const [id,j] = next; now = j.at;
      if (j.every) j.at += j.every; else jobs.delete(id);
      j.fn(); await Promise.resolve();
    }
    now = end; await Promise.resolve();
  }
  return {w,d,events,navigation,loc,advance,close: () => {observers.forEach(o => o.disconnect()); w.close();},
    cover(value) {covered = value;},
    visibility(value) {visibility=value; d.dispatchEvent(new w.Event('visibilitychange'));}};
}
(async () => {
  const cases = [];
  try {
    const usable = boot(); cases.push(usable);
    await usable.advance(1200);
    assert(!usable.d.getElementById('im-boot'), 'a visible login form must clear the overlay without waiting for window.load');
    assert.equal(usable.events.filter(e => e.event === 'login_form_ready').length, 1);
    const password = usable.d.querySelector('input[type=password]'); password.value = 'fixture-secret';
    usable.visibility('hidden'); await usable.advance(30000); usable.visibility('visible'); await usable.advance(30000);
    assert.equal(password.value, 'fixture-secret', 'retrieving a password must preserve the form');
    assert.deepEqual(usable.navigation, [], 'waiting/backgrounding must not navigate or reload');
    assert.equal(usable.events.filter(e => e.event === 'login_form_ready').length, 1, 'readiness is deduplicated');
    assert(!usable.events.some(e => e.event === 'login_loading_slow'), 'time spent retrieving a password is not loading failure');
    assert(usable.events.some(e => e.event === 'login_resumed' && e.props.form_ready));
    assert(!JSON.stringify(usable.events).includes('fixture-secret'), 'diagnostics must never contain input values');

    const delayed = boot({hidden: true}); cases.push(delayed); await delayed.advance(1500);
    assert(delayed.d.getElementById('im-boot'), 'hidden fields do not count as usable');
    assert(!delayed.events.some(e => e.event === 'login_form_ready'));
    delayed.d.querySelector('main').style.display = ''; await delayed.advance(1500);
    assert(!delayed.d.getElementById('im-boot'));
    assert.equal(delayed.events.filter(e => e.event === 'login_form_ready').length, 1);

    const consent = boot({covered: true}); cases.push(consent); await consent.advance(1500);
    assert(!consent.d.getElementById('im-boot'), 'Konvo overlay clears even if Instagram has a consent prompt');
    assert(!consent.events.some(e => e.event === 'login_form_ready'), 'a field behind another dialog is not usable');
    consent.cover(false); await consent.advance(1500);
    assert.equal(consent.events.filter(e => e.event === 'login_form_ready').length, 1);

    const waiting = boot({form: false}); cases.push(waiting); await waiting.advance(1000);
    waiting.visibility('hidden'); await waiting.advance(30000); waiting.visibility('visible'); await waiting.advance(1000);
    assert(!waiting.events.some(e => e.event === 'login_loading_slow'), 'background time must not count as a foreground loading stall');
    await waiting.advance(10000);
    assert.equal(waiting.events.filter(e => e.event === 'login_loading_slow').length, 1);
    assert.deepEqual(waiting.navigation, [], 'slow-page telemetry is passive');

    usable.loc.pathname = '/accounts/password/reset/'; usable.d.querySelector('main').remove();
    await usable.advance(1500);
    assert(!usable.events.some(e => e.event === 'login_loading_slow' && e.props.stage === 'reset'),
      'prior time filling a password must not classify a new reset page as slow');

    const reset = boot({route: '/accounts/password/reset/',
      // Observed on Instagram's live reset page: text input, no name/autocomplete.
      markup: '<main><input type="text"><button>Send login link</button></main>'}); cases.push(reset);
    await reset.advance(1500);
    assert(reset.events.some(e => e.event === 'login_form_ready' && e.props.stage === 'reset'),
      'the recovery identifier field must be recognized even when its name differs from the login field');
    const identifier = reset.d.querySelector('input'); identifier.value = 'private-reset-identifier';
    reset.visibility('hidden'); await reset.advance(120000); reset.visibility('visible'); await reset.advance(10000);
    assert.equal(identifier.value, 'private-reset-identifier', 'returning from Notes or email preserves the reset form');
    assert(!reset.d.getElementById('im-reset-bar'), 'switching apps to look up an identifier must not cover the still-active recovery form');
    assert.deepEqual(reset.navigation, [], 'reset recovery must never force navigation');
    assert(!reset.events.some(e => e.event === 'login_loading_slow'), 'a usable reset form is not a slow page');
    assert(!JSON.stringify(reset.events).includes('private-reset-identifier'));
    reset.loc.pathname = '/accounts/login/'; await reset.advance(1500);
    assert(!reset.d.getElementById('im-reset-bar'), 'the reset return prompt must not cover a later login or verification page');

    const confirmation = boot({route: '/accounts/password/reset/', markup: '<main><p>Check your email</p></main>'}); cases.push(confirmation);
    await confirmation.advance(12000);
    assert(!confirmation.events.some(e => e.event === 'login_loading_slow'),
      'a reset page without a field may be confirmation, and must not be labelled a loading stall');
    assert(confirmation.events.some(e => e.event === 'login_reset_state' && e.props.state === 'no_input'),
      'record ambiguous reset pages separately without claiming success');
    assert(!confirmation.events.some(e => e.event === 'login_form_ready'));
    assert.deepEqual(confirmation.navigation, []);
    confirmation.visibility('hidden'); await confirmation.advance(30000); confirmation.visibility('visible');
    assert(confirmation.d.getElementById('im-reset-bar'), 'a field-free reset page still offers a manual return after email lookup');
    confirmation.loc.pathname = '/accounts/login/'; await confirmation.advance(1500);
    assert(!confirmation.d.getElementById('im-reset-bar'), 'the reset prompt is removed on SPA return to login');

    const newPassword = boot({route: '/accounts/password/reset/confirm/',
      markup: '<main><input type="password" autocomplete="new-password"><input type="password" autocomplete="new-password"></main>'}); cases.push(newPassword);
    await newPassword.advance(1500);
    assert([...newPassword.d.querySelectorAll('input')].every(e => e.autocomplete === 'new-password'),
      'new-password forms must not be relabelled as current-password autofill');

    const blockedReset = boot({route: '/accounts/password/reset/', covered: true,
      markup: '<main><input name="emailOrUsername" type="text"></main>'}); cases.push(blockedReset);
    await blockedReset.advance(12000);
    assert(!blockedReset.events.some(e => e.event === 'login_form_ready'), 'covered recovery fields are not ready');
    assert(blockedReset.events.some(e => e.event === 'login_loading_slow' && e.props.form_detected),
      'a detected but obstructed recovery form still reports the actionable slow signal');

    const interactive = boot({returning: true, handoff: true}); cases.push(interactive); await interactive.advance(1500);
    interactive.d.cookie = 'ds_user_id=1234567; path=/'; interactive.w.localStorage.konvoPaid = '1';
    interactive.loc.pathname = '/direct/inbox/'; await interactive.advance(3500);
    const signed = interactive.events.filter(e => e.event === 'login_succeeded');
    assert.equal(signed.length, 1);
    assert.equal(signed[0].props.connection_type, 'interactive_login');
    assert.equal(signed[0].props.returning_user, true);

    const restored = boot({signedIn: true, returning: true, handoff: true}); cases.push(restored); await restored.advance(3500);
    const successes = restored.events.filter(e => e.event === 'login_succeeded');
    assert.equal(successes.length, 1, 'an explicit onboarding handoff counts an existing authenticated session once');
    assert.equal(successes[0].props.connection_type, 'existing_session');
    assert.equal(successes[0].props.returning_user, true);
    await restored.advance(3000); assert.equal(restored.events.filter(e => e.event === 'login_succeeded').length, 1);
    const regular = boot({signedIn: true, returning: true}); cases.push(regular); await regular.advance(3500);
    assert(!regular.events.some(e => e.event === 'login_succeeded'), 'ordinary launches must not become new onboarding conversions');
    console.log('LOGIN READINESS PASSED: delayed load, hidden fields, password retrieval, passive stalls, returning handoff, no input capture');
  } finally {cases.forEach(c => c.close());}
})().catch(e => {console.error(e); process.exitCode = 1;});
