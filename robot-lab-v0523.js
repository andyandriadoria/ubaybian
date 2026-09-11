/* v0.5.23 — Robot Evolution Polish
   Localizes upgrade states, simplifies Energy Core wording, and adds semantic
   hooks for stronger robot evolution silhouettes. Runs after v0.5.22. */
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

  function enhance(){
    const card=main.querySelector('.robotlab-card.robotlab-adventure-v0521');
    if(!card||card.dataset.robotEvolution==='1')return;

    /* Localize every progression state. */
    for(const item of card.querySelectorAll('.robotlab-upgrade-item')){
      const badge=item.querySelector('.upgrade-state-badge');
      const level=parseLevel(item.querySelector('.upgrade-name')?.textContent);
      const active=item.classList.contains('upgrade-current');
      const locked=item.classList.contains('upgrade-locked');

      if(badge){
        badge.textContent=active?'AKTIF':locked?'TERKUNCI':'TERBUKA';
        badge.setAttribute('aria-label',badge.textContent.toLowerCase());
      }

      const status=item.querySelector('.upgrade-status');
      if(status){
        if(active){
          status.textContent='Robot aktif sekarang';
          status.classList.remove('upgrade-lock-chip');
        }else if(!locked){
          status.textContent='Terbuka ✓';
          status.classList.remove('upgrade-lock-chip');
        }
      }

      if(level){
        item.classList.add(`robot-evolution-level-${level}`);
        const form=item.querySelector('.robot-form');
        if(form)form.dataset.evolution=String(level);
      }
    }

    /* Active-bot and energy labels are Indonesian too. */
    const activeLabel=card.querySelector('.robotlab-current-label');
    if(activeLabel)activeLabel.textContent='ROBOT AKTIF';
    const energyLabels=card.querySelectorAll('.robotlab-energy-label span');
    if(energyLabels.length>1)energyLabels[1].textContent='PROGRES LEVEL';

    /* Cleaner Energy Core hierarchy: big remaining XP, short next-step label. */
    const xpbar=card.querySelector('.robotlab-xpbar');
    const labels=xpbar?.querySelectorAll('.robotlab-xpbar-label span');
    const next=card.querySelector('.robotlab-next-step');
    const currentTitle=card.querySelector('.robotlab-level-title');
    const currentLevel=parseLevel(currentTitle?.textContent)||1;

    if(labels?.length>1){
      labels[1].classList.add('robotlab-remaining-xp');
    }

    if(next){
      const nextLevel=currentLevel+1;
      if(nextLevel<=6){
        next.innerHTML=`menuju <strong>${levelTitles[nextLevel]}</strong>`;
      }else{
        next.innerHTML='<strong>Level maksimum tercapai ✨</strong>';
      }
    }

    /* Microcopy on the section is localized and a little more aspirational. */
    const subtitle=card.querySelector('.robotlab-upgrades-head p');
    if(subtitle)subtitle.textContent='Naikkan XP untuk membuka evolusi robot berikutnya.';

    card.dataset.robotEvolution='1';
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(enhance));
  observer.observe(main,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(enhance,0));
  enhance();
})();
