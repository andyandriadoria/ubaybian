// UbayBian v0.5.12 — Quiz Mission: Adventure Arena
(() => {
  const main = document.querySelector('#main');
  if (!main) return;

  function profileAsset(){
    return document.body.dataset.profile === 'bian'
      ? 'assets/bian-cosmic-scout.svg'
      : 'assets/ubay-cosmic-spider-bot.svg';
  }

  function progressInfo(card){
    const labels = card.querySelectorAll('.progress-label-row span');
    let current = 1;
    let total = 1;
    if (labels[0]) {
      labels[0].textContent = labels[0].textContent.replace('% complete', '% selesai');
    }
    if (labels[1]) {
      const match = labels[1].textContent.match(/Question\s+(\d+)\s+of\s+(\d+)/i) || labels[1].textContent.match(/Soal\s+(\d+)\s+dari\s+(\d+)/i);
      if (match) {
        current = Number(match[1]) || 1;
        total = Number(match[2]) || 1;
        labels[1].textContent = `Soal ${current} dari ${total}`;
      }
    }
    return {current,total};
  }

  function syncCoach(card){
    const {current,total} = progressInfo(card);
    let coach = card.querySelector('.mission-coach');
    if (!coach) {
      coach = document.createElement('div');
      coach.className = 'mission-coach';
      const img = document.createElement('img');
      img.alt = '';
      img.setAttribute('aria-hidden','true');
      const bubble = document.createElement('span');
      coach.append(img,bubble);
      card.append(coach);
    }
    const img = coach.querySelector('img');
    const bubble = coach.querySelector('span');
    img.src = profileAsset();
    const remaining = Math.max(0,total-current);
    bubble.textContent = remaining === 0 ? 'Soal terakhir! ✨' : `Ayo, ${remaining} lagi!`;
  }

  function syncFeedback(card){
    const feedback = card.querySelector('.feedback');
    if (!feedback) return;
    if (feedback.classList.contains('correct')) card.dataset.answerState = 'correct';
    else if (feedback.classList.contains('wrong')) card.dataset.answerState = 'wrong';
    else card.dataset.answerState = '';
  }

  function enhanceQuiz(card){
    card.classList.add('adventure-quiz');
    syncCoach(card);
    syncFeedback(card);
  }

  function enhanceResult(panel){
    panel.classList.add('adventure-result');
    if (panel.querySelector('.result-review-note')) return;
    const wrong = [...panel.querySelectorAll('.result-stats span')].find(node => /salah/i.test(node.textContent));
    const count = wrong ? Number((wrong.textContent.match(/\d+/) || ['0'])[0]) : 0;
    if (count > 0) {
      const note = document.createElement('p');
      note.className = 'result-review-note';
      note.textContent = `${count} soal sudah masuk Review untuk dicoba lagi nanti.`;
      const actions = panel.querySelector('.result-actions');
      if (actions) panel.insertBefore(note,actions);
      else panel.append(note);
    }
  }

  function scan(){
    const quiz = main.querySelector('.quiz-card');
    if (quiz) enhanceQuiz(quiz);
    const result = main.querySelector('.result-panel');
    if (result) enhanceResult(result);
  }

  const observer = new MutationObserver(scan);
  observer.observe(main,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  scan();
})();
