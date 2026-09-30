// Delayed Instagram route commits must not re-enable retired swipe transitions.
const fs=require('fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/test_tab_swipe.js','utf8');
const harness=source.slice(0,source.indexOf('(async()=>{try{'));
const {fixture,swipe,wait,closeFixtures}=new Function('require','__dirname',harness+';return {fixture,swipe,wait,closeFixtures}')(require,__dirname);
(async()=>{try{
 for(const [path,button,destination] of [['/direct/inbox/','im-stories','/'],['/owner/','im-heart','/notifications/']]){
  const f=await fixture(path,{deferCommit:true}),doc=f.d.window.document;
  f.d.window.document.getElementById(button).click();
  assert.equal(f.d.window.__loc.pathname,destination,'Tap changes the route before its content arrives');
  const noise=doc.createElement('aside');doc.body.append(noise);
  const timer=setInterval(()=>noise.replaceChildren(doc.createElement('span')),12);
  try{
   for(const dx of [220,-220])assert.equal(swipe(f.d,dx).defaultPrevented,false);
   await wait(180);f.commit();await wait(1000);
   assert.equal(f.routes.length,1,'Only the explicit tab tap navigates, including after DOM changes');
   assert(!f.events.some(e=>['tab-prepare','tab-reveal'].includes(e.cmd)),'No delayed swipe overlay or animation');
   assert.deepEqual(f.d.went,[],'No fallback reload');
  }finally{clearInterval(timer)}
 }
 console.log('TAB SWIPE TIMING PASSED: gestures remain disabled through asynchronous tab commits and background mutations.');
}finally{closeFixtures()}})().catch(e=>{console.error(e);process.exitCode=1});
