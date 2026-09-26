// Read-only source rendering. Builds a review gallery; never runs app bridges in the browser.
const fs=require('fs'),path=require('path');
const {JSDOM}=require('../node_modules/jsdom');
const root=path.resolve(__dirname,'..');
const open=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const ua='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const slice=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const freeze=`*{animation-duration:.001s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important}.spin,.imp-spin{animation:none!important}html,body{overflow:hidden!important}html{color-scheme:light}`;
const nav=`<script>document.addEventListener('click',e=>{const t=e.target.closest('button,a,[data-act],[data-next]');if(!t)return;e.preventDefault();if(t.id==='onboarding-privacy'){parent.postMessage({konvoGallery:'privacy'},'*');return}parent.postMessage({konvoGallery:'navigate',direction:t.matches('[data-back],.back')?-1:1},'*')});<\/script>`;
function embedImages(doc,base){for(const img of doc.querySelectorAll('img[src]')){const src=img.getAttribute('src');if(/^(data:|https?:)/.test(src))continue;const file=path.resolve(base,src);if(!fs.existsSync(file))throw Error('Missing image '+file);const mime=/\.jpe?g$/i.test(file)?'jpeg':/\.svg$/i.test(file)?'svg+xml':'png';img.src='data:image/'+mime+';base64,'+fs.readFileSync(file).toString('base64')}}
function page(title,css,body,classes='',extra=''){return '<!doctype html><html lang="en" class="'+classes+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>'+css+'\n'+freeze+'\n'+extra+'</style></head><body>'+body+nav+'</body></html>'}
const pages=[];
function add(id,title,group,html,note='',badge='Existing'){
 // Hide the referral offer and its follow-up states in the proposed gallery.
 if(['invite','sent','claim'].includes(id))return;
 // The review HTML has a fixed light theme, independent of the viewer's OS.
 // Keep these changes in the snapshots; the app's appearance is untouched.
 html=html.replace(/(<style(?:\s[^>]*)?>)([\s\S]*?)(<\/style>)/gi,(_,start,css,end)=>start+css.replace(/@media\s*\(prefers-color-scheme:\s*dark\)/g,'@media not all')+end);
 html=html.replace('</head>','<meta name="color-scheme" content="only light"><style id="preview-light-mode">html{color-scheme:only light!important}:root{--dbg:#f5f8ff;--dink:#141d33;--dmut:#5d6478;--daccent:#0a5cf0}.screen.dark .glow{opacity:.3}</style></head>');
 if(['progress','commitment','loading','paywall'].includes(id)){
  const init=id==='loading'?"KonvoPreviewMotion.startLoading(document,()=>parent.postMessage({konvoGallery:'navigate',direction:1},'*'));":id==='paywall'?'KonvoPreviewMotion.revealPaywall();':id==='commitment'?'':'KonvoPreviewMotion.personalize();';
  html=html.replace('</body>','<script>'+read('prototype/onboarding-motion.js')+'\nconst activatePreview=()=>{KonvoPreviewMotion.cancel();'+init+'}; if(!window.__konvoPreviewStandby)activatePreview(); addEventListener("message",e=>{if(e.source===parent&&e.data?.konvoGallery==="activate")activatePreview()});'+'<\/script></body>');
 }
 pages.push({id,title,group,html,note,badge});
}
(async()=>{
 const test=read('test/test_onboarding.js');
 const original=read('dist/index.html');
 const augmented=original.replace('  var DWELL =','  window.__galleryHydrate=function(){prime();reveal();columns();outcome();};\n  var DWELL =');
 const scripts=[...augmented.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 const boot=new Function('JSDOM','HTML','SCRIPTS','IPHONE','DESKTOP','open',slice(test,'function boot(','\nconst settle')+'\nreturn boot;')(JSDOM,augmented,scripts,ua,'',open);
 const d=boot({lang:'en-US'});await pause(100);d.window.__galleryHydrate();
 const doc=d.window.document;embedImages(doc,path.join(root,'dist'));
 // Preview choice order: highest usage first, with "Not sure" still last.
 const timeOptions=doc.querySelector('#s3 .opts');
 const timeChoices=[...timeOptions.querySelectorAll('.opt')];
 const unsure=timeChoices.pop();
 timeOptions.replaceChildren(...timeChoices.reverse(),unsure);
 const css=[...doc.querySelectorAll('style')].map(s=>s.textContent).join('\n');
 const pre=[['s1','Welcome'],['s2c','Your reason'],['s3','Time on Instagram'],['s4','Time spent messaging'],['s4b','Calculating your time'],['s5','Years spent scrolling'],['s6','Scrolling vs. messaging'],['s7','Time you could reclaim'],['s8a','Your messages stay'],['s8b','Your friends’ Stories stay'],['s8c','Optional Instagram lock'],['s9t','Community reviews'],['s11','Opening Instagram']];
 for(const [id,title] of pre){const screen=doc.getElementById(id).cloneNode(true);screen.classList.remove('past','hold');screen.classList.add('on');screen.querySelectorAll('.pill').forEach(p=>p.classList.add('done'));add(id,title,'flow',page(title,css,'<div id="flow">'+screen.outerHTML+'</div>','ios onboard'),['s4b','s5','s6','s7'].includes(id)?'Illustrative answers: 2½ hours on Instagram, 20 minutes messaging.':'From the current bundled onboarding.');
  if(id==='s7'){
   const progress=new JSDOM(read('prototype/onboarding-progress-preview.html'));const pd=progress.window.document;pd.querySelectorAll('script,.preview-toolbar,dialog').forEach(e=>e.remove());embedImages(pd,path.join(root,'prototype'));const st=pd.createElement('style');st.textContent=freeze+'\n.phone{width:100%;height:100vh;min-height:0;margin:0;border-radius:0;box-shadow:none}';pd.head.append(st);const sc=pd.createElement('script');sc.textContent=nav.slice(8,-9);pd.body.append(sc);add('progress','NEW · Before and after','flow','<!doctype html>'+pd.documentElement.outerHTML,'AI-generated illustrative comparison: 150 minutes of Instagram versus 20 minutes of messaging per day, an 87% rounded reduction. Not measured results. Five-star ratings and member outcome claim are unverified draft styling.','New');progress.window.close();
  }
 }
 const placeholderCss=`*{box-sizing:border-box}body{margin:0;background:#fff;color:#141d33;font:16px/1.5 -apple-system,system-ui,sans-serif}.external{height:100vh;padding:36px 28px;display:flex;flex-direction:column;justify-content:center}.external small{font-size:11px;letter-spacing:1.5px;font-weight:700;color:#0a5cf0}.external h1{font-size:30px;line-height:1.1;letter-spacing:-1px;margin:16px 0}.external p{color:#5d6478;font-size:15px}.external button{margin-top:22px;border:0;background:#0a5cf0;color:#fff;border-radius:14px;padding:16px;font:600 16px system-ui}`;
 add('instagram-login','Instagram sign-in','flow',page('Instagram sign-in',placeholderCss,'<section class="external"><small>EXTERNAL SCREEN</small><h1>Sign in to Instagram</h1><p>The app opens Instagram’s own login page here. Its current UI, two-factor authentication and account challenges are supplied by Instagram.</p><p>This gallery does not collect credentials or open a real login session.</p><button>Preview the next screen</button></section>'),'External Instagram page; represented here by a labeled placeholder.','External');
 const ctest=read('test/test_cage.js');
 const capture=`window.__galleryCapture=function(name){var map={connected:function(){return PAGES.connected},loader:loaderPage,reveal:revealPage,perks:perksPage,try:tryPage,offer:offerPage,reminder:reminderPage,annual:function(){return pay('y')},monthly:function(){return pay('m')},notify:function(){return notifyPage(0)},success:function(){var p=prod(),n=p.yearly.trialDays;p.yearly.trialDays=0;var s=successPage('konvo.pro.yearly');p.yearly.trialDays=n;return s},invite:invitePage,sent:inviteSent,claim:function(){return daysOn('Your 3 free days are on.')},cage:cageIntroPage,protected:protectedPage};return map[name]();};\n    `;
 const cage=read('src-tauri/src/cage.js').replace('function fine(text) {',capture+'function fine(text) {');
 const cboot=new Function('fs','JSDOM','CAGE','IPHONE','DESKTOP','open',slice(ctest,'function boot(','\nconst settle')+'\nreturn boot;')(fs,JSDOM,cage,ua,'',open);
 const answer=new Function('posted',slice(ctest,'const answer = ','\n  const LIVE_PRODUCTS')+'\nreturn answer;')([]);
 const cd=cboot('/direct/inbox/','',{lang:'en-US',hash:'#konvo=15,distracted',seed:{konvoHandle:'your_username'},bridge:answer({entitlements:{entitled:false},products:{ok:true,yearly:{price:'$24.99',perWeek:'$0.48',perMonth:'$2.08',trialDays:7,savePct:70},monthly:{price:'$6.99',trialDays:0}}})});
 await pause(700);
 const ccss=[...cd.window.document.querySelectorAll('style')].map(s=>s.textContent).join('\n');
 const draft=new JSDOM(read('prototype/paywall-yearly-inbox-preview.html'));
 const draftDoc=draft.window.document;
 const sample=draftDoc.querySelector('.sample-inbox').outerHTML;
 const sampleStyles=[...draftDoc.querySelectorAll('style')].map(s=>s.textContent).join('\n');
 const mock='<div class="gallery-inbox" style="position:fixed;inset:0;container-type:inline-size">'+sample+'</div>';
 const cextra=`#im-pay{--bg:#fff;--ink:#141d33;--mut:#5d6478;--line:#d9d9de;--chip:#f2f2f4;--icbg:#eef3ff;--accent:#0a5cf0}#im-pay{position:fixed!important;inset:0!important;opacity:1!important}#im-pay .imp-page{height:100%;display:flex;flex-direction:column}.imp-row{opacity:1!important}.imp-ck svg{display:block!important}.imp-ck{background:#0a5cf0!important}.gallery-inbox .sample-inbox{display:block}.gallery-inbox .sample-status{padding-top:8px}.gallery-inbox .sample-home{display:none}`;
 function cpage(name,title,group,note='',badge='Existing'){
  let body=cd.window.__galleryCapture(name);const reveal=name==='reveal'||name==='try';
  const behind=reveal?mock:'';
  const overrides=name==='try'?'.gallery-inbox{inset:170px auto auto calc(50% - 98px)!important;width:196px;height:420px;overflow:hidden}.gallery-inbox .sample-inbox{height:420px}':name==='reveal'?'.gallery-inbox{filter:brightness(.74)}':'';
  add(name,title,group,page(title,sampleStyles+'\n'+ccss,behind+'<div id="im-pay" class="'+(reveal?'im-reveal':'')+'"><div class="imp-page">'+body+'</div></div>','',cextra+overrides),note,badge);
 }
 // Move the before-and-after screen from its former page 09 position into
 // the comparison's former page 21 position, directly before commitment.
 const [progressPage]=pages.splice(pages.findIndex(p=>p.id==='progress'),1);
 cpage('connected','Instagram connected','flow');cpage('loader','Setting up Konvo','flow');cpage('reveal','Your inbox revealed','flow','Sample inbox behind the current live-inbox reveal.');pages.push(progressPage);
 for(const [id,title] of [['commitment','NEW · Sign your commitment'],['loading','NEW · Your inbox is next'],['paywall','NEW · Annual inbox paywall']]){
  const n=new JSDOM(draftDoc.documentElement.outerHTML);const nd=n.window.document;nd.title=title;nd.querySelectorAll('script,.preview-label,dialog,input,img:not([src])').forEach(e=>e.remove());nd.querySelector('.phone').dataset.step=id;
  const extra=nd.createElement('style');extra.textContent=freeze+'\n.preview-label{display:none}.phone{width:100%;height:100vh;min-height:0;margin:0;border-radius:0;box-shadow:none}body{background:#fff}';nd.head.append(extra);
  const s=nd.createElement('script');s.textContent=nav.slice(8,-9);nd.body.append(s);
  add(id,title,'flow','<!doctype html>'+nd.documentElement.outerHTML,id==='commitment'?'New signature page. Use the working preview to draw and continue through the transition.':id==='loading'?'Percentage circle finishes with a checkmark, then fades into the staged paywall reveal. Reduced motion supported.':'New $24.99/year design, no trial. Illustrative inbox; animated 800 → 1,000+ count remains draft copy, not live growth.','New');n.window.close();
 }
 cpage('notify','Notifications','flow','Existing notification page rendered without a trial reminder.');
 cpage('invite','Invite friends','flow','Existing referral offer still says 3 free days; separate from the annual subscription trial.');
 cpage('success','You’re in','flow','Existing success page rendered for an annual purchase without a trial.');
 for(const [id,title] of [['try','Previous · Trial inbox preview'],['offer','Previous · Free-trial offer'],['reminder','Previous · Trial reminder'],['annual','Previous · Annual trial paywall'],['monthly','Previous · Monthly paywall']])cpage(id,title,'legacy','Existing app design, shown for comparison only. Example US prices; no live store request.','Previous');
 for(const [id,title,note] of [['sent','Referral sent','Conditional after sharing.'],['claim','Referral access granted','Conditional referral grant.'],['cage','Set up Instagram blocking','Optional setup offered from the inbox.'],['protected','Instagram protected','Conditional after enabling the block.']])cpage(id,title,'optional',note,'Optional');
 const splash=doc.querySelector('#splash');if(splash)add('launch','Launch splash','optional',page('Launch splash',css,splash.outerHTML,'ios'),'Launch state, before onboarding.','Optional');
 draft.window.close();
 const template=fs.readFileSync(path.join(__dirname,'onboarding-gallery.template.html'),'utf8');
 const payload=JSON.stringify(pages).replaceAll('<','\\u003c');
 const output=template.replace('/*__PAGES__*/',payload);
 fs.writeFileSync(path.join(__dirname,'onboarding-all-pages.html'),output);
 console.log(JSON.stringify({file:path.join(__dirname,'onboarding-all-pages.html'),pages:pages.length,groups:pages.reduce((a,p)=>(a[p.group]=(a[p.group]||0)+1,a),{}),bytes:Buffer.byteLength(output)}));
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>open.forEach(d=>d.window.close()));
