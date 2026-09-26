// Real rendering regression for the shipped wrapper: synthetic messages only.
// Uses a disposable Chrome profile and fabricated local inbox; never a signed-in browser.
const {spawn}=require('child_process');
const assert=require('node:assert/strict');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {pathToFileURL}=require('url');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'konvo-wrapper-test-'));
 const chrome=spawn(process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
 let ws;
 try{
  let port;
  for(let i=0;i<100;i++){await delay(100);try{port=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];break}catch{}}
  assert(port,'Chrome did not start');
  const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
  let id=0;const pending=new Map(),errors=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text)};
  const call=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value};
  const until=async expression=>{for(let i=0;i<110;i++){if(await evaluate(expression))return;await delay(50)}throw Error('Timed out: '+expression)};
  const shot=async name=>{const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'konvo127-'+name+'.png'),Buffer.from(r.data,'base64'))};
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
  await call('Network.setBlockedURLs',{urls:['http://*','https://*']});
  const fixture=path.join(profile,'fixture.html');
  fs.writeFileSync(fixture,'<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#0c1013;color:#fff;font:16px system-ui}main{padding:20px}h1{font-size:24px}#read{font-weight:400}#unread{font-weight:700}.row{padding:24px 0;border-bottom:1px solid #272b30}.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#0a5cf0;margin-left:10px}</style><main><h1>Messages</h1><div role="row" class="row"><div dir="auto" id="read">Read conversation</div></div><div role="row" class="row"><div dir="auto" id="unread">Unread conversation <i class="dot"></i></div></div><a id="native-notifications" href="https://www.instagram.com/notifications/">Native notifications</a></main>');
  const cage=fs.readFileSync(path.resolve(__dirname,'../src-tauri/src/cage.js'),'utf8');
  for(const [width,height] of [[375,623],[390,750],[430,838]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
   await call('Emulation.setUserAgentOverride',{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1'});
   await call('Page.navigate',{url:pathToFileURL(fixture).href});await until("!!document.querySelector('#read')");
   await evaluate(`window.__loc={hostname:'www.instagram.com',pathname:'/direct/inbox/',href:'https://www.instagram.com/direct/inbox/',search:'',hash:'',assign:()=>{throw Error('Unexpected navigation')},replace:()=>{throw Error('Unexpected redirect')}};
    Object.defineProperty(document,'cookie',{get:()=> 'ds_user_id=1234567'});
    localStorage.konvoPaid='1';localStorage.konvoWelcomed='1';localStorage.konvoNotifyAsked='1';
    window.fetch=()=>new Promise(()=>{});window.webkit={messageHandlers:{konvoStore:{postMessage:m=>{const replies={entitlements:{entitled:true},cageStatus:{active:true,supported:true,passAvailable:true,passesLeft:2},onboardingContext:{variant:'test',enrolled:true}};if(m.cmd in replies)setTimeout(()=>window.__konvoStoreReply(m.id,replies[m.cmd]),0)}}}};
    document.querySelector('#native-notifications').onclick=e=>{e.preventDefault();window.nativeClicks=(window.nativeClicks||0)+1;window.__loc.pathname='/notifications/';window.dispatchEvent(new PopStateEvent('popstate'));};`);
   await evaluate('(function(location){'+cage+'})(window.__loc)');
   await until("document.documentElement.classList.contains('im-caged')");
   const metrics=()=>evaluate(`(()=>{const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};return{bar:rect(document.querySelector('#im-tabs')),display:getComputedStyle(document.querySelector('#im-tabs')).display,buttons:[...document.querySelector('#im-tabs').children].map(rect),read:getComputedStyle(document.querySelector('#read')).fontWeight,unread:getComputedStyle(document.querySelector('#unread')).fontWeight}})()`);
   const inbox=await metrics();assert.equal(inbox.display,'flex');assert.equal(inbox.bar.bottom,height);assert.equal(inbox.buttons.length,4);
   for(let i=0;i<4;i++){const b=inbox.buttons[i];assert(b.w>=44&&b.h>=44,'Accessible tap target');assert(b.x>=0&&b.right<=width,'Button must fit');assert.equal(b.y,inbox.buttons[0].y);assert.equal(b.w,inbox.buttons[0].w);if(i)assert(b.x>=inbox.buttons[i-1].right,'No overlap');}
   assert.equal(inbox.read,'400');assert.equal(inbox.unread,'700');assert(await evaluate("document.querySelector('.dot').getBoundingClientRect().width>0"),'Never hide unread dots');
   await shot('bottom-nav-'+width);
   await evaluate("document.querySelector('#im-heart').click()");await delay(850);
   assert.equal(await evaluate('window.nativeClicks'),1,'Delegate once to Instagram router');assert.deepEqual((await metrics()).bar,inbox.bar);
   await evaluate("window.__loc.pathname='/fixture_profile/';window.dispatchEvent(new PopStateEvent('popstate'))");await delay(850);assert.deepEqual((await metrics()).buttons,inbox.buttons,'Tabs must not move on profile');
   await evaluate("window.dispatchEvent(new Event('konvo-cage-paused'))");assert.equal(await evaluate("document.querySelector('#im-pass').getAttribute('aria-label')"),'Block Instagram');assert.equal(await evaluate("document.documentElement.classList.contains('im-caged')"),false);
   await evaluate("window.__loc.pathname='/direct/t/fixture/';window.dispatchEvent(new PopStateEvent('popstate'));let v=document.createElement('video');v.id='media';v.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain';document.body.append(v)");await delay(850);
   const media=await evaluate("(()=>{const r=document.querySelector('#media').getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,zoom:document.documentElement.style.zoom,bar:getComputedStyle(document.querySelector('#im-tabs')).display}})()");
   assert.equal(media.left,0);assert.equal(media.right,width);assert.equal(media.width,width);assert.equal(media.bar,'none');assert(['','1'].includes(media.zoom));
   await shot('shared-media-'+width);console.log(JSON.stringify({width,height,inbox,media}));
  }
  const quiz=fs.readFileSync(path.resolve(__dirname,'../dist/index.html'),'utf8').replace(/<script>[\s\S]*?<\/script>/g,'');
  const quizFile=path.join(profile,'quiz.html');fs.writeFileSync(quizFile,quiz);
  for(const [width,height] of [[375,623],[390,750]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
   await call('Page.navigate',{url:pathToFileURL(quizFile).href});await until("!!document.querySelector('#s3 .opt')");
   await evaluate("document.documentElement.className='ios onboard';document.querySelectorAll('.screen').forEach(e=>e.classList.remove('on'));document.querySelector('#s3').classList.add('on')");await delay(650);
   const initial=await evaluate("(()=>{const b=document.querySelector('#s3 .body'),opts=[...b.querySelectorAll('.opt')];return{count:opts.length,first:opts[0].textContent,last:opts.at(-1).getBoundingClientRect().bottom,overflow:getComputedStyle(b).overflowY,scroll:b.scrollHeight,client:b.clientHeight}})()");
   assert.equal(initial.count,7);assert.equal(initial.first,'5+ hours');
   assert(initial.last<=height || (['auto','scroll'].includes(initial.overflow)&&initial.scroll>initial.client),'Every choice must be visible or scrollable: '+JSON.stringify(initial));
   await evaluate("document.querySelector('#s3 .body').scrollTop=10000");await delay(100);
   const last=await evaluate("(()=>{const e=document.querySelector('#s3 .opt:last-child'),r=e.getBoundingClientRect();return{bottom:r.bottom,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e}})()");
   assert(last.bottom<=height&&last.hit,'Not sure must remain tappable on a small phone');await shot('original-choices-'+width);
  }
  assert.deepEqual(errors,[]);console.log('WRAPPER VISUAL PASSED: four stable tabs, native router delegation, read/unread styles, Screen Time recovery UI and uncropped media at three widths.');
 }finally{if(ws)ws.close();chrome.kill('SIGTERM')}
})().catch(e=>{console.error(e);process.exitCode=1});
