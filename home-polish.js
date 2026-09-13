/* UbayBian Home v0.5.2 · final polish helpers */
(function(){
  let scheduled=false;

  function enhanceBadges(){
    const card=document.querySelector('.badge-card');
    const rack=card?.querySelector('.adventure-badge-rack');
    if(!card||!rack)return;
    const empty=Boolean(card.querySelector('.badge-empty'));
    const realBadges=card.querySelectorAll('.badge-chip').length;
    if(realBadges){rack.hidden=true;return;}
    rack.hidden=false;
    rack.classList.toggle('is-locked',empty);
    if(empty){
      const symbols=['🏅','⭐','🏆','🔒'];
      [...rack.children].forEach((item,index)=>{
        item.textContent=symbols[index]||'🔒';
        item.title='Belum terbuka';
        item.setAttribute('aria-label','Badge belum terbuka');
      });
    }
  }

  function enhanceMap(){
    const map=document.querySelector('.adventure-map');
    if(!map||map.querySelector('.adventure-map-checkpoints'))return;
    const layer=document.createElement('div');
    layer.className='adventure-map-checkpoints';
    const points=[
      ['p0 start','🚩','Mulai'],
      ['p1','','Checkpoint 1'],
      ['p2','','Checkpoint 2'],
      ['p3','','Checkpoint 3'],
      ['p4 goal','⭐','Tujuan'],
    ];
    for(const [cls,text,label] of points){
      const point=document.createElement('span');
      point.className=`map-point ${cls}`;point.textContent=text;
      point.setAttribute('aria-hidden','true');point.title=label;layer.append(point);
    }
    map.append(layer);
  }

  function enhanceMissionCompanion(){
    const visual=document.querySelector('.mission-visual');
    if(!visual||visual.querySelector('.mission-companion-copy'))return;
    const levelText=document.querySelector('.xp-level')?.textContent?.trim()||'Robot teman belajar';
    const tip=document.querySelector('.mission-tip')?.textContent?.trim()||'';
    const remaining=(tip.match(/(\d+)\s*XP lagi/i)||[])[1];
    const copy=document.createElement('div');copy.className='mission-companion-copy';
    const strong=document.createElement('strong');strong.textContent=levelText;
    const small=document.createElement('small');small.textContent=remaining?`${remaining} XP lagi ke level berikutnya`:'Teman belajar hari ini';
    copy.append(strong,small);visual.append(copy);
  }

  function enhance(){
    scheduled=false;
    if(!document.body.classList.contains('adventure-home'))return;
    enhanceBadges();enhanceMap();enhanceMissionCompanion();
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(enhance);}
  const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);window.addEventListener('load',schedule);schedule();
})();
