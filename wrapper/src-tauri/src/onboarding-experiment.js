// Production alternative to the original cage flow. Account content and signatures stay in memory.
(function () {
  'use strict';
  const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const forwardCooldown=900;
  function comparison(answers) {
    const a = answers || {};
    const before = Number(a.instagramMinutes), after = Number(a.messagingMinutes);
    const known = [45,90,150,210,300].includes(before) && [10,20,30,45,60].includes(after) && !a.instagramUnknown && !a.messagingUnknown;
    return {known, before: known ? before : null, after: known ? Math.min(before,after) : null,
      reduction: known ? Math.round(Math.max(0,1-after/before)*100) : null,
      range: typeof a.instagramLabel === 'string' ? a.instagramLabel : '', inconsistent: known && after>before};
  }
  function heading(handle) { return (handle?'<span data-instagram-username>'+escape('@'+handle)+'</span>, here’s':'Here’s')+' what your screen time could look like'; }
  function fmt(m) { return m >= 60 ? Math.floor(m/60)+'h'+(m%60?' '+m%60+'m':'') : m+'m'; }
  function bars(minutes,max) {
    // Same estimated average each day, on a shared scale; no invented usage history.
    const top=Math.max(60,Math.ceil(max/60)*60);
    return '<div class="kx-plot"><div class="kx-axis">'+[4,3,2,1,0].map(n=>'<span>'+Math.round(top*n/4)+'</span>').join('')+'</div><div class="kx-bars">'+[0,1,2,3].map(()=>'<i style="height:'+Math.max(2,minutes/top*100)+'%"></i>').join('')+'</div><div class="kx-days"><span>M</span><span>T</span><span>W</span><span>T</span></div></div>';
  }
  function chart(title,value,max,label) { return '<div class="kx-chart"><h2>'+title+'</h2><p>'+escape(label)+'</p><strong>'+fmt(value)+'</strong>'+bars(value,max)+'</div>'; }
  const overrides = `:host{display:block;height:100%;width:100%;color:#141d33;font:16px -apple-system,BlinkMacSystemFont,sans-serif;--blue:#0a5cf0;--ink:#141d33;--muted:#5d6478;--line:#d9d9de;--soft-blue:#eef3ff}*{box-sizing:border-box}.phone{width:100%!important;height:100%!important;min-height:0!important;border-radius:0!important;box-shadow:none!important;margin:0!important;padding-top:env(safe-area-inset-top);padding-bottom:max(12px,env(safe-area-inset-bottom));overflow-y:auto;background:#fff!important;color:#141d33;color-scheme:light}.topbar,.nav{flex:none;min-height:28px}.phone[data-step=commitment] #flow-back{visibility:visible}.content{min-height:0}.chart-card.comparison{display:flex;flex-direction:row!important;align-items:stretch!important;gap:8px;width:100%;margin-inline:0;min-height:170px;max-height:320px}.kx-chart{background:white;border:1px solid #dfe6ff;border-radius:15px;width:50%;height:100%;padding:15px 12px;display:flex;flex-direction:column}.kx-chart h2{font-size:20px;line-height:1.1;letter-spacing:-.7px;font-weight:750;margin:0 0 20px}.kx-chart p{font-size:11px;margin:0;color:#5d6478}.kx-chart strong{font-size:28px;color:#0a5cf0;letter-spacing:-1px}.kx-bars{flex:1;min-height:55px;margin-top:15px;display:flex;align-items:flex-end;gap:10px;border-bottom:1px solid #dfe6ff;background:repeating-linear-gradient(to top,transparent 0,transparent 24%,#edf1fa 25%)}.kx-bars i{flex:1;background:linear-gradient(#bcb5ff 0 10%,#a5e6f1 10% 20%,#0a5cf0 20%);border-radius:3px 3px 0 0}.kx-note{font-size:11px;line-height:1.4;color:#5d6478;margin:3px 0}.milestones{flex:none}.footer{padding-top:24px}.price{font-size:26px!important}.billing{font-size:12px!important}.inbox-device{pointer-events:none}.device-screen{background:#000;color:#f5f5f5;color-scheme:dark}.kx-live{position:absolute;inset:0;overflow:hidden;pointer-events:none}.kx-live>div{transform-origin:0 0}.kx-empty{padding:35px 14px;font-size:14px;text-align:center}.kx-error{color:#a11;font-size:12px;text-align:center;margin:5px 0}.kx-progress-header{font-size:28px!important}.cta:disabled{opacity:.55}.signature-wrap{min-height:140px}.inbox-intro{padding-top:7px}.inbox-intro h1{font-size:30px}.inbox-stage{min-height:100px}.phone .legal button{min-height:24px}.kx-plot{flex:1;min-height:60px;margin-top:14px;display:grid;grid-template-columns:18px 1fr;grid-template-rows:1fr 13px;gap:4px}.kx-axis{display:flex;flex-direction:column;justify-content:space-between;font-size:8px;color:#5d6478;text-align:right}.kx-plot .kx-bars{margin:0;min-height:0}.kx-days{grid-column:2;display:flex;justify-content:space-around;color:#5d6478;font-size:8px}.kx-unit{font-size:15px;font-weight:650}.price{line-height:1.1}.phone .billing{font-size:13px!important}.phone .plan{padding:10px 14px}.review-stars{display:block;color:#ffb000;font-size:19px;letter-spacing:1px;line-height:1.15}.kx-note summary{cursor:pointer;font-size:10px}.kx-note p{margin:5px 0}.phone[data-step=progress] .content{justify-content:flex-start;gap:8px}.phone[data-step=progress] .chart-card.comparison{flex:0 1 240px;min-height:160px;max-height:255px;margin-top:12px}.phone[data-step=progress] .milestones,.phone[data-step=progress] .community,.phone[data-step=progress] .quote{background:#f8f9fc}.phone[data-step=progress] .kx-chart h2{font-weight:800;margin-bottom:20px}.phone[data-step=progress] .footer{margin-top:auto}.kx-chart{padding:16px 12px}.kx-bars{gap:9px}.phone .reassurance{font-size:14px}.phone .legal{display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:nowrap}button,a{-webkit-tap-highlight-color:transparent}@media(max-height:700px){.kx-chart h2{font-size:17px;margin-bottom:12px}.kx-chart strong{font-size:24px}.chart-card.comparison{min-height:150px}.inbox-intro h1{font-size:25px}.phone .sheet{gap:6px}.commitment{padding-top:16px}.testimonials{display:none}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`;
  const paywallPolishStyles = `
    .phone[data-step=paywall]{padding-bottom:4px}
    .phone[data-step=paywall] .sheet{padding-top:17px}
    .phone[data-step=paywall] .inbox-device{width:min(72cqw,282px);transform:scale(.86);transform-origin:top center}
    .kx-plans{display:grid;gap:8px}
    .phone .kx-plans .plan{display:block;width:100%;font-family:inherit;text-align:left;border-color:#dce1e9;background:#fff;color:var(--ink);cursor:pointer}
    .phone .kx-plans .plan[aria-checked=true]{border-color:var(--blue);background:#f6f8ff}
    .kx-plans .plan:not([aria-checked=true]) .selected{background:none;border:1.5px solid #c8cfdd}
    .kx-plans .plan:not([aria-checked=true]) .selected svg{visibility:hidden}
    .kx-plans .plan:disabled{cursor:default;opacity:.6}
    .phone .kx-weekly{min-height:58px;display:flex!important;align-items:center;justify-content:space-between;padding-right:44px}
    .kx-weekly .plan-name{font-size:15px;margin:0 0 3px}.kx-weekly .billing{font-size:11px!important;margin:0}
    .kx-weekly .price{font-size:21px!important;margin:0}.kx-weekly .kx-unit{font-size:11px}
    .kx-weekly .selected{top:50%;transform:translateY(-50%)}
    .kx-save{position:absolute;left:50%;top:-15px;transform:translateX(-50%);background:var(--blue);color:white;border:2px solid white;border-radius:9px;padding:7px 15px;font-size:12px;line-height:1;letter-spacing:.65px;font-weight:800;white-space:nowrap;box-shadow:0 3px 9px #0a5cf021}
    .phone .kx-plans .kx-annual{padding-top:14px;padding-bottom:12px}
    .kx-annual .billing{text-align:left;margin-top:4px}
    .kx-annual[aria-checked=true]{box-shadow:0 3px 13px #0a5cf00d}
    .kx-save[hidden]{display:none}
    .kx-error:empty{display:none}
    .inbox-stage::after{height:48px}
    .inbox-device::before{content:'';position:absolute;inset:2px;background:#080a0c;border-radius:18% / 9%;z-index:0}
    .device-screen{z-index:1}
    .original-frame{z-index:2}
    .kx-forward-wait{opacity:.7;cursor:default}
    @media(max-height:700px){.inbox-stage::after{height:44px}.phone[data-step=paywall] .inbox-device{transform:scale(.76)}.phone .kx-plans .kx-annual{padding-top:10px;padding-bottom:9px}}
  `;
  function inboxRoot() {
    if(!document.body||location.hostname.endsWith('instagram.com')&&!/^\/direct\/(inbox)?\/?$/.test(location.pathname))return null;
    const owned=el=>el.closest('[id^="im-"],[id^="konvo-"]');
    function visible(el) {
      for(let node=el;node&&node!==document.documentElement;node=node.parentElement){
        const style=getComputedStyle(node);
        if(node.hidden||node.getAttribute('aria-hidden')==='true'||style.display==='none'||style.visibility==='hidden')return false;
      }
      return true;
    }
    // Instagram also renders conversation rows as div buttons/links. They
    // need no h1/h2 or href, and Notes can still be loading above real DMs.
    // Ignore our own headings, even when Instagram and our portal share a root.
    const signals='a[href*="/direct/t/"],h1,h2,[role=heading],[role=button],[role=link],[role=listitem],[role=row]';
    const candidates=[...document.querySelectorAll('main,[role=main]'),...document.body.children];
    return candidates.find(el=>!owned(el)&&!/^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName)&&visible(el)&&
      [...el.querySelectorAll(signals)].some(row=>!owned(row)&&visible(row)&&
        (row.matches('a[href*="/direct/t/"],h1,h2,[role=heading]')||row.querySelector('img')&&row.textContent.trim())))||null;
  }
  function mount(host, options) {
    let root, stage='', stopped=false, frame=0, timeout=0, signed=false, busy=false, nameTimer=0, paywallTimer=0, forwardTimer=0, forwardReadyAt=0, animations=[];
    let selectedPlan='annual', offerShown=false;
    function track(event, p={}) { options.track(event, Object.assign({screen_id:'new_'+stage, onboarding_version:'personalized_weekly_offer_v3',offer_flow_version:'gift_v1',paywall_id:stage==='offer'||stage==='gift'?'inbox_special_annual_v3':'inbox_annual_weekly_v3'},p)); }
    function availableOffer(p) {
      const o=p?.specialOffer,y=p?.yearly;
      return p?.ok!==false&&o?.offeringId==='konvo_special_offer_v1'&&o.productId==='konvo.pro.yearly.special'&&
        o.noIntroOffer===true&&!o.trialDays&&o.price&&o.currency&&o.currency===y?.currency&&
        Number.isFinite(Number(o.amount))&&Number(o.amount)>0&&Number(o.amount)<Number(y?.amount)?o:null;
    }
    function clear() { cancelAnimationFrame(frame); clearTimeout(timeout); clearTimeout(forwardTimer); clearInterval(paywallTimer); animations.forEach(a=>a.cancel());animations=[]; }
    function canAdvance(expected) { return !stopped&&stage===expected&&performance.now()>=forwardReadyAt; }
    function holdForward() {
      const controls=root.querySelectorAll('.continue,#commit-continue,#skip-signature,#loading-continue');
      forwardReadyAt=performance.now()+forwardCooldown;
      controls.forEach(el=>{el.setAttribute('aria-disabled','true');el.classList.add('kx-forward-wait');});
      forwardTimer=setTimeout(()=>controls.forEach(el=>{el.removeAttribute('aria-disabled');el.classList.remove('kx-forward-wait');}),forwardCooldown);
    }
    function animate(el, frames, timing) { if(el?.animate){const a=el.animate(frames,timing);animations.push(a);return a;} }
    function show(next) {
      if(stopped || busy) return;
      if((next==='offer'||next==='gift')&&!availableOffer(options.products()))return;
      const fromLoading=stage==='loading';
      const fromGift=stage==='gift';
      clear(); stage=next; busy=false;
      options.appearance?.(next==='offer'||next==='gift'?'onboarding-offer':'onboarding-inbox');
      const v=window.KonvoOnboardingViews[['progress','offer','gift'].includes(next)?next:'paywall'];
      host.innerHTML=''; root=host.attachShadow && host.shadowRoot || host.attachShadow({mode:'open'});
      root.innerHTML='<style>'+v.css+'\n'+overrides+paywallPolishStyles+'</style>'+v.html;
      const phone=root.querySelector('.phone'); phone.dataset.step=next;
      phone.setAttribute('aria-label','Konvo onboarding');
      root.querySelectorAll('[title]').forEach(e=>e.removeAttribute('title'));
      const handle=options.handle();
      root.querySelectorAll('[data-instagram-username]').forEach(e=>e.textContent=handle?'@'+handle:'Here');
      if(next==='progress') {
        const c=comparison(options.answers);
        root.querySelector('h1').innerHTML=heading(handle);
        const box=root.querySelector('.comparison'), milestones=root.querySelector('.milestones');
        if(c.known) {
          box.innerHTML=chart('Before Konvo',c.before,Math.max(c.before,c.after),'Your estimate')+chart('After Konvo',c.after,Math.max(c.before,c.after),'DMs-only estimate');
          milestones.innerHTML=[['~'+fmt(c.before),'Your estimate','Before'],['~'+fmt(c.after),'DMs only','Potential after'],['−'+c.reduction+'%','Instagram time','Potential reduction']].map(x=>'<div class="milestone"><strong>'+x[0]+'</strong><span>'+x[1]+'</span><b>'+x[2]+'</b></div>').join('');
        } else { box.innerHTML='<div class="kx-empty">Your conversations stay.<br>Your Feed, Reels and Explore don’t.</div>'; milestones.remove(); }
        const note=document.createElement('details');note.className='kx-note';const explanation=c.known?'Based on your selected ranges'+(c.range?' ('+c.range+' on Instagram)':'')+'. Assumes scrolling is replaced by DMs. Not measured usage or a guaranteed result.':'You weren’t sure about your time, so we haven’t invented a screen-time estimate.';
        note.innerHTML='<summary>Based on your estimates · How it’s calculated</summary><p>'+escape(explanation)+'</p>';box.after(note);
        root.querySelector('.continue').onclick=e=>{e.preventDefault();if(canAdvance('progress'))show('commitment');};
        root.querySelector('.nav a').onclick=e=>{e.preventDefault();options.back();};
        track('onboarding_screen_viewed',{personalization_available:c.known,username_available:!!handle});
      } else if(next==='gift') {
        setupGift();
        track('onboarding_screen_viewed');
      } else if(next==='offer') {
        setupOffer();
        track('onboarding_screen_viewed');
      } else {
        root.querySelector('#flow-back').onclick=()=>{track('onboarding_back');show(next==='paywall'?'commitment':'progress');};
        if(next==='commitment') setupSignature();
        if(next==='loading') setupLoading();
        if(next==='paywall') setupPaywall(fromLoading);
        track('onboarding_screen_viewed');
      }
      if(!['paywall','offer','gift'].includes(next))holdForward();
      if(!reduced() && !(next==='paywall'&&fromLoading)) {
        const giftReveal=next==='gift'||next==='offer'&&fromGift;
        animate(phone,[{opacity:0,transform:giftReveal?'translateY(12px)':'translateX(22px)'},{opacity:1,transform:'translate(0)'}],{duration:giftReveal?340:260,easing:'cubic-bezier(.16,1,.3,1)'});
      }
      if(next==='gift'||next==='offer'&&fromGift){const title=root.querySelector('h1');title.tabIndex=-1;title.focus({preventScroll:true});}
    }
    function setupSignature() {
      const canvas=root.querySelector('#signature'),ctx=canvas.getContext('2d');
      const btn=root.querySelector('#commit-continue'),clearBtn=root.querySelector('#clear-signature');
      let drawing=false,last=null; signed=false;
      const r=canvas.getBoundingClientRect(),scale=window.devicePixelRatio||1;
      canvas.width=Math.max(1,r.width*scale);canvas.height=Math.max(1,r.height*scale);
      if(ctx){ctx.scale(scale,scale);ctx.strokeStyle='#141d33';ctx.lineWidth=2.5;ctx.lineCap='round';}
      function point(e){const b=canvas.getBoundingClientRect();return [e.clientX-b.left,e.clientY-b.top];}
      canvas.onpointerdown=e=>{drawing=true;last=point(e);canvas.setPointerCapture?.(e.pointerId);};
      canvas.onpointermove=e=>{if(!drawing||!ctx)return;const p=point(e);ctx.beginPath();ctx.moveTo(...last);ctx.lineTo(...p);ctx.stroke();last=p;signed=true;btn.disabled=false;clearBtn.disabled=false;root.querySelector('.signature-wrap').classList.add('has-signature');};
      canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false;};
      clearBtn.onclick=()=>{ctx?.clearRect(0,0,canvas.width,canvas.height);signed=false;btn.disabled=true;clearBtn.disabled=true;root.querySelector('.signature-wrap').classList.remove('has-signature');};
      function next(skip){if(!canAdvance('commitment'))return;track('commitment_completed',{signed:!skip&&signed});show('loading');}
      btn.onclick=()=>{if(signed)next(false);};root.querySelector('#skip-signature').onclick=()=>next(true);
    }
    function setupLoading() {
      const start=performance.now();
      let exiting=false;
      const go=()=>{
        if(stage!=='loading'||exiting)return;exiting=true;
        cancelAnimationFrame(frame);clearTimeout(timeout);
        const finish=()=>{if(!stopped&&stage==='loading'){track('paywall_transition_completed');show('paywall');}};
        if(reduced()||!root.querySelector('.loading-orb').animate){finish();return;}
        root.querySelector('.loading-value').hidden=true;root.querySelector('.loading-check').hidden=false;
        root.querySelector('[role=progressbar]').setAttribute('aria-valuenow','100');
        root.querySelector('.loading-ring-fill').style.strokeDashoffset=0;
        animate(root.querySelector('.loading-step'),[{opacity:1},{opacity:0}],{duration:180,easing:'ease-out',fill:'forwards'});
        timeout=setTimeout(finish,180);
      };
      root.querySelector('#loading-continue').onclick=()=>{if(canAdvance('loading'))go();};
      function tick(now){
        if(stopped||stage!=='loading'||exiting)return;
        const elapsed=reduced()?2300:now-start;
        const f=Math.max(0,Math.min(1,(elapsed-1400)/900));
        const n=elapsed<950?.85*(1-Math.pow(1-elapsed/950,3)):elapsed<1400?.85:.85+.15*f*f*(3-2*f);
        root.querySelector('.loading-value').textContent=Math.round(n*100)+'%';
        root.querySelector('.loading-ring-fill').style.strokeDashoffset=100*(1-n);
        root.querySelector('[role=progressbar]').setAttribute('aria-valuenow',Math.round(n*100));
        if(elapsed<2300)frame=requestAnimationFrame(tick);else {root.querySelector('.loading-value').hidden=true;root.querySelector('.loading-check').hidden=false;timeout=setTimeout(go,reduced()?80:250);}
      }
      frame=requestAnimationFrame(tick);
    }
    function setupPaywall(fromLoading=false) {
      let y=null,w=null,p=null,selected=selectedPlan,valid=false,annualValid=false,weeklyValid=false,impressionKey='',inboxReady=false,refreshing=false;
      let attempts=0,started=Date.now(),lastFailure='';
      let revealing=fromLoading&&!reduced()&&typeof root.querySelector('.phone').animate==='function';
      const sheet=root.querySelector('.sheet');sheet.inert=revealing;
      const oldPlan=root.querySelector('.plan'),button=root.querySelector('[data-preview=purchase]');
      const plans=document.createElement('div');plans.className='kx-plans';plans.setAttribute('role','radiogroup');plans.setAttribute('aria-label','Subscription plan');
      const plan=document.createElement('button');plan.type='button';plan.className='plan kx-annual';plan.innerHTML=oldPlan.innerHTML;plan.dataset.plan='annual';plan.setAttribute('role','radio');plan.setAttribute('aria-checked',String(selected==='annual'));
      oldPlan.replaceWith(plans);plans.append(plan);
      const saving=document.createElement('span');saving.className='kx-save';saving.hidden=true;plan.prepend(saving);plan.querySelector('.cancel')?.remove();
      const weekly=document.createElement('button');weekly.type='button';weekly.className='plan kx-weekly';weekly.dataset.plan='weekly';weekly.setAttribute('role','radio');weekly.setAttribute('aria-checked','false');
      weekly.innerHTML='<div><p class="plan-name">Weekly</p><p class="billing">Billed every week</p></div><p class="price"></p>'+plan.querySelector('.selected').outerHTML;plans.append(weekly);
      sheet.setAttribute('aria-label','Choose your subscription');
      const isValid=x=>!!(p?.ok!==false&&p?.offeringId&&x?.productId&&x.price&&x.currency&&Number.isFinite(Number(x.amount))&&Number(x.amount)>0&&x.noIntroOffer===true&&!x.trialDays);
      function choose(value){if(busy||revealing||(value==='weekly'?!weeklyValid:!annualValid))return;selected=selectedPlan=value;track('plan_selected',{plan:value,product_id:(value==='weekly'?w:y).productId});update();}
      plan.onclick=()=>choose('annual');weekly.onclick=()=>choose('weekly');
      plans.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();choose(selected==='annual'?'weekly':'annual');(selected==='annual'?plan:weekly).focus();}};
      button.querySelector('svg').innerHTML='<path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
      button.querySelector('svg').setAttribute('viewBox','0 0 24 24');
      const count=root.querySelector('[data-member-count]');
      if(count&&!reduced()){
        const start=performance.now(),duration=revealing?500:900;
        function tick(now){const t=Math.max(0,Math.min(1,(now-start)/duration));count.textContent=Math.round(700+300*(1-Math.pow(1-t,3))).toLocaleString('en-US')+'+';if(t<1)frame=requestAnimationFrame(tick);}
        frame=requestAnimationFrame(tick);
      }
      root.querySelector('.sample-inbox')?.remove();
      const screen=root.querySelector('.device-screen');
      const holder=document.createElement('div');holder.className='kx-live';
      holder.innerHTML='<div class="kx-empty" role="status">Loading your Instagram inbox…</div>';screen.append(holder);
      root.querySelector('.inbox-device').setAttribute('aria-label','Your Instagram inbox preview');
      root.querySelector('.reassurance').innerHTML='<svg width=18 height=20 viewBox="0 0 24 24" fill=none stroke="#0a5cf0" stroke-width=1.7 aria-hidden=true><path d="M12 2 4 6v6c0 5 8 10 8 10s8-5 8-10V6Z"/><path d="m8 12 3 3 5-6"/></svg><span>Cancel anytime, no commitment</span>';
      const error=document.createElement('p');error.className='kx-error';error.setAttribute('role','status');root.querySelector('.bottom').append(error);
      const retry=document.createElement('button');retry.textContent='Try again';
      function refresh(){
        if(refreshing||stopped||stage!=='paywall')return;
        refreshing=true;attempts++;retry.disabled=true;
        options.refresh(()=>{refreshing=false;retry.disabled=false;if(!stopped&&stage==='paywall')update();});
      }
      retry.onclick=()=>{started=Date.now();attempts=0;refresh();};
      function update(){
        if(stopped||stage!=='paywall')return;
        p=options.products();y=p&&p.yearly;w=p&&p.weekly;
        annualValid=isValid(y);weeklyValid=isValid(w);
        valid=selected==='weekly'?weeklyValid:annualValid;
        plan.querySelector('.price').innerHTML=annualValid?escape(y.perWeek||y.price)+'<span class="kx-unit">'+(y.perWeek?' /week':' /year')+'</span>':'Loading your plan…';
        plan.querySelector('.billing').textContent=annualValid?y.price+' billed annually':'';
        weekly.querySelector('.price').innerHTML=weeklyValid?escape(w.price)+'<span class="kx-unit"> /week</span>':p?.weeklyUnavailableReason?'Unavailable':'Loading…';
        const pct=annualValid&&weeklyValid&&y.currency===w.currency?Math.round((1-y.amount/(w.amount*52))*100):0;
        saving.hidden=pct<=0||pct>=100;saving.textContent=saving.hidden?'':'SAVE '+pct+'%';
        plan.setAttribute('aria-checked',String(selected==='annual'));weekly.setAttribute('aria-checked',String(selected==='weekly'));
        plan.tabIndex=selected==='annual'?0:-1;weekly.tabIndex=selected==='weekly'?0:-1;
        plan.disabled=!annualValid||busy||revealing;weekly.disabled=!weeklyValid||busy||revealing;
        const product=selected==='weekly'?w:y;
        root.querySelector('.renewal').textContent=valid?product.price+' charged today. Renews '+(selected==='weekly'?'weekly':'annually')+' unless cancelled.':'Your local price will appear before you can purchase.';
        button.disabled=!valid||busy||revealing;
        if(valid){
          const key=p.offeringId+':'+y?.productId+':'+y?.currency+':'+y?.amount+':'+w?.productId+':'+w?.amount;
          if(!revealing&&key!==impressionKey){error.replaceChildren();impressionKey=key;track('paywall_viewed',{offering_id:p.offeringId,product_id:product.productId,currency:product.currency,price:product.amount,weekly_available:weeklyValid,weekly_product_id:weeklyValid?w.productId:'',trial_days:0});options.impression('inbox_annual_weekly_v3');}
        }else if(p?.ok===false||y||Date.now()-started>=15000){
          const reason=p?.reason||(selected==='weekly'?p?.weeklyUnavailableReason||'weekly_product_unavailable':y?'invalid_annual_product':'products_timeout');
          const messages={offering_unavailable:'These plans are not available from the store yet.',annual_product_unavailable:'Apple hasn’t returned this annual plan yet.',invalid_annual_product:'The annual plan configuration needs checking.',weekly_product_unavailable:'Apple hasn’t returned this weekly plan yet.',invalid_weekly_product:'The weekly plan configuration needs checking.',store_unavailable:'Unable to connect to the App Store.',products_timeout:'The App Store is taking longer than usual.'};
          error.textContent=messages[reason]||'Your plan couldn’t be loaded.';error.append(' ',retry);
          if(lastFailure!==reason){lastFailure=reason;track('paywall_load_failed',{reason});}
        }
        if(!inboxReady){
          const live=captureInbox();
          if(live){
            holder.replaceChildren(live);inboxReady=true;
            requestAnimationFrame(()=>{if(!stopped)live.style.transform='scale('+(screen.clientWidth/window.innerWidth)+')';});
            track('paywall_inbox_preview_ready');
          }else if(Date.now()-started>=15000){holder.firstChild.textContent='Your inbox is still connecting. Your messages stay in Instagram.';}
        }
      }
      update();
      if(revealing){
        // A short, unified reveal keeps the final step calm and quickly usable.
        animate(root.querySelector('.phone'),[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:500,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
        timeout=setTimeout(()=>{if(stopped||stage!=='paywall')return;revealing=false;sheet.inert=false;update();track('paywall_reveal_completed');},520);
      }
      // Native products and Instagram arrive independently; never freeze either at mount time.
      paywallTimer=setInterval(()=>{update();if((!annualValid||!weeklyValid)&&!refreshing&&attempts<3&&Date.now()-started>(attempts+1)*5000)refresh();},500);
      button.onclick=()=>{
        if(busy||!valid||revealing)return;
        const product=selected==='weekly'?w:y;busy=true;update();
        track('plan_selected',{plan:selected,product_id:product.productId});
        options.buy(product.productId,res=>{
          busy=false;if(stopped||stage!=='paywall')return;
          if(res?.cancelled&&!res.entitled&&!res.pending&&!offerShown){
            if(availableOffer(options.products())){offerShown=true;show('gift');return;}
            track('special_offer_unavailable',{reason:options.products()?.specialOfferUnavailableReason||'catalog_unavailable'});
          }
          update();if(!res||!res.entitled)error.textContent=res?.cancelled?'':res?.pending?'Purchase pending approval.':'Purchase couldn’t be completed. Please try again.';
        });
      };
      root.querySelector('[data-preview=restore]').onclick=()=>{if(busy||revealing)return;busy=true;update();options.restore(res=>{busy=false;if(stopped||stage!=='paywall')return;update();if(!res?.entitled)error.textContent='No active subscription found.';});};
      root.querySelectorAll('.legal a').forEach(a=>a.onclick=e=>{e.preventDefault();options.open(a.href);});
    }
    function setupGift() {
      const button=root.querySelector('[data-gift=open]'),phone=root.querySelector('.phone');
      let opening=false;
      track('special_offer_gift_viewed',{trigger:'purchase_cancelled',previous_plan:selectedPlan});
      button.onclick=()=>{
        if(opening||busy||stopped||stage!=='gift')return;
        opening=true;button.disabled=true;
        track('special_offer_gift_opened',{previous_plan:selectedPlan});
        const reveal=()=>{
          if(stopped||stage!=='gift')return;
          if(!availableOffer(options.products())){
            track('special_offer_unavailable',{reason:'catalog_unavailable_after_gift'});
            show('paywall');return;
          }
          show('offer');
        };
        if(reduced()){reveal();return;}
        phone.classList.add('is-opening');
        timeout=setTimeout(reveal,420);
      };
    }
    function setupOffer() {
      const claim=root.querySelector('[data-offer=claim]'),error=root.querySelector('.kx-error');
      let impressed=false;
      function update() {
        const p=options.products(),o=availableOffer(p),w=p?.weekly;
        root.querySelectorAll('button').forEach(el=>el.disabled=busy);
        claim.disabled=busy||!o;
        if(!o){error.textContent='This offer is unavailable right now. You can return to your plans.';return null;}
        root.querySelector('[data-offer-price]').textContent=o.price;
        root.querySelector('[data-offer-billing]').textContent=o.price+' billed annually';
        root.querySelector('.offer-equivalent').innerHTML=escape(o.perWeek||o.price)+'<small> / '+(o.perWeek?'week':'year')+'</small>';
        const comparable=w?.noIntroOffer===true&&!w.trialDays&&w.currency===o.currency&&Number(w.amount)>0&&w.annualizedPrice;
        const pct=comparable?Math.floor((1-Number(o.amount)/(Number(w.amount)*52))*100):0;
        const hasSaving=pct>0&&pct<100;
        root.querySelector('.gift-value').textContent=hasSaving?pct+'% OFF':'Special price';
        root.querySelector('.gift-detail').textContent=hasSaving?'Compared with weekly':'Your yearly plan';
        const previous=root.querySelector('.offer-price del');previous.hidden=!hasSaving;previous.textContent=hasSaving?w.annualizedPrice:'';
        if(!impressed){
          impressed=true;
          const props={offering_id:o.offeringId,product_id:o.productId,currency:o.currency,price:Number(o.amount),trial_days:0,trigger:'purchase_cancelled',previous_plan:selectedPlan};
          track('special_offer_viewed',props);track('paywall_viewed',props);options.impression('inbox_special_annual_v3');
        }
        return o;
      }
      function decline(){if(busy||stopped||stage!=='offer')return;track('special_offer_dismissed',{return_plan:selectedPlan});show('paywall');}
      root.querySelectorAll('[data-offer=decline]').forEach(el=>el.onclick=decline);
      claim.onclick=()=>{
        if(busy||stopped||stage!=='offer')return;
        const o=update();if(!o)return;
        busy=true;error.textContent='';update();track('plan_selected',{plan:'annual_special',product_id:o.productId,offering_id:o.offeringId});
        options.buy(o.productId,res=>{
          busy=false;if(stopped||stage!=='offer')return;update();
          if(!res?.entitled)error.textContent=res?.cancelled?'':res?.pending?'Purchase pending approval.':'Purchase couldn’t be completed. Please try again.';
        },{plan:'annual_special',screen_id:'new_offer',paywall_id:'inbox_special_annual_v3',offering_id:o.offeringId});
      };
      root.querySelector('[data-offer=restore]').onclick=()=>{
        if(busy||stopped||stage!=='offer')return;busy=true;error.textContent='';update();
        options.restore(res=>{busy=false;if(stopped||stage!=='offer')return;update();if(!res?.entitled)error.textContent='No active subscription found.';});
      };
      root.querySelectorAll('.legal a').forEach(a=>a.onclick=e=>{e.preventDefault();options.open(a.href);});
      update();paywallTimer=setInterval(()=>{if(!stopped&&stage==='offer')update();},500);
    }
    let lastHandle=options.handle(), nameAttempts=0;
    nameTimer=setInterval(()=>{if(stopped||++nameAttempts>30){clearInterval(nameTimer);return;}const h=options.handle();if(h&&h!==lastHandle){lastHandle=h;if(stage==='progress'){root.querySelector('h1').innerHTML=heading(h);track('personalization_ready',{field:'username'});}}},500);
    show(options.initial||'progress');
    return {destroy(){if(stage==='paywall'||stage==='offer')track('paywall_exited');stopped=true;clear();clearInterval(nameTimer);host.remove();},show,stage:()=>stage};
  }
  // Copy only visible inbox elements and computed presentation. No scripts, handlers,
  // hrefs, forms or identifiers; never serialize the result into analytics or storage.
  function captureInbox() {
    const main=inboxRoot(); if(!main)return null;
    let remaining=2000;
    const props=['display','position','transform','transform-origin','translate','rotate','scale','z-index','direction','top','left','right','bottom','font-size','font-weight','font-family','line-height','color','background-color','padding','margin','border-radius','border','flex-wrap','grid-template-columns','grid-template-rows','grid-auto-flow','column-gap','row-gap','align-self','order','flex','flex-grow','flex-shrink','min-width','max-width','box-sizing','object-fit','flex-direction','align-items','justify-content','gap','width','height','overflow','white-space','text-overflow'];
    function copy(node){
      if(node.nodeType===3)return document.createTextNode(node.textContent);
      if(node.nodeType!==1||/^(SCRIPT|STYLE|IFRAME|INPUT|TEXTAREA|VIDEO|AUDIO|SVG|FORM|NOSCRIPT)$/.test(node.tagName)||/^im-|^konvo-/.test(node.id))return null;
      if(--remaining<0)return null;
      const cs=getComputedStyle(node);if(cs.display==='none'||cs.visibility==='hidden')return null;
      if(node.tagName==='BR')return document.createElement('br');
      const el=document.createElement(node.tagName==='IMG'?'img':'div');
      for(const key of props)el.style.setProperty(key,cs.getPropertyValue(key));
      function neutral(value){const n=(value.match(/[\d.]+/g)||[]).map(Number);return n.length>=3&&(n.length<4||n[3]>.9)&&Math.max(...n.slice(0,3))-Math.min(...n.slice(0,3))<25?n[0]:null;}
      if(neutral(cs.backgroundColor)>210)el.style.backgroundColor='#000';
      const ink=(cs.color.match(/[\d.]+/g)||[]).map(Number);if(ink.length>=3&&Math.max(...ink.slice(0,3))<120)el.style.color='#f5f5f5';
      if(node.tagName==='IMG'){const src=node.currentSrc||node.src;if(/^https:\/\//.test(src))el.src=src;el.alt='';}
      else for(const child of node.childNodes){const clone=copy(child);if(clone)el.append(clone);}
      return el;
    }
    const result=document.createElement('div');Object.assign(result.style,{width:window.innerWidth+'px',background:'#000',color:'#f5f5f5',minHeight:window.innerHeight+'px'});const c=copy(main);if(c){Object.assign(c.style,{position:'relative',top:'0',left:'0',margin:'0',width:'100%'});result.append(c);}return c?result:null;
  }
  window.KonvoOnboardingExperiment={mount,comparison,inboxRoot,captureInbox};
})();
