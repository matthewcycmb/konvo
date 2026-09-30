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
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'konvo-checkout-visual-'));
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
  const shot=async name=>{const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'konvo-checkout-'+name+'.png'),Buffer.from(r.data,'base64'))};
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
  await call('Emulation.setFocusEmulationEnabled',{enabled:true});
  await call('Network.setBlockedURLs',{urls:['http://*','https://*']});


  const fixture=path.join(profile,'fixture.html');
  fs.writeFileSync(fixture,`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;background:#000;color:#fff;font:16px system-ui}main{padding:130px 28px 40px}input,main button{display:block;box-sizing:border-box;min-height:44px;width:100%;margin:12px 0;font:16px system-ui}main button{background:#0a5cf0;color:white;border:0;border-radius:8px}</style><main><h2>Instagram</h2><input name="username" aria-label="Username"><input type="password" aria-label="Password"><button type="button">Log in</button></main>`);
  const cage=fs.readFileSync(path.resolve(__dirname,'../src-tauri/src/cage.js'),'utf8');
  async function boot(mode, language='en', trial=7, fresh=false){
    await call('Page.navigate',{url:pathToFileURL(fixture).href});await until("!!document.querySelector('main')");
    await evaluate(`localStorage.clear();sessionStorage.clear();${fresh?'':"localStorage.konvoDone='1';"}
      Object.defineProperty(navigator,'languages',{value:[${JSON.stringify(language)}]});
      window.__loc={hostname:'www.instagram.com',pathname:${JSON.stringify(mode==='login'?'/accounts/login/':'/direct/inbox/')},href:'https://www.instagram.com/',search:'',hash:'',assign:()=>{},replace:()=>{}};
      Object.defineProperty(document,'cookie',{get:()=>${JSON.stringify(mode==='login'?'':'ds_user_id=1234567')}});window.fetch=()=>new Promise(()=>{});
      window.webkit={messageHandlers:{konvoStore:{postMessage:m=>{const replies={entitlements:{entitled:false,accessState:'none'},products:{ok:true,yearly:{productId:'konvo.pro.yearly',price:'CA$34.99',perMonth:'CA$2.92',trialDays:${trial}},monthly:{productId:'konvo.pro.monthly',price:'CA$6.99'},lifetime:{price:'CA$99.99'}},onboardingContext:{variant:'control'}};if(m.cmd in replies)setTimeout(()=>window.__konvoStoreReply(m.id,replies[m.cmd]),0)}}}};`);
    await evaluate('(function(location){'+cage+'})(window.__loc)');
    if(fresh){
      for(let i=0;i<220&&!await evaluate("!!document.querySelector('[data-act=keep]')");i++)await delay(50);
      for(const [act,next] of [['keep','try'],['try','try-go'],['try-go','offer-go'],['offer-go','pay'],['pay','buy-y']]){
        await evaluate(`document.querySelector('[data-act="${act}"]').click()`);
        await until(`!!document.querySelector('[data-act="${next}"]')`);
      }
    }
    await until(mode==='login'?"!!document.querySelector('#im-sheet')":"!!document.querySelector('[data-act=buy-y]')");await delay(500);
  }
  const rect=`e=>{const b=e.getBoundingClientRect();return {top:b.top,bottom:b.bottom,height:b.height,left:b.left,right:b.right}}`;
  for(const scheme of ['light','dark'])for(const [width,height] of [[375,623],[390,750],[430,838]]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:scheme}]});
    await call('Emulation.setUserAgentOverride',{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1'});
    await boot('paywall');
    const metric=await evaluate(`(()=>{const r=${rect};return {summary:r(document.querySelector('.imp-checkout-summary')),cta:r(document.querySelector('[data-act=buy-y]')),plans:r(document.querySelector('[data-act=pk-y]')),legal:r(document.querySelector('.imp-links')),main:r(document.querySelector('.imp-mid')),pageWidth:document.querySelector('.imp-page').scrollWidth}})()`);
    assert(metric.cta.bottom<=metric.summary.top,'Charge summary follows CTA');
    assert(metric.legal.bottom<=height&&metric.cta.height>=44,'Purchase and legal links must remain visible');
    assert(metric.pageWidth<=width,'No horizontal overflow');
    assert(metric.main.height>=150,'Timeline must remain usable on small devices');
    assert(metric.plans.bottom<=metric.cta.top&&metric.plans.top>=metric.main.bottom,'Both plan choices must be visible above the purchase button');
    await shot('trial-'+scheme+'-'+width);
    await evaluate("document.querySelector('.imp-cancel-help').open=true");await delay(100);
    assert(await evaluate("document.querySelector('.imp-links').getBoundingClientRect().bottom<=innerHeight"),'Expanding cancellation help must retain legal links');
    await evaluate("document.querySelector('[data-act=pk-m]').click()");await delay(100);
    assert((await evaluate("document.querySelector('.imp-checkout-summary').textContent")).includes('CA$6.99 charged today.'));
    console.log(JSON.stringify({scheme,width,height,...metric}));
  }
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:750,deviceScaleFactor:1,mobile:false});
  await boot('paywall','fr',0);
  assert((await evaluate("document.querySelector('.imp-checkout-summary').textContent")).includes('CA$34.99 facturés'));
  await shot('french-no-trial');
  await boot('paywall','en',7,true);
  assert((await evaluate("document.querySelector('.imp-checkout-mid h2').textContent")).includes('Start your 7-day FREE'));
  await shot('first-time-trial');
  await boot('login');
  const help=await evaluate(`(${rect})(document.querySelector('[data-act=login_help]'))`);
  assert(help.height>=44&&help.left>=0,'Help button remains tappable');
  assert(!await evaluate("!!document.querySelector('#im-login-help')"),'Help is opt-in');
  await evaluate("document.querySelector('[data-act=login_help]').click()");
  const box=await evaluate(`(${rect})(document.querySelector('#im-login-help'))`);
  assert(box.left>=0&&box.right<=390&&box.bottom<750,'Help panel fits phone');
  await shot('login-help');
  await evaluate("document.querySelector('input').focus()");
  assert(!await evaluate("!!document.querySelector('#im-login-help')"),'Editing closes help');
  assert.deepEqual(errors,[]);
  console.log('CHECKOUT/LOGIN VISUAL PASSED: three sizes, light/dark, plan changes, expanded cancellation help, French no-trial, opt-in login help');
 }finally{if(ws)ws.close();chrome.kill('SIGTERM')}
})().catch(e=>{console.error(e);process.exitCode=1});
