// PROTOTYPE helper, throwaway: boots the real cage.js in jsdom exactly as the
// test suite does, walks perks -> try -> reminder -> price, and dumps each
// wall page's markup plus the cage's injected styles to out-chain.json.
const fs = require('fs'); const path = require('path');
const { JSDOM } = require('jsdom');
const T = fs.readFileSync(path.join(__dirname, '../test/test_cage.js'), 'utf8');
const CAGE = fs.readFileSync(path.join(__dirname, '../src-tauri/src/cage.js'), 'utf8');
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';
const open = [];
const slice = (from, to) => T.slice(T.indexOf(from), T.indexOf(to, T.indexOf(from)));
const bootSrc = slice('function boot(', '\nconst settle');
const answerSrc = slice('const answer = ', '\n  const LIVE_PRODUCTS');
const liveSrc = slice('const LIVE_PRODUCTS = ', '\n  const ');
const boot = new Function('fs', 'JSDOM', 'CAGE', 'IPHONE', 'DESKTOP', 'open', bootSrc + '\nreturn boot;')(fs, JSDOM, CAGE, IPHONE, DESKTOP, open);
const answer = new Function('posted', answerSrc + '\nreturn answer;')([]);
const LIVE_PRODUCTS = { ok: true, yearly: { price: '$19.99', perWeek: '$0.38', perMonth: '$1.67', savePct: 76, trialDays: 7 }, monthly: { price: '$6.99' }, lifetime: { price: '$79.99' } }; // the US storefront as App Store Connect has it
const settle = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const dom = boot('/direct/inbox/', '', { hash: '#konvo=15', bridge: answer({ entitlements: { entitled: false }, products: LIVE_PRODUCTS }) });
  await settle(8400);
  const doc = dom.window.document;
  const tap = act => { const el = doc.querySelector(`[data-act='${act}']`); if (!el) { console.log('missing', act, 'acts:', [...doc.querySelectorAll('[data-act]')].map(e => e.getAttribute('data-act')).join(','), '| text:', (doc.getElementById('im-pay')||{textContent:''}).textContent.slice(0,80)); process.exit(1); } el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })); };
  const grab = name => ({ name, htmlClass: doc.documentElement.className, wall: doc.getElementById('im-pay').outerHTML });
  const out = { styles: [...doc.querySelectorAll('style')].map(s => s.textContent).join('\n'), pages: [] };
  tap('keep'); await settle(450);
  tap('try'); await settle(450); out.pages.push(grab('1 Try for free'));
  tap('try-go'); await settle(450); out.pages.push(grab('2 Offer'));
  tap('offer-go'); await settle(450); out.pages.push(grab('3 Reminder'));
  tap('pay'); await settle(450); out.pages.push(grab('4 Trial timeline, yearly'));
  tap('pk-m'); await settle(300); out.pages.push(grab('4b Trial timeline, monthly'));
  fs.writeFileSync(path.join(__dirname, 'out-chain.json'), JSON.stringify(out));
  console.log('pages:', out.pages.map(p => p.name + ' (' + p.wall.length + ' chars, html.' + p.htmlClass + ')').join(' | '));
  process.exit(0);
})();
