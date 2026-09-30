// Real gesture handlers, synthetic account/Stories only. No Instagram requests.
const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const CAGE=fs.readFileSync(__dirname+'/../src-tauri/src/cage.js','utf8');
const base=fs.readFileSync(__dirname+'/test_cage.js','utf8'),open=[];
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const boot=new Function('JSDOM','CAGE','IPHONE','open',base.slice(base.indexOf('function boot('),base.indexOf('const settle ='))+';return boot;')(JSDOM,CAGE,IPHONE,open);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const markup='<main><div id="tray"><div role="button" aria-label="Story"><canvas></canvas><img><span>Friend</span></div></div><article>Hidden feed</article></main>';
function touch(d,type,x,y,{target=d.window.document.body,count=1}={}){
 const e=new d.window.Event(type,{bubbles:true,cancelable:true});
 Object.defineProperty(e,'touches',{value:/touchend|touchcancel/.test(type)?[]:Array.from({length:count},(_,identifier)=>({clientX:x,clientY:y,identifier}))});
 target.dispatchEvent(e);return e;
}
function pull(d,dx=0,dy=140,options={}){
 touch(d,'touchstart',100,180,options);
 const move=touch(d,'touchmove',100+dx,180+dy,options);
 touch(d,'touchend',100+dx,180+dy,options);return move;
}
async function fixture(path='/?konvo_stories=1',options={}){
 const d=boot(path,markup,{paid:true,...options});await wait(25);return d;
}
(async()=>{try{
 const d=await fixture();
 assert.equal(pull(d).defaultPrevented,true,'A deliberate vertical pull is handled without scrolling the body');
 assert.deepEqual(d.went,['reload'],'One released pull requests a fresh Instagram document');
 assert.equal(d.window.sessionStorage.konvoStoriesAccount,'1234567','Preserve account-scoped Stories intent through reload');
 assert.equal(d.window.getComputedStyle(d.window.document.querySelector('article')).visibility,'hidden','Feed stays masked during refresh');
 assert.equal(d.window.document.getElementById('im-stories-refresh').getAttribute('aria-busy'),'true');
 pull(d);assert.deepEqual(d.went,['reload'],'Ignore repeated pulls while one refresh is pending');
 for(const [dx,dy] of [[0,40],[0,-160],[160,4],[120,140]]){
  const f=await fixture(),move=pull(f,dx,dy,{target:f.window.document.querySelector('#tray [role="button"]')});
  assert.deepEqual(f.went,[],'Short, upward, horizontal and ambiguous diagonal drags do not refresh');
  if(dx||dy<0)assert.equal(move.defaultPrevented,false,'Leave carousel/default gestures untouched');
 }
 const cancel=await fixture();touch(cancel,'touchstart',100,180);touch(cancel,'touchmove',100,330);touch(cancel,'touchcancel',100,330);touch(cancel,'touchend',100,330);
 assert.deepEqual(cancel.went,[],'Interrupted gestures never reload');
 assert(cancel.window.document.getElementById('im-stories-refresh').hidden);
 const reverse=await fixture();touch(reverse,'touchstart',100,180);touch(reverse,'touchmove',100,330);touch(reverse,'touchmove',100,200);touch(reverse,'touchend',100,200);
 assert.deepEqual(reverse.went,[],'Pulling back under the threshold cancels refresh');
 const multi=await fixture();pull(multi,0,150,{count:2});assert.deepEqual(multi.went,[],'Pinches are not refresh gestures');
 const offline=await fixture();Object.defineProperty(offline.window.navigator,'onLine',{value:false});pull(offline);
 assert.deepEqual(offline.went,[],'Keep loaded Stories available when offline');
 assert.match(offline.window.document.getElementById('im-stories-refresh').textContent,/offline/);
 for(const path of ['/direct/inbox/','/stories/friend/123/','/create/story/','/notifications/']){
  const f=await fixture(path,{sseed:{konvoStoriesAccount:'1234567'}});const before=[...f.went];pull(f);
  assert.deepEqual(f.went,before,'No pull-refresh outside the Stories tray: '+path);
 }
 const tabs=await fixture();assert.equal(pull(tabs,0,150,{target:tabs.window.document.getElementById('im-stories')}).defaultPrevented,false);assert.deepEqual(tabs.went,[],'Bottom tabs never initiate refresh');
 const gated=await fixture();gated.window.document.body.insertAdjacentHTML('beforeend','<div id="im-pay"></div>');pull(gated);assert.deepEqual(gated.went,[],'Do not reload a paywall');
 const modal=await fixture();modal.window.document.body.insertAdjacentHTML('beforeend','<div role="dialog" id="modal">Instagram dialog</div>');
 const dialog=modal.window.document.getElementById('modal');dialog.getBoundingClientRect=()=>({width:300,height:200});
 pull(modal);assert.deepEqual(modal.went,[],'An open Instagram modal blocks refresh even when masked');
 dialog.getBoundingClientRect=()=>({width:0,height:0});pull(modal);assert.deepEqual(modal.went,['reload'],'A retained hidden portal does not block refresh');
 const logout=await fixture();logout.window.document.cookie='ds_user_id=; Max-Age=0';pull(logout);assert.deepEqual(logout.went,[],'Do not refresh after sign-out');
 const route=await fixture();touch(route,'touchstart',100,180);touch(route,'touchmove',100,330);route.window.__loc.pathname='/direct/inbox/';route.window.__loc.search='';route.window.dispatchEvent(new route.window.PopStateEvent('popstate'));touch(route,'touchend',100,330);
 assert.deepEqual(route.went,[],'Changing tabs during a pull cancels the gesture');
 assert(route.window.document.getElementById('im-stories-refresh').hidden,'No refresh indicator leaking onto Messages');
 console.log('STORIES REFRESH PASSED: directional threshold, release/cancel, single in-flight reload, offline preservation, account intent, feed mask and route/modal gates.');
}finally{open.forEach(d=>d.window.close())}})().catch(e=>{console.error(e);process.exitCode=1});
