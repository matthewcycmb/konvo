// Shipped main-page swipes are disabled; tab buttons retain their normal routing.
const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const CAGE=fs.readFileSync(__dirname+'/../src-tauri/src/cage.js','utf8');
const base=fs.readFileSync(__dirname+'/test_cage.js','utf8'),open=[];
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
let setup=base.slice(base.indexOf('function boot('),base.indexOf('const settle ='));
setup=setup.replace('  dom.window.eval(`','  if(opts.router)dom.window.require=opts.router;\n  dom.window.eval(`');
setup=setup.replace('  dom.window.eval(`','  dom.observers=[];const Observer=dom.window.MutationObserver;dom.window.MutationObserver=class extends Observer{constructor(callback){super(callback);dom.observers.push(this)}};\n  dom.window.eval(`');
const boot=new Function('JSDOM','CAGE','IPHONE','open',setup+';return boot;')(JSDOM,CAGE,IPHONE,open);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function closeFixtures(){open.forEach(d=>{d.window.dispatchEvent(new d.window.Event('pagehide'));d.observers.forEach(o=>o.disconnect());d.window.close()})}
function touch(d,type,x,y,target=d.window.document.body,count=1){const e=new d.window.Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:/end|cancel/.test(type)?[]:Array.from({length:count},()=>({clientX:x,clientY:y}))});target.dispatchEvent(e);return e;}
function swipe(d,dx=220,dy=0,target=d.window.document.body){const start=dx>0?70:300;touch(d,'touchstart',start,350,target);const move=touch(d,'touchmove',start+dx,350+dy,target);touch(d,'touchend',start+dx,350+dy,target);return move;}
async function fixture(path='/notifications/',{respond=true,deferCommit=false}={}){
 const routes=[],events=[];let d;
 const commit=()=>{d.window.document.querySelector('main,[role="main"]').innerHTML='<div id="surface">Synthetic destination</div>';};
 const router=()=>({getCometRouterDispatcher:()=>({withContext(){}}),browserHistory:{push(url){routes.push(url);if(!respond)return;const u=new URL(url,'https://www.instagram.com');Object.assign(d.window.__loc,{pathname:u.pathname,search:u.search,href:u.href});if(!deferCommit)commit();d.window.dispatchEvent(new d.window.PopStateEvent('popstate'));}}});
 d=boot(path,'<main><div id="surface">Synthetic page</div></main>',{paid:true,seed:{konvoHandle:'owner',konvoHandleUid:'1234567'},sseed:{konvoStoriesAccount:'1234567'},router,bridge:m=>events.push(m)});Object.defineProperty(d.window,'innerWidth',{value:390});
 // jsdom has no layout. Model rendered main content, including retained but
 // display:none route trees; visibility masking still occupies layout.
 const rect={x:0,y:100,top:100,left:0,right:390,bottom:500,width:390,height:400};
 d.window.HTMLElement.prototype.getClientRects=function(){return this.isConnected&&!this.closest('[hidden],[style*="display: none"],[style*="display:none"]')?[rect]:[]};
 d.window.HTMLElement.prototype.getBoundingClientRect=function(){return this.getClientRects()[0]||{width:0,height:0,top:0,bottom:0,left:0,right:0}};
 await wait(25);return{d,routes,events,commit};
}
(async()=>{try{
 for(const path of ['/direct/inbox/','/','/notifications/','/owner/']){
  const f=await fixture(path);
  for(const dx of [220,-220])assert.equal(swipe(f.d,dx).defaultPrevented,false,'Do not intercept horizontal gestures: '+path);
  await wait(50);
  assert.equal(f.d.window.__loc.pathname,path,'Both swipe directions leave the selected page unchanged');
  assert.deepEqual(f.routes,[],'Swiping must not navigate');
  assert.deepEqual(f.d.went,[],'Swiping must not reload');
  assert(!f.events.some(e=>['tab-prepare','tab-reveal'].includes(e.cmd)),'No swipe snapshot or animation');
 }
 const f=await fixture('/direct/inbox/');
 for(const [id,path] of [['im-stories','/'],['im-heart','/notifications/'],['im-me','/owner/'],['im-messages','/direct/inbox/']]){
  const before=f.routes.length;
  f.d.window.document.getElementById(id).click();
  assert.equal(f.routes.length,before+1,'One route change per tab tap');
  assert.equal(f.d.window.__loc.pathname,path,'Tab buttons still navigate');
  await wait(25);
 }
 assert.equal(f.events.filter(e=>e.cmd==='haptic').length,4,'Tab taps retain their haptics');
 assert(!f.events.some(e=>['tab-prepare','tab-reveal'].includes(e.cmd)),'Tab taps do not start the retired swipe animation');
 assert.deepEqual(f.d.went,[],'Tab buttons retain in-page routing');
 for(const path of ['/direct/t/fake/','/stories/friend/123/','/create/story/','/friend/','/direct/requests/']){
  const f=await fixture(path);for(const dx of [220,-220])swipe(f.d,dx);assert.equal(f.routes.length,0,'No main-tab navigation from pushed pages: '+path);
 }
 console.log('TAB SWIPE PASSED: both directions disabled on all four main pages; tab routing and haptics retained.');
}finally{closeFixtures()}})().catch(e=>{console.error(e);process.exitCode=1});
