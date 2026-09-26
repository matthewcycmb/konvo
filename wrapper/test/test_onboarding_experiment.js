const assert=require('assert'),fs=require('fs');const {JSDOM}=require('jsdom');
const dom=new JSDOM('<body><main><h2>Private inbox</h2><script>bad()</script><a href="/direct/t/secret">A message</a></main><div id="host" style="height:844px;width:390px"></div></body>',{url:'https://www.instagram.com/direct/inbox/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;w.HTMLCanvasElement.prototype.getContext=()=>({scale(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}});
for(const f of ['onboarding-views.js','onboarding-experiment.js'])w.eval(fs.readFileSync(__dirname+'/../src-tauri/src/'+f,'utf8'));
const api=w.KonvoOnboardingExperiment;
let now=0;w.performance.now=()=>now;
for(const n of [45,90,150,210,300]){const c=api.comparison({instagramMinutes:n,messagingMinutes:20});assert(c.known);assert.equal(c.before,n);assert.equal(c.reduction,Math.round(Math.max(0,1-20/n)*100));}
assert(!api.comparison({instagramMinutes:150,messagingMinutes:20,instagramUnknown:true}).known);
assert(!api.comparison({instagramMinutes:150,messagingMinutes:20,messagingUnknown:true}).known);
assert(!api.comparison({instagramMinutes:999999,messagingMinutes:20}).known);
assert.equal(api.comparison({instagramMinutes:45,messagingMinutes:60}).reduction,0);
let events=[],buys=[],doneBuy,view;let products={offeringId:'no_trial',yearly:{productId:'konvo.pro.yearly.notrial',price:'฿799.00',perWeek:'฿15.37',amount:799,currency:'THB',noIntroOffer:true}};
function mount(initial){if(view)view.destroy();const host=w.document.createElement('div');w.document.body.append(host);view=api.mount(host,{initial,answers:{instagramMinutes:210,messagingMinutes:30},handle:()=>'<script>alert(1)</script>',track:(e,p)=>events.push([e,p]),products:()=>products,impression:()=>{},buy:(id,done)=>{buys.push(id);doneBuy=done;},restore:f=>f({entitled:false}),refresh:f=>f(),open:()=>{},back:()=>{}});return host.shadowRoot;}
let root=mount('progress');assert(root.textContent.includes('3h 30m'));assert(root.querySelector('h1 [data-instagram-username]'));assert.equal(root.querySelector('.review-stars').textContent,'★★★★★');assert(root.textContent.includes('30m'));assert(root.textContent.includes('86%'));assert(!root.querySelector('script'));assert(root.querySelector('.community').textContent.includes('1,000+'));assert(root.querySelector('.community').textContent.includes('members quit doomscrolling'));assert(!root.querySelector('.comparison-art'));
const originalContinue=root.querySelector('.continue');
for(let i=0;i<5;i++)originalContinue.click();assert.equal(view.stage(),'progress','rapid arrival taps must not skip the comparison');
now+=600;originalContinue.click();assert.equal(view.stage(),'progress','the slightly longer cooldown must still reject taps after 600ms');
now+=300;originalContinue.click();assert.equal(view.stage(),'commitment');assert(root.querySelector('#commit-continue').disabled);
for(let i=0;i<5;i++)root.querySelector('#skip-signature').click();assert.equal(view.stage(),'commitment','carried-over taps must not skip the signing page');
now+=900;root.querySelector('#skip-signature').click();assert.equal(view.stage(),'loading');
originalContinue.click();assert.equal(view.stage(),'loading','a stale button must not navigate a later stage');
root.querySelector('#loading-continue').click();assert.equal(view.stage(),'loading','the loader also rejects carried-over taps');
now+=900;root.querySelector('#loading-continue').click();assert.equal(view.stage(),'paywall');assert(root.querySelector('.price').textContent.includes('฿15.37'));assert(root.querySelector('.billing').textContent.includes('฿799.00 billed annually'));assert(root.querySelector('.reassurance').textContent.includes('Cancel anytime, no commitment'));assert(root.querySelector('.reassurance svg'));assert(!root.querySelector('.price').textContent.includes('$24.99'));assert(!root.querySelector('.sample-inbox'));assert(root.querySelector('.kx-live').textContent.includes('A message'));assert(!root.querySelector('.kx-live a'));assert(!root.querySelector('.kx-live script'));
const btn=root.querySelector('[data-preview=purchase]');btn.click();btn.click();assert.equal(buys.length,1);assert.equal(buys[0],'konvo.pro.yearly.notrial');doneBuy({cancelled:true});assert(!btn.disabled);assert(!JSON.stringify(events).includes('Private inbox'));assert(!JSON.stringify(events).includes('A message'));assert(!JSON.stringify(events).includes('alert(1)'));
products.yearly.noIntroOffer=false;root=mount('paywall');assert(root.querySelector('[data-preview=purchase]').disabled);assert(!root.textContent.includes('฿799'));assert(events.some(x=>x[0]==='paywall_load_failed'));
products=null;root=mount('paywall');assert(root.querySelector('[data-preview=purchase]').disabled);assert(!root.textContent.includes('$24.99'));
view.destroy();w.close();console.log('EXPERIMENT VIEW CHECKS PASSED: ranges, unknowns, privacy, currency, no-trial guard, navigation, purchase debounce.');
