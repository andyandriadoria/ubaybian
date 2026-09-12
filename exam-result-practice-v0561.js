// UbayBian v0.5.62 — align Mid Exam result presentation with Practice
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

  function countFromStats(panel, pattern){
    for (const node of panel.querySelectorAll('.exam-result-stats span')) {
      const match = node.textContent.match(pattern);
      if (match) return Math.max(0, Number(match[1]) || 0);
    }
    return 0;
  }

  function rewardProgress(panel){
    const correct = countFromStats(panel, /(\d+)\s+auto-correct/i);
    const wrong = countFromStats(panel, /(\d+)\s+auto-wrong/i);
    const writing = countFromStats(panel, /(\d+)\s+writing to review/i);
    const unanswered = countFromStats(panel, /(\d+)\s+unanswered/i);
    const answered = correct + wrong + writing;
    const total = answered + unanswered;
    const threshold = total ? Math.ceil(total * .8) : 0;
    return { answered, total, threshold };
  }

  function rewardAmounts(panel){
    const rewards = panel.querySelector('.exam-result-rewards');
    if (!rewards) return { xp:0, coins:0 };
    const chips = [...rewards.querySelectorAll('span')];
    const xp = Number(chips[0]?.textContent.match(/\+(\d+)\s*XP/i)?.[1] || 0);
    const coins = Number(chips[1]?.textContent.match(/\+(\d+)\s*coins/i)?.[1] || 0);
    return { xp, coins };
  }

  function ensureRewardGuidance(panel){
    const rewards = panel.querySelector('.exam-result-rewards');
    if (!rewards) return;

    const progress = rewardProgress(panel);
    const amounts = rewardAmounts(panel);
    let note = panel.querySelector('.exam-result-reward-note');

    if (progress.total > 0 && progress.answered < progress.threshold) {
      const copy = `Selesaikan minimal ${progress.threshold} dari ${progress.total} soal untuk membuka reward Mid Exam. Kesempatan reward masih tersedia.`;
      if (!note) {
        note = document.createElement('p');
        note.className = 'exam-result-reward-note is-retake';
        rewards.after(note);
      }
      note.textContent = copy;
      note.classList.add('is-retake');
      return;
    }

    if (!note && amounts.xp === 0 && amounts.coins === 0) {
      note = document.createElement('p');
      note.className = 'exam-result-reward-note is-retake';
      note.textContent = 'Reward tidak bertambah pada sesi ini. Retake tetap bisa digunakan untuk latihan.';
      rewards.after(note);
    }
  }

  function removeObsoleteResultNote(panel){
    panel.querySelectorAll('.exam-result-note').forEach((note) => {
      if (/Nilai baru dibuka setelah seluruh simulasi selesai/i.test(note.textContent)) note.remove();
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
    ensureRewardGuidance(panel);
    removeObsoleteResultNote(panel);
    ensureCompanion(panel, score);
  }

  function scan(){
    enhance(main.querySelector(':scope > .exam-result'));
  }

  const observer = new MutationObserver(scan);
  observer.observe(main, { childList:true, subtree:true, characterData:true });
  scan();
})();
