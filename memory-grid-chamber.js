/* UbayBian v0.5.34 · Memory Grid Neural Chamber
   Decorative world-building only. No gameplay/scoring logic here. */
(() => {
  const SELECTOR = '.neural-shell';

  function buildWorld(overlay){
    if(!overlay || overlay.querySelector(':scope > .ng-chamber-world')) return;
    const world = document.createElement('div');
    world.className = 'ng-chamber-world';
    world.setAttribute('aria-hidden','true');
    world.innerHTML = `
      <div class="ng-world-beam"></div>
      <div class="ng-world-ring ring-a"></div>
      <div class="ng-world-ring ring-b"></div>
      <div class="ng-world-float float-a">✦</div>
      <div class="ng-world-float float-b">✚</div>
      <div class="ng-world-float float-c">◈</div>
      <div class="ng-world-floor"></div>
    `;
    overlay.prepend(world);
  }

  function buildChamber(shell){
    if(shell.querySelector(':scope > .ng-chamber-fx')) return;
    const fx = document.createElement('div');
    fx.className = 'ng-chamber-fx';
    fx.setAttribute('aria-hidden','true');
    fx.innerHTML = `
      <div class="ng-core-halo"></div>
      <div class="ng-scan-beam"></div>
      <div class="ng-conduit left"><span></span><span></span><span></span></div>
      <div class="ng-conduit right"><span></span><span></span><span></span></div>
      <div class="ng-console-bed"><i></i><i></i><i></i></div>
      <div class="ng-prop ng-prop-puzzle"><b>🧩</b></div>
      <div class="ng-prop ng-prop-brain"><b>🧠</b></div>
      <div class="ng-node n1"></div><div class="ng-node n2"></div><div class="ng-node n3"></div><div class="ng-node n4"></div>
    `;
    shell.append(fx);
  }

  function decorate(shell){
    if(!shell || shell.dataset.ng0534 === '1') return;
    shell.dataset.ng0534 = '1';
    const overlay = shell.closest('.neural-overlay');
    buildWorld(overlay);
    buildChamber(shell);

    const syncState = () => {
      const state = shell.dataset.neuralState || 'ready';
      if(overlay && overlay.dataset.neuralState !== state) overlay.dataset.neuralState = state;
    };
    syncState();

    const observer = new MutationObserver((records) => {
      if(records.some(r => r.type === 'attributes' && r.attributeName === 'data-neural-state')) syncState();
    });
    observer.observe(shell,{attributes:true,attributeFilter:['data-neural-state']});
  }

  function scan(root=document){
    if(root.matches?.(SELECTOR)) decorate(root);
    root.querySelectorAll?.(SELECTOR).forEach(decorate);
  }

  const observer = new MutationObserver(records => {
    for(const record of records){
      for(const node of record.addedNodes){
        if(node.nodeType === 1) scan(node);
      }
    }
  });

  function boot(){
    scan();
    if(document.body) observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
