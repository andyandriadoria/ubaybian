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

  globalThis.UBAYBIAN_VERSION = Object.freeze({
    version: VERSION,
    channel: CHANNEL,
    label: LABEL,
    asset,
  });

  const renderVersion = () => {
    document.querySelectorAll('[data-app-version]').forEach((node) => {
      node.textContent = LABEL;
      node.title = `UbayBian ${LABEL}`;
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderVersion, { once: true });
  else renderVersion();
})();
