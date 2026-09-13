// UbayBian v0.5.77 — Open Response wording for non-English assessments
(() => {
  'use strict';

  function isEnglishAssessment(root) {
    const shell = root.closest?.('.exam-shell') || root.querySelector?.('.exam-shell');
    if (shell) {
      const subject = shell.querySelector('.exam-tags span')?.textContent?.trim().toUpperCase() || '';
      return subject === 'ENGLISH';
    }
    const result = root.closest?.('.exam-result') || root.querySelector?.('.exam-result');
    if (result) {
      const title = result.querySelector('h1')?.textContent?.trim().toLowerCase() || '';
      return title.startsWith('english ');
    }
    return false;
  }

  function replaceText(root) {
    if (!root || isEnglishAssessment(root)) return;
    const replacements = [
      [/WRITING · REVIEWED/g, 'OPEN RESPONSE · REVIEWED'],
      [/writing akan direview/gi, 'response akan direview'],
      [/Writing is not checked by exact-match\. Your response will be marked for review after the assessment\./g,
        'This response is not checked by exact-match. It will be marked for review after the assessment.'],
      [/Writing is not checked by exact-match\. Your response will be marked for review after the simulation\./g,
        'This response is not checked by exact-match. It will be marked for review after the assessment.'],
      [/(\d+) writing to review/g, '$1 responses to review'],
      [/(\d+) writing response(s?) tersimpan untuk review/gi, '$1 open response$2 tersimpan untuk review'],
      [/Unanswered writing/g, 'Unanswered response'],
      [/This writing response is not graded by exact-match\./g, 'This response is not graded by exact-match.'],
      [/Writing review pending/g, 'Open response review pending'],
    ];

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node = walker.nextNode();
    while (node) {
      if (!node.parentElement?.closest('script,style')) nodes.push(node);
      node = walker.nextNode();
    }
    nodes.forEach((textNode) => {
      let next = textNode.nodeValue;
      replacements.forEach(([pattern, value]) => { next = next.replace(pattern, value); });
      if (next !== textNode.nodeValue) textNode.nodeValue = next;
    });
  }

  function scan(root = document) {
    const targets = [];
    if (root.nodeType === 1 && root.matches?.('.exam-shell,.exam-result')) targets.push(root);
    root.querySelectorAll?.('.exam-shell,.exam-result').forEach((node) => targets.push(node));
    targets.forEach(replaceText);
  }

  scan();
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      const assessment = target?.closest?.('.exam-shell,.exam-result');
      if (assessment) {
        requestAnimationFrame(() => replaceText(assessment));
        continue;
      }
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.('.exam-shell,.exam-result') || node.querySelector?.('.exam-shell,.exam-result')) {
          requestAnimationFrame(() => scan(node));
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
})();
