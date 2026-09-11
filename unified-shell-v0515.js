// UbayBian v0.5.16 — Unified Adventure Shell
// Keeps the Home visual world active on Quiz/Result/Report/Robot Lab and loading transitions.
(() => {
  const main = document.querySelector('#main');
  if (!main) return;

  let scheduled = false;

  function classifyTiles(){
    main.querySelectorAll('.side-tile').forEach((tile) => {
      const name = tile.querySelector('.side-tile-text')?.textContent?.trim();
      tile.classList.toggle('adventure-brain', name === 'Brain Games');
      tile.classList.toggle('adventure-memory', name === 'Memory Grid');
      tile.classList.toggle('adventure-reward', name === 'Reward Shop');
    });
  }

  function scan(){
    scheduled = false;
    const hasSidebar = Boolean(main.querySelector('.app-main-grid .side-menu'));
    const hasMainColumn = Boolean(main.querySelector('.app-main-grid .main-col'));
    const hasInternalScreen = hasSidebar && hasMainColumn;
    const hasLoadingTransition = Boolean(
      document.body.dataset.profile && main.querySelector('.loading-card:not(.error-state)')
    );
    const hasAdventureShell = hasInternalScreen || hasLoadingTransition;

    document.body.classList.toggle('adventure-shell', hasAdventureShell);
    document.body.classList.toggle('adventure-transition-shell', hasLoadingTransition);

    if (hasInternalScreen) classifyTiles();
  }

  function schedule(){
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(scan);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(main, {childList:true, subtree:true, characterData:true});
  window.addEventListener('hashchange', schedule);
  window.addEventListener('load', schedule);
  schedule();
})();
