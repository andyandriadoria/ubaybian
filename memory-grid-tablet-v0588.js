/* UbayBian v0.5.88 · Neural Grid tablet CSS order guard
   Prevent legacy clarity styles from being re-appended after the tablet layer,
   then load the final tablet balance polish last. */
(() => {
  function removeDuplicateLegacyLayers(){
    document.querySelectorAll([
      'link[data-memory-grid-v0536]',
      'link[data-memory-grid-v0537]',
      'link[data-memory-grid-v0538]'
    ].join(',')).forEach((link) => link.remove());
  }

  function ensurePolish(){
    const existing = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .find((link) => String(link.getAttribute('href') || '').includes('memory-grid-tablet-v0588.css'));
    if(existing) existing.remove();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'memory-grid-tablet-v0588.css?v=0.5.88';
    link.dataset.memoryGridTabletV0588 = '1';
    document.head.append(link);
  }

  function boot(){
    removeDuplicateLegacyLayers();
    ensurePolish();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
