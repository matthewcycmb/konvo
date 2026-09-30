// Synthetic versions of the live Instagram tray/player inspected 2026-09-28.
// Exercises the shipped cage, never Instagram accounts or private endpoints.
const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const CAGE=fs.readFileSync(__dirname+'/../src-tauri/src/cage.js','utf8');
const base=fs.readFileSync(__dirname+'/test_cage.js','utf8');
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',open=[];
const boot=new Function('JSDOM','CAGE','IPHONE','open',base.slice(base.indexOf('function boot('),base.indexOf('const settle ='))+';return boot;')(JSDOM,CAGE,IPHONE,open);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const HOME='/?konvo_stories=1';
const item=(name,label='Story')=>`<li><div role="button" aria-label="${label}"><div><canvas></canvas><span role="link"><img src="https://example.com/avatar.png" alt="${name}'s profile picture"></span></div><div>${name}</div></div></li>`;
const fixture=`<main><div id="tray"><div><div><ul>${item('alex')}${item('sam','스토리')}</ul></div></div><button id="next" aria-label="Next" tabindex="-1"></button></div><article id="post">POST MUST STAY HIDDEN<ul>${item('post_author')}</ul></article><aside id="suggested"><ul><li><button aria-label="Suggested user"><img src="https://example.com/avatar.png">suggested</button></li></ul></aside></main>`;
const player='<section id="player"><video></video><div role="button"><svg aria-label="Fermer"><polyline points="20.643 3.357 12 12 3.353 20.647"></polyline></svg></div><textarea placeholder="Reply"></textarea></section>';
const ownCircle='<div id="own-story" role="button" tabindex="0"><span role="link"><img src="https://example.com/self.png" alt=""></span><svg aria-label="Plus icon"><line x1="12" x2="12" y1="3" y2="21"></line><line x1="21" x2="3" y1="12" y2="12"></line></svg><span>Your story</span><form><input type="file" accept="image/avif,image/jpeg,image/png"></form></div>';
const editor='<section id="editor"><canvas></canvas><canvas></canvas><header><button id="close-editor">Close</button></header><footer><div role="button" id="share-story">Share story</div></footer></section>';
function route(d,path){const q=path.indexOf('?');d.window.__loc.pathname=q<0?path:path.slice(0,q);d.window.__loc.search=q<0?'':path.slice(q);d.window.__loc.href='https://www.instagram.com'+path;d.window.dispatchEvent(new d.window.PopStateEvent('popstate'));}
(async()=>{try{
 const initial=boot('/direct/inbox/','<main><h1>Messages</h1></main>',{paid:true});await wait(40);
 assert.equal(initial.went.length,0,'Never redirect the startup inbox to Stories');
 assert.equal(initial.window.document.getElementById('im-messages').getAttribute('aria-current'),'page');
 assert(initial.window.document.getElementById('im-stories'),'Dedicated Stories tab');
 initial.window.document.getElementById('im-stories').click();
 assert.deepEqual(initial.went,[HOME],'Stories requires an explicit tap');

 // iPhone 16e / WebKit, inspected over USB: the native tray is a flex DIV
 // whose Story buttons are direct children. There are no UL/LI ancestors.
 const mobileItem=name=>item(name).replace(/^<li>|<\/li>$/g,'');
 const mobileFixture=`<main><div id="mobile-scroll" style="overflow-x:auto"><div id="mobile-tray" style="display:flex">${ownCircle}${mobileItem('mobile_friend')}${mobileItem('second_friend')}</div></div><article id="mobile-post">POST${mobileItem('post_author')}</article></main>`;
 const mobileEvents=[],mobile=boot(HOME,mobileFixture,{paid:true,bridge:m=>mobileEvents.push(m)});await wait(40);
 const md=mobile.window.document, native=md.querySelector('#mobile-tray [aria-label="Story"]');
 assert.equal(mobile.window.getComputedStyle(native).visibility,'visible','iPhone DIV-based Stories must be revealed');
 assert.equal(mobile.window.getComputedStyle(md.getElementById('own-story')).visibility,'visible','Native own circle without a ring/aria-label must remain visible');
 let pickerTaps=0;md.getElementById('own-story').onclick=()=>pickerTaps++;md.getElementById('own-story').click();assert.equal(pickerTaps,1,'Preserve Instagram’s photo picker handler');
 assert.equal(mobile.window.getComputedStyle(md.querySelector('#mobile-post [role=button]')).visibility,'hidden','A post author with a Story ring remains hidden');
 assert(!md.querySelector('#im-stories-view'),'Never replace the native iPhone row');
 let mobileTaps=0;native.onclick=()=>mobileTaps++;native.click();
 assert.equal(mobileTaps,1,'Preserve the native mobile tap handler');
 assert.equal(mobileEvents.filter(e=>e.event==='story_open_tapped').length,1,'Track native mobile taps');
 native.parentElement.insertAdjacentHTML('beforeend',mobileItem('late_mobile_friend'));await wait(150);
 assert.equal(mobile.window.getComputedStyle(md.querySelector('#mobile-tray').lastElementChild).visibility,'visible','Virtualized mobile Story controls remain visible');
 // Mobile player is a DIV portal; a hidden old-home Close icon precedes it.
 const closeGlyph='<div role="button"><svg aria-label="Close"><polyline points="20.643 3.357 12 12 3.353 20.647"></polyline></svg></div>';
 md.body.insertAdjacentHTML('afterbegin','<section style="display:none">'+closeGlyph+'<main><article>Old feed</article></main></section>');
 route(mobile,'/stories/mobile_friend/123/');
 md.body.insertAdjacentHTML('beforeend','<div id="mobile-player"><div><video></video></div><header><img width="32" height="32">'+closeGlyph+'</header><footer><textarea placeholder="Reply"></textarea></footer></div>');
 await wait(150);
 assert.equal(mobile.window.getComputedStyle(md.querySelector('#mobile-player video')).visibility,'visible','Reveal the actual DIV-based mobile player, not the first hidden Close icon');
 assert.equal(mobile.window.getComputedStyle(md.querySelector('#mobile-player textarea')).visibility,'visible','Keep the native reply controls visible');
 assert.equal(mobile.window.getComputedStyle(md.querySelector('article')).visibility,'hidden','Never reveal the old feed section');
 let mobilePaused=0;const mv=md.querySelector('#mobile-player video');mv.pause=()=>mobilePaused++;mv.dispatchEvent(new mobile.window.Event('play'));
 assert.equal(mobilePaused,0,'Native mobile Story playback is not suppressed');
 // Creating uses the actual native canvas editor, never a custom uploader.
 const ownOnly=boot(HOME,'<main><div>'+ownCircle+'</div><article id="old-feed">Old feed</article></main>',{paid:true});await wait(40);
 const od=ownOnly.window.document;
 assert.equal(ownOnly.window.getComputedStyle(od.getElementById('own-story')).visibility,'visible','Posting is available even when no friends have a Story');
 const originalPicker=od.querySelector('input[type=file]');
 route(ownOnly,'/create/story/');
 assert(od.documentElement.classList.contains('im-stories-creating'),'Mask old feed before the editor mounts');
 assert(ownOnly.window.sessionStorage.konvoStoriesAccount,'Preserve Stories return intent while composing');
 assert.equal(ownOnly.window.getComputedStyle(od.getElementById('old-feed')).visibility,'hidden');
 od.body.insertAdjacentHTML('beforeend',editor);await wait(150);
 assert.equal(ownOnly.window.getComputedStyle(od.querySelector('#editor canvas')).visibility,'visible','Native editor canvas is visible');
 assert.equal(ownOnly.window.getComputedStyle(od.getElementById('share-story')).visibility,'visible','Native Share action remains visible');
 od.body.insertAdjacentHTML('beforeend','<div role="dialog" id="discard"><button>Keep</button><button>Discard</button></div>');await wait(150);
 assert.equal(ownOnly.window.getComputedStyle(od.getElementById('discard')).visibility,'visible','Native discard/keep dialog stays accessible');
 assert.equal(ownOnly.window.getComputedStyle(od.getElementById('old-feed')).visibility,'hidden');
 od.getElementById('discard').remove();od.getElementById('editor').remove();route(ownOnly,'/');await wait(40);
 assert(!ownOnly.went.includes('/direct/inbox/'),'Cancel or share returns to Stories, not an unexpected Messages redirect');
 assert.equal(ownOnly.window.getComputedStyle(od.getElementById('own-story')).visibility,'visible');
 assert.equal(originalPicker,od.querySelector('input[type=file]'),'Never clone or reset the native picker');
 assert.equal(ownOnly.window.getComputedStyle(od.getElementById('old-feed')).visibility,'hidden');
 // The same own picker can carry an active ring without a plus or friends.
 od.querySelector('#own-story svg').remove();od.getElementById('own-story').insertAdjacentHTML('afterbegin','<canvas></canvas>');
 await wait(150);assert.equal(ownOnly.window.getComputedStyle(od.getElementById('own-story')).visibility,'visible','Active own picker remains available without friends');
 // Active own Story captions can be translated; opening still uses the player.
 od.getElementById('own-story').outerHTML='<div id="own-active" role="button"><canvas></canvas><img><span>Deine Story</span></div>'+mobileItem('friend');
 await wait(150);assert.equal(ownOnly.window.getComputedStyle(od.getElementById('own-active')).visibility,'visible');
 route(ownOnly,'/stories/my_account/123/');od.body.insertAdjacentHTML('beforeend',player);await wait(150);
 assert.equal(ownOnly.window.getComputedStyle(od.getElementById('player')).visibility,'visible','Own existing Story uses the same native viewer');
 route(ownOnly,'/direct/inbox/');await wait(40);
 assert(!ownOnly.window.sessionStorage.konvoStoriesAccount);assert(!od.documentElement.classList.contains('im-stories-creating'));
 const sent=[],d=boot(HOME,fixture,{paid:true,bridge:m=>sent.push(m)});await wait(50);
 const doc=d.window.document;
 assert(!d.went.includes('/direct/inbox/'));
 assert(doc.documentElement.classList.contains('im-stories-guard'),'Mask installed immediately');
 assert.equal(d.window.getComputedStyle(doc.querySelector('#post')).visibility,'hidden');
 assert.equal(d.window.getComputedStyle(doc.querySelector('#suggested')).visibility,'hidden');
 assert.equal(doc.querySelectorAll('#im-stories-view,.im-story-card').length,0,'No replacement Stories page or cloned cards');
 assert.equal(d.window.getComputedStyle(doc.querySelector('#tray [role=button]')).visibility,'visible','Show the original Instagram Story button');
 assert.equal(doc.querySelectorAll('#tray ul > li').length,2,'Keep Instagram’s original list intact');
 assert.equal(doc.getElementById('im-stories').getAttribute('aria-current'),'page');
 let next=0;doc.getElementById('next').onclick=()=>next++;
 assert.equal(d.window.getComputedStyle(doc.getElementById('next')).visibility,'visible');doc.getElementById('next').click();assert.equal(next,1,'Keep the native carousel control');
 let opened=0;doc.querySelector('#tray [role=button]').onclick=()=>{opened++;route(d,'/stories/alex/123/');doc.body.insertAdjacentHTML('beforeend',player);};
 doc.querySelector('#tray [role=button]').click();await wait(180);
 assert.equal(opened,1,'Use Instagram’s original Story click handler once');
 assert(doc.getElementById('player').classList.contains('im-stories-player'));
 assert.equal(d.window.getComputedStyle(doc.getElementById('player')).visibility,'visible');
 assert.equal(d.window.getComputedStyle(doc.getElementById('post')).visibility,'hidden','Feed stays hidden under the Story player');
 assert(!doc.documentElement.classList.contains('im-tabs-visible'),'Tabs do not cover Story replies');
 const video=doc.querySelector('video');video.getBoundingClientRect=()=>({height:1000,width:390});
 for(const type of ['wheel','touchmove']){const ev=new d.window.Event(type,{bubbles:true,cancelable:true});video.dispatchEvent(ev);assert(!ev.defaultPrevented,'Story video must support '+type);}
 const key=new d.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true});video.dispatchEvent(key);assert(!key.defaultPrevented);
 let paused=0;video.pause=()=>paused++;video.dispatchEvent(new d.window.Event('play',{bubbles:false}));assert.equal(paused,0,'Story video playback must not be suppressed');
 const feedVideo=doc.createElement('video');feedVideo.pause=()=>paused++;doc.getElementById('post').append(feedVideo);feedVideo.dispatchEvent(new d.window.Event('play'));assert.equal(paused,1,'Hidden feed media cannot play');

 doc.getElementById('player').remove();route(d,'/');await wait(40);
 assert.equal(d.window.getComputedStyle(doc.querySelector('#tray [role=button]')).visibility,'visible','Native close returns to the original Stories row');
 assert.equal(d.window.getComputedStyle(doc.getElementById('post')).visibility,'hidden');
 doc.getElementById('im-messages').click();assert.equal(new URL(d.went.at(-1),'https://www.instagram.com').pathname,'/direct/inbox/');
 doc.querySelector('main').innerHTML='<h1>Messages</h1>';route(d,'/direct/inbox/');await wait(40);
 assert(!doc.getElementById('im-stories-view'));assert(!doc.documentElement.classList.contains('im-stories-guard'));
 assert.equal(d.window.getComputedStyle(doc.querySelector('main')).visibility,'visible','Cleanup restores Messages');
 assert(!d.window.sessionStorage.konvoStoriesAccount);

 for(const path of ['/','/?variant=following','/reels/','/explore/']){
  const b=boot(path,'<article>feed</article>',{paid:true});await wait(20);assert(b.went.includes('/direct/inbox/'),path+' remains blocked');
 }
 const lateEvents=[];
 const unavailable=boot(HOME,'<main><article>Changed/unknown layout</article></main>',{paid:true,bridge:m=>lateEvents.push(m)});await wait(20);
 assert.equal(unavailable.window.document.querySelectorAll('.im-story-card').length,0);
 unavailable.window.Date.now=()=>Date.now()+13000;unavailable.window.dispatchEvent(new unavailable.window.PopStateEvent('popstate'));
 assert(!unavailable.window.document.getElementById('im-stories-view'),'Slow loading must not add a custom page');
 assert.equal(unavailable.window.getComputedStyle(unavailable.window.document.querySelector('article')).visibility,'hidden','Unknown markup must never expose the feed');
 assert(unavailable.window.document.getElementById('im-messages'),'Messages remains the way out while Instagram loads');
 unavailable.window.document.querySelector('main').insertAdjacentHTML('afterbegin','<ul>'+item('late_friend')+'</ul>');
 await wait(180);
 assert.equal(unavailable.window.getComputedStyle(unavailable.window.document.querySelector('ul [role=button]')).visibility,'visible','Late native Stories should recover automatically');
 assert.equal(lateEvents.filter(m=>m.event==='stories_ready').length,1,'Record successful readiness even after a slow-load event');
 assert.equal(lateEvents.filter(m=>m.event==='stories_loading_slow').length,1);
 const fresh=boot(HOME,fixture,{bridge:()=>{}});await wait(20);assert(fresh.went.includes('/direct/inbox/'),'An unpaid deep link returns to onboarding');
 const loggedOut=boot(HOME,fixture,{paid:true,loggedOut:true});await wait(20);assert(loggedOut.went.includes('/direct/inbox/'));
 const changedAccount=boot('/',fixture,{paid:true,sseed:{konvoStoriesAccount:'other-account'}});await wait(20);assert(changedAccount.went.includes('/direct/inbox/'),'Story intent is scoped to the signed-in account');
 const storyLink=boot('/direct/inbox/','<a id="story-link" href="/stories/alex/123/"><img alt="alex profile picture"></a>',{paid:true});await wait(30);assert.notEqual(storyLink.window.document.getElementById('story-link').style.display,'none','Story avatars outside main stay accessible');
 const reel=boot('/reel/shared/','<video></video>',{paid:true});await wait(20);const wheel=new reel.window.Event('wheel',{bubbles:true,cancelable:true});reel.window.document.dispatchEvent(wheel);assert(wheel.defaultPrevented,'Reel feed swipes remain blocked');
 assert(sent.filter(m=>m.cmd==='track'&&/^stor/.test(m.event||m.productId||'')).every(m=>!JSON.stringify(m).includes('alex')),'No friend handles in telemetry');
 console.log('STORIES PASSED: messages-first, explicit entry, native Stories row, native click/close, media gestures, feed mask, delayed native tray, account/auth gates and cleanup.');
}finally{open.forEach(d=>d.window.close());}})().catch(e=>{console.error(e);process.exitCode=1});
