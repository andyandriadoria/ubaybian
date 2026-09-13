// UbayBian v0.5.91 — Guided Learning Setup
(() => {
  'use strict';

  let scheduled = false;

  function ensureSubjectPlaceholder(subject) {
    if (!subject) return;
    let placeholder = [...subject.options].find((option) => option.value === '');
    if (!placeholder) {
      placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Pilih pelajaran';
      placeholder.disabled = true;
      subject.prepend(placeholder);
    }
  }

  function setDeckValue(control, text) {
    const value = control?.querySelector('.deck-trigger-value');
    if (value) value.textContent = text;
  }

  function setDeckSelection(control, value) {
    control?.querySelectorAll('.deck-option').forEach((button) => {
      const active = Boolean(value) && button.dataset.value === value;
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function clearSession(panel, { silent = true } = {}) {
    const session = panel.querySelector('#question-count');
    if (!session) return;
    session.value = '';
    const control = panel.querySelector('.deck-control-questions');
    setDeckValue(control, 'Pilih sesi');
    setDeckSelection(control, '');
    if (!silent) session.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function resetSubject(panel) {
    const subject = panel.querySelector('#subject-select');
    if (!subject) return;
    ensureSubjectPlaceholder(subject);
    subject.value = '';
    const control = panel.querySelector('.deck-control-subject');
    setDeckValue(control, 'Pilih pelajaran');
    setDeckSelection(control, '');
  }

  function existingStartLabel(sessionValue) {
    return sessionValue === 'exam' ? 'Mulai Assessment 📝' : 'Mulai Latihan ⚡';
  }

  function syncMissionFocus(subject) {
    const focus = document.querySelector('.mission-focus');
    if (!focus) return;
    const label = subject?.value
      ? subject.selectedOptions?.[0]?.textContent?.trim() || 'Pelajaran'
      : 'pilih pelajaran';
    focus.textContent = `Fokus: ${label}`;
  }

  function syncReviewContext(panel, hasSubject) {
    const review = panel.querySelector('.review-btn');
    const info = panel.querySelector('.deck-review-info, .review-info');
    if (!hasSubject) {
      if (review) review.hidden = true;
      if (info) info.textContent = 'Pilih pelajaran untuk melihat Review';
    }
  }

  function syncRules(panel, ready) {
    const rules = panel.parentElement?.querySelector(':scope > .learning-deck-rules, :scope > .rules-strip');
    if (rules) rules.classList.toggle('guided-rules-muted', !ready);
  }

  function updateGuidance(panel) {
    const subject = panel.querySelector('#subject-select');
    const session = panel.querySelector('#question-count');
    const start = panel.querySelector('.start-btn');
    const chip = panel.querySelector('.learning-deck-status-chip');
    const subjectControl = panel.querySelector('.deck-control-subject');
    const sessionControl = panel.querySelector('.deck-control-questions');
    const sessionTrigger = sessionControl?.querySelector('.deck-trigger');
    if (!subject || !session || !start) return;

    const hasSubject = Boolean(subject.value);
    const hasSession = Boolean(session.value);
    const ready = hasSubject && hasSession;

    panel.classList.toggle('guided-step-subject', !hasSubject);
    panel.classList.toggle('guided-step-session', hasSubject && !hasSession);
    panel.classList.toggle('guided-ready', ready);
    subjectControl?.classList.toggle('guided-focus', !hasSubject);
    sessionControl?.classList.toggle('guided-focus', hasSubject && !hasSession);
    sessionControl?.classList.toggle('guided-locked', !hasSubject);

    if (sessionTrigger) {
      sessionTrigger.disabled = !hasSubject;
      sessionTrigger.setAttribute('aria-disabled', !hasSubject ? 'true' : 'false');
      sessionTrigger.title = hasSubject ? 'Pilih sesi belajar' : 'Pilih pelajaran dulu';
    }

    start.disabled = !ready;
    start.classList.toggle('guided-disabled', !ready);
    if (!hasSubject) {
      start.textContent = 'Pilih pelajaran dulu 👆';
      start.title = 'Pilih mata pelajaran sebelum mulai';
      if (chip) chip.textContent = 'STEP 1 · PILIH SUBJECT';
      panel.dataset.guidedStep = '1';
    } else if (!hasSession) {
      start.textContent = 'Pilih sesi dulu 👆';
      start.title = 'Pilih jenis sesi sebelum mulai';
      if (chip) chip.textContent = 'STEP 2 · PILIH SESSION';
      panel.dataset.guidedStep = '2';
    } else {
      start.textContent = existingStartLabel(session.value);
      start.title = session.value === 'exam' ? 'Mulai Assessment' : 'Mulai sesi belajar';
      if (chip) chip.textContent = 'READY TO LEARN ✓';
      panel.dataset.guidedStep = 'ready';
    }

    const hint = panel.querySelector('.guided-setup-hint');
    if (hint) {
      hint.textContent = !hasSubject
        ? '1. Pilih pelajaran yang mau dipelajari.'
        : !hasSession
          ? '2. Sekarang pilih jenis sesinya.'
          : 'Siap! Cek pilihanmu lalu mulai.';
    }

    syncMissionFocus(subject);
    syncReviewContext(panel, hasSubject);
    syncRules(panel, ready);
  }

  function addHint(panel) {
    if (panel.querySelector('.guided-setup-hint')) return;
    const hint = document.createElement('p');
    hint.className = 'guided-setup-hint';
    hint.setAttribute('aria-live', 'polite');
    const actions = panel.querySelector('.start-row');
    if (actions) actions.append(hint);
    else panel.append(hint);
  }

  function install(panel) {
    if (!panel?.classList?.contains('learning-deck')) return;
    const subject = panel.querySelector('#subject-select');
    const session = panel.querySelector('#question-count');
    if (!subject || !session) return;

    if (panel.dataset.guidedSetup591 !== '1') {
      panel.dataset.guidedSetup591 = '1';
      addHint(panel);

      resetSubject(panel);
      clearSession(panel);

      subject.addEventListener('change', () => {
        // The legacy session bridge updates first; clear afterwards so changing
        // subject always asks the child to make a fresh session choice.
        requestAnimationFrame(() => {
          if (!panel.isConnected) return;
          clearSession(panel);
          updateGuidance(panel);
        });
      });

      session.addEventListener('change', () => requestAnimationFrame(() => updateGuidance(panel)));
    }

    updateGuidance(panel);
  }

  function scan(root = document) {
    const panels = new Set();
    if (root.nodeType === 1) {
      if (root.matches?.('.controls-panel.learning-deck')) panels.add(root);
      root.closest?.('.controls-panel.learning-deck') && panels.add(root.closest('.controls-panel.learning-deck'));
    }
    root.querySelectorAll?.('.controls-panel.learning-deck').forEach((panel) => panels.add(panel));
    panels.forEach(install);
  }

  function schedule(root = document) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan(root);
    });
  }

  // Review is a deliberate alternate flow: the subject was already chosen
  // in the Review modal, so give it a safe Practice session automatically.
  document.addEventListener('click', (event) => {
    const review = event.target.closest('.review-btn');
    if (!review) return;
    const panel = review.closest('.controls-panel');
    const subject = panel?.querySelector('#subject-select');
    const session = panel?.querySelector('#question-count');
    if (!panel || !subject?.value || !session) return;
    if (!session.value) {
      session.value = '5';
      session.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, true);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.('.controls-panel') || node.querySelector?.('.controls-panel')) {
          schedule(node);
          return;
        }
      }
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (target?.closest?.('.controls-panel.learning-deck')) {
        schedule(target);
        return;
      }
    }
  });

  scan();
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => schedule());
  window.addEventListener('pageshow', () => schedule());
})();
