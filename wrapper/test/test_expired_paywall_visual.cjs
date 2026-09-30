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
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'konvo-expired-test-'));
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
  const shot=async name=>{const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'konvo-expired-'+name+'.png'),Buffer.from(r.data,'base64'))};
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
  await call('Network.setBlockedURLs',{urls:['http://*','https://*']});

  const fixture=path.join(profile,'inbox.html');
  fs.writeFileSync(fixture,`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#0c1013;color:#f5f5f5;font:16px system-ui}main{padding:18px}h2{margin:8px 0 22px;text-align:center;font-size:21px}.search{border-radius:20px;background:#25272e;padding:13px;color:#aaa;margin-bottom:24px}.notes{display:flex;gap:20px;margin-bottom:26px}.note{text-align:center;font-size:12px}.circle{width:60px;height:60px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#39434e;margin-bottom:7px}.row{display:flex;gap:14px;margin:22px 0}.row p{margin:4px 0;color:#9aa0ae;font-size:14px}</style><main><h2>your_instagram</h2><div class="search">⌕ &nbsp; Search</div><div class="notes">${['Your note','Alex','Sam','Morgan'].map((n,i)=>`<div class="note"><div class="circle">${['J','A','S','M'][i]}</div>${n}</div>`).join('')}</div><b>Messages</b>${['Jamie','Alex','Sam','Morgan','Taylor','Casey'].map(n=>`<div role="row" class="row"><div class="circle">${n[0]}</div><div><b>${n}</b><p>See you soon · 2m</p></div></div>`).join('')}</main>`);
  const cage=fs.readFileSync(path.resolve(__dirname,'../src-tauri/src/cage.js'),'utf8');
  const preview=fs.readFileSync(path.resolve(__dirname,'../src-tauri/src/onboarding-experiment.js'),'utf8');
  for(const scheme of ['light','dark'])for(const [width,height] of [[375,623],[390,750],[430,838]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
   await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:scheme}]});
   await call('Emulation.setUserAgentOverride',{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1'});
   await call('Page.navigate',{url:pathToFileURL(fixture).href});await until("!!document.querySelector('main')");
   await evaluate(`localStorage.clear();sessionStorage.clear();window.__loc={hostname:'www.instagram.com',pathname:'/direct/inbox/',href:'https://www.instagram.com/direct/inbox/',search:'',hash:'',assign:()=>{},replace:()=>{}};
    Object.defineProperty(document,'cookie',{get:()=> 'ds_user_id=1234567'});window.fetch=()=>new Promise(()=>{});
    window.webkit={messageHandlers:{konvoStore:{postMessage:m=>{const replies={entitlements:{entitled:false,accessState:'expired_trial'},products:{ok:true,yearly:{productId:'konvo.pro.yearly',price:'$24.99',perMonth:'$2.08'},monthly:{productId:'konvo.pro.monthly',price:'$4.99'},lifetime:{price:'$99.99'}},onboardingContext:{variant:'control'}};if(m.cmd in replies)setTimeout(()=>window.__konvoStoreReply(m.id,replies[m.cmd]),0)}}}};`);
   await evaluate('(function(location){'+preview+'})(window.__loc)');
   await evaluate('(function(location){'+cage+'})(window.__loc)');
   await until("!!document.querySelector('.imp-return-screen')?.shadowRoot");await delay(650);
   const metrics=await evaluate(`(()=>{const r=e=>{const b=e.getBoundingClientRect();return {top:b.top,bottom:b.bottom,height:b.height,left:b.left,right:b.right}};return {title:r(document.querySelector('.imp-return-title')),phone:r(document.querySelector('.imp-return-preview')),plans:r(document.querySelector('.imp-return-plans')),cta:r(document.querySelector('[data-act=buy-y]')),legal:r(document.querySelector('.imp-links')),overflow:document.querySelector('.imp-return').scrollHeight>document.querySelector('.imp-return').clientHeight+1,preview:document.querySelector('.imp-return-screen').shadowRoot.textContent,background:getComputedStyle(document.querySelector('#im-pay')).backgroundColor}})()`);
   assert(!metrics.overflow,'Unexpected scrolling '+JSON.stringify({width,height,metrics}));
   assert(metrics.legal.bottom<=height,'Legal links clipped');assert(metrics.cta.height>=44,'CTA tap target');assert(metrics.phone.height>=160,'Phone visible');assert(metrics.plans.top>=metrics.phone.bottom-1,'Phone overlaps plans');
   assert(metrics.preview.includes('Jamie'),'Personalized inbox visible');
   const ink=await evaluate("getComputedStyle(document.querySelector('[data-act=pk-y]')).color");assert.equal(ink,scheme==='dark'?'rgb(242, 243, 247)':'rgb(20, 29, 51)','Plan text follows the theme');
   await shot(scheme+'-'+width);console.log(JSON.stringify({scheme,width,height,...metrics,preview:undefined}));
  }
  const quiz=fs.readFileSync(path.resolve(__dirname,'../dist/index.html'),'utf8').replace(/<script>[\s\S]*?<\/script>/g,'');
  const quizFile=path.join(profile,'proof.html');fs.writeFileSync(quizFile,quiz);
  for(const scheme of ['light','dark'])for(const [width,height] of [[375,623],[390,750]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
   await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:scheme}]});
   await call('Page.navigate',{url:pathToFileURL(quizFile).href});await until("!!document.querySelector('#proof-cap')");
   await evaluate("document.documentElement.className='ios onboard';document.querySelectorAll('.screen').forEach(e=>e.classList.remove('on'));document.querySelector('#s9t').classList.add('on')");await delay(2000);
   assert.equal(await evaluate("document.querySelector('#proof-cap').textContent"),'Join 10,000+ people on Konvo');
   assert.equal(await evaluate("document.querySelectorAll('.laurel img').length"),0,'No stale number artwork');
   const spacing=await evaluate("(()=>{const r=s=>document.querySelector(s).getBoundingClientRect();return {above:r('.b2').bottom,start:r('#proof-cap').top,end:r('.proof-stars').bottom,below:r('.b3').top}})()");
   assert(spacing.above<=spacing.start&&spacing.end<=spacing.below,'Proof must not overlap reviews: '+JSON.stringify({width,height,spacing}));
   await shot('proof-'+scheme+'-'+width);
  }
  assert.deepEqual(errors,[]);console.log('EXPIRED PAYWALL VISUAL PASSED: three phone sizes, light/dark, actual inbox preview, plan/CTA/legal visibility and live social proof');
 }finally{if(ws)ws.close();chrome.kill('SIGTERM')}
})().catch(e=>{console.error(e);process.exitCode=1});
