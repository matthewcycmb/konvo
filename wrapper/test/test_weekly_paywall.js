const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<body><main><h2>Inbox fixture</h2></main><div id="host"></div></body>',{url:'https://www.instagram.com/direct/inbox/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
for(const file of ['onboarding-views.js','onboarding-experiment.js'])w.eval(fs.readFileSync(__dirname+'/../src-tauri/src/'+file,'utf8'));
const annual={productId:'konvo.pro.yearly.notrial',price:'CA$34.99',perWeek:'CA$0.67',amount:34.99,currency:'CAD',noIntroOffer:true};
const weekly={productId:'konvo.pro.weeklyy',price:'CA$9.99',amount:9.99,currency:'CAD',noIntroOffer:true};
let products={ok:true,offeringId:'konvo_ab_annual_no_trial_v1',yearly:annual,weekly},view,root,done;
const buys=[],events=[];
function mount(){view?.destroy();const host=w.document.createElement('div');w.document.body.append(host);view=w.KonvoOnboardingExperiment.mount(host,{initial:'paywall',answers:{},handle:()=>'',track:(e,p)=>events.push([e,p]),products:()=>products,refresh:f=>f(),impression:()=>{},buy:(id,cb)=>{buys.push(id);done=cb;},restore:cb=>cb({entitled:false}),open:()=>{},back:()=>{}});root=host.shadowRoot;}
const q=s=>root.querySelector(s);
(async()=>{
 mount();assert.equal(q('[data-plan=annual]').getAttribute('aria-checked'),'true');
 assert.equal(q('.kx-save').textContent,'SAVE 93%');assert(q('.renewal').textContent.includes('CA$34.99 charged today'));
 q('[data-plan=weekly]').click();assert(q('.renewal').textContent.includes('CA$9.99 charged today. Renews weekly'));
 assert.equal(events.filter(([e])=>e==='paywall_viewed').length,1,'selection must not double-count impressions');
 q('[data-preview=purchase]').click();q('[data-preview=purchase]').click();q('[data-plan=annual]').click();
 assert.deepEqual(buys,['konvo.pro.weeklyy']);assert.equal(q('[data-plan=weekly]').getAttribute('aria-checked'),'true','selection locked during StoreKit');
 done({cancelled:true});assert(!q('[data-preview=purchase]').disabled);assert.equal(view.stage(),'paywall');
 q('[data-preview=purchase]').click();done({pending:true});assert(q('.kx-error').textContent.includes('pending approval'));
 q('[data-preview=purchase]').click();done({ok:false});assert(q('.kx-error').textContent.includes('couldn’t be completed'));
 products={...products,weekly:undefined,weeklyUnavailableReason:'weekly_product_unavailable'};
 await new Promise(r=>setTimeout(r,600));assert(q('[data-preview=purchase]').disabled,'lost weekly catalog must not purchase annual instead');
 q('[data-plan=annual]').click();q('[data-preview=purchase]').click();assert.equal(buys.at(-1),annual.productId);done({cancelled:true});
 products={...products,weekly:{...weekly,currency:'USD'}};mount();assert(q('.kx-save').hidden,'never compare different currencies');
 products.weekly={...weekly,noIntroOffer:false};mount();assert(q('[data-plan=weekly]').disabled,'trial-bearing weekly must not be offered');assert(q('.kx-save').hidden);
 products.weekly=weekly;mount();q('[data-plan=annual]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(q('[data-plan=weekly]').getAttribute('aria-checked'),'true');
 console.log('WEEKLY PAYWALL PASSED: localized savings, exact weekly SKU, locked checkout, cancellation/pending/error, catalog loss, trial guard, keyboard selection.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{view?.destroy();w.close();});
