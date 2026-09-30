// Exercise the shipped tab handlers with Instagram's verified in-page router.
const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const CAGE=fs.readFileSync(process.env.KONVO_CAGE_SOURCE||__dirname+'/../src-tauri/src/cage.js','utf8');
const base=fs.readFileSync(__dirname+'/test_cage.js','utf8'),open=[];
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
let setup=base.slice(base.indexOf('function boot('),base.indexOf('const settle ='));
setup=setup.replace('  dom.window.eval(`','  if(opts.router)dom.window.require=opts.router;\n  dom.window.eval(`');
const boot=new Function('JSDOM','CAGE','IPHONE','open',setup+';return boot;')(JSDOM,CAGE,IPHONE,open);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const tray='<div id="native-tray"><div role="button" aria-label="Story"><canvas></canvas><img><span>friend</span></div></div>';
function router(push,dispatcher={withContext(){}}){return name=>{assert.equal(name,'browserHistory_DO_NOT_USE');return{getCometRouterDispatcher:()=>dispatcher,browserHistory:{push}}};}
(async()=>{try{
 const routes=[],d=boot('/direct/inbox/','<main>Messages</main>',{paid:true,router:router(path=>routes.push(path)),seed:{konvoHandle:'owner',konvoHandleUid:'1234567'}});await wait(20);
 d.window.document.getElementById('im-heart').click();
 assert.deepEqual(routes,['/notifications/'],'A tab with no native link must use Instagram’s existing router, not reload the app');
 assert.deepEqual(d.went,[],'Preserve the loaded document and Instagram state');
 d.window.document.getElementById('im-me').click();assert.equal(routes.at(-1),'/owner/');
 d.window.document.getElementById('im-stories').click();assert.equal(routes.at(-1),'/?konvo_stories=1');
 assert(d.window.sessionStorage.konvoStoriesAccount,'Arm Story access before routing to home');
 // A matching path on an external DM link is never a native navigation source.
 d.window.document.body.insertAdjacentHTML('beforeend','<a id="external" href="https://example.com/notifications/">External</a>');
 let externalClicks=0;d.window.document.getElementById('external').onclick=e=>{e.preventDefault();externalClicks++};
 d.window.document.getElementById('im-heart').click();assert.equal(externalClicks,0);assert.equal(routes.at(-1),'/notifications/');
 // Existing native React links still take precedence and receive one click.
 let nativeClicks=0;d.window.document.body.insertAdjacentHTML('beforeend','<a id="native" href="/notifications/">Activity</a>');
 d.window.document.getElementById('native').onclick=e=>{e.preventDefault();nativeClicks++};const before=routes.length;
 d.window.document.getElementById('im-heart').click();assert.equal(nativeClicks,1);assert.equal(routes.length,before);
 // A missing, uninitialized or throwing Instagram router falls back once.
 for(const provider of [undefined,()=>{throw Error('Changed module')},router(()=>{throw Error('Router failure')}),router(()=>{throw Error('Must not invoke uninitialized router')},null)]){
  const f=boot('/direct/inbox/','<main>Messages</main>',{paid:true,router:provider});await wait(10);f.window.document.getElementById('im-heart').click();assert.equal(f.went.length,1);assert.equal(new URL(f.went[0]).pathname,'/notifications/');
 }
 // A SPA departure must never unmask the old home before React replaces it.
 let home;
 home=boot('/?konvo_stories=1','<main id="home">'+tray+'<article id="post"><video></video>Feed</article></main>',{paid:true,router:router(path=>{
   home.window.__loc.pathname=path;home.window.__loc.search='';home.window.dispatchEvent(new home.window.PopStateEvent('popstate'));
 })});await wait(30);
 const doc=home.window.document;doc.getElementById('im-messages').click();
 assert.equal(home.went.length,0,'Stories can leave through the native router');
 assert.equal(home.window.getComputedStyle(doc.getElementById('post')).visibility,'hidden','Old home stays hidden during asynchronous React replacement');
 assert(!home.window.sessionStorage.konvoStoriesAccount,'Leaving Stories clears its home exception');
 doc.getElementById('home').innerHTML='<h1 id="inbox-ready">Messages</h1>';await wait(30);
 assert.equal(home.window.getComputedStyle(doc.getElementById('inbox-ready')).visibility,'visible','A reused main becomes visible when its old feed and circles are removed');
 assert(!doc.querySelector('.im-stories-retired'),'Release the temporary mask after the old content is gone');
 // Same-tab taps are no-ops, including a trailing-slash variant.
 d.window.__loc.pathname='/notifications';d.window.document.getElementById('native').remove();const count=routes.length;d.window.document.getElementById('im-heart').click();assert.equal(routes.length,count,'Do not refetch the current tab');
 console.log('TAB NAVIGATION PASSED: real router, native-link priority, safe fallback, Messages-first, Stories feed isolation, DOM reuse and same-tab taps.');
}finally{open.forEach(d=>d.window.close())}})().catch(e=>{console.error(e);process.exitCode=1});
