// UbayBian v0.5.57 — Compact unanswered Mid Exam review
(() => {
  'use strict';

  function isUnansweredItem(item) {
    const status = item.querySelector('summary strong')?.textContent?.trim() || '';
    return /unanswered/i.test(status);
  }

  function compactReview(review) {
    if (!review || review.dataset.compactUnanswered === '1') return;

    const items = [...review.querySelectorAll(':scope > .exam-review-item')];
    const unanswered = items.filter(isUnansweredItem);
    if (unanswered.length < 2) {
      review.dataset.compactUnanswered = '1';
      return;
    }

    const group = document.createElement('details');
    group.className = 'exam-unanswered-group';

    const summary = document.createElement('summary');
    const copy = document.createElement('span');
    copy.className = 'exam-unanswered-summary-copy';

    const title = document.createElement('strong');
    title.textContent = `${unanswered.length} unanswered questions`;
    const hint = document.createElement('small');
    hint.textContent = 'Open to review the questions you skipped.';
    copy.append(title, hint);

    const action = document.createElement('span');
    action.className = 'exam-unanswered-action';
    action.textContent = 'Show';
    summary.append(copy, action);

    const list = document.createElement('div');
    list.className = 'exam-unanswered-list';
    unanswered.forEach((item) => {
      item.classList.add('is-unanswered-compact');
      list.append(item);
    });

    group.addEventListener('toggle', () => {
      action.textContent = group.open ? 'Hide' : 'Show';
    });

    group.append(summary, list);
    review.append(group);
    review.dataset.compactUnanswered = '1';
  }

  function scan(root = document) {
    const reviews = [];
    if (root.nodeType === 1 && root.matches?.('.exam-review')) reviews.push(root);
    root.querySelectorAll?.('.exam-review').forEach((review) => reviews.push(review));
    reviews.forEach(compactReview);
  }

  scan();
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.('.exam-review') || node.querySelector?.('.exam-review')) {
          requestAnimationFrame(() => scan(node));
          return;
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
