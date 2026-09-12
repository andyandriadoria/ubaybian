// UbayBian v0.5.46 — Learning Control Deck
(() => {
  'use strict';

  let openControl = null;

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function closeMenu(control = openControl) {
    if (!control) return;
    const menu = control.querySelector('.deck-menu');
    const trigger = control.querySelector('.deck-trigger');
    if (menu) menu.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    control.classList.remove('deck-open');
    if (openControl === control) openControl = null;
  }

  function openMenu(control) {
    if (openControl && openControl !== control) closeMenu(openControl);
    const menu = control.querySelector('.deck-menu');
    const trigger = control.querySelector('.deck-trigger');
    if (!menu || !trigger) return;
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    control.classList.add('deck-open');
    openControl = control;
  }

  function commitValue(select, value) {
    if (select.value === value) return;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function replaceLegacyLabel(select, kind) {
    const legacy = select.closest('.controls-pill');
    if (!legacy) return null;
    if (legacy.classList.contains('deck-control')) return legacy;

    const control = el('div', `controls-pill deck-control deck-control-${kind}`);
    legacy.replaceWith(control);
    control.append(select);
    select.classList.add('deck-native-select');
    return control;
  }

  function buildDropdown(select, kind, label, icon) {
    const control = replaceLegacyLabel(select, kind);
    if (!control || control.dataset.deckReady === '1') return;
    control.dataset.deckReady = '1';

    const trigger = el('button', 'deck-trigger');
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', `Pilih ${label.toLowerCase()}`);

    const triggerIcon = el('span', 'deck-trigger-icon', icon);
    triggerIcon.setAttribute('aria-hidden', 'true');
    const copy = el('span', 'deck-trigger-copy');
    const labelNode = el('span', 'deck-trigger-label', label);
    const valueNode = el('span', 'deck-trigger-value');
    copy.append(labelNode, valueNode);
    const chevron = el('span', 'deck-trigger-chevron', '⌄');
    chevron.setAttribute('aria-hidden', 'true');
    trigger.append(triggerIcon, copy, chevron);

    const menu = el('div', 'deck-menu');
    menu.hidden = true;
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', label);

    const optionButtons = [];
    [...select.options].forEach((option) => {
      const item = el('button', 'deck-option');
      item.type = 'button';
      item.dataset.value = option.value;
      item.setAttribute('role', 'option');
      const dot = el('span', 'deck-option-dot');
      dot.setAttribute('aria-hidden', 'true');
      const text = el('span', 'deck-option-text', option.textContent.trim());
      item.append(dot, text);
      item.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        commitValue(select, option.value);
        sync();
        closeMenu(control);
        trigger.focus();
      });
      optionButtons.push(item);
      menu.append(item);
    });

    function sync() {
      const selected = select.options[select.selectedIndex];
      valueNode.textContent = selected?.textContent?.trim() || 'Pilih';
      optionButtons.forEach((button) => {
        const active = button.dataset.value === select.value;
        button.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (control.classList.contains('deck-open')) closeMenu(control);
      else openMenu(control);
    });

    trigger.addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      event.preventDefault();
      openMenu(control);
      const selectedIndex = Math.max(0, optionButtons.findIndex((button) => button.dataset.value === select.value));
      const next = event.key === 'ArrowDown'
        ? Math.min(optionButtons.length - 1, selectedIndex + 1)
        : Math.max(0, selectedIndex - 1);
      optionButtons[next]?.focus();
    });

    menu.addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'ArrowUp', 'Escape'].includes(event.key)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(control);
        trigger.focus();
        return;
      }
      const index = optionButtons.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      const next = event.key === 'ArrowDown'
        ? Math.min(optionButtons.length - 1, index + 1)
        : Math.max(0, index - 1);
      optionButtons[next]?.focus();
    });

    select.addEventListener('change', sync);
    control.append(trigger, menu);
    sync();
  }

  function buildMode(select) {
    const control = replaceLegacyLabel(select, 'mode');
    if (!control || control.dataset.deckReady === '1') return;
    control.dataset.deckReady = '1';

    const shell = el('div', 'deck-mode-shell');
    const icon = el('span', 'deck-mode-icon', '✦');
    icon.setAttribute('aria-hidden', 'true');
    const content = el('div', 'deck-mode-content');
    const label = el('span', 'deck-mode-label', 'Mode');
    const segments = el('div', 'deck-mode-segments');
    segments.setAttribute('role', 'group');
    segments.setAttribute('aria-label', 'Mode latihan');

    const buttons = [...select.options].map((option) => {
      const button = el('button', 'deck-mode-option', option.textContent.trim());
      button.type = 'button';
      button.dataset.value = option.value;
      button.addEventListener('click', () => {
        commitValue(select, option.value);
        sync();
      });
      segments.append(button);
      return button;
    });

    function sync() {
      buttons.forEach((button) => {
        const active = button.dataset.value === select.value;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }

    select.addEventListener('change', sync);
    content.append(label, segments);
    shell.append(icon, content);
    control.append(shell);
    sync();
  }

  function decorateActions(panel) {
    const start = panel.querySelector('.start-btn');
    const review = panel.querySelector('.review-btn');
    const reviewInfo = panel.querySelector('.review-info');
    const status = panel.querySelector('.start-status');

    if (start && !start.dataset.deckAction) {
      start.dataset.deckAction = 'start';
      start.textContent = 'Mulai Latihan';
      start.title = 'Mulai sesi belajar';
    }
    if (review && !review.dataset.deckAction) {
      review.dataset.deckAction = 'review';
      review.textContent = 'Review Soal';
      review.title = 'Ulangi soal yang masih perlu diperbaiki';
    }
    reviewInfo?.classList.add('deck-review-info');
    status?.classList.add('deck-start-status');
  }

  function addHeading(panel) {
    if (panel.querySelector(':scope > .learning-deck-heading')) return;
    const heading = el('div', 'learning-deck-heading');
    const main = el('div', 'learning-deck-heading-main');
    const emblem = el('span', 'learning-deck-emblem', '🎛️');
    emblem.setAttribute('aria-hidden', 'true');
    const titleWrap = el('div', 'learning-deck-title-wrap');
    titleWrap.append(
      el('span', 'learning-deck-kicker', 'Mission setup'),
      el('strong', 'learning-deck-title', 'Siapkan sesi belajarmu')
    );
    main.append(emblem, titleWrap);
    const chip = el('span', 'learning-deck-status-chip', 'Ready to learn');
    heading.append(main, chip);
    panel.prepend(heading);
  }

  function decoratePanel(panel) {
    if (!panel || panel.dataset.learningDeck === '1') return;
    const subject = panel.querySelector('#subject-select');
    const count = panel.querySelector('#question-count');
    const mode = panel.querySelector('#quiz-mode');
    if (!subject || !count || !mode) return;

    panel.dataset.learningDeck = '1';
    panel.classList.add('learning-deck');
    panel.querySelector('.controls-row')?.classList.add('learning-deck-controls');
    addHeading(panel);
    buildDropdown(subject, 'subject', 'Subject', '📚');
    buildDropdown(count, 'questions', 'Questions', '🎯');
    buildMode(mode);
    decorateActions(panel);

    const wrapper = panel.parentElement;
    wrapper?.querySelector(':scope > .rules-strip')?.classList.add('learning-deck-rules');
  }

  function scan(root = document) {
    if (root.nodeType === 1 && root.matches?.('.controls-panel')) decoratePanel(root);
    root.querySelectorAll?.('.controls-panel:not([data-learning-deck="1"])').forEach(decoratePanel);
  }

  document.addEventListener('click', (event) => {
    if (openControl && !openControl.contains(event.target)) closeMenu(openControl);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && openControl) closeMenu(openControl);
  });

  scan();
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === 1) scan(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
