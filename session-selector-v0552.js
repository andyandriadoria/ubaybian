// UbayBian v0.5.55 — Session selector bridge for Learning Deck + Exam Simulation
(() => {
  'use strict';

  let scheduled = false;

  function examAvailable(profileId, subjectId) {
    return profileId === 'bian' && ['english', 'math'].includes(subjectId);
  }

  function desiredOptions(profileId, subjectId) {
    const options = [
      { value: '5', label: '⚡ Quick Practice' },
      { value: '10', label: '📚 Practice' },
    ];
    if (examAvailable(profileId, subjectId)) {
      options.push({ value: 'exam', label: '📝 Mid Exam Simulation' });
    }
    return options;
  }

  function setNativeOptions(select, options, preferredValue) {
    const wanted = options.map((item) => `${item.value}:${item.label}`).join('|');
    const current = [...select.options].map((item) => `${item.value}:${item.textContent.trim()}`).join('|');
    if (current !== wanted) {
      select.replaceChildren(...options.map((item) => {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.label;
        return option;
      }));
    }
    const valid = options.some((item) => item.value === preferredValue);
    select.value = valid ? preferredValue : options[0].value;
  }

  function closeDeckControl(control) {
    const menu = control?.querySelector('.deck-menu');
    const trigger = control?.querySelector('.deck-trigger');
    if (menu) menu.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    control?.classList.remove('deck-open');
  }

  function syncDeckDropdown(select, options) {
    const control = select.closest('.deck-control-questions');
    if (!control) return;

    const trigger = control.querySelector('.deck-trigger');
    const label = control.querySelector('.deck-trigger-label');
    const value = control.querySelector('.deck-trigger-value');
    const menu = control.querySelector('.deck-menu');
    if (label) label.textContent = 'Session';

    const signature = options.map((item) => `${item.value}:${item.label}`).join('|');
    if (menu && menu.dataset.sessionOptions !== signature) {
      menu.dataset.sessionOptions = signature;
      menu.replaceChildren();
      for (const item of options) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'deck-option';
        button.dataset.value = item.value;
        button.setAttribute('role', 'option');

        const dot = document.createElement('span');
        dot.className = 'deck-option-dot';
        dot.setAttribute('aria-hidden', 'true');
        const copy = document.createElement('span');
        copy.className = 'deck-option-text';
        copy.textContent = item.label;
        button.append(dot, copy);

        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (select.value !== item.value) {
            select.value = item.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
          syncPanel(select.closest('.controls-panel'));
          closeDeckControl(control);
          trigger?.focus();
        });
        menu.append(button);
      }
    }

    const selected = options.find((item) => item.value === select.value) || options[0];
    if (value) value.textContent = selected?.label || 'Pilih sesi';
    menu?.querySelectorAll('.deck-option').forEach((button) => {
      const active = button.dataset.value === select.value;
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function hideMode(panel) {
    const mode = panel.querySelector('#quiz-mode');
    if (!mode) return;
    mode.value = 'normal';
    const deck = mode.closest('.deck-control-mode');
    if (deck) {
      deck.hidden = true;
      deck.style.setProperty('display', 'none', 'important');
      deck.setAttribute('aria-hidden', 'true');
    }
    const legacy = mode.closest('label.controls-pill');
    if (legacy) {
      legacy.hidden = true;
      legacy.style.setProperty('display', 'none', 'important');
    }
    const controlsRow = panel.querySelector('.controls-row, .learning-deck-controls');
    controlsRow?.style.setProperty('grid-template-columns', 'minmax(0, 1fr) minmax(0, 1fr)', 'important');
  }

  function syncActions(panel, isExam) {
    const start = panel.querySelector('.start-btn');
    const review = panel.querySelector('.review-btn');
    if (start) {
      start.textContent = isExam ? 'Mulai Simulasi 📝' : 'Mulai Latihan ⚡';
      start.classList.toggle('exam-start-btn', isExam);
      start.title = isExam ? 'Mulai simulasi Mid Exam' : 'Mulai sesi belajar';
    }
    if (review) {
      if (isExam) review.style.setProperty('display', 'none', 'important');
      else review.style.removeProperty('display');
    }
    panel.classList.toggle('exam-session-selected', isExam);
  }

  function syncPanel(panel) {
    if (!panel?.matches?.('.controls-panel')) return;
    const subject = panel.querySelector('#subject-select');
    const session = panel.querySelector('#question-count');
    if (!subject || !session) return;

    const profileId = document.body.dataset.profile || '';
    const previous = session.value;
    const options = desiredOptions(profileId, subject.value);
    setNativeOptions(session, options, previous);
    syncDeckDropdown(session, options);
    hideMode(panel);

    const isExam = session.value === 'exam';
    syncActions(panel, isExam);

    const nativeLabel = session.closest('label.controls-pill')?.querySelector('.control-label');
    if (nativeLabel) nativeLabel.textContent = 'Session';

    if (subject.dataset.sessionSelector552 !== '1') {
      subject.dataset.sessionSelector552 = '1';
      subject.addEventListener('change', () => queueMicrotask(() => syncPanel(panel)));
    }
    if (session.dataset.sessionSelector552 !== '1') {
      session.dataset.sessionSelector552 = '1';
      session.addEventListener('change', () => queueMicrotask(() => syncPanel(panel)));
    }
  }

  function syncExamSubjectTags(root = document) {
    const shells = [];
    if (root.nodeType === 1 && root.matches?.('.exam-shell')) shells.push(root);
    root.querySelectorAll?.('.exam-shell').forEach((shell) => shells.push(shell));
    for (const shell of shells) {
      const title = shell.querySelector('.exam-heading h1')?.textContent?.trim().toLowerCase() || '';
      const subjectTag = shell.querySelector('.exam-tags span');
      if (!subjectTag) continue;
      if (title.startsWith('math ')) subjectTag.textContent = 'MATH';
      else if (title.startsWith('english ')) subjectTag.textContent = 'ENGLISH';
    }
  }

  function scan(root = document) {
    syncExamSubjectTags(root);
    const panels = new Set();
    if (root.nodeType === 1) {
      if (root.matches?.('.controls-panel')) panels.add(root);
      const ancestor = root.closest?.('.controls-panel');
      if (ancestor) panels.add(ancestor);
    }
    root.querySelectorAll?.('.controls-panel').forEach((panel) => panels.add(panel));
    panels.forEach(syncPanel);
  }

  function schedule(root = document) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan(root);
    });
  }

  scan();
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (target?.closest?.('.controls-panel')) {
        schedule(target);
        return;
      }
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.('.exam-shell') || node.querySelector?.('.exam-shell')) {
          schedule(node);
          return;
        }
        if (node.matches?.('.controls-panel') || node.closest?.('.controls-panel') || node.querySelector?.('.controls-panel')) {
          schedule(node);
          return;
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
