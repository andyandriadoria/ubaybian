/* Lab Rescue Arcade Presentation — deterministic decoration + guarded game transport. */
(() => {
  'use strict';
  const SHELL = '.lab-rescue-shell';
  const nativeFetch = globalThis.fetch.bind(globalThis);
  const localSessions = new Set();
  let transportPatched = false;

  function urlString(input) {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    return input?.url || '';
  }

  function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async function withTimeout(promise, ms = 6000) {
    let timer = 0;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('LAB_RESCUE_API_TIMEOUT')), ms);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function patchTransport() {
    if (transportPatched) return;
    transportPatched = true;

    globalThis.fetch = async function labRescueFetch(input, init = {}) {
      const url = urlString(input);
      const method = String(init?.method || input?.method || 'GET').toUpperCase();
      const isGameStart = method === 'POST' && /\/v1\/games\/[^/]+\/start(?:\?|$)/.test(url);
      const isGameFinish = method === 'POST' && /\/v1\/games\/[^/]+\/finish(?:\?|$)/.test(url);

      if (isGameStart) {
        let body = null;
        try { body = JSON.parse(String(init?.body || '{}')); } catch {}
        if (body?.gameId === 'lab-rescue') {
          try {
            const response = await withTimeout(nativeFetch(input, init), 6000);
            if (response.ok) return response;
            console.warn('Lab Rescue backend start unavailable; switching to local play mode.', response.status);
          } catch (error) {
            console.warn('Lab Rescue backend start timed out; switching to local play mode.', error);
          }

          const sessionId = `local-lab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          localSessions.add(sessionId);
          return jsonResponse({
            sessionId,
            gameId: 'lab-rescue',
            startedAt: Date.now(),
            remainingDailyXp: 0,
            localFallback: true,
          });
        }
      }

      if (isGameFinish) {
        let body = null;
        try { body = JSON.parse(String(init?.body || '{}')); } catch {}
        if (body?.sessionId && localSessions.has(body.sessionId)) {
          localSessions.delete(body.sessionId);
          return jsonResponse({
            gameId: 'lab-rescue',
            score: Number(body.score || 0),
            xpEarned: 0,
            games: { 'lab-rescue': { best: 0, plays: 0, totalScore: 0 } },
            dailyXp: 0,
            dailyXpCap: 50,
            remainingDailyXp: 50,
            localFallback: true,
          });
        }
      }

      return nativeFetch(input, init);
    };
  }

  function ensureHiddenContract() {
    if (document.getElementById('lab-rescue-hidden-contract')) return;
    const style = document.createElement('style');
    style.id = 'lab-rescue-hidden-contract';
    style.textContent = '.lab-rescue-shell.lab-arcade-v2 [hidden]{display:none!important}';
    document.head.append(style);
  }

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
    patchTransport();
    ensureHiddenContract();
    scan();
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
