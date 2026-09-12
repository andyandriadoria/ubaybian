// UbayBian v0.5.74 — normalize Wikimedia SVG question images to PNG thumbnails.
(() => {
  'use strict';

  function wikimediaPngThumb(raw) {
    const value = String(raw || '').trim();
    if (!value) return '';
    try {
      const url = new URL(value, window.location.href);
      if (url.hostname !== 'upload.wikimedia.org') return '';
      const match = url.pathname.match(/^\/wikipedia\/commons\/([0-9a-f]\/[^/]+)\/(.+\.svg)$/i);
      if (!match) return '';
      const bucket = match[1];
      const filename = match[2];
      return `https://upload.wikimedia.org/wikipedia/commons/thumb/${bucket}/${filename}/960px-${filename}.png`;
    } catch {
      return '';
    }
  }

  function normalizeImage(img) {
    if (!(img instanceof HTMLImageElement)) return;
    const raw = img.getAttribute('src') || '';
    const fallback = wikimediaPngThumb(raw);
    if (!fallback || fallback === raw) return;
    img.dataset.wikimediaSvgOriginal = raw;
    img.src = fallback;
  }

  function scan(root = document) {
    if (root instanceof HTMLImageElement) normalizeImage(root);
    root.querySelectorAll?.('img').forEach(normalizeImage);
  }

  scan();

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes' && record.target instanceof HTMLImageElement) {
        normalizeImage(record.target);
        continue;
      }
      for (const node of record.addedNodes) {
        if (node.nodeType === 1) scan(node);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src'],
  });
})();
