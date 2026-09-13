/* UbayBian app version — single source of truth.
   Update VERSION here when shipping a new app release. */
(() => {
  'use strict';

  const VERSION = '0.5.83';
  const CHANNEL = 'family';
  const LABEL = `v${VERSION} · ${CHANNEL}`;

  const asset = (path) => {
    const separator = String(path).includes('?') ? '&' : '?';
    return `${path}${separator}v=${encodeURIComponent(VERSION)}`;
  };

  const appVersion = Object.freeze({
    version: VERSION,
    channel: CHANNEL,
    label: LABEL,
    asset
  });

  window.UBAYBIAN_VERSION = VERSION;
  window.UBAYBIAN = appVersion;

  const syncVersionUI = (root = document) => {
    const nodes = [];
    if (root.nodeType === 1 && root.matches?.('.version,[data-app-version]')) nodes.push(root);
    root.querySelectorAll?.('.version,[data-app-version]').forEach((node) => nodes.push(node));

    nodes.forEach((node) => {
      if (node.textContent !== LABEL) node.textContent = LABEL;
      node.dataset.appVersion = VERSION;
      node.dataset.appChannel = CHANNEL;
    });

    document.documentElement.dataset.appVersion = VERSION;
    document.documentElement.dataset.appChannel = CHANNEL;
  };

  const boot = () => {
    syncVersionUI();
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === 1) syncVersionUI(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
