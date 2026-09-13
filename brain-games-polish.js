/* UbayBian v0.5.29 · Brain Games Final Polish
   Tightens intro copy and mascot companion language without changing game logic. */
(() => {
  const polish = (shell) => {
    if (!shell || shell.dataset.finalPolish === '1') return;
    shell.dataset.finalPolish = '1';

    const ready = shell.querySelector('.reactor-ready');
    const play = shell.querySelector('.reactor-play');
    const result = shell.querySelector('.reactor-result');
    const readyTitle = ready?.querySelector('h3');
    const readyCopy = ready?.querySelector('.reactor-ready-copy');
    const bubble = shell.querySelector('.reactor-mascot-bubble');
    const newBest = shell.querySelector('.reactor-new-best');

    if (readyTitle) readyTitle.textContent = 'Siap mulai?';
    if (readyCopy) readyCopy.textContent = 'Jawab sebanyak mungkin dalam satu misi 60 detik.';

    const sync = () => {
      let state = 'ready';
      if (play && !play.hidden) state = 'play';
      if (result && !result.hidden) state = 'result';

      if (!bubble) return;
      if (state === 'ready') bubble.textContent = 'Siap? Nyalakan reactornya! ⚡';
      else if (state === 'play') bubble.textContent = 'Fokus! Satu soal lagi! 🚀';
      else bubble.textContent = newBest && !newBest.hidden ? 'Rekor baru! Keren! 🌟' : 'Misi selesai! Mantap! ✨';
    };

    sync();
    const observer = new MutationObserver(sync);
    [ready, play, result, newBest].filter(Boolean).forEach((node) => {
      observer.observe(node, { attributes: true, attributeFilter: ['hidden', 'class'] });
    });

    const removalObserver = new MutationObserver(() => {
      if (!document.body.contains(shell)) {
        observer.disconnect();
        removalObserver.disconnect();
      }
    });
    removalObserver.observe(document.body, { childList: true, subtree: true });
  };

  const scan = () => document.querySelectorAll('.reactor-shell').forEach(polish);
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
})();
