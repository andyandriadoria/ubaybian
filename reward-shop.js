// UbayBian v0.5.40 — Reward Shop Full Chamber Immersive
(() => {
  const decorate = (box) => {
    if (!box || box.dataset.rewardChamberReady === '1') return;
    const title = box.querySelector('.ub-modal-heading h2');
    if (!title || title.textContent.trim() !== 'Reward Shop') return;

    box.dataset.rewardChamberReady = '1';
    box.classList.add('reward-chamber');
    const overlay = box.closest('.ub-modal-overlay');
    if (overlay) overlay.classList.add('reward-chamber-overlay');

    const mascot = document.createElement('div');
    mascot.className = 'reward-chamber-mascot';
    mascot.setAttribute('aria-hidden', 'true');
    mascot.textContent = '🤖';

    const orb = document.createElement('div');
    orb.className = 'reward-chamber-orb';
    orb.setAttribute('aria-hidden', 'true');

    const consoleEl = document.createElement('div');
    consoleEl.className = 'reward-chamber-console';
    consoleEl.setAttribute('aria-hidden', 'true');

    box.append(mascot, orb, consoleEl);

    const decorateContent = () => {
      const content = box.querySelector('.ub-shop-content');
      if (!content || content.dataset.rewardDecorated === '1') return;
      content.dataset.rewardDecorated = '1';

      const cards = [...content.querySelectorAll('.ub-reward-card')];
      cards.forEach((card, index) => {
        const name = (card.querySelector('.ub-reward-copy strong')?.textContent || '').toLowerCase();
        let kind = 'gift';
        let icon = '🎁';
        if (name.includes('snack')) {
          kind = 'snack';
          icon = '🍪';
        } else if (name.includes('buku')) {
          kind = 'book';
          icon = '📚';
        } else if (name.includes('mainan')) {
          kind = 'toy';
          icon = '🤖';
        }
        card.dataset.rewardKind = kind;
        card.dataset.rewardIndex = String(index + 1);
        const iconEl = card.querySelector('.ub-reward-icon');
        if (iconEl) iconEl.textContent = icon;
      });

      const headings = [...content.querySelectorAll('.ub-section-title')];
      const parentHeading = headings.find((node) => node.textContent.trim() === 'Persetujuan orang tua');
      if (parentHeading && !parentHeading.closest('.reward-parent-panel')) {
        const parentCopy = parentHeading.nextElementSibling?.classList.contains('ub-modal-copy') ? parentHeading.nextElementSibling : null;
        const requestList = parentCopy?.nextElementSibling?.classList.contains('ub-request-list')
          ? parentCopy.nextElementSibling
          : parentHeading.nextElementSibling?.classList.contains('ub-request-list')
            ? parentHeading.nextElementSibling
            : null;
        const panel = document.createElement('section');
        panel.className = 'reward-parent-panel';
        parentHeading.before(panel);
        panel.append(parentHeading);
        if (parentCopy) panel.append(parentCopy);
        if (requestList) panel.append(requestList);
      }
    };

    decorateContent();
    const contentObserver = new MutationObserver(decorateContent);
    contentObserver.observe(box, { childList: true, subtree: true });
  };

  const scan = () => document.querySelectorAll('.ub-modal-box').forEach(decorate);
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
