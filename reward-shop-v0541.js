// UbayBian v0.5.42 — Reward Shop Chamber Lock Polish
(() => {
  const ensure542Style = () => {
    if (document.querySelector('link[data-reward-v0542="1"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './reward-shop-v0542.css?v=0.5.42';
    link.dataset.rewardV0542 = '1';
    document.head.appendChild(link);
  };

  const upgradeVersionLabel = () => {
    document.querySelectorAll('body *').forEach((el) => {
      if (el.children.length) return;
      const text = (el.textContent || '').trim();
      if (/^v0\.5\.4[01]\s*·\s*family$/i.test(text)) {
        el.textContent = 'v0.5.42 · family';
      }
    });
  };

  const svgSafe = (kind) => {
    const span = document.createElement('span');
    span.className = `reward-object ${kind}`;
    span.setAttribute('aria-hidden', 'true');
    return span;
  };

  const decorateWorld = (overlay) => {
    if (!overlay) return;
    overlay.classList.add('reward-chamber-overlay');
    if (overlay.dataset.rewardWorld541 === '1') return;
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

  const normalizeViewport = (box) => {
    if (!box) return;
    box.classList.add('reward-chamber');
    const overlay = box.closest('.ub-modal-overlay');
    if (overlay) {
      overlay.classList.add('reward-chamber-overlay');
      overlay.scrollTop = 0;
      overlay.scrollLeft = 0;
    }
    box.scrollTop = 0;
    box.scrollLeft = 0;
  };

  const decorateTerminal = (box) => {
    if (!box) return;
    const title = box.querySelector('.ub-modal-heading h2');
    if (!title || title.textContent.trim() !== 'Reward Shop') return;

    normalizeViewport(box);
    const overlay = box.closest('.ub-modal-overlay');
    decorateWorld(overlay);

    if (box.dataset.rewardDepth541 !== '1') {
      box.dataset.rewardDepth541 = '1';

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
    }

    const refresh = () => {
      decorateWallet(box.querySelector('.ub-wallet'));
      decorateCards(box);
      normalizeViewport(box);

      const parent = box.querySelector('.reward-parent-panel');
      if (parent) parent.setAttribute('aria-label', 'Persetujuan orang tua');
    };

    refresh();
    if (!box.__reward542Observer) {
      const mo = new MutationObserver(refresh);
      mo.observe(box, { childList: true, subtree: true });
      box.__reward542Observer = mo;
    }
  };

  const scan = () => {
    ensure542Style();
    upgradeVersionLabel();
    document.querySelectorAll('.ub-modal-box.reward-chamber, .ub-modal-box').forEach(decorateTerminal);
  };

  ensure542Style();
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
