const fs=require('fs'),assert=require('assert'),{JSDOM}=require('jsdom');
const CAGE=fs.readFileSync(process.env.KONVO_CAGE_SOURCE||__dirname+'/../src-tauri/src/cage.js','utf8');
const base=fs.readFileSync(__dirname+'/test_cage.js','utf8');
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',open=[];
const boot=new Function('JSDOM','CAGE','IPHONE','open',base.slice(base.indexOf('function boot('),base.indexOf('const settle ='))+';return boot;')(JSDOM,CAGE,IPHONE,open);
(async()=>{try{
 for(const path of ['/notifications/','/fixture_owner/','/direct/inbox/']){
  const sent=[];boot(path,'<main>Signed in page</main>',{welcomed:true,seed:{konvoHandle:'fixture_owner',konvoHandleUid:'1234567'},bridge:m=>sent.push(m)});
  await new Promise(r=>setTimeout(r,60));
  assert(sent.some(m=>m.cmd==='appearance'&&m.productId==='auto'),'Every signed-in document must restore phone appearance even when no old login sheet exists: '+path);
 }
 console.log('AUTHENTICATED APPEARANCE PASSED: system mode restored on inbox, notifications, profile');
}finally{open.forEach(d=>d.window.close())}})().catch(e=>{console.error(e);process.exitCode=1});
