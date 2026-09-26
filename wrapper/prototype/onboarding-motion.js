// Local preview motion only: no analytics, account access, or real member counts.
(() => {
  let ringFrame=0, countFrame=0, completionTimer=0;
  let animations=[];
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  function animate(el,frames,options){if(el&&!reduced()){const a=el.animate(frames,options);animations.push(a);return a}}
  function cancel(){cancelAnimationFrame(ringFrame);cancelAnimationFrame(countFrame);clearTimeout(completionTimer);animations.forEach(a=>a.cancel());animations=[]}
  function countMembers(root=document){
    cancelAnimationFrame(countFrame);
    const numbers=[...root.querySelectorAll('[data-member-count]')],start=performance.now();
    function tick(now){
      const t=reduced()?1:Math.min(1,(now-start)/1200);
      const value=Math.round(800+200*(1-Math.pow(1-t,3)));
      numbers.forEach(n=>n.textContent=value.toLocaleString('en-US')+'+');
      if(t<1)countFrame=requestAnimationFrame(tick);
    }
    if(numbers.length)tick(start);
  }
  function revealPaywall(root=document){
    countMembers(root);
    const ease='cubic-bezier(.16,1,.3,1)';
    animate(root.querySelector('.inbox-intro'),[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,easing:ease,fill:'backwards'});
    animate(root.querySelector('.inbox-stage'),[{opacity:0,transform:'translateY(42px) scale(.96)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:950,delay:100,easing:ease,fill:'backwards'});
    animate(root.querySelector('.sheet'),[{opacity:0,transform:'translateY(22px)'},{opacity:1,transform:'translateY(0)'}],{duration:750,delay:270,easing:ease,fill:'backwards'});
  }
  function exitLoading(root=document,onComplete=()=>{}){
    cancel();
    const scene=root.querySelector('.loading-step');
    if(reduced()){onComplete();return}
    animate(scene,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-12px)'}],{duration:350,easing:'ease-in',fill:'forwards'});
    completionTimer=setTimeout(onComplete,350);
  }
  function startLoading(root=document,onComplete=()=>{}){
    cancel();
    const ring=root.querySelector('.loading-ring-fill'),label=root.querySelector('.loading-status');
    const value=root.querySelector('.loading-value'),check=root.querySelector('.loading-check');
    const progress=root.querySelector('[role="progressbar"]');
    if(!ring)return;
    check.hidden=true;value.hidden=false;label.textContent='Making room for what matters.';
    const start=performance.now();
    function tick(now){
      // Quick rise to 85%, a brief hold, then a smooth finish. Preview timing only.
      const elapsed=reduced()?2300:Math.max(0,now-start);
      const finish=Math.min(1,Math.max(0,(elapsed-1400)/900));
      const amount=elapsed<950?.85*(1-Math.pow(1-elapsed/950,3)):elapsed<1400?.85:.85+.15*finish*finish*(3-2*finish);
      ring.style.strokeDashoffset=String(100*(1-amount));
      value.textContent=Math.round(amount*100)+'%';
      progress.setAttribute('aria-valuenow',String(Math.round(amount*100)));
      if(elapsed<2300){ringFrame=requestAnimationFrame(tick);return}
      value.hidden=true;check.hidden=false;label.textContent='You’re ready.';
      animate(check,[{opacity:0,transform:'scale(.65)'},{opacity:1,transform:'scale(1)'}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});
      completionTimer=setTimeout(onComplete,reduced()?200:220);
    }
    tick(start);
  }
  function personalize(root=document,handle){
    const supplied=handle||new URLSearchParams(location.search).get('username');
    const safe=supplied?.replace(/^@/,'');
    const name=safe&&/^[a-zA-Z0-9._]{1,30}$/.test(safe)?safe:'your_username';
    root.querySelectorAll('[data-instagram-username]').forEach(n=>n.textContent='@'+name);
    root.querySelector('.phone')?.classList.toggle('has-long-username',name.length>20);
  }
  window.KonvoPreviewMotion={cancel,countMembers,revealPaywall,exitLoading,startLoading,personalize};
  addEventListener('pagehide',cancel);
})();
