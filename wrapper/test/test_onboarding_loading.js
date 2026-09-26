// Regression: slow native prices + Instagram's div-root inbox arriving after mount.
const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('assert');
const dom=new JSDOM('<body><div id="mount_ig"></div><div id="im-pay"><div id="host"></div></div></body>',{url:'https://www.instagram.com/direct/inbox/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;for(const f of ['onboarding-views.js','onboarding-experiment.js'])w.eval(fs.readFileSync(__dirname+'/../src-tauri/src/'+f,'utf8'));
let products=null,events=[];
const host=w.document.getElementById('host');
const view=w.KonvoOnboardingExperiment.mount(host,{initial:'paywall',answers:{},handle:()=>'',track:(e,p)=>events.push([e,p]),products:()=>products,refresh:f=>f({ok:false}),impression:()=>{},buy:()=>{},restore:()=>{},open:()=>{},back:()=>{}});
(async()=>{
 const root=host.shadowRoot;assert(root.querySelector('[data-preview=purchase]').disabled);
 products={ok:true,offeringId:'test',yearly:{productId:'konvo.pro.yearly.notrial',price:'CA$34.99',amount:34.99,currency:'CAD',noIntroOffer:true}};
 w.document.getElementById('mount_ig').innerHTML='<div><header>Instagram inbox</header><div role="link"><img src="https://example.test/avatar.png"><span>Private fixture message</span></div></div>';
 await new Promise(r=>setTimeout(r,1200));
 assert(root.querySelector('.price').textContent.includes('CA$34.99'),'late native prices must update the already-mounted paywall');
 assert(!root.querySelector('[data-preview=purchase]').disabled);
 assert(root.querySelector('.kx-live').textContent.includes('Private fixture message'),'late div-root inbox must populate without main tag');
 assert(!root.querySelector('.kx-live a'),'snapshot must be noninteractive');
 assert(!JSON.stringify(events).includes('Private fixture message'));
 assert.equal(events.filter(([e])=>e==='paywall_viewed').length,1);
 console.log('LOADING REGRESSION PASSED: late localized price, late div-root inbox, private content stays local.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{view.destroy();w.close();});
