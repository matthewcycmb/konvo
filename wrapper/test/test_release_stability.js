const fs = require('fs'), assert = require('assert'), {JSDOM} = require('jsdom');
const CAGE=fs.readFileSync(__dirname+'/../src-tauri/src/cage.js','utf8');
const base=fs.readFileSync(__dirname+'/test_cage.js','utf8');
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const open=[];
const boot=new Function('JSDOM','CAGE','IPHONE','open',base.slice(base.indexOf('function boot('),base.indexOf('const settle ='))+';return boot;')(JSDOM,CAGE,IPHONE,open);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 try {
  const messages=[];
  const d=boot('/direct/t/123/', '<div role="row"><div dir="auto">Read message</div></div><video style="width:100vw;height:100vh"></video>', {paid:true,bridge:m=>messages.push(m)});
  await wait(1000);
  assert(['','1'].includes(d.window.document.documentElement.style.zoom),'Shared media inside a thread must keep a 1:1 viewport');
  const inbox=boot('/direct/inbox/','<div role="row"><div dir="auto" id="read">Read thread</div></div>',{paid:true,bridge:()=>{}});
  await wait(1000);
  assert.notEqual(inbox.window.getComputedStyle(inbox.window.document.getElementById('read')).fontWeight,'500','Read inbox rows must retain Instagram unread/read styling');
  const bar=inbox.window.document.getElementById('im-tabs');
  assert(bar,'Inbox must have the shared bottom navigation');
  assert(bar.contains(inbox.window.document.getElementById('im-heart')));
  assert(bar.contains(inbox.window.document.getElementById('im-me')));
  assert(bar.contains(inbox.window.document.getElementById('im-pass')));
  assert(bar.querySelector('#im-messages'));
  inbox.window.__loc.pathname='/example_user/';inbox.window.dispatchEvent(new inbox.window.PopStateEvent('popstate'));
  await wait(1000);
  assert(inbox.window.document.documentElement.classList.contains('im-tabs-visible'),'Same bar stays available on profiles');
  inbox.window.__loc.pathname='/direct/t/321/';inbox.window.dispatchEvent(new inbox.window.PopStateEvent('popstate'));
  await wait(1000);
  assert(!inbox.window.document.documentElement.classList.contains('im-tabs-visible'),'The bar must not cover a chat composer');
  assert(messages.filter(m=>m.cmd==='track').every(m=>!JSON.stringify(m.props||{}).includes('Read message')));
  console.log('RELEASE STABILITY PASSED: stable viewport, read styling, persistent bottom controls, composer clearance');
 }finally{open.forEach(d=>d.window.close());}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
