const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<body><main><h2>Inbox</h2></main></body>',{url:'https://www.instagram.com/direct/inbox/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;w.matchMedia=()=>({matches:true});
for(const f of ['onboarding-views.js','onboarding-experiment.js'])w.eval(fs.readFileSync(__dirname+'/../src-tauri/src/'+f,'utf8'));
const annual={productId:'konvo.pro.yearly.notrial',price:'CA$34.99',perWeek:'CA$0.67',amount:34.99,currency:'CAD',noIntroOffer:true};
const weekly={productId:'konvo.pro.weeklyy',price:'CA$9.99',annualizedPrice:'CA$519.48',amount:9.99,currency:'CAD',noIntroOffer:true};
const offer={productId:'konvo.pro.yearly.special',offeringId:'konvo_special_offer_v1',price:'CA$29.99',perWeek:'CA$0.58',amount:29.99,currency:'CAD',noIntroOffer:true};
let products,view,root,done,restoreDone;
const events=[],buys=[],appearances=[],impressions=[];
function mount(special=offer){view?.destroy();products={ok:true,offeringId:'konvo_ab_annual_no_trial_v1',yearly:annual,weekly,specialOffer:special};const host=w.document.createElement('div');w.document.body.append(host);view=w.KonvoOnboardingExperiment.mount(host,{initial:'paywall',answers:{},handle:()=>'',track:(e,p)=>events.push([e,p]),appearance:a=>appearances.push(a),products:()=>products,refresh:f=>f(),impression:i=>impressions.push(i),buy:(id,cb,meta)=>{buys.push({id,meta});done=cb;},restore:cb=>restoreDone=cb,open:()=>{},back:()=>{}});root=host.shadowRoot;}
const q=s=>root.querySelector(s);
function cancelRegular(){q('[data-preview=purchase]').click();done({cancelled:true});}
try {
 mount();q('[data-plan=weekly]').click();
 for(const result of [{pending:true},{ok:false},{cancelled:true,pending:true},{cancelled:true,entitled:true}]){q('[data-preview=purchase]').click();done(result);assert.equal(view.stage(),'paywall','pending/error/entitled must not trigger gift');}
 q('[data-preview=restore]').click();restoreDone({cancelled:true});assert.equal(view.stage(),'paywall','restore must not trigger gift');
 const offerViews=()=>events.filter(([e])=>e==='special_offer_viewed').length;
 const beforeGift=offerViews(),beforeImpressions=impressions.length,beforeBuys=buys.length;
 cancelRegular();assert.equal(view.stage(),'gift');assert.equal(appearances.at(-1),'onboarding-offer');
 assert(q('h1').textContent.includes('We have a gift!'));assert(q('.gift-present'));
 assert.equal(offerViews(),beforeGift,'gift is not an offer paywall view');assert.equal(impressions.length,beforeImpressions,'gift must not send a RevenueCat paywall impression');
 const openGift=q('[data-gift=open]');openGift.click();openGift.click();
 assert.equal(view.stage(),'offer');assert.equal(buys.length,beforeBuys+1,'opening a gift does not purchase');
 assert.equal(events.filter(([e])=>e==='special_offer_gift_opened').length,1,'double taps open only once');
 assert.equal(offerViews(),beforeGift+1);
 assert.equal(q('.gift-value').textContent,'94% OFF');assert.equal(q('.offer-price del').textContent,'CA$519.48');
 assert.equal(q('[data-offer-price]').textContent,'CA$29.99');assert.equal(q('[data-offer-billing]').textContent,'CA$29.99 billed annually');
 assert.equal(q('.decline').textContent,'I’d rather pay full price.');assert(!q('.renewal'));
 assert.equal(impressions.at(-1),'inbox_special_annual_v3');
 q('[data-offer=claim]').click();q('[data-offer=claim]').click();q('[data-offer=decline]').click();view.show('paywall');
 assert.equal(view.stage(),'offer','navigation blocked during StoreKit');assert.equal(buys.filter(b=>b.id===offer.productId).length,1,'debounce offer checkout');
 assert.equal(buys.at(-1).meta.offering_id,offer.offeringId);done({cancelled:true});assert.equal(view.stage(),'offer','offer cancellation stays on offer');
 q('[data-offer=claim]').click();done({pending:true});assert(q('.kx-error').textContent.includes('pending'));
 q('[data-offer=restore]').click();restoreDone({entitled:false});assert(q('.kx-error').textContent.includes('No active'));
 q('.decline').click();assert.equal(view.stage(),'paywall');assert.equal(appearances.at(-1),'onboarding-inbox');assert.equal(q('[data-plan=weekly]').getAttribute('aria-checked'),'true');
 cancelRegular();assert.equal(view.stage(),'paywall','offer automatically shown only once per walkthrough');
 for(const special of [undefined,{...offer,trialDays:7},{...offer,noIntroOffer:false},{...offer,currency:'USD'},{...offer,amount:45},{...offer,productId:'unexpected'}]){mount(special===undefined?null:special);cancelRegular();assert.equal(view.stage(),'paywall','invalid offer must not render or purchase');}
 mount();products.weekly={...weekly,currency:'USD'};cancelRegular();assert.equal(view.stage(),'gift');q('[data-gift=open]').click();assert.equal(view.stage(),'offer');assert(q('.offer-price del').hidden,'no cross-currency comparison');assert.equal(q('.gift-value').textContent,'Special price');
 products.specialOffer=null;q('[data-offer=claim]').click();assert(q('[data-offer=claim]').disabled);assert(q('.kx-error').textContent.includes('unavailable'));
 mount();cancelRegular();products.specialOffer=null;q('[data-gift=open]').click();assert.equal(view.stage(),'paywall','catalog loss during gift returns to regular plans');
 assert(events.some(([e,p])=>e==='special_offer_gift_viewed'&&p.screen_id==='new_gift'&&p.previous_plan==='weekly'&&p.offer_flow_version==='gift_v1'));
 assert(events.some(([e,p])=>e==='special_offer_viewed'&&p.previous_plan==='weekly'&&p.onboarding_version==='personalized_weekly_offer_v3'));
 console.log('SPECIAL OFFER PASSED: cancellation -> gift -> offer, separate impressions, double taps, once-per-walkthrough, localized prices, product guard, pending/error, restore, purchase lock, plan retention and catalog loss.');
} finally {view?.destroy();w.close();}
