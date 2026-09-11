/* UbayBian v0.5.31 · Memory Grid Neural Refresh
   Decorative/state-sync layer only. No scoring or persistence logic lives here. */
(() => {
  const SELECTOR = '.neural-shell';

  function activeProfileId(){
    const raw = location.hash.replace(/^#\/?/, '').split('/')[0].toLowerCase();
    return raw === 'bian' ? 'bian' : 'ubay';
  }

  function isVisible(node){
    return !!node && !node.hidden;
  }

  function makeWave(){
    const wrap = document.createElement('div');
    wrap.className = 'neural-lab-wave';
    wrap.setAttribute('aria-hidden','true');
    wrap.innerHTML = `
      <svg viewBox="0 0 1000 160" preserveAspectRatio="none" focusable="false" aria-hidden="true">
        <defs>
          <linearGradient id="ngWaveGradient" x1="0" x2="1">
            <stop offset="0" stop-color="#78ddb0" stop-opacity=".08"/>
            <stop offset=".28" stop-color="#65d9a5" stop-opacity=".85"/>
            <stop offset=".54" stop-color="#ffd18a" stop-opacity=".9"/>
            <stop offset=".8" stop-color="#d5a5f4" stop-opacity=".72"/>
            <stop offset="1" stop-color="#78ddb0" stop-opacity=".08"/>
          </linearGradient>
        </defs>
        <path d="M0 82 C35 82 44 34 72 34 S108 129 138 129 173 54 204 54 236 111 270 111 302 28 334 28 365 131 398 131 431 58 462 58 493 105 526 105 558 40 590 40 621 124 654 124 687 60 720 60 751 106 785 106 817 39 850 39 883 126 916 126 949 78 1000 78"/>
      </svg>`;
    return wrap;
  }

  function makeMascot(profileId){
    const wrap = document.createElement('div');
    wrap.className = 'neural-lab-mascot';
    wrap.setAttribute('aria-hidden','true');
    const img = document.createElement('img');
    img.alt = '';
    img.src = profileId === 'bian' ? 'assets/bian-cosmic-scout.svg' : 'assets/ubay-cosmic-spider-bot.svg';
    const bubble = document.createElement('div');
    bubble.className = 'neural-lab-bubble';
    bubble.textContent = 'Siap melatih ingatan?';
    wrap.append(img,bubble);
    return {wrap,bubble};
  }

  function makeEnergy(){
    const wrap = document.createElement('aside');
    wrap.className = 'neural-memory-energy';
    wrap.setAttribute('aria-hidden','true');
    const label = document.createElement('div');
    label.className = 'neural-energy-label';
    label.textContent = 'MEMORY ENERGY';
    const vessel = document.createElement('div');
    vessel.className = 'neural-energy-vessel';
    const fill = document.createElement('div');
    fill.className = 'neural-energy-fill';
    const s1 = document.createElement('span'); s1.className='neural-energy-spark s1'; s1.textContent='XP';
    const s2 = document.createElement('span'); s2.className='neural-energy-spark s2'; s2.textContent='XP';
    const s3 = document.createElement('span'); s3.className='neural-energy-spark s3'; s3.textContent='✦';
    vessel.append(fill,s1,s2,s3);
    const value = document.createElement('div');
    value.className = 'neural-energy-value';
    value.textContent = '0 / 50 XP';
    wrap.append(label,vessel,value);
    return {wrap,fill,value};
  }

  function decorate(shell){
    if(!shell || shell.dataset.neuralLabDecorated === '1') return;
    shell.dataset.neuralLabDecorated = '1';

    const ready = shell.querySelector('.neural-ready');
    const play = shell.querySelector('.neural-play');
    const result = shell.querySelector('.neural-result');
    const phase = shell.querySelector('.neural-phase');
    const xpSource = shell.querySelector('.neural-xp-row strong');

    const wave = makeWave();
    const mascot = makeMascot(activeProfileId());
    const energy = makeEnergy();
    shell.append(wave,mascot.wrap,energy.wrap);

    function updateEnergy(){
      const text = xpSource?.textContent || '0 / 50 XP';
      const match = text.match(/(\d+)\s*\/\s*(\d+)/);
      const current = match ? Number(match[1]) : 0;
      const cap = Math.max(1, match ? Number(match[2]) : 50);
      const pct = Math.max(0,Math.min(100,(current/cap)*100));
      energy.value.textContent = `${current} / ${cap} XP`;
      energy.fill.style.height = `${Math.max(3,pct)}%`;
      energy.wrap.style.setProperty('--ng-mobile-fill',`${pct}%`);
    }

    function updateState(){
      let state = 'ready';
      if(isVisible(result)) state = 'result';
      else if(isVisible(play)){
        const label = phase?.textContent || '';
        state = /RECALL/i.test(label) ? 'recall' : 'scan';
      }
      shell.dataset.neuralState = state;
      mascot.bubble.textContent = ({
        ready:'Siap melatih ingatan?',
        scan:'Ingat posisinya!',
        recall:'Kotak yang mana tadi?',
        result:'Scan selesai! ✨'
      })[state] || 'Siap!';
    }

    const observer = new MutationObserver(() => {
      updateState();
      updateEnergy();
    });
    observer.observe(shell,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class']});

    updateState();
    updateEnergy();
  }

  function scan(root=document){
    if(root.matches?.(SELECTOR)) decorate(root);
    root.querySelectorAll?.(SELECTOR).forEach(decorate);
  }

  const rootObserver = new MutationObserver(records => {
    for(const record of records){
      for(const node of record.addedNodes){
        if(node.nodeType === 1) scan(node);
      }
    }
  });

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',() => {
      scan();
      rootObserver.observe(document.body,{childList:true,subtree:true});
    },{once:true});
  }else{
    scan();
    rootObserver.observe(document.body,{childList:true,subtree:true});
  }
})();
