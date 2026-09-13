/* v0.5.22 — Robot Lab Final Polish
   Runs after v0.5.21 and refines progression wording, locked-state readability,
   and robot-form visuals without touching the unified shell. */
(function(){
  const main=document.querySelector('#main');
  if(!main)return;

  const levelTitles={
    1:'Rookie Bot',
    2:'Curious Bot',
    3:'Smart Explorer',
    4:'Knowledge Ranger',
    5:'Brain Commander',
    6:'UbayBian Legend'
  };

  function parseLevel(text){
    const m=String(text||'').match(/Lv\.\s*(\d+)/i);
    return m?Number(m[1]):null;
  }

  function robotForm(level,label){
    const form=document.createElement('span');
    form.className=`robot-form level-${level}`;
    form.setAttribute('role','img');
    form.setAttribute('aria-label',label||`Robot level ${level}`);
    form.innerHTML='<span class="rf-head"></span><span class="rf-face"><span class="rf-eye"></span></span><span class="rf-body"></span><span class="rf-core"></span>';
    return form;
  }

  function parseXp(label){
    const m=String(label||'').match(/([\d.,]+)\s*\/\s*([\d.,]+)\s*XP/i);
    if(!m)return null;
    const current=Number(m[1].replace(/[^\d]/g,''));
    const target=Number(m[2].replace(/[^\d]/g,''));
    if(!Number.isFinite(current)||!Number.isFinite(target))return null;
    return {current,target,remaining:Math.max(0,target-current)};
  }

  function enhance(){
    const card=main.querySelector('.robotlab-card.robotlab-adventure-v0521');
    if(!card||card.dataset.robotFinal==='1')return;

    const levelTitle=card.querySelector('.robotlab-level-title');
    const currentLevel=parseLevel(levelTitle?.textContent)||1;

    /* Replace ability emoji in the active core with an actual robot form. */
    const activeHost=card.querySelector('.robotlab-core-orb .robotlab-robot-emoji');
    if(activeHost){
      activeHost.classList.add('robot-form-host');
      activeHost.replaceChildren(robotForm(currentLevel,`Lv. ${currentLevel} — ${levelTitles[currentLevel]||'Robot'}`));
    }

    /* Every upgrade card now previews an evolving robot silhouette. */
    for(const item of card.querySelectorAll('.robotlab-upgrade-item')){
      const level=parseLevel(item.querySelector('.upgrade-name')?.textContent);
      if(!level)continue;
      const icon=item.querySelector('.upgrade-icon');
      if(icon){
        icon.classList.add('robot-form-host');
        icon.replaceChildren(robotForm(level,`Lv. ${level} — ${levelTitles[level]||'Robot'}`));
      }

      const status=item.querySelector('.upgrade-status');
      if(item.classList.contains('upgrade-locked')&&status){
        const xpMatch=status.textContent.match(/([\d.,]+)\s*XP/i);
        const requirement=xpMatch?xpMatch[1].replace(/\./g,''):'?';
        status.textContent=`🔒 ${requirement} XP`;
        status.classList.add('upgrade-lock-chip');
      }
    }

    /* Make the XP target actionable: show remaining XP and the next bot name. */
    const xpbar=card.querySelector('.robotlab-xpbar');
    const labels=xpbar?.querySelectorAll('.robotlab-xpbar-label span');
    const xpInfo=labels?.length?parseXp(labels[0].textContent):null;
    if(xpInfo&&labels.length>1){
      labels[1].textContent=xpInfo.remaining?`${xpInfo.remaining} XP lagi`:'Siap naik level';
      const nextLevel=currentLevel+1;
      const next=document.createElement('div');
      next.className='robotlab-next-step';
      if(nextLevel<=6){
        next.innerHTML=`Menuju <strong>Lv. ${nextLevel} · ${levelTitles[nextLevel]}</strong> →`;
      }else{
        next.innerHTML='<strong>Level maksimum tercapai.</strong> Kamu sudah menjadi UbayBian Legend ✨';
      }
      xpbar.parentElement?.append(next);
    }

    card.dataset.robotFinal='1';
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(enhance));
  observer.observe(main,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(enhance,0));
  enhance();
})();
