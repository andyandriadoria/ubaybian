// UbayBian v0.5.65 — user-facing Assessment terminology layer
// Internal exam_* APIs, table names, route values, and blueprint IDs intentionally remain unchanged.
(() => {
  'use strict';

  const ATTRIBUTES = ['title', 'aria-label'];

  function translate(value) {
    let text = String(value ?? '');
    if (!text) return text;

    // Specific assessment titles first, so generic replacements below do not flatten them.
    text = text.replace(/\b([A-Za-z][A-Za-z &/-]*?) Mid Exam S([12])\b/g, '$1 Midterm Assessment S$2');
    text = text.replace(/\b([A-Za-z][A-Za-z &/-]*?) Final Exam S([12])\b/g, '$1 Final Assessment S$2');

    text = text
      .replace(/MID EXAM SIMULATION/g, 'ASSESSMENT')
      .replace(/Mid Exam Simulation/g, 'Assessment')
      .replace(/mid exam simulation/g, 'assessment')
      .replace(/SIMULATION COMPLETE/g, 'ASSESSMENT COMPLETE')
      .replace(/Simulation Complete/g, 'Assessment Complete')
      .replace(/simulation complete/g, 'assessment complete')
      .replace(/Finish Exam/g, 'Finish Assessment')
      .replace(/Mulai Simulasi/g, 'Mulai Assessment')
      .replace(/Mulai simulasi Mid Exam/g, 'Mulai Assessment')
      .replace(/Reward Mid Exam/g, 'Reward Assessment')
      .replace(/reward Mid Exam/g, 'reward Assessment')
      .replace(/Mid Exam/g, 'Assessment')
      .replace(/mid exam/g, 'assessment')
      .replace(/Simulasi ujian/g, 'Assessment')
      .replace(/simulasi ujian/g, 'assessment')
      .replace(/setelah seluruh simulasi selesai/g, 'setelah seluruh assessment selesai')
      .replace(/after the simulation/g, 'after the assessment')
      .replace(/setelah simulasi/g, 'setelah assessment')
      .replace(/simulasi ini/g, 'assessment ini')
      .replace(/Simulasi ini/g, 'Assessment ini');

    return text;
  }

  function translateTextNode(node) {
    const next = translate(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  }

  function translateElement(element) {
    for (const name of ATTRIBUTES) {
      if (!element.hasAttribute?.(name)) continue;
      const current = element.getAttribute(name);
      const next = translate(current);
      if (next !== current) element.setAttribute(name, next);
    }
  }

  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;

    if (root.nodeType === Node.ELEMENT_NODE) translateElement(root);
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
          if (parent?.closest?.('script,style')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );
    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
      else translateElement(node);
      node = walker.nextNode();
    }
  }

  // Keep confirmations consistent even though the legacy module still uses internal exam wording.
  const nativeConfirm = window.confirm.bind(window);
  window.confirm = (message) => nativeConfirm(translate(message));

  const nativeAlert = window.alert.bind(window);
  window.alert = (message) => nativeAlert(translate(message));

  function boot() {
    translateTree(document.body);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'characterData') {
          translateTextNode(record.target);
          continue;
        }
        if (record.type === 'attributes') {
          translateElement(record.target);
          continue;
        }
        for (const node of record.addedNodes) translateTree(node);
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRIBUTES,
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
