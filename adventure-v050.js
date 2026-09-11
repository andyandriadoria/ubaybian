/* UbayBian Home v0.5 · small DOM enhancements for Adventure UI */
(function(){
  let scheduled=false;
  function enhance(){
    scheduled=false;
    const hero=document.querySelector('.hero-daily');
    const isHome=Boolean(hero);
    document.body.classList.toggle('adventure-home',isHome);
    if(!isHome)return;

    const kicker=hero.querySelector('.hero-kicker');
    if(kicker)kicker.textContent='DAILY LEARNING ADVENTURE';

    const controls=document.querySelector('.controls-panel');
    if(controls&&!controls.querySelector('.adventure-map')){
      const map=document.createElement('div');
      map.className='adventure-map';
      map.setAttribute('aria-hidden','true');
      const road=document.createElement('div');road.className='adventure-map-road';
      const scenery=document.createElement('div');scenery.className='adventure-map-scenery';scenery.textContent='🌲  🌳  🌲';
      map.append(road,scenery);controls.append(map);
    }

    const badgeCard=document.querySelector('.badge-card');
    if(badgeCard&&!badgeCard.querySelector('.adventure-badge-rack')){
      const rack=document.createElement('div');rack.className='adventure-badge-rack';rack.setAttribute('aria-hidden','true');
      ['XP','🎖️','🌟','🏆'].forEach((item)=>{const s=document.createElement('span');s.textContent=item;rack.append(s);});
      badgeCard.append(rack);
    }

    document.querySelectorAll('.side-tile').forEach((tile)=>{
      const name=tile.querySelector('.side-tile-text')?.textContent?.trim();
      tile.classList.toggle('adventure-brain',name==='Brain Games');
      tile.classList.toggle('adventure-memory',name==='Memory Grid');
      tile.classList.toggle('adventure-reward',name==='Reward Shop');
    });
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(enhance);}
  const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);window.addEventListener('load',schedule);schedule();
})();
