/* UbayBian v0.5.35 · Memory Grid Neural Chamber Depth
   Spatial/decorative layer only. Gameplay, scoring, XP and persistence stay in memory-grid-v046.js. */
(() => {
  const SELECTOR = '.neural-shell';

  function addWorldDepth(overlay){
    const world = overlay?.querySelector(':scope > .ng-chamber-world');
    if(!world || world.querySelector('.ng35-world-depth')) return;
    const depth = document.createElement('div');
    depth.className = 'ng35-world-depth';
    depth.setAttribute('aria-hidden','true');
    depth.innerHTML = `
      <div class="ng35-ceiling-rig"><i></i><i></i><i></i></div>
      <div class="ng35-wall-bay bay-left">
        <div class="ng35-wall-screen"><span>MEMORY LAB</span><b>⌁</b></div>
        <div class="ng35-wall-slots"><i></i><i></i><i></i></div>
      </div>
      <div class="ng35-wall-bay bay-right">
        <div class="ng35-wall-screen"><span>NEURAL CORE</span><b>✦</b></div>
        <div class="ng35-wall-slots"><i></i><i></i><i></i></div>
      </div>
      <div class="ng35-foreground fg-left">
        <div class="ng35-console-screen">∿</div>
        <div class="ng35-console-lights"><i></i><i></i><i></i></div>
      </div>
      <div class="ng35-foreground fg-right">
        <div class="ng35-brain-pod">🧠</div>
        <div class="ng35-console-lights"><i></i><i></i><i></i></div>
      </div>
      <div class="ng35-floor-reflection"></div>
    `;
    world.append(depth);
  }

  function addChamberDepth(shell){
    const fx = shell.querySelector(':scope > .ng-chamber-fx');
    if(!fx || fx.querySelector('.ng35-depth-kit')) return;
    const kit = document.createElement('div');
    kit.className = 'ng35-depth-kit';
    kit.setAttribute('aria-hidden','true');
    kit.innerHTML = `
      <div class="ng35-projector"><i></i><span></span></div>
      <div class="ng35-data-rail"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="ng35-grid-dock"><span></span><b></b></div>
      <div class="ng35-mascot-pad"><span></span></div>
      <div class="ng35-energy-dock"><i></i><i></i><span>CORE</span></div>
      <div class="ng35-stage-plinth"><i></i><i></i><i></i></div>
    `;
    fx.append(kit);
  }

  function decorate(shell){
    if(!shell || shell.dataset.ng0535 === '1') return;
    shell.dataset.ng0535 = '1';
    const overlay = shell.closest('.neural-overlay');
    addWorldDepth(overlay);
    addChamberDepth(shell);

    const feedback = shell.querySelector('.neural-feedback');
    const resultScore = shell.querySelector('.neural-score-ring strong');

    const syncOutcome = () => {
      let outcome = '';
      if(feedback?.classList.contains('success')) outcome = 'success';
      else if(feedback?.classList.contains('error')) outcome = 'error';
      if(shell.dataset.neuralOutcome !== outcome) shell.dataset.neuralOutcome = outcome;
      if(overlay && overlay.dataset.neuralOutcome !== outcome) overlay.dataset.neuralOutcome = outcome;

      const raw = resultScore?.textContent || '';
      const score = Number((raw.match(/^(\d+)/)||[])[1] || 0);
      if(shell.dataset.neuralState === 'result'){
        const grade = score === 5 ? 'perfect' : score >= 4 ? 'great' : 'complete';
        if(shell.dataset.resultGrade !== grade) shell.dataset.resultGrade = grade;
      }
    };

    let queued = false;
    const schedule = () => {
      if(queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        syncOutcome();
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(shell,{
      subtree:true,
      childList:true,
      characterData:true,
      attributes:true,
      attributeFilter:['class','hidden','data-neural-state']
    });
    syncOutcome();
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

  function boot(){
    scan();
    if(document.body) rootObserver.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
