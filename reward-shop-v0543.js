// UbayBian v0.5.43 — Reward Shop Object & Hierarchy Polish
(() => {
  const ensureStyle = () => {
    if (document.querySelector('link[data-reward-v0543="1"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './reward-shop-v0543.css?v=0.5.43';
    link.dataset.rewardV0543 = '1';
    document.head.appendChild(link);
  };

  const upgradeVersionLabel = () => {
    document.querySelectorAll('body *').forEach((el) => {
      if (el.children.length) return;
      const text = (el.textContent || '').trim();
      if (/^v0\.5\.4[0-2]\s*·\s*family$/i.test(text)) {
        el.textContent = 'v0.5.43 · family';
      }
    });
  };

  const makeObject = (kind) => {
    const span = document.createElement('span');
    span.className = `reward-object ${kind}`;
    span.setAttribute('aria-hidden', 'true');
    return span;
  };

  const inferKind = (card) => {
    const existing = card.dataset.rewardKind;
    if (existing && ['snack', 'book', 'toy'].includes(existing)) return existing;
    const title = (card.querySelector('.ub-reward-copy strong')?.textContent || '').toLowerCase();
    if (title.includes('snack')) return 'snack';
    if (title.includes('buku')) return 'book';
    if (title.includes('mainan')) return 'toy';
    return 'toy';
  };

  const repairRewardObjects = (box) => {
    box.querySelectorAll('.ub-reward-card').forEach((card) => {
      const kind = inferKind(card);
      card.dataset.rewardKind = kind;
      const icon = card.querySelector('.ub-reward-icon');
      if (!icon) return;

      const expected = icon.querySelector(`.reward-object.${kind}`);
      if (!expected || icon.children.length !== 1) {
        icon.replaceChildren(makeObject(kind));
      }
      icon.dataset.toyIcon541 = '1';
      icon.dataset.toyIcon543 = kind;
      icon.setAttribute('aria-hidden', 'true');
    });
  };

  const repairParentAccess = (box) => {
    const parent = box.querySelector('.reward-parent-panel');
    if (!parent || parent.querySelector('.reward-parent-access-badge')) return;
    const badge = document.createElement('div');
    badge.className = 'reward-parent-access-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = '<span class="shield"></span><span>PARENT<br>ACCESS</span>';
    parent.appendChild(badge);
  };

  const polishTerminal = (box) => {
    const title = box.querySelector('.ub-modal-heading h2');
    if (!title || title.textContent.trim() !== 'Reward Shop') return;

    box.classList.add('reward-chamber');
    box.closest('.ub-modal-overlay')?.classList.add('reward-chamber-overlay');
    repairRewardObjects(box);
    repairParentAccess(box);

    if (!box.__reward543Observer) {
      let queued = false;
      const refresh = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          repairRewardObjects(box);
          repairParentAccess(box);
        });
      };
      const observer = new MutationObserver(refresh);
      observer.observe(box, { childList: true, subtree: true });
      box.__reward543Observer = observer;
    }
  };

  const scan = () => {
    ensureStyle();
    upgradeVersionLabel();
    document.querySelectorAll('.ub-modal-box').forEach(polishTerminal);
  };

  ensureStyle();
  scan();
  const pageObserver = new MutationObserver(scan);
  pageObserver.observe(document.documentElement, { childList: true, subtree: true });
})();
