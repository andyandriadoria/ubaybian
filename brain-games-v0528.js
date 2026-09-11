/* UbayBian v0.5.28 · Brain Games Arcade Polish
   Adds a lightweight mascot/decor layer without touching game logic. */
(() => {
  const enhance = (shell) => {
    if (!shell || shell.dataset.arcadePolish === '1') return;
    shell.dataset.arcadePolish = '1';

    const mathField = document.createElement('div');
    mathField.className = 'reactor-math-field';
    mathField.setAttribute('aria-hidden', 'true');
    const symbols = [
      ['m1', '+'], ['m2', '×'], ['m3', '÷'], ['m4', '−'], ['m5', '★'], ['m6', '✦']
    ];
    symbols.forEach(([cls, value]) => {
      const span = document.createElement('span');
      span.className = cls;
      span.textContent = value;
      mathField.appendChild(span);
    });

    const mascot = document.createElement('div');
    mascot.className = 'reactor-mascot';
    mascot.setAttribute('aria-hidden', 'true');
    mascot.innerHTML = `
      <div class="reactor-mascot-bot">
        <span class="reactor-mascot-antenna"></span>
        <span class="reactor-mascot-head"></span>
        <span class="reactor-mascot-eye left"></span>
        <span class="reactor-mascot-eye right"></span>
        <span class="reactor-mascot-body"></span>
      </div>
      <div class="reactor-mascot-bubble">Siap? ⚡</div>
    `;

    shell.prepend(mathField);
    shell.appendChild(mascot);

    const bubble = mascot.querySelector('.reactor-mascot-bubble');
    const ready = shell.querySelector('.reactor-ready');
    const play = shell.querySelector('.reactor-play');
    const result = shell.querySelector('.reactor-result');
    const newBest = shell.querySelector('.reactor-new-best');

    const syncState = () => {
      let state = 'ready';
      if (play && !play.hidden) state = 'play';
      if (result && !result.hidden) state = 'result';
      shell.dataset.reactorState = state;

      if (!bubble) return;
      if (state === 'ready') bubble.textContent = 'Siap? ⚡';
      else if (state === 'play') bubble.textContent = 'Fokus! Kamu bisa.';
      else bubble.textContent = newBest && !newBest.hidden ? 'Rekor baru! 🚀' : 'Misi selesai! ✨';
    };

    syncState();

    const stateObserver = new MutationObserver(syncState);
    [ready, play, result, newBest].filter(Boolean).forEach((node) => {
      stateObserver.observe(node, { attributes: true, attributeFilter: ['hidden', 'class'] });
    });

    const removalObserver = new MutationObserver(() => {
      if (!document.body.contains(shell)) {
        stateObserver.disconnect();
        removalObserver.disconnect();
      }
    });
    removalObserver.observe(document.body, { childList: true, subtree: true });
  };

  const scan = () => document.querySelectorAll('.reactor-shell').forEach(enhance);
  scan();

  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
})();
