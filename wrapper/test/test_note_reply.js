// Native iPhone Notes replies are fixed presentation portals on the inbox
// route, not a new thread URL. No real messages or credentials are used.
const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const CAGE=fs.readFileSync(__dirname+'/../src-tauri/src/cage.js','utf8');
const base=fs.readFileSync(__dirname+'/test_cage.js','utf8'),open=[];
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const boot=new Function('JSDOM','CAGE','IPHONE','open',base.slice(base.indexOf('function boot('),base.indexOf('const settle ='))+';return boot;')(JSDOM,CAGE,IPHONE,open);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
 const d=boot('/direct/inbox/','<main><input type="search"><h1>Messages</h1><a id="native-inbox-link" href="/direct/inbox/">Messages</a></main>',{paid:true});
 const w=d.window,doc=w.document;await wait(30);
 const tabs=doc.getElementById('im-tabs');
 assert.equal(w.getComputedStyle(tabs).display,'flex');
 const bottomSpace=w.getComputedStyle(doc.body).paddingBottom;
 const assertStableLayout=()=>{
  assert.equal(w.getComputedStyle(doc.body).paddingBottom,bottomSpace,'Opening or closing a Note must preserve the tab spacer');
  assert.equal(w.getComputedStyle(doc.getElementById('native-inbox-link')).display,'none','Do not restore duplicate Instagram navigation behind a Note');
 };
 assertStableLayout();
 // Observed on iPhone: role=presentation, z-index 100, a fixed bottom
 // sheet and a contenteditable role=textbox. The route stays /direct/inbox/.
 doc.body.insertAdjacentHTML('beforeend','<div id="note-reply" role="presentation" style="position:fixed;inset:0;z-index:100"><div style="position:fixed;bottom:0;height:172px"><div id="reply" role="textbox" contenteditable="true" style="height:46px;width:324px">draft</div></div></div>');
 const reply=doc.getElementById('reply');
 reply.getBoundingClientRect=()=>({x:33,y:688,left:33,top:688,right:357,bottom:734,width:324,height:46});
 await wait(25);
 assert.equal(w.getComputedStyle(tabs).display,'none','The native Note composer must be tappable before focus, without waiting for an 800ms route sweep');
 assertStableLayout();
 assert.equal(reply.textContent,'draft');
 reply.focus();doc.dispatchEvent(new w.Event('visibilitychange'));await wait(25);
 assert.equal(w.getComputedStyle(tabs).display,'none','Keep tabs hidden when returning with a Note still open');
 assertStableLayout();
 doc.getElementById('note-reply').style.display='none';await wait(25);
 assert.equal(w.getComputedStyle(tabs).display,'flex','Hidden retained Note portals must not hide navigation');
 assertStableLayout();
 doc.getElementById('note-reply').style.display='block';await wait(25);
 assert.equal(w.getComputedStyle(tabs).display,'none','Reused visible Note portal hides navigation again');
 assertStableLayout();
 doc.getElementById('note-reply').remove();await wait(25);
 assert.equal(w.getComputedStyle(tabs).display,'flex','Restore navigation when the Note closes');
 assertStableLayout();
 assert.equal(doc.querySelector('main input').type,'search','Inbox search remains untouched');
 console.log('NOTE REPLY PASSED: unobstructed composer, stable background layout, hidden/reused portals, dismissal and preserved text.');
}finally{open.forEach(d=>d.window.close())}})().catch(e=>{console.error(e);process.exitCode=1});
