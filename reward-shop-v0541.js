// UbayBian v0.5.41 — Reward Shop Chamber Depth & Toy Polish
(() => {
  const svgSafe = (kind) => {
    const span = document.createElement('span');
    span.className = `reward-object ${kind}`;
    span.setAttribute('aria-hidden', 'true');
    return span;
  };

  const decorateWorld = (overlay) => {
    if (!overlay || overlay.dataset.rewardWorld541 === '1') return;
    overlay.dataset.rewardWorld541 = '1';

    const world = document.createElement('div');
    world.className = 'reward-lab-world';
    world.setAttribute('aria-hidden', 'true');

    const orbit = document.createElement('div');
    orbit.className = 'reward-lab-orbit';

    const leftRail = document.createElement('div');
    leftRail.className = 'reward-lab-rail left';
    const rightRail = document.createElement('div');
    rightRail.className = 'reward-lab-rail right';

    const leftConsole = document.createElement('div');
    leftConsole.className = 'reward-lab-console left';
    const rightConsole = document.createElement('div');
    rightConsole.className = 'reward-lab-console right';

    const mascot = document.createElement('div');
    mascot.className = 'reward-lab-mascot';
    mascot.innerHTML = '<span class="antenna"></span><span class="head"><span class="face"></span></span><span class="body"></span>';

    world.append(orbit, leftRail, rightRail, leftConsole, rightConsole, mascot);
    overlay.prepend(world);
  };

  const decorateWallet = (wallet) => {
    if (!wallet || wallet.dataset.rewardWallet541 === '1') return;
    wallet.dataset.rewardWallet541 = '1';

    const main = wallet.querySelector('.ub-wallet-main');
    if (main) {
      const clean = main.textContent.replace(/^\s*🪙\s*/, '').trim();
      const match = clean.match(/^([\d.]+)\s+coins$/i);
      if (match) {
        main.textContent = '';
        const number = document.createElement('span');
        number.className = 'reward-balance-number';
        number.textContent = match[1];
        const suffix = document.createTextNode(' coins');
        main.append(number, suffix);
      } else {
        main.textContent = clean;
      }
    }

    if (!wallet.querySelector('.reward-vault-core')) {
      const core = document.createElement('span');
      core.className = 'reward-vault-core';
      core.setAttribute('aria-hidden', 'true');
      const track = document.createElement('span');
      track.className = 'reward-vault-track';
      track.setAttribute('aria-hidden', 'true');
      wallet.append(core, track);
    }
  };

  const decorateCards = (box) => {
    const cards = [...box.querySelectorAll('.ub-reward-card')];
    cards.forEach((card) => {
      const icon = card.querySelector('.ub-reward-icon');
      if (!icon || icon.dataset.toyIcon541 === '1') return;
      icon.dataset.toyIcon541 = '1';
      const kind = card.dataset.rewardKind || 'gift';
      icon.textContent = '';
      icon.append(svgSafe(kind === 'gift' ? 'toy' : kind));
    });
  };

  const decorateTerminal = (box) => {
    if (!box || box.dataset.rewardDepth541 === '1') return;
    const title = box.querySelector('.ub-modal-heading h2');
    if (!title || title.textContent.trim() !== 'Reward Shop') return;
    box.dataset.rewardDepth541 = '1';

    const overlay = box.closest('.ub-modal-overlay');
    decorateWorld(overlay);

    const oldMascot = box.querySelector(':scope > .reward-chamber-mascot');
    const oldOrb = box.querySelector(':scope > .reward-chamber-orb');
    const oldConsole = box.querySelector(':scope > .reward-chamber-console');
    oldMascot?.remove();
    oldOrb?.remove();
    oldConsole?.remove();

    if (!box.querySelector('.reward-chamber-hardware')) {
      const hardware = document.createElement('div');
      hardware.className = 'reward-chamber-hardware';
      hardware.setAttribute('aria-hidden', 'true');
      hardware.innerHTML = '<span class="clamp left"></span><span class="clamp right"></span><span class="floor-glow"></span>';
      box.append(hardware);
    }

    const refresh = () => {
      decorateWallet(box.querySelector('.ub-wallet'));
      decorateCards(box);

      const parent = box.querySelector('.reward-parent-panel');
      if (parent) parent.setAttribute('aria-label', 'Persetujuan orang tua');
    };

    refresh();
    const mo = new MutationObserver(refresh);
    mo.observe(box, { childList: true, subtree: true });
  };

  const scan = () => document.querySelectorAll('.ub-modal-box.reward-chamber, .ub-modal-box').forEach(decorateTerminal);
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
