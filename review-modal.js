/* UbayBian v0.5.89 · Review modal enhancement
   Visual/semantic decoration only. Core Review behavior stays in extras.js. */
(() => {
  const BOX_SELECTOR = '.ub-modal-box';

  function numberFrom(text){
    const match = String(text || '').match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  function isReviewModal(box){
    return box?.querySelector('.ub-modal-heading h2')?.textContent?.trim().toLowerCase() === 'review';
  }

  function enhanceHeader(box){
    const heading = box.querySelector('.ub-modal-heading');
    const title = heading?.querySelector('h2');
    if(!heading || !title || heading.querySelector('.ub-review-titlecopy')) return;

    const wrap = document.createElement('div');
    wrap.className = 'ub-review-titlecopy';
    const kicker = document.createElement('span');
    kicker.className = 'ub-review-kicker';
    kicker.textContent = 'FOCUS & RECOVERY';
    title.before(wrap);
    wrap.append(kicker,title);
  }

  function enhanceRows(box){
    box.querySelectorAll('.ub-review-item').forEach((item) => {
      if(item.dataset.reviewV0589 === '1') return;
      item.dataset.reviewV0589 = '1';
      const name = item.querySelector('.ub-review-name')?.textContent?.trim() || 'pelajaran';
      const count = item.querySelector('.ub-review-count')?.textContent?.trim() || '';
      item.setAttribute('aria-label',`Review ${name}. ${count}.`);
      const arrow = document.createElement('span');
      arrow.className = 'ub-review-arrow';
      arrow.setAttribute('aria-hidden','true');
      arrow.textContent = '›';
      item.append(arrow);
    });
  }

  function enhanceSummary(box){
    const list = box.querySelector('.ub-review-list');
    if(!list) return;
    const rows = [...list.querySelectorAll('.ub-review-item')];
    const total = rows.reduce((sum,row) => sum + numberFrom(row.querySelector('.ub-review-count')?.textContent),0);
    let summary = box.querySelector('.ub-review-summary');
    if(!summary){
      summary = document.createElement('div');
      summary.className = 'ub-review-summary';
      const copy = box.querySelector('.ub-modal-copy');
      if(copy) copy.after(summary); else list.before(summary);
    }
    summary.replaceChildren();
    if(rows.length){
      const main = document.createElement('span');
      main.className = 'ub-review-summary-main';
      main.textContent = `🎯 ${total} soal fokus`;
      const note = document.createElement('span');
      note.className = 'ub-review-summary-note';
      note.textContent = 'Salah + dilewati terbaru';
      summary.append(main,note);
    }else{
      summary.hidden = true;
      return;
    }
    summary.hidden = false;
  }

  function enhance(box){
    if(!isReviewModal(box)) return;
    box.classList.add('ub-review-modal');
    box.closest('.ub-modal-overlay')?.classList.add('ub-review-overlay');
    enhanceHeader(box);
    enhanceRows(box);
    enhanceSummary(box);
  }

  function scan(root=document){
    if(root.matches?.(BOX_SELECTOR)) enhance(root);
    root.querySelectorAll?.(BOX_SELECTOR).forEach(enhance);
  }

  let queued = false;
  function schedule(){
    if(queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan();
    });
  }

  const observer = new MutationObserver(schedule);
  function boot(){
    scan();
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
