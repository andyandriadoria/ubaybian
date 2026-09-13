// UbayBian v0.5.47 — Learning Deck Lock Polish
(() => {
  'use strict';

  let scheduled = false;

  function polishReview(panel) {
    const info = panel.querySelector('.deck-review-info, .review-info');
    if (!info) return;
    info.classList.add('deck-review-info');
    const text = info.textContent.trim();
    const match = text.match(/(\d+)\s*soal/i);
    if (match && !/siap direview/i.test(text)) {
      const count = Number(match[1]);
      info.textContent = `${count} soal siap direview`;
    } else if (/tidak ada review/i.test(text)) {
      info.textContent = 'Review bersih';
    }
  }

  function polishMap(panel) {
    const map = panel.querySelector('.adventure-map');
    if (!map) return;
    map.classList.add('deck-route-ambient');
  }

  function polishMenus(panel) {
    panel.querySelector('.deck-control-subject .deck-menu')?.classList.add('deck-subject-menu');
    panel.querySelector('.deck-control-questions .deck-menu')?.classList.add('deck-questions-menu');
  }

  function enhancePanel(panel) {
    if (!panel?.classList?.contains('learning-deck')) return;
    panel.classList.add('learning-deck-lock');
    polishMenus(panel);
    polishMap(panel);
    polishReview(panel);

    const subject = panel.querySelector('#subject-select');
    if (subject && subject.dataset.lockPolish547 !== '1') {
      subject.dataset.lockPolish547 = '1';
      subject.addEventListener('change', () => requestAnimationFrame(() => polishReview(panel)));
    }
  }

  function enhance(root = document) {
    if (root.nodeType === 1 && root.matches?.('.controls-panel.learning-deck')) enhancePanel(root);
    root.querySelectorAll?.('.controls-panel.learning-deck').forEach(enhancePanel);
  }

  function schedule(root = document) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhance(root);
    });
  }

  enhance();
  const observer = new MutationObserver((records) => {
    let relevant = false;
    for (const record of records) {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (target?.closest?.('.controls-panel.learning-deck')) {
        relevant = true;
        break;
      }
      for (const node of record.addedNodes) {
        if (node.nodeType === 1 && (node.matches?.('.controls-panel.learning-deck') || node.querySelector?.('.controls-panel.learning-deck'))) {
          relevant = true;
          break;
        }
      }
      if (relevant) break;
    }
    if (relevant) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
})();
