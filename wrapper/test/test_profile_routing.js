// Execute the shipped wrapper at the profile-button call site.
const fs=require('fs'),assert=require('assert'),{JSDOM}=require('jsdom');
const CAGE=fs.readFileSync(__dirname+'/../src-tauri/src/cage.js','utf8');
const base=fs.readFileSync(__dirname+'/test_cage.js','utf8');
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const open=[];
const boot=new Function('JSDOM','CAGE','IPHONE','open',base.slice(base.indexOf('function boot('),base.indexOf('const settle ='))+';return boot;')(JSDOM,CAGE,IPHONE,open);
(async()=>{
 try{
  for(const page of ['/notifications/','/direct/inbox/']){
   const d=boot(page,'<h1>Notifications</h1>',{paid:true,seed:{konvoMe:'Notifications',konvoHandle:'fixture_owner',konvoHandleUid:'1234567'},bridge:()=>{}});
   d.window.document.querySelector('h1').getBoundingClientRect=()=>({top:20,width:180});
   d.window.document.querySelector('#im-me').click();
   assert(d.went.some(x=>new URL(x,'https://www.instagram.com').pathname==='/fixture_owner/'),'Profile must use verified account handle, never a page heading or unverified legacy cache: '+JSON.stringify(d.went));
  }
  const d=boot('/direct/inbox/','<div role="button"><h2><span>fixture_actual</span></h2><svg><path d="M12 17.502anything"></path></svg></div>',{paid:true,seed:{konvoMe:'Notifications'},bridge:()=>{}});
  d.window.document.querySelector('h2').getBoundingClientRect=()=>({top:20,width:160});
  d.window.document.querySelector('#im-me').click();
  assert(d.went.some(x=>new URL(x,'https://www.instagram.com').pathname==='/fixture_actual/'),'Read account switcher on inbox, ignore corrupt legacy cache');
  assert.equal(d.window.localStorage.konvoHandleUid,'1234567');
  d.window.__loc.pathname='/notifications/';d.window.document.body.insertAdjacentHTML('afterbegin','<h1>Notifications</h1>');
  d.window.document.querySelector('#im-me').click();
  assert.equal(new URL(d.went.at(-1)).pathname,'/fixture_actual/');
  const unknown=boot('/notifications/','<h1>Notifications</h1>',{paid:true,seed:{konvoMe:'Notifications'},bridge:()=>{}});
  unknown.window.document.querySelector('#im-me').click();
  assert.equal(new URL(unknown.went.at(-1)).pathname,'/direct/inbox/','Unknown identity returns to account selector, never Edit profile or a guessed username');
  unknown.window.__loc.pathname='/direct/inbox/';
  unknown.window.document.body.insertAdjacentHTML('afterbegin','<div role="button"><h2>fixture_recovered</h2><svg><path d="M12 17.502test"></path></svg></div>');
  unknown.window.document.querySelector('h2').getBoundingClientRect=()=>({top:20,width:160});
  unknown.window.dispatchEvent(new unknown.window.PopStateEvent('popstate'));
  await new Promise(r=>setTimeout(r,100));
  assert.equal(new URL(unknown.went.at(-1)).pathname,'/fixture_recovered/','Resume the profile tap after the account selector becomes ready');
  console.log('PROFILE ROUTING PASSED: verified account cache, actual inbox account selector, notifications, corrupt legacy cache');
 }finally{open.forEach(d=>d.window.close())}
})().catch(e=>{console.error(e);process.exitCode=1});
