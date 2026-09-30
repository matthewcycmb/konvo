// Replays the informational modal inspected on iPhone 16e. The real OK
// callback owns removal/unlocking; hiding a dialog alone must not be the fix.
const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const CAGE=fs.readFileSync(__dirname+'/../src-tauri/src/cage.js','utf8');
const base=fs.readFileSync(__dirname+'/test_cage.js','utf8'),open=[];
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const boot=new Function('JSDOM','CAGE','IPHONE','open',base.slice(base.indexOf('function boot('),base.indexOf('const settle ='))+';return boot;')(JSDOM,CAGE,IPHONE,open);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const home='/?konvo_stories=1';
const fixture='<main><div><div role="button" aria-label="Story"><canvas></canvas><img><span>friend</span></div></div><article>Hidden feed</article></main>';
const title='The messaging tab has a new look';
const body='You can now go to your inbox by tapping this icon.';
const icon='<i role="img" data-visualcompletion="css-img" style="background-image:url(https://static.cdninstagram.com/rsrc.php/y0/r/r-Dq8k6uHHA.webp)"></i>';
function modal(heading=title,content=body,asset=icon){return `<div role="dialog" aria-modal="true">${asset}<span>${heading}</span><span>${content}</span><div role="button" tabindex="0">OK</div></div>`;}
function mount(d,html){
 const host=d.window.document.createElement('div');host.innerHTML=html;
 const dialog=host.querySelector('[role=dialog]'),button=dialog.querySelector('[role=button],button');
 const result={clicks:0,dialog,host};
 button.onclick=()=>{result.clicks++;host.remove()};
 d.window.document.body.append(host);return result;
}
(async()=>{try{
 const d=boot(home,fixture,{paid:true});await wait(30);
 const row=d.window.document.querySelector('main [role=button]');
 const original=row;
 const notice=mount(d,modal());await wait(180);
 assert.equal(notice.clicks,1,'A late Instagram messaging announcement must invoke its native acknowledgement');
 assert(!notice.dialog.isConnected,'Native acknowledgement removes the overlay, not just its pixels');
 assert.equal(original,d.window.document.querySelector('main [role=button]'));
 assert.equal(d.window.getComputedStyle(original).visibility,'visible');
 assert.equal(d.window.getComputedStyle(d.window.document.querySelector('article')).visibility,'hidden');
 assert.deepEqual(d.went,[],'Dismissing an informational announcement must not reload or navigate');
 // The observed icon is locale independent. English copy is a conservative
 // fallback when Instagram changes its static sprite URL.
 const translated=mount(d,modal('La messagerie fait peau neuve','Accédez à votre boîte de réception.'));await wait(180);assert.equal(translated.clicks,1);
 const changedAsset=mount(d,modal(title,body,'<i role="img"></i>'));await wait(180);assert.equal(changedAsset.clicks,1);
 const unrelated=mount(d,modal('Security alert','Review your account',''));
 const input=mount(d,modal().replace('</span><div role="button"','</span><input type="password"><div role="button"'));
 const choices=mount(d,modal().replace('</span><div role="button"','</span><button>Cancel</button><div role="button"'));
 const form=mount(d,modal().replace('</span><div role="button"','</span><form></form><div role="button"'));
 await wait(180);
 for(const r of [unrelated,input,choices,form])assert.equal(r.clicks,0,'Other dialogs, forms and choices must not be acknowledged');
 // A handler that takes time to finish is invoked only once per mounted modal.
 const pending=mount(d,modal());pending.dialog.querySelector('[role=button]').onclick=()=>pending.clicks++;
 await wait(180);d.window.dispatchEvent(new d.window.PopStateEvent('popstate'));await wait(180);
 assert.equal(pending.clicks,1,'Do not click repeatedly while Instagram handles the acknowledgement');
 for(const path of ['/direct/inbox/','/accounts/login/','/create/story/']){
  const other=boot(path,'<main></main>',{paid:true,loggedOut:path.includes('login')});await wait(20);
  const r=mount(other,modal());await wait(180);assert.equal(r.clicks,0,'Only the explicit signed-in Stories home may auto-dismiss');
 }
 const unpaid=boot(home,'<main></main>');await wait(20);const r=mount(unpaid,modal());await wait(180);assert.equal(r.clicks,0);
 console.log('STORIES ANNOUNCEMENT PASSED: native acknowledgement, late mount, translated sprite, exact-copy fallback, modal cleanup, no reload, no repeated click, other dialogs and auth preserved.');
}finally{open.forEach(d=>{d.window.__loc.pathname="/direct/inbox/";d.window.close()});}})().catch(e=>{console.error(e);process.exitCode=1});
