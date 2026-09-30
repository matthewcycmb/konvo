// Story media swaps use Instagram's existing player portal. Its shell must
// remain visible before paint, including gaps between old/new media nodes.
const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const CAGE=fs.readFileSync(__dirname+'/../src-tauri/src/cage.js','utf8');
const base=fs.readFileSync(__dirname+'/test_cage.js','utf8'),open=[];
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const boot=new Function('JSDOM','CAGE','IPHONE','open',base.slice(base.indexOf('function boot('),base.indexOf('const settle ='))+';return boot;')(JSDOM,CAGE,IPHONE,open);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function route(d,path){d.window.__loc.pathname=path;d.window.__loc.search='';d.window.dispatchEvent(new d.window.PopStateEvent('popstate'));}
const close='<header><div role="button"><svg aria-label="Close"><polyline points="20.643 3.357 12 12 3.353 20.647"></polyline></svg></div></header>';
(async()=>{try{
 const d=boot('/?konvo_stories=1','<main><article id="feed">Feed</article></main>',{paid:true});const w=d.window,doc=w.document;await wait(30);
 route(d,'/stories/friend/1/');
 doc.body.insertAdjacentHTML('beforeend','<div id="viewer">'+close+'<video></video><footer><textarea></textarea></footer></div>');
 await wait(15);
 const viewer=doc.getElementById('viewer');
 assert.equal(w.getComputedStyle(viewer.querySelector('video')).visibility,'visible','New Story media must not wait for the 100ms feed/tray scan');
 assert.equal(w.getComputedStyle(doc.getElementById('feed')).visibility,'hidden');
 viewer.querySelector('video').remove();
 route(d,'/stories/friend/2/');await wait(15);
 assert.equal(w.getComputedStyle(viewer.querySelector('header')).visibility,'visible','Keep the verified player shell visible between media nodes');
 viewer.insertAdjacentHTML('beforeend','<img id="next-photo">');
 const photo=doc.getElementById('next-photo');photo.getBoundingClientRect=()=>({width:390,height:693});
 await wait(15);assert.equal(w.getComputedStyle(photo).visibility,'visible','Next photo appears without an extra wrapper delay');
 // On iPhone, Instagram's native cube animation overlaps two panes. The
 // outgoing photo shell can stay mounted while an incoming video slides in.
 doc.body.insertAdjacentHTML('beforeend','<div id="viewer2">'+close+'<video></video></div>');await wait(15);
 assert.equal(w.getComputedStyle(doc.querySelector('#viewer2 video')).visibility,'visible','Incoming cube-transition pane must not be masked while the previous pane remains mounted');
 assert.equal(w.getComputedStyle(photo).visibility,'visible','Outgoing pane stays visible during the native animation');
 let incomingPauses=0;const incomingVideo=doc.querySelector('#viewer2 video');incomingVideo.pause=()=>incomingPauses++;
 incomingVideo.dispatchEvent(new w.Event('play'));
 assert.equal(incomingPauses,0,'A valid incoming Story video must not be paused as if it were hidden feed media');
 viewer.remove();await wait(15);
 assert.equal(w.getComputedStyle(doc.querySelector('#viewer2 video')).visibility,'visible');
 assert.equal(w.getComputedStyle(doc.getElementById('feed')).visibility,'hidden');
 // A retired responsive player is never a valid active boundary.
 doc.getElementById('viewer2').parentElement.insertAdjacentHTML('beforeend','<div style="display:none"><div>'+close+'<video></video></div></div>');await wait(15);
 assert.equal(doc.querySelectorAll('.im-stories-player').length,1);
 doc.getElementById('viewer2').remove();route(d,'/');await wait(20);
 assert.equal(doc.querySelectorAll('.im-stories-player').length,0,'Release player on close');
 assert.equal(w.getComputedStyle(doc.getElementById('feed')).visibility,'hidden','Closing a Story never exposes the home feed');
 console.log('STORY TRANSITIONS PASSED: immediate player, media gaps, replacement, hidden copies and feed isolation.');
}finally{open.forEach(d=>d.window.close())}})().catch(e=>{console.error(e);process.exitCode=1});
