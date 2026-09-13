/* UbayBian v0.5.33 · Memory Grid Gameplay Polish
   DOM-only layout polish. Core game logic remains in memory-grid.js. */
(() => {
  const SELECTOR = '.neural-shell';

  function decorate(shell){
    if(!shell || shell.dataset.ng0533 === '1') return;
    shell.dataset.ng0533 = '1';

    const ready = shell.querySelector('.neural-ready');
    const play = shell.querySelector('.neural-play');
    const feedback = shell.querySelector('.neural-feedback');
    const nextBtn = shell.querySelector('.neural-next');

    /* Remove the duplicated identity title from the center of the intro. */
    const readyTitle = ready?.querySelector('h3');
    if(readyTitle) readyTitle.textContent = 'Siap latih ingatan?';

    const readyCopy = ready?.querySelector('.neural-ready-copy');
    if(readyCopy){
      readyCopy.textContent = 'Lihat dan ingat posisi angkanya. Setelah tertutup, pilih angka yang tadi muncul di kotak menyala.';
    }

    /* Reserve a permanent action zone so feedback and the next-round CTA never get clipped. */
    if(play && feedback && nextBtn && !play.querySelector('.neural-action-zone')){
      const zone = document.createElement('div');
      zone.className = 'neural-action-zone';
      zone.setAttribute('aria-live','polite');
      feedback.before(zone);
      zone.append(feedback,nextBtn);
    }

    const options = shell.querySelector('.neural-options');
    if(options) options.setAttribute('aria-label','Pilihan jawaban Neural Grid');
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

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
})();
