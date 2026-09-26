// Real rendering regression: transformed Notes, safe-area layouts and reveal lifecycle.
// Uses a disposable Chrome profile and fabricated local inbox; never a signed-in browser.
const {spawn}=require('child_process');
const assert=require('node:assert/strict');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {pathToFileURL}=require('url');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'konvo-paywall-test-'));
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
  const shot=async name=>{const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'konvo114-'+name+'.png'),Buffer.from(r.data,'base64'))};
  const root="document.querySelector('#mount').shadowRoot";
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
  await call('Network.setBlockedURLs',{urls:['http://*','https://*']});
  const url=pathToFileURL(path.resolve(__dirname,'../experiments/preview.html')).href;
  for(const [width,height] of [[390,750],[375,623],[430,838]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
   await call('Page.navigate',{url});await until("typeof start==='function'");
   await evaluate(`document.querySelector('aside').style.display='none';Object.assign(document.querySelector('#device').style,{width:innerWidth+'px',height:innerHeight+'px',border:'0',borderRadius:'0',margin:'0'});
    document.querySelector('#username').value='a_long_instagram_username';
    document.querySelector('#demo-inbox').innerHTML='<h2>Inbox fixture</h2><div style="position:relative;height:110px;width:320px;overflow:hidden"><div style="position:absolute;left:0;top:0;width:70px;height:90px;transform:translateX(0px)"><span>Note A</span></div><div style="position:absolute;left:0;top:0;width:70px;height:90px;transform:translateX(90px)"><span>Note B</span></div><div style="position:absolute;left:0;top:0;width:70px;height:90px;transform:translateX(180px)"><span>Note C</span></div></div><a href="/direct/t/fixture">Fixture DM</a>';start('paywall');`);
   await delay(950);
   const metric=await evaluate(`(()=>{const r=${root},p=r.querySelector('.phone');const rect=s=>{const b=r.querySelector(s).getBoundingClientRect();return{top:b.top,bottom:b.bottom,height:b.height}};return{overflow:p.scrollHeight>p.clientHeight+1,plan:rect('.plan'),legal:rect('.legal'),inbox:rect('.inbox-stage'),boxes:['Note A','Note B','Note C'].map(t=>{const e=[...r.querySelectorAll('.kx-live div')].find(e=>e.childElementCount===0&&e.textContent===t),b=e.getBoundingClientRect();return{x:b.x,right:b.right}})}})()`);
   assert(!metric.overflow,`Overflow at ${width}×${height}`);assert(metric.legal.bottom<=height,'Legal links clipped');
   assert(metric.boxes[1].x>metric.boxes[0].right&&metric.boxes[2].x>metric.boxes[1].right,'Transformed Notes overlap');
   if(width===390)assert(metric.inbox.height>=260,'Annual and weekly pricing must leave room for the inbox: '+JSON.stringify(metric));
   await shot('paywall-'+width);console.log(JSON.stringify({width,height,...metric}));
   await evaluate("events=[];view.show('gift')");await delay(400);
   const giftMetric=await evaluate(`(()=>{const r=${root},p=r.querySelector('.phone'),rect=s=>{const b=r.querySelector(s).getBoundingClientRect();return{top:b.top,bottom:b.bottom,height:b.height}};return{overflow:p.scrollHeight>p.clientHeight+1,open:rect('[data-gift=open]'),art:rect('.gift-art'),caption:rect('.gift-caption'),animation:getComputedStyle(r.querySelector('.gift-present')).animationName,background:getComputedStyle(p).backgroundColor}})()`);
   assert(!giftMetric.overflow,`Gift overflow at ${width}×${height}: ${JSON.stringify(giftMetric)}`);
   assert(giftMetric.open.bottom<=height&&giftMetric.open.height>=56,'Gift button must stay visible');
   assert(giftMetric.art.top>=giftMetric.caption.bottom&&giftMetric.art.bottom<giftMetric.open.top,'Gift must fit between copy and button');
   assert.equal(giftMetric.animation,'konvo-gift-shake');assert.equal(giftMetric.background,'rgb(6, 11, 27)');
   assert.equal(await evaluate("events.filter(e=>e.event==='paywall_viewed'||e.event==='special_offer_viewed').length"),0,'Gift is not a paywall impression');
   await shot('gift-'+width);console.log(JSON.stringify({width,height,gift:giftMetric}));
   if(width===390){
    const shake=await evaluate(`(()=>{const el=${root}.querySelector('.gift-present'),a=el.getAnimations()[0];a.pause();a.currentTime=1512;const left=getComputedStyle(el).transform;a.currentTime=1680;const right=getComputedStyle(el).transform;a.play();return{left,right}})()`);
    assert.notEqual(shake.left,shake.right,'Gift shaking must move the present');
   }
   await evaluate(`${root}.querySelector('[data-gift=open]').click();${root}.querySelector('[data-gift=open]').click()`);
   assert.equal(await evaluate('view.stage()'),'gift','Gift opening has a short reveal');
   assert(await evaluate(`${root}.querySelector('[data-gift=open]').disabled`),'Block repeated opens');
   await until("view.stage()==='offer'");await delay(350);
   assert.equal(await evaluate("events.filter(e=>e.event==='special_offer_gift_opened').length"),1);
   assert.equal(await evaluate("events.filter(e=>e.event==='special_offer_viewed').length"),1);
   const offerMetric=await evaluate(`(()=>{const r=${root},p=r.querySelector('.phone'),rect=s=>{const b=r.querySelector(s).getBoundingClientRect();return{top:b.top,bottom:b.bottom,height:b.height}};return{overflow:p.scrollHeight>p.clientHeight+1,claim:rect('[data-offer=claim]'),legal:rect('.legal'),card:rect('.offer-plan')}})()`);
   assert(!offerMetric.overflow,`Offer overflow at ${width}×${height}: ${JSON.stringify(offerMetric)}`);assert(offerMetric.legal.bottom<=height,'Offer legal links clipped');assert(offerMetric.claim.height>=56,'Offer CTA must match larger reference');
   await shot('offer-'+width);console.log(JSON.stringify({width,height,offer:offerMetric}));
  }
  await evaluate("events=[];view.show('loading')");
  await delay(1150);
  assert.equal(await evaluate(`${root}.querySelector('[role=progressbar]').getAttribute('aria-valuenow')`),'85','Loading should pause at 85%');
  await until("view.stage()==='paywall'");
  assert(await evaluate(`${root}.querySelector('.sheet').inert`),'Purchase area should wait for the reveal');
  assert(await evaluate(`${root}.querySelector('[data-preview=purchase]').disabled`));
  await evaluate(`${root}.querySelector('[data-preview=purchase]').click()`);
  assert.equal(await evaluate("events.filter(e=>e.event==='plan_selected'||e.event==='paywall_viewed').length"),0,'No premature purchase/impression');
  const revealStarted=Date.now();await shot('reveal-start');await delay(180);await shot('reveal-middle');
  await until(`${root}.querySelector('.sheet').inert===false`);
  assert(Date.now()-revealStarted<1100,'Small reveal should be usable in about half a second');
  assert.equal(await evaluate("events.filter(e=>e.event==='paywall_viewed').length"),1);
  assert.equal(await evaluate("events.filter(e=>e.event==='paywall_reveal_completed').length"),1);
  assert.equal(await evaluate(`${root}.querySelector('[data-member-count]').textContent`),'1,000+');
  assert.equal(await evaluate(`${root}.querySelector('[data-preview=purchase]').disabled`),false);
  await shot('reveal-complete');
  await evaluate('events=[];view.show("loading")');await delay(950);await evaluate(`${root}.querySelector('#loading-continue').click()`);
  await until("view.stage()==='paywall'");
  await evaluate(`${root}.querySelector('#flow-back').click()`);await delay(700);
  assert.equal(await evaluate('view.stage()'),'commitment','Back navigation must cancel reveal');
  assert.equal(await evaluate("events.filter(e=>e.event==='paywall_viewed'||e.event==='paywall_reveal_completed').length"),0);
  // Exercise repeated forward taps against real browser timers and accessibility state.
  await evaluate("view.show('progress')");
  assert.equal(await evaluate(`${root}.querySelector('.continue').getAttribute('aria-disabled')`),'true');
  await evaluate(`for(let i=0;i<6;i++)${root}.querySelector('.continue').click()`);
  assert.equal(await evaluate('view.stage()'),'progress');
  await until(`${root}.querySelector('.continue').getAttribute('aria-disabled')===null`);
  await evaluate(`${root}.querySelector('.continue').click();for(let i=0;i<6;i++)${root}.querySelector('#skip-signature').click()`);
  assert.equal(await evaluate('view.stage()'),'commitment');
  await until(`${root}.querySelector('#skip-signature').getAttribute('aria-disabled')===null`);
  await evaluate(`${root}.querySelector('#skip-signature').click();for(let i=0;i<6;i++)${root}.querySelector('#loading-continue').click()`);
  assert.equal(await evaluate('view.stage()'),'loading');
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await evaluate("view.show('gift')");
  assert.equal(await evaluate(`getComputedStyle(${root}.querySelector('.gift-present')).animationName`),'none','Reduced motion stops gift shaking');
  await evaluate(`${root}.querySelector('[data-gift=open]').click()`);
  assert.equal(await evaluate('view.stage()'),'offer','Reduced motion opens the offer immediately');
  await evaluate("events=[];view.show('loading')");await until("view.stage()==='paywall'");
  assert.equal(await evaluate(`${root}.querySelector('.sheet').inert`),false,'Reduced motion should be immediately usable');
  assert.equal(await evaluate(`${root}.querySelector('[data-preview=purchase]').disabled`),false);
  assert.equal(await evaluate("events.filter(e=>e.event==='paywall_viewed').length"),1);
  assert.deepEqual(errors,[]);console.log('PAYWALL VISUAL PASSED: Notes, layouts, gift/open animation, separate impressions, 85% pause, short reveal, forward cooldown, back cancellation and reduced motion.');
 }finally{if(ws)ws.close();chrome.kill('SIGTERM')}
})().catch(e=>{console.error(e);process.exitCode=1});
