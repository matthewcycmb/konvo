// Original onboarding keeps its live inbox reveal without the retired variant's
// loading overlay. Slow Instagram rows must never disable the Continue action.
const fs=require('fs'),assert=require('assert'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(__dirname+'/test_cage.js','utf8'),open=[];
const CAGE=['onboarding-views.js','onboarding-experiment.js','cage.js'].map(f=>fs.readFileSync(__dirname+'/../src-tauri/src/'+f,'utf8')).join('\n');
const ua='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const boot=new Function('JSDOM','CAGE','IPHONE','DESKTOP','open',source.slice(source.indexOf('function boot('),source.indexOf('const settle ='))+';return boot;')(JSDOM,CAGE,ua,'',open);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const rows='<div>Messages</div><div role="list"><div role="button" tabindex="0"><img alt="" src="https://example.test/avatar.png"><span>Fixture person</span><span>Fixture message</span></div></div>';
function start(content){return boot('/direct/inbox/','<div id="mount_ig"><div role="main">'+content+'</div></div>',{experiment:{variant:'test',enrolled:true},bridge:(m,d)=>{const replies={entitlements:{entitled:false},products:{ok:false},cageStatus:{supported:false}};if(m.cmd in replies)d.window.__konvoStoreReply(m.id,replies[m.cmd]);}});}
(async()=>{
 const ready=start(rows),late=start('<div role="progressbar"></div>');await wait(7200);
 assert(ready.window.document.querySelector('[data-act=keep]'),'actual reveal must mount');
 assert(!ready.window.document.querySelector('#im-pay [role=status]'),'visible message rows must clear the inbox loader without headings or thread anchors');
 assert(!late.window.document.querySelector('#im-pay [role=status]'),'original reveal must not inherit the retired loading overlay');
 await wait(15500);
 assert(late.window.document.querySelector('[data-act=keep]'),'slow inbox keeps original Continue available');
 late.window.document.querySelector('#mount_ig [role=main]').innerHTML=rows;
 await wait(650);
 assert(!late.window.document.querySelector('#im-pay [role=status]'),'late inbox must still clear the timeout message');
 console.log('ORIGINAL INBOX REVEAL PASSED: no retired loading overlay; late rows preserve original Continue.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>open.forEach(d=>d.window.close()));
