// UbayBian v0.5.13 — Quiz Mission Final Polish
(() => {
  const main = document.querySelector('#main');
  if (!main) return;

  function profileAsset(){
    return document.body.dataset.profile === 'bian'
      ? 'assets/bian-cosmic-scout.svg'
      : 'assets/ubay-cosmic-spider-bot.svg';
  }

  function profileName(){
    return document.body.dataset.profile === 'bian' ? 'Bian' : 'Ubay';
  }

  function upgradeSidebarAvatar(){
    const avatar = main.querySelector('.side-profile .profile-avatar');
    if (!avatar || avatar.dataset.upgraded === '1') return;
    avatar.dataset.upgraded = '1';
    avatar.classList.add('profile-avatar-upgraded');
    const img = document.createElement('img');
    img.src = profileAsset();
    img.alt = `Avatar ${profileName()}`;
    avatar.replaceChildren(img);
  }

  function classifyQuestion(card){
    const node = card.querySelector('.question-text');
    if (!node) return;
    const length = node.textContent.trim().length;
    card.classList.toggle('question-long', length > 72);
    card.classList.toggle('question-very-long', length > 135);
  }

  function polishFeedback(card){
    const feedback = card.querySelector('.feedback');
    if (!feedback) return;

    const answered = feedback.classList.contains('correct') || feedback.classList.contains('wrong');
    if (answered) card.dataset.answerState = feedback.classList.contains('correct') ? 'correct' : 'wrong';

    if (!answered || feedback.dataset.coachified === '1' || !feedback.textContent.trim()) return;

    const original = feedback.textContent.trim();
    let title = feedback.classList.contains('correct') ? '✓ Tepat!' : 'Belum tepat';
    let copy = original;

    if (/^Benar!\s*/i.test(copy)) copy = copy.replace(/^Benar!\s*/i,'');
    else if (/^Belum tepat\.\s*/i.test(copy)) copy = copy.replace(/^Belum tepat\.\s*/i,'');
    else if (/^Dilewati\.\s*/i.test(copy)) {
      title = 'Dilewati';
      copy = copy.replace(/^Dilewati\.\s*/i,'');
    }

    const strong = document.createElement('span');
    strong.className = 'feedback-title';
    strong.textContent = title;
    const body = document.createElement('span');
    body.className = 'feedback-copy';
    body.textContent = copy;
    feedback.dataset.coachified = '1';
    feedback.replaceChildren(strong,body);
  }

  function enhanceResult(panel){
    const scoreNode = panel.querySelector('.result-score strong');
    const score = scoreNode ? Number(scoreNode.textContent.trim()) : NaN;
    if (!Number.isFinite(score)) return;

    panel.dataset.score = String(score);
    panel.classList.toggle('result-perfect', score === 100);
    panel.classList.toggle('result-encourage', score < 50);

    if (!panel.querySelector('.result-companion')) {
      const img = document.createElement('img');
      img.className = 'result-companion';
      img.src = profileAsset();
      img.alt = '';
      img.setAttribute('aria-hidden','true');
      panel.append(img);
    }

    if (!panel.querySelector('.result-companion-bubble')) {
      const bubble = document.createElement('div');
      bubble.className = 'result-companion-bubble';
      bubble.textContent = score === 100
        ? 'Misi sempurna! 🌟'
        : score >= 80
          ? 'Keren! Sedikit lagi sempurna.'
          : score >= 50
            ? 'Mantap, lanjut Review ya!'
            : 'Tidak apa-apa. Kita coba lagi! 💪';
      panel.append(bubble);
    }
  }

  function scan(){
    upgradeSidebarAvatar();

    const quiz = main.querySelector('.quiz-card.adventure-quiz');
    if (quiz) {
      classifyQuestion(quiz);
      polishFeedback(quiz);
    }

    const result = main.querySelector('.result-panel.adventure-result');
    if (result) enhanceResult(result);
  }

  const observer = new MutationObserver(scan);
  observer.observe(main,{
    childList:true,
    subtree:true,
    characterData:true,
    attributes:true,
    attributeFilter:['class']
  });
  scan();
})();
