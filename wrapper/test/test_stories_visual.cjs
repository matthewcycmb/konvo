// Real Chromium layout/visibility checks using synthetic Stories only.
// The full shipped cage runs in <head>, before the feed fixture is parsed.
const {spawn}=require('child_process'),assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path'),{pathToFileURL}=require('url');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'konvo-stories-visual-'));
 const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+dir,'about:blank'],{stdio:'ignore'});
 let ws;
 try{
  let port;for(let i=0;i<100;i++){await delay(100);try{port=fs.readFileSync(path.join(dir,'DevToolsActivePort'),'utf8').split('\n')[0];break}catch{}}
  assert(port,'Chrome must start');
  const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
  let id=0;const pending=new Map(),errors=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text)};
  const call=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value};
  const until=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(50)}throw Error('Timed out: '+expression)};
  await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
  await call('Network.setBlockedURLs',{urls:['http://*','https://*']});
  await call('Emulation.setUserAgentOverride',{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1'});
  const setup=`window.__loc={hostname:'www.instagram.com',pathname:'/',search:'?konvo_stories=1',hash:'',href:'https://www.instagram.com/?konvo_stories=1',assign:u=>window.destination=u,replace:u=>{throw Error('Unexpected redirect: '+u)},reload:()=>{window.storyReloads=(window.storyReloads||0)+1}};
   Object.defineProperty(document,'cookie',{get:()=> 'ds_user_id=1234567'});localStorage.konvoPaid='1';localStorage.konvoWelcomed='1';localStorage.konvoNotifyAsked='1';
   window.fetch=()=>new Promise(()=>{});window.webkit={messageHandlers:{konvoStore:{postMessage:m=>{const r={entitlements:{entitled:true},cageStatus:{supported:true,active:false},onboardingContext:{}};if(m.cmd in r)setTimeout(()=>window.__konvoStoreReply(m.id,r[m.cmd]),0)}}}};`;
  const cage=fs.readFileSync(path.resolve(__dirname,'../src-tauri/src/cage.js'),'utf8');
  const avatar=name=>'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#284a73"/><text x="40" y="52" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="34">${name[0].toUpperCase()}</text></svg>`);
  const own='<li><div id="own-story" role="button" tabindex="0"><img src="'+avatar('you')+'"><svg aria-label="Plus icon" width="12" height="12" style="position:absolute;right:6px;top:50px"><line x1="12" x2="12" y1="3" y2="21"></line><line x1="21" x2="3" y1="12" y2="12"></line></svg><span>Your story</span><form style="display:none"><input type="file" accept="image/avif,image/jpeg,image/png"></form></div></li>';
  const cards=own+['alex' ,'sam','jamie','maya','morgan','leo','sophie','taylor'].map(name=>`<li><div role="button" aria-label="Story"><canvas></canvas><img src="${avatar(name)}"><div>${name}</div></div></li>`).join('');
  const fixture=path.join(dir,'stories.html');
  fs.writeFileSync(fixture,'<!doctype html><html class="phone-touch"><head><base href="https://www.instagram.com/"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{height:100%}.phone-touch .native-body{overflow-y:visible!important}body{height:100%;margin:0;color:#262626;font:12px -apple-system,BlinkMacSystemFont,sans-serif}#native-carousel{position:relative;margin-top:16px;max-width:100%}#native-scroll{overflow-x:auto;scrollbar-width:none}ul{display:flex;gap:12px;list-style:none;padding:8px 12px;margin:0;width:max-content}li{flex:none;width:76px;text-align:center}li [role=button]{cursor:pointer;position:relative}li canvas{position:absolute;top:0;left:2px;width:68px;height:68px;border:2px solid #e2438d;border-radius:50%;box-sizing:border-box}li img{width:60px;height:60px;margin:4px 8px 10px;border-radius:50%}#native-next{position:absolute;right:8px;top:30px;border:0;border-radius:50%;width:24px;height:24px;background:#fff;box-shadow:0 1px 4px #777}article,aside{position:fixed;inset:150px 0 0;background:red;font:80px sans-serif;color:#fff}#player{position:fixed;inset:0;background:#000}@media(prefers-color-scheme:dark){body{color:#f5f5f7}}</style><script>'+setup+'(function(location){'+cage+'})(window.__loc);</script></head><body class="native-body"><main><div id="native-carousel"><div id="native-scroll"><ul id="native-tray">'+cards+'</ul></div><button id="native-next" aria-label="Next" tabindex="-1">›</button></div><div style="display:none"><ul id="duplicate-tray">'+cards+'</ul></div><article id="post">POSTS MUST NEVER SHOW</article><aside id="ads">SUGGESTED CONTENT</aside><div id="hidden-feed-tail" style="height:2200px">Hidden feed height</div></main><script>window.firstVisibility=getComputedStyle(document.getElementById("post")).visibility;window.originalTray=document.getElementById("native-tray");window.originalStory=originalTray.querySelector("[role=button]");window.originalBounds=originalStory.getBoundingClientRect().toJSON();</script></body></html>');
  const desktopFixture=fs.readFileSync(fixture,'utf8');
  for(const layout of ['desktop-list','iphone-div'])for(const [width,height] of [[320,568],[390,750],[430,838]])for(const theme of ['light','dark']){
   fs.writeFileSync(fixture,layout==='desktop-list'?desktopFixture:desktopFixture.replace(/<ul/g,'<div data-native-row').replace(/<\/ul>/g,'</div>').replace(/<li>/g,'<div data-native-item>').replace(/<\/li>/g,'</div>').replace(/ul\{/g,'[data-native-row]{').replace(/li\{/g,'[data-native-item]{').replace(/li /g,'[data-native-item] '));
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
   await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:theme}]});
   await call('Page.navigate',{url:pathToFileURL(fixture).href});await until("document.querySelector('#native-tray [role=button]') && document.querySelector('#native-tray [role=button]').classList.contains('im-story-native') && !!document.querySelector('#im-pass') && !document.querySelector('#im-boot')");
   const metrics=await evaluate(`(()=>{const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};return{first:window.firstVisibility,posts:getComputedStyle(document.querySelector('#post')).visibility,ads:getComputedStyle(document.querySelector('#ads')).visibility,bg:getComputedStyle(document.documentElement).backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth,tabs:[...document.querySelector('#im-tabs').children].map(rect),cards:[...document.querySelectorAll('#native-tray [role=button]')].map(e=>({...rect(e),visible:getComputedStyle(e).visibility}))}})()`);
   assert.equal(metrics.first,'hidden','No feed visible when HTML first parses');assert.equal(metrics.posts,'hidden');assert.equal(metrics.ads,'hidden');assert.equal(metrics.overflow,false);
   assert.equal(metrics.bg,theme==='dark'?'rgb(12, 16, 19)':'rgb(255, 255, 255)');assert.equal(metrics.tabs.length,5);
   assert.equal(await evaluate("document.querySelectorAll('#im-stories-view,.im-story-card,#im-stories-more').length"),0,'No custom Stories UI');
   assert.equal(await evaluate("originalTray===document.getElementById('native-tray') && originalStory===originalTray.querySelector('[role=button]')"),true,'Preserve native DOM nodes');
   assert.deepEqual(await evaluate("originalStory.getBoundingClientRect().toJSON()"),await evaluate('originalBounds'),'Keep the native row geometry');
   assert.equal(await evaluate("document.querySelector('#duplicate-tray').getBoundingClientRect().height"),0,'Hidden responsive tray stays hidden');
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#native-next')).visibility"),'visible','Keep native carousel arrows');
   for(const t of metrics.tabs){assert(t.w>=44&&t.h>=44);assert(t.x>=0&&t.right<=width);assert(t.bottom<=height)}
   for(const c of metrics.cards){assert(c.w>=44&&c.h>=44);assert.equal(c.visible,'visible');assert.equal(c.y,metrics.cards[0].y,'Native circles stay in one row')}
   assert.equal(await evaluate("document.elementFromPoint(50,50).closest('#native-tray')!==null"),true,'Native circles receive touches');
   assert.equal(await evaluate("document.querySelector('#native-scroll').scrollWidth>document.querySelector('#native-scroll').clientWidth"),true,'Original row remains horizontally scrollable');
   // Assigning scrollLeft succeeds even when a hidden overflow ancestor
   // rejects finger scrolling. Exercise the browser's actual touch default.
   await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:250,y:55}]});
   for(let i=1;i<=12;i++){
    await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:250-i*15,y:55}]});
    await delay(20);
   }
   await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(350);
   assert(await evaluate("document.querySelector('#native-scroll').scrollLeft>80"),'A finger swipe must scroll the native Stories carousel');
   await evaluate("document.querySelector('#native-scroll').scrollLeft=0");
   // Instagram's touch-layout rule has two classes and overrides a
   // weaker body overflow lock after its native announcement is dismissed.
   await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:160,y:300}]});
   for(let i=1;i<=12;i++){
    await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:160,y:300-i*15}]});
    await delay(20);
   }
   await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(250);
   assert.equal(await evaluate("document.body.scrollTop + document.documentElement.scrollTop"),0,'Stories home must reject vertical finger scrolling through hidden feed space');
   // Horizontal momentum may still settle by a pixel after the preceding
   // carousel swipe. This check concerns vertical lock and circle sizing.
   const verticalGeometry=expression=>evaluate(`(()=>{const r=${expression};return{y:r.y,width:r.width,height:r.height}})()`);
   assert.deepEqual(await verticalGeometry('originalStory.getBoundingClientRect()'),await verticalGeometry('originalBounds'),'The Stories row must not move vertically');
   assert.equal(await evaluate('window.storyReloads||0'),0,'Horizontal and upward swipes never refresh');
   // A downward pull on a circle requests one refresh on release without
   // accidentally opening that Story or moving the underlying page.
   await evaluate('window.storyClicks=0;originalStory.onclick=()=>{window.storyClicks++}');
   await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:50,y:55}]});
   for(let i=1;i<=12;i++){
    await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:50,y:55+i*12}]});await delay(20);
   }
   assert.equal(await evaluate('window.storyReloads||0'),0,'Do not refresh before the finger is released');
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#im-stories-refresh')).visibility"),'visible','The pull indicator is visible through the feed mask');
   await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(100);
   assert.equal(await evaluate('window.storyReloads'),1,'A real downward touch requests exactly one reload');
   assert.equal(await evaluate('window.storyClicks'),0,'A pull on a circle must not open a Story');
   assert.equal(await evaluate("document.body.scrollTop + document.documentElement.scrollTop"),0,'Refresh keeps the Stories page vertically fixed');
   assert.deepEqual(await verticalGeometry('originalStory.getBoundingClientRect()'),await verticalGeometry('originalBounds'),'Pulling preserves circle size and vertical position');
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#post')).visibility"),'hidden','Feed remains masked while refreshing');
   const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('/tmp/konvo-native-stories-'+layout+'-'+width+'-'+theme+'.png',Buffer.from(shot.data,'base64'));
   // Preserve a stale Close glyph before the real native viewer. iPhone uses
   // a DIV portal with a header avatar; desktop uses SECTION.
   const playerTag=layout==='iphone-div'?'div':'section';
   await evaluate(`window.__loc.pathname='/stories/alex/123/';window.__loc.search='';window.dispatchEvent(new PopStateEvent('popstate'));document.body.insertAdjacentHTML('afterbegin','<section style="display:none"><svg><polyline points="20.643 3.357 12 12 3.353 20.647"></polyline></svg><main><article>Old home</article></main></section>');document.body.insertAdjacentHTML('beforeend','<div style="position:relative;z-index:0"><${playerTag} id="player"><img src="${avatar('alex')}" style="height:100%;width:100%;object-fit:contain"><div role="button"><svg aria-label="Close"><polyline points="20.643 3.357 12 12 3.353 20.647"></polyline></svg></div></${playerTag}></div>')`);
   assert.equal(await evaluate("new Promise(resolve=>requestAnimationFrame(()=>resolve(getComputedStyle(document.querySelector('#player img')).visibility)))"),'visible','The newly mounted Story must be visible by the next frame, without a 100ms wrapper delay');
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#post')).visibility"),'hidden');
   assert.equal(await evaluate("document.elementFromPoint(innerWidth/2,innerHeight/2).closest('#player')!==null"),true,'Native player must be on top and interactive');
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#im-tabs')).display"),'none');
   // Retain the native shell across a media gap and paint replacement media
   // on its first frame, not after the tray's throttled scan.
   await evaluate("window.storyPhoto=document.querySelector('#player img');storyPhoto.remove();window.__loc.pathname='/stories/alex/124/';window.dispatchEvent(new PopStateEvent('popstate'))");
   assert.equal(await evaluate("new Promise(resolve=>requestAnimationFrame(()=>resolve(getComputedStyle(document.querySelector('#player [role=button]')).visibility)))"),'visible','Story controls stay visible between media items');
   await evaluate("document.getElementById('player').prepend(storyPhoto)");
   assert.equal(await evaluate("new Promise(resolve=>requestAnimationFrame(()=>resolve(getComputedStyle(storyPhoto).visibility)))"),'visible','Next Story media paints immediately');
   await evaluate(`document.body.insertAdjacentHTML('beforeend','<div id="incoming-player" style="position:fixed;inset:0;transform:translateX(30%) rotateY(-30deg)"><img src="${avatar('sam')}" style="width:100%;height:100%;object-fit:contain"><div role="button"><svg><polyline points="20.643 3.357 12 12 3.353 20.647"></polyline></svg></div></div>')`);
   assert.equal(await evaluate("new Promise(resolve=>requestAnimationFrame(()=>resolve(getComputedStyle(document.querySelector('#incoming-player img')).visibility)))"),'visible','Incoming pane must paint during Instagram’s overlapping cube transition');
   assert.equal(await evaluate("getComputedStyle(storyPhoto).visibility"),'visible','Keep outgoing pane visible during the native animation');
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#post')).visibility"),'hidden');
   await evaluate("document.getElementById('incoming-player').remove()");
   await evaluate("document.querySelector('#player').remove();window.__loc.pathname='/';window.dispatchEvent(new PopStateEvent('popstate'))");
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#post')).visibility"),'hidden','Close never exposes posts');
   await evaluate(`window.__loc.pathname='/create/story/';window.dispatchEvent(new PopStateEvent('popstate'));document.body.insertAdjacentHTML('beforeend','<section id="story-editor" style="position:fixed;inset:0;background:#1255aa"><canvas></canvas><header><button>Close</button></header><footer><div role="button">Share story</div></footer></section><div role="dialog" id="discard-dialog" style="position:fixed;top:40%;left:10%;width:80%;background:white;color:black;z-index:50"><h3>Discard photo?</h3><button>Keep</button><button>Discard</button></div>')`);
   await until("document.querySelector('#story-editor').classList.contains('im-stories-editor') && document.querySelector('#discard-dialog').classList.contains('im-story-dialog')");
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#story-editor canvas')).visibility"),'visible','Native editor stays visible');
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#discard-dialog button')).visibility"),'visible','Keep/discard controls stay visible');
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#post')).visibility"),'hidden','Editor never exposes old feed');
   assert.equal(await evaluate("document.elementFromPoint(innerWidth/2,innerHeight*.45).closest('#discard-dialog')!==null"),true,'Native dialog receives touches');
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#im-tabs')).display"),'none','Tabs never cover editor controls');
   await evaluate("document.querySelector('#story-editor').remove();document.querySelector('#discard-dialog').remove();window.__loc.pathname='/';window.dispatchEvent(new PopStateEvent('popstate'))");
   await until("document.querySelector('#own-story').classList.contains('im-story-native')");
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#own-story')).visibility"),'visible','Return to native own circle');
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#post')).visibility"),'hidden');
   await evaluate(`window.require=()=>({getCometRouterDispatcher:()=>({withContext(){}}),browserHistory:{push(path){window.__loc.pathname=path;window.__loc.search='';window.dispatchEvent(new PopStateEvent('popstate'));}}});document.querySelector('#im-messages').click()`);
   assert.equal(await evaluate("window.__loc.pathname"),'/direct/inbox/','Native router changes the destination');
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#post')).visibility"),'hidden','SPA tab departure never reveals the old feed');
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#im-tabs')).display"),'flex');
   await evaluate("document.querySelector('#native-tray').closest('main').innerHTML='<h1 id=returned-inbox>Messages</h1>'");
   await until("!document.querySelector('.im-stories-retired')");
   assert.equal(await evaluate("getComputedStyle(document.querySelector('#returned-inbox')).visibility"),'visible','Reused destination main must render');
   console.log('STORIES VISUAL',layout,width,height,theme,'passed');
  }
  assert.deepEqual(errors,[]);console.log('STORIES VISUAL PASSED: feed masking, horizontal touch scrolling, downward pull refresh, native player isolation, light/dark, 320/390/430px and accessible five-tab layout.');
 }finally{if(ws)ws.close();chrome.kill('SIGTERM')}
})().catch(e=>{console.error(e);process.exitCode=1});
