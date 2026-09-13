/* UbayBian v0.5.87 · Memory Grid Readability + Tablet Layout Loader
   Spatial/decorative layer only. Gameplay, scoring, XP and persistence stay in memory-grid.js.
   Loads the clarity layers first, then the tablet-specific composition last. */
(() => {
  const SELECTOR = '.neural-shell';

  function appendCSS({selector,href,dataKey}){
    if(document.querySelector(selector)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset[dataKey] = '1';
    document.head.append(link);
  }

  function loadClarityCSS(){
    appendCSS({
      selector:'link[data-memory-grid-v0536]',
      href:'memory-grid-clarity.css?v=0.5.39',
      dataKey:'memoryGridV0536'
    });
    appendCSS({
      selector:'link[data-memory-grid-v0537]',
      href:'memory-grid-contrast.css?v=0.5.39',
      dataKey:'memoryGridV0537'
    });
    appendCSS({
      selector:'link[data-memory-grid-v0538]',
      href:'memory-grid-hint-contrast.css?v=0.5.39',
      dataKey:'memoryGridV0538'
    });
    appendCSS({
      selector:'link[data-memory-grid-tablet-v0587]',
      href:'memory-grid-tablet.css?v=0.5.87',
      dataKey:'memoryGridTabletV0587'
    });
  }

  function syncVersionLabel(){
    /* This feature file can still be loaded by newer app releases.
       Never downgrade a newer global app version label. */
    const version = document.querySelector('.version');
    if(!version) return;
    const current = (version.textContent || '').trim();
    const match = current.match(/^v(\d+)\.(\d+)\.(\d+)\s*·\s*family$/i);
    if(!match) return;
    const [, major, minor, patch] = match.map((part, index) => index === 0 ? part : Number(part));
    const isOlderThan587 = major < 0 || (major === 0 && (minor < 5 || (minor === 5 && patch < 87)));
    if(isOlderThan587) version.textContent = 'v0.5.87 · family';
  }

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
      <div class="ng35-energy-dock"><i></i><i></i><span>MEMORY CORE</span></div>
      <div class="ng35-stage-plinth"><i></i><i></i><i></i></div>
    `;
    fx.append(kit);
  }

  function addClarityKit(shell){
    const fx = shell.querySelector(':scope > .ng-chamber-fx');
    if(!fx || fx.querySelector('.ng36-clarity-kit')) return;
    const kit = document.createElement('div');
    kit.className = 'ng36-clarity-kit';
    kit.setAttribute('aria-hidden','true');
    kit.innerHTML = `
      <div class="ng36-focus-field"></div>
      <div class="ng36-link left"><i></i><i></i><i></i></div>
      <div class="ng36-link right"><i></i><i></i><i></i></div>
      <div class="ng36-stage-rim"></div>
      <div class="ng36-celebration"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    `;
    fx.append(kit);
  }

  function decorate(shell){
    if(!shell || shell.dataset.ng0535 === '1') return;
    shell.dataset.ng0535 = '1';
    shell.dataset.ng0536 = '1';
    shell.dataset.ng0537 = '1';
    shell.dataset.ng0538 = '1';
    shell.dataset.ng0539 = '1';
    shell.dataset.ng0587 = '1';
    const overlay = shell.closest('.neural-overlay');
    addWorldDepth(overlay);
    addChamberDepth(shell);
    addClarityKit(shell);

    const syncOutcome = () => {
      const feedback = shell.querySelector('.neural-feedback');
      const resultScore = shell.querySelector('.neural-score-ring strong');
      const mascotBubble = shell.querySelector('.neural-lab-bubble');
      const resultNote = shell.querySelector('.neural-result .neural-note');

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

      if(resultNote?.textContent.trim() === 'Hasil tersimpan ke profilmu.'){
        resultNote.textContent = '';
      }

      if(mascotBubble){
        const state = shell.dataset.neuralState || '';
        if(outcome === 'success') mascotBubble.textContent = 'Yes! Ketemu! ✨';
        else if(outcome === 'error') mascotBubble.textContent = 'Hampir! Coba ingat lagi.';
        else if(state === 'ready') mascotBubble.textContent = 'Siap melatih ingatan?';
        else if(state === 'scan') mascotBubble.textContent = 'Ingat posisinya!';
        else if(state === 'recall') mascotBubble.textContent = 'Kotak yang mana tadi?';
        else if(state === 'result' && score === 5) mascotBubble.textContent = 'Hebat! Semua ketemu! 🌟';
        else if(state === 'result' && score >= 4) mascotBubble.textContent = 'Mantap! Ingatanmu tajam! ✨';
        else if(state === 'result') mascotBubble.textContent = 'Kita coba lagi, ya!';
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
    loadClarityCSS();
    syncVersionLabel();
    scan();
    if(document.body) rootObserver.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();