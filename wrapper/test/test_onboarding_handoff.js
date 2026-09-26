// Run the shipped page scripts with a slow native navigation: the old document
// stays alive while WKWebView waits for Instagram's first response.
const fs=require('fs'),assert=require('assert'),{JSDOM}=require('jsdom');
const HTML=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
const SCRIPTS=[...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const source=fs.readFileSync(__dirname+'/test_onboarding.js','utf8'),open=[];
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const boot=new Function('JSDOM','HTML','SCRIPTS','IPHONE','open',source.slice(source.indexOf('function boot('),source.indexOf('const settle ='))+';return boot;')(JSDOM,HTML,SCRIPTS,IPHONE,open);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function signIn(dom){const w=dom.window,d=w.document;let now=Date.now()+10000;w.Date.now=()=>now;const next=d.querySelector('#s1 [data-next]');next.dataset.next='s9t';next.click();now+=10000;d.querySelector('#signin').click();d.querySelector('#signin').click();}
(async()=>{
 const quiz=boot({experiment:{enrolled:true,variant:'test'}}),payer=boot({entitled:true});await wait(200);
 signIn(quiz);await wait(1400);
 assert.equal(quiz.nav.length,1,'one native sign-in request, even after repeated taps');
 assert.equal(quiz.went.length,0,'a slow native request must not be restarted by a browser navigation');
 assert.equal(payer.nav.length,1);assert.equal(payer.went.length,0,'subscriber reinstall must not restart its native request either');
 assert(quiz.window.document.querySelector('#signin-recovery').hidden,'no retry affordance during a normal handoff');
 await wait(7000);
 const retry=quiz.window.document.querySelector('#signin-retry');
 assert(!retry.parentElement.hidden,'a stalled navigation offers recovery');
 assert.equal(quiz.nav.length,1,'waiting must never restart the native request automatically');
 retry.click();retry.click();assert.equal(quiz.nav.length,2,'an explicit retry starts once and then locks again');
 assert(retry.parentElement.hidden);assert.equal(quiz.went.length,0);
 const fallback=boot();await wait(200);delete fallback.window.webkit;signIn(fallback);
 assert.equal(fallback.went.length,1,'without a native bridge, use browser navigation exactly once');
 console.log('HANDOFF REGRESSION PASSED: slow native login and subscriber navigation stay single; browser fallback retained.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>open.forEach(d=>d.window.close()));
