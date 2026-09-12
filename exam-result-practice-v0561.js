// UbayBian v0.5.61 — align Mid Exam result presentation with Practice
(() => {
  const main = document.querySelector('#main');
  if (!main) return;

  function profileAsset(){
    return document.body.dataset.profile === 'bian'
      ? 'assets/bian-cosmic-scout.svg'
      : 'assets/ubay-cosmic-spider-bot.svg';
  }

  function scoreFrom(panel){
    const node = panel.querySelector('.exam-result-score strong');
    const value = node ? Number(node.textContent.trim()) : NaN;
    return Number.isFinite(value) ? value : null;
  }

  function motivationalCopy(score){
    if (score === null) return {
      title:'Jawaban tersimpan, lanjut review!',
      body:'Cek kembali bagian yang perlu direview sebelum menyimpulkan hasil akhirnya.',
      bubble:'Lanjut Review ya!'
    };
    if (score >= 90) return {
      title:'Keren, hasilmu mantap!',
      body:'Review sebentar supaya bagian yang masih kurang bisa makin kuat.',
      bubble:'Keren! 🌟'
    };
    if (score >= 70) return {
      title:'Bagus, tinggal kita rapikan!',
      body:'Review jawaban yang belum tepat lalu coba lagi saat sudah siap.',
      bubble:'Mantap, lanjut Review ya!'
    };
    if (score >= 50) return {
      title:'Lumayan, kita push lagi!',
      body:'Belajar pelan-pelan tapi rutin. Review akan membantu bagian yang masih lemah.',
      bubble:'Ayo, sedikit lagi!'
    };
    return {
      title:'Tetap semangat, kita coba lagi!',
      body:'Mulai dari Review dulu, pahami yang belum tepat, lalu ulangi saat sudah siap.',
      bubble:'Kita coba lagi! 💪'
    };
  }

  function ensureMotivation(panel, score){
    if (panel.querySelector('.exam-result-practice-title')) return;
    const copy = motivationalCopy(score);
    const title = document.createElement('h2');
    title.className = 'exam-result-practice-title';
    title.textContent = copy.title;
    const message = document.createElement('p');
    message.className = 'exam-result-practice-message';
    message.textContent = copy.body;

    const anchor = panel.querySelector('.exam-result-score, .exam-result-pending-title');
    if (anchor) anchor.after(title, message);
    else {
      const heading = panel.querySelector('h1');
      if (heading) heading.after(title, message);
      else panel.prepend(title, message);
    }
  }

  function ensureRewardChips(panel){
    let rewards = panel.querySelector('.exam-result-rewards');
    if (!rewards) {
      rewards = document.createElement('div');
      rewards.className = 'exam-result-rewards exam-result-rewards-zero';

      const xp = document.createElement('span');
      xp.textContent = '⭐ +0 XP';
      const coins = document.createElement('span');
      coins.textContent = '🪙 +0 coins';
      rewards.append(xp, coins);

      const stats = panel.querySelector('.exam-result-stats');
      if (stats) stats.after(rewards);
      else {
        const message = panel.querySelector('.exam-result-practice-message');
        if (message) message.after(rewards);
        else panel.append(rewards);
      }
    }

    rewards.classList.add('exam-result-rewards-practice');
    rewards.querySelectorAll('span').forEach((chip, index) => {
      chip.classList.add('exam-result-reward-chip');
      chip.classList.toggle('coin', index === 1);
    });
  }

  function ensureCompanion(panel, score){
    if (!panel.querySelector('.exam-result-companion')) {
      const img = document.createElement('img');
      img.className = 'exam-result-companion';
      img.src = profileAsset();
      img.alt = '';
      img.setAttribute('aria-hidden','true');
      panel.append(img);
    }
    if (!panel.querySelector('.exam-result-companion-bubble')) {
      const bubble = document.createElement('div');
      bubble.className = 'exam-result-companion-bubble';
      bubble.textContent = motivationalCopy(score).bubble;
      panel.append(bubble);
    }
  }

  function enhance(panel){
    if (!panel) return;
    const score = scoreFrom(panel);
    panel.classList.add('exam-result-practice');
    panel.classList.toggle('exam-result-perfect', score === 100);
    panel.classList.toggle('exam-result-encourage', score !== null && score < 50);
    ensureMotivation(panel, score);
    ensureRewardChips(panel);
    ensureCompanion(panel, score);
  }

  function scan(){
    enhance(main.querySelector(':scope > .exam-result'));
  }

  const observer = new MutationObserver(scan);
  observer.observe(main, { childList:true, subtree:true, characterData:true });
  scan();
})();
