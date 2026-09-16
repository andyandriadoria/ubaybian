/* Lab Rescue Arcade Presentation — visual decoration only. */
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

  function decorate(shell) {
    if (!shell || shell.dataset.arcadeDecorated === '1') return;
    shell.dataset.arcadeDecorated = '1';
    shell.classList.add('lab-arcade-v2');

    const bubbles = document.createElement('div');
    bubbles.className = 'lab-arcade-bubbles';
    bubbles.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 14; i += 1) bubbles.append(document.createElement('span'));
    shell.prepend(bubbles);

    const ready = shell.querySelector('.lab-rescue-ready');
    if (ready) {
      ready.append(
        img('assets/lab-rescue-tube.svg', 'lab-ready-tube-art'),
        img('assets/lab-rescue-ufo.svg', 'lab-ready-ufo-art'),
      );
    }

    const play = shell.querySelector('.lab-rescue-play');
    if (play) {
      play.append(img('assets/lab-rescue-tube.svg', 'lab-play-tube-art'));
    }

    const result = shell.querySelector('.lab-rescue-result');
    if (result) result.append(img('assets/lab-rescue-ufo.svg', 'lab-result-ufo-art'));
  }

  function scan(root = document) {
    if (root.matches?.(SHELL)) decorate(root);
    root.querySelectorAll?.(SHELL).forEach(decorate);
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
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
