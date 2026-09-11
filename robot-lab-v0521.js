/* v0.5.21 — Robot Lab Adventure Upgrade
   Visual-only enhancement built from the Robot Lab data already rendered by app-v040.js. */
(function(){
  const main=document.querySelector('#main');
  if(!main)return;

  const levelNotes={
    1:'Fondasi perjalanan belajarmu.',
    2:'Rasa ingin tahu aktif dan terus berkembang.',
    3:'Sensor belajar makin tajam.',
    4:'Siap menjelajah pengetahuan lebih jauh.',
    5:'Strategi dan fokus masuk level tinggi.',
    6:'Puncak perjalanan UbayBian.'
  };

  function parseLevel(text){
    const match=String(text||'').match(/Lv\.\s*(\d+)/i);
    return match?Number(match[1]):null;
  }

  function enhanceRobotLab(){
    const card=main.querySelector('.robotlab-card');
    document.body.classList.toggle('robotlab-adventure',Boolean(card));
    if(!card||card.dataset.robotAdventure==='1')return;

    const heading=card.querySelector(':scope > h2');
    const intro=card.querySelector(':scope > p');
    const robotEmoji=card.querySelector('.robotlab-robot-emoji');
    const levelTitle=card.querySelector('.robotlab-level-title');
    const xpbar=card.querySelector('.robotlab-xpbar');
    const stats=card.querySelector('.robotlab-stats');
    const upgradeTitle=card.querySelector('.robotlab-upgrade-title');
    const upgradeList=card.querySelector('.robotlab-upgrade-list');
    if(!heading||!levelTitle||!xpbar||!stats||!upgradeTitle||!upgradeList)return;

    card.dataset.robotAdventure='1';
    card.classList.add('robotlab-adventure-v0521');

    const currentLevel=parseLevel(levelTitle.textContent)||1;

    const hero=document.createElement('section');
    hero.className='robotlab-hero-v0521';

    const heroTop=document.createElement('div');
    heroTop.className='robotlab-hero-top';

    const copy=document.createElement('div');
    copy.className='robotlab-hero-copy';
    const kicker=document.createElement('span');
    kicker.className='robotlab-kicker';
    kicker.textContent='ROBOT PROGRESSION';
    heading.textContent='ROBOT LAB';
    copy.append(kicker,heading);
    if(intro){
      intro.textContent='XP menaikkan level robot. Level tidak pernah turun.';
      copy.append(intro);
    }

    const core=document.createElement('div');
    core.className='robotlab-core';
    const orb=document.createElement('div');
    orb.className='robotlab-core-orb';
    if(robotEmoji)orb.append(robotEmoji);
    const current=document.createElement('span');
    current.className='robotlab-current-label';
    current.textContent='BOT AKTIF';
    core.append(orb,current,levelTitle);

    const stars=document.createElement('div');
    stars.className='robotlab-hero-stars';
    stars.setAttribute('aria-hidden','true');
    stars.innerHTML='<span>✦</span><span>★</span><span>✧</span>';

    heroTop.append(copy,core,stars);

    const energy=document.createElement('div');
    energy.className='robotlab-energy-wrap';
    const energyLabel=document.createElement('div');
    energyLabel.className='robotlab-energy-label';
    energyLabel.innerHTML='<span>⚡ ENERGY CORE</span><span>LEVEL PROGRESS</span>';
    xpbar.classList.add('robotlab-energy-bar');
    energy.append(energyLabel,xpbar);

    const statItems=[...stats.querySelectorAll('.robotlab-stat')];
    const statIcons=['⚡','🧭','🏆'];
    statItems.forEach((item,index)=>{
      item.dataset.statIcon=statIcons[index]||'✦';
      item.classList.add(`robotlab-stat-${index+1}`);
    });
    stats.classList.add('robotlab-podiums');

    hero.append(heroTop,energy,stats);

    const upgrades=document.createElement('section');
    upgrades.className='robotlab-upgrades-panel-v0521';
    const titleRow=document.createElement('div');
    titleRow.className='robotlab-upgrades-head';
    const titleBox=document.createElement('div');
    titleBox.append(upgradeTitle);
    const subtitle=document.createElement('p');
    subtitle.textContent='Naikkan XP untuk membuka bentuk robot berikutnya.';
    titleBox.append(subtitle);
    const count=document.createElement('span');
    count.className='robotlab-upgrade-count';
    count.textContent='6 tahap robot';
    titleRow.append(titleBox,count);

    const items=[...upgradeList.querySelectorAll('.robotlab-upgrade-item')];
    items.forEach((item)=>{
      const name=item.querySelector('.upgrade-name');
      const status=item.querySelector('.upgrade-status');
      const info=item.querySelector('.upgrade-info');
      const level=parseLevel(name?.textContent);
      const locked=item.classList.contains('upgrade-locked');
      const active=level===currentLevel;

      item.dataset.level=String(level||'');
      item.dataset.state=active?'current':locked?'locked':'unlocked';
      if(active)item.classList.add('upgrade-current');
      else if(!locked)item.classList.add('upgrade-unlocked');

      if(info&&level){
        const note=document.createElement('div');
        note.className='upgrade-note';
        note.textContent=levelNotes[level]||'';
        info.append(note);
      }

      const badge=document.createElement('span');
      badge.className='upgrade-state-badge';
      badge.textContent=active?'CURRENT':locked?'LOCKED':'UNLOCKED';
      item.append(badge);

      if(status){
        if(active)status.textContent='Robot aktif sekarang';
        else if(!locked)status.textContent='Terbuka ✓';
      }
    });

    upgrades.append(titleRow,upgradeList);
    card.replaceChildren(hero,upgrades);
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(enhanceRobotLab));
  observer.observe(main,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(enhanceRobotLab,0));
  enhanceRobotLab();
})();