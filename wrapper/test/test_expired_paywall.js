// Receipt-controlled returning paywall; synthetic inbox only, no network or purchases.
const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const harness=fs.readFileSync(__dirname+'/test_cage.js','utf8');
const cage=fs.readFileSync(__dirname+'/../src-tauri/src/cage.js','utf8');
const preview=fs.readFileSync(__dirname+'/../src-tauri/src/onboarding-experiment.js','utf8');
const open=[],ua='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const boot=new Function('JSDOM','CAGE','IPHONE','DESKTOP','open',harness.slice(harness.indexOf('function boot('),harness.indexOf('const settle ='))+';return boot;')(JSDOM,cage,ua,'',open);
const products={ok:true,offeringId:'default',yearly:{productId:'konvo.pro.yearly',price:'CA$34.99',amount:34.99,currency:'CAD',perMonth:'CA$2.92'},monthly:{productId:'konvo.pro.monthly',price:'CA$6.99',amount:6.99,currency:'CAD'},lifetime:{price:'CA$99.99'}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const until=async fn=>{for(let i=0;i<80;i++){if(fn())return;await wait(50)}throw Error('Timed out')};
function setup(access,opts={}){
 const events=[],requests=[];
 const dom=boot('/direct/inbox/',opts.empty?'':'<main><h1>Messages</h1><a href="/direct/t/fixture" onclick="window.leaked=true"><b>Private fixture name</b><div>Private fixture message</div></a><input value="private-password"><form>private-form</form></main>',{paid:opts.paid,seed:opts.seed,bridge:(m,d)=>{
  if(m.cmd==='track')events.push(m);
  if(m.cmd==='purchase'||m.cmd==='restore')requests.push(m);
  if(m.cmd==='products')d.window.__konvoStoreReply(m.id,products);
  if(m.cmd==='notify')d.window.__konvoStoreReply(m.id,{ok:true,granted:false});
  if(m.cmd==='cageStatus')d.window.__konvoStoreReply(m.id,{supported:false,active:false});
  if(m.cmd==='entitlements'){
   if(opts.delay)setTimeout(()=>d.window.__konvoStoreReply(m.id,access),opts.delay);
   else d.window.__konvoStoreReply(m.id,access);
  }
 }});
 dom.window.eval(preview);
 return {dom,events,requests,doc:dom.window.document,tap(act){const el=this.doc.querySelector('[data-act="'+act+'"]');assert(el,act);el.click()}};
}
(async()=>{
 const active=setup({entitled:true,accessState:'active'},{seed:{konvoDone:'1'}});
 const offline=setup({accessState:'unknown'},{paid:true,seed:{konvoDone:'1'}});
 const expired=setup({entitled:false,accessState:'expired_trial'},{seed:{konvoWelcomed:'1'}});
 const plan=setup({entitled:false,accessState:'expired_subscription'});
 const generic=setup({entitled:false,accessState:'none'},{seed:{konvoDone:'1'}});
 const fresh=setup({entitled:false,accessState:'none'});
 await until(()=>expired.doc.querySelector('.imp-return'));
 assert(!active.doc.querySelector('#im-pay'),'Cancellation with active access never shows a paywall');
 assert(!offline.doc.querySelector('#im-pay'),'Unknown receipt preserves cached subscriber access');
 assert.equal(offline.dom.window.localStorage.konvoPaid,'1');
 assert.match(expired.doc.querySelector('.imp-return').textContent,/Your trial has ended\./);
 assert.match(expired.doc.querySelector('h2').textContent,/Don't lose your inbox/);
 assert(!expired.doc.querySelector('.imp-node'),'Expired trial replaces the timeline');
 assert.match(plan.doc.querySelector('.imp-return').textContent,/Your plan ended\./);
 assert(!generic.doc.querySelector('.imp-return'),'Completion flag alone cannot claim expired access');
 assert(!generic.doc.querySelector('#im-pay').textContent.includes('Your plan ended.'),'Unknown history must not claim a past subscription');
 assert(!fresh.doc.querySelector('.imp-return'),'New users retain the original onboarding');
 await until(()=>expired.doc.querySelector('.imp-return-screen').shadowRoot);
 const snap=expired.doc.querySelector('.imp-return-screen').shadowRoot;
 assert.match(snap.textContent,/Private fixture message/,'Preview contains the actual synthetic inbox');
 assert(!snap.querySelector('a,input,form,script,iframe,[onclick],[id]'),'Preview strips forms, identifiers and interactive markup');
 assert(!snap.textContent.includes('private-password')&&!snap.textContent.includes('private-form'));
 assert(!JSON.stringify(expired.events).includes('Private fixture'),'Inbox content never enters tracking');
 const original=expired.doc.querySelector('main');
 assert(!original.style.transform,'Preview does not move the real inbox');
 assert.equal(expired.events.filter(m=>m.event==='paywall_presented').length,1);
 expired.tap('pk-m');
 assert.equal(expired.doc.querySelector('[data-act="pk-m"]').getAttribute('aria-pressed'),'true');
 assert.match(expired.doc.querySelector('.imp-foot').textContent,/CA\$6.99 billed monthly/);
 expired.tap('buy-m');expired.tap('buy-m');
 assert.equal(expired.requests.length,1,'Purchase tap guard remains active');
 const started=expired.events.find(m=>m.event==='purchase_started').props;
 assert.equal(started.paywall_id,'expired_inbox_v1');assert.equal(started.placement,'lapsed');assert.equal(started.trial_days,0);
 expired.dom.window.__konvoStoreReply(expired.requests[0].id,{cancelled:true});
 expired.tap('pk-y');
 assert.match(expired.doc.querySelector('.imp-foot').textContent,/CA\$34.99 billed annually/);
 assert.equal(expired.events.filter(m=>m.event==='paywall_presented').length,1,'Plan switches do not duplicate impressions');
 expired.tap('restore');
 expired.dom.window.__konvoStoreReply(expired.requests[1].id,{ok:true,entitled:true});
 await wait(950);assert(!expired.doc.querySelector('.imp-return'),'Restore leaves the returning paywall');
 const empty=setup({entitled:false,accessState:'expired_trial'},{empty:true});
 await until(()=>empty.doc.querySelector('[data-act="buy-y"]'));
 assert.match(empty.doc.querySelector('.imp-return-screen').textContent,/Your messages stay on Instagram/);
 assert(!empty.doc.querySelector('[data-act="buy-y"]').disabled,'Loading Instagram never blocks checkout');
 // A receipt arriving after the fallback timeout must replace the connected screen
 // and must not be overwritten by the original onboarding's delayed reveal.
 const delayed=setup({entitled:false,accessState:'expired_trial'},{delay:2800});
 await until(()=>delayed.doc.querySelector('.imp-return'));
 await wait(6500);assert(delayed.doc.querySelector('.imp-return'),'Delayed pitch timers cannot replace an expired paywall');
 console.log('EXPIRED PAYWALL PASSED: receipt gating, active/unknown access, localized plans, sanitized preview, fallback, checkout, restore, delayed receipt');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>open.forEach(d=>d.window.close()));
