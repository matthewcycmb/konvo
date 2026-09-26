// The restored original flow follows system appearance except its dark S5-S7 stretch.
const fs=require('fs'),assert=require('assert'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(__dirname+'/test_onboarding.js','utf8');
const HTML=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
const SCRIPTS=[...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const open=[],IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)';
const boot=new Function('JSDOM','HTML','SCRIPTS','IPHONE','open',source.slice(source.indexOf('function boot('),source.indexOf('const settle ='))+';return boot;')(JSDOM,HTML,SCRIPTS,IPHONE,open);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const dom=boot({onboardingPreview:true,onboarded:true,entitled:true,experiment:{variant:'test',enrolled:true}}),w=dom.window,d=w.document;
 await sleep(150);assert.equal(dom.appearance[0],'auto');assert.equal(dom.appearance.at(-1),'auto');
 let now=Date.now();w.Date.now=()=>now;
 async function tap(sel){now+=10000;d.querySelector(sel).click();await sleep(300);}
 await tap('#s1 [data-next]');await tap('#s2c .opt');await tap('#s3 .opt');await tap('#s4 .opt');
 assert(d.querySelector('#s4b').classList.contains('on'));assert.equal(dom.appearance.at(-1),'auto');
 await sleep(3400);assert(d.querySelector('#s5').classList.contains('on'));assert.equal(dom.appearance.at(-1),'dark');
 await tap('#s5');assert(d.querySelector('#s6').classList.contains('on'));assert.equal(dom.appearance.at(-1),'dark');
 await tap('#s6 [data-next]');assert(d.querySelector('#s7').classList.contains('on'));assert.equal(dom.appearance.at(-1),'dark');
 await tap('#s7 [data-next]');assert.equal(dom.appearance.at(-1),'auto');
 console.log('ORIGINAL THEME PASSED: system hero/calculation -> dark years/comparison/saved -> system next page.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>open.forEach(d=>d.window.close()));
