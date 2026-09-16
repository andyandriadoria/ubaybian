/* Lab Rescue Arcade Presentation — deterministic decoration only. */
(() => {
  'use strict';
  const SHELL = '.lab-rescue-shell';

  function img(src, cls) {
    const node = document.createElement('img');
    node.src = src;
    node.alt = '';
    node.className = cls;
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  function ensureDecorations(shell) {
    if (!shell) return;
    shell.classList.add('lab-arcade-v2');

    if (!shell.querySelector(':scope > .lab-arcade-bubbles')) {
      const bubbles = document.createElement('div');
      bubbles.className = 'lab-arcade-bubbles';
      bubbles.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < 12; i += 1) bubbles.append(document.createElement('span'));
      shell.prepend(bubbles);
    }

    const ready = shell.querySelector('.lab-rescue-ready');
    if (ready && !ready.querySelector('.lab-ready-tube-art')) {
      ready.append(img('assets/lab-rescue-tube.svg', 'lab-ready-tube-art'));
    }

    const play = shell.querySelector('.lab-rescue-play');
    if (play && !play.querySelector('.lab-play-tube-art')) {
      play.append(img('assets/lab-rescue-tube.svg', 'lab-play-tube-art'));
    }
  }

  function scan(root = document) {
    if (root.matches?.(SHELL)) ensureDecorations(root);
    root.querySelectorAll?.(SHELL).forEach(ensureDecorations);
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      const shell = record.target?.closest?.(SHELL);
      if (shell) ensureDecorations(shell);
      for (const node of record.addedNodes) {
        if (node.nodeType === 1) scan(node);
      }
    }
  });

  function boot() {
    scan();
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
