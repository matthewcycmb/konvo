// The same native light-haptic bridge used by message sends. Never vibrates a device.
const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const CAGE=fs.readFileSync(__dirname+'/../src-tauri/src/cage.js','utf8');
const base=fs.readFileSync(__dirname+'/test_cage.js','utf8'),open=[];
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const boot=new Function('JSDOM','CAGE','IPHONE','open',base.slice(base.indexOf('function boot('),base.indexOf('const settle ='))+';return boot;')(JSDOM,CAGE,IPHONE,open);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
 const haptics=[],d=boot('/direct/inbox/','<main><button id="unrelated">Other control</button></main>',{paid:true,bridge:m=>{if(m.cmd==='haptic')haptics.push(m)}});await wait(30);
 const doc=d.window.document,heart=doc.getElementById('im-heart');
 heart.dispatchEvent(new d.window.Event('pointerdown',{bubbles:true}));heart.dispatchEvent(new d.window.Event('pointercancel',{bubbles:true}));
 assert.equal(haptics.length,0,'Cancelled presses do not vibrate');
 doc.getElementById('im-messages').click();assert.equal(haptics.length,0,'Current tab is a no-op');
 heart.querySelector('svg').dispatchEvent(new d.window.MouseEvent('click',{bubbles:true,cancelable:true}));
 assert.equal(haptics.length,1,'One haptic on a committed tab selection, including icon taps');
 assert.equal(new URL(d.went[0]).pathname,'/notifications/','Feedback never delays routing');
 doc.getElementById('unrelated').click();assert.equal(haptics.length,1,'Unrelated controls are untouched');
 const lock=doc.getElementById('im-pass');assert(lock.disabled);lock.click();assert.equal(haptics.length,1,'Disabled lock does not vibrate');
 doc.getElementById('im-me').setAttribute('aria-busy','true');doc.getElementById('im-me').click();assert.equal(haptics.length,1,'Pending profile lookup does not repeat haptics');
 console.log('TAB FEEDBACK PASSED: one committed haptic, no cancelled/disabled/current-tab feedback and immediate navigation.');
}finally{open.forEach(d=>d.window.close())}})().catch(e=>{console.error(e);process.exitCode=1});
