// Exercise the original shipped paywall through real taps and the native bridge.
const fs = require('fs'), assert = require('assert'), {JSDOM} = require('jsdom');
const harness = fs.readFileSync(__dirname + '/test_cage.js', 'utf8');
const source = fs.readFileSync(__dirname + '/../src-tauri/src/cage.js', 'utf8');
const open = [], ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const boot = new Function('JSDOM','CAGE','IPHONE','DESKTOP','open',
  harness.slice(harness.indexOf('function boot('), harness.indexOf('const settle =')) + ';return boot;')(JSDOM,source,ua,'',open);
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const messages = [], purchases = [];
  const products = {ok:true, offeringId:'default',
    yearly:{productId:'konvo.pro.yearly',price:'CA$34.99',amount:34.99,currency:'CAD',perMonth:'CA$2.92',trialDays:7},
    monthly:{productId:'konvo.pro.monthly',price:'CA$6.99',amount:6.99,currency:'CAD'}, lifetime:{price:'CA$99.99'}};
  const dom = boot('/direct/inbox/', '', {seed:{konvoDone:'1'}, bridge:(m,d) => {
    messages.push(m);
    if (m.cmd === 'purchase') purchases.push(m);
    const reply = {products,entitlements:{entitled:false}}[m.cmd];
    if (reply) d.window.__konvoStoreReply(m.id, reply);
  }});
  for (let i=0;i<50 && !dom.window.document.querySelector('[data-act="buy-y"]');i++) await wait(200);
  const d=dom.window.document;
  const tap = act => {const el=d.querySelector(`[data-act="${act}"]`); assert(el, act); el.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));};
  const summary=()=>d.querySelector('.imp-checkout-summary').textContent;
  assert(summary().includes('CA$34.99/year starting'), 'trial checkout shows the full annual bill and charge date before purchase');
  assert(!summary().includes('charged today'), 'eligible trials must not imply an immediate charge');
  assert(d.querySelector('[data-act="pk-y"]').textContent.includes('CA$34.99 billed annually'));
  assert(d.querySelector('.imp-cancel-help').textContent.includes('24 hours'));
  assert(d.querySelector('.imp-cancel-help').textContent.includes('Settings → your name → Subscriptions'));
  tap('buy-y'); tap('buy-y'); tap('pk-m');
  assert.equal(purchases.length,1,'rapid taps/plan switching must not start duplicate Apple purchases');
  const starts=()=>messages.filter(m=>m.event==='purchase_started');
  assert.equal(starts().length,1);
  const start=starts()[0].props, request=purchases[0];
  assert.equal(start.checkout_attempt_id,request.checkout.checkout_attempt_id);
  assert.equal(start.price_amount,34.99); assert.equal(start.currency,'CAD');
  assert.equal(start.displayed_price,'CA$34.99'); assert.equal(start.trial_days,7); assert.equal(start.trial_eligible,true);
  assert.equal(start.offering_id,'default'); assert.equal(start.placement,'lapsed');
  assert.equal(start.checkout_copy_version,'clarity_v1');
  assert(messages.indexOf(starts()[0]) < messages.indexOf(request),'start event precedes bridge purchase');
  dom.window.__konvoStoreReply(request.id,{ok:false,cancelled:true});
  const result=messages.find(m=>m.event==='purchase_result').props;
  assert.equal(result.checkout_attempt_id,start.checkout_attempt_id); assert.equal(result.result,'cancelled');
  assert.equal(result.product_id,'konvo.pro.yearly');
  // A second callback cannot emit another result.
  dom.window.__konvoStoreReply(request.id,{ok:false,cancelled:true});
  assert.equal(messages.filter(m=>m.event==='purchase_result').length,1);
  tap('pk-m');
  assert(summary().includes('CA$6.99 charged today.'), 'switching to a non-trial plan updates the immediate charge');
  assert(summary().includes('CA$6.99/month') && !summary().includes('CA$34.99'));
  assert(!d.querySelector('.imp-cancel-help').textContent.includes('trial ends'));
  tap('buy-m');
  assert.equal(purchases.length,2); assert.notEqual(starts()[1].props.checkout_attempt_id,start.checkout_attempt_id);
  assert.equal(starts()[1].props.trial_eligible,false); assert.equal(starts()[1].props.trial_days,0);
  assert.equal(starts()[1].props.price_amount,6.99); assert.equal(starts()[1].props.plan,'monthly');
  dom.window.__konvoStoreReply(purchases[1].id,{ok:false,pending:true});
  assert.equal(messages.filter(m=>m.event==='purchase_result')[1].props.result,'pending');
  assert(d.querySelector('.imp-checkout-status')?.textContent.includes('approval'), 'pending Apple approval must be explained');
  tap('buy-m'); dom.window.__konvoStoreReply(purchases[2].id,{ok:false,error:'private error text'});
  assert.equal(messages.filter(m=>m.event==='purchase_result')[2].props.result,'error');
  assert(d.querySelector('.imp-checkout-status')?.textContent.includes('try again'), 'a failed checkout must give a visible next step');
  assert(!d.querySelector('.imp-checkout-status').textContent.includes('private error text'));
  tap('buy-m'); dom.window.__konvoStoreReply(purchases[3].id,{ok:true,entitled:true});
  assert.equal(messages.filter(m=>m.event==='purchase_result')[3].props.result,'purchased');
  assert(!JSON.stringify(messages.filter(m=>m.cmd==='track')).includes('private error text'));
  console.log('CHECKOUT PASSED: starts, localized catalog, trial eligibility, attempt correlation, duplicate taps/callbacks, retries, pending, error, success');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>open.forEach(d=>d.window.close()));
