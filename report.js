/* v0.5.18 — Adventure Report DOM polish
   Uses only already-rendered report data. No fabricated metrics. */
(function(){
  const main=document.querySelector('#main');
  if(!main)return;

  const subjectIcons={
    MATH:'🧮',
    MATEMATIKA:'🧮',
    SCIENCE:'🔬',
    IPA:'🔬',
    ENGLISH:'🔤',
    'BAHASA INDONESIA':'📚',
    PANCASILA:'🇮🇩',
    INFORMATIKA:'💻',
    'GLOBAL CITIZENSHIP':'🌍',
    PAI:'🕌',
    PAIBP:'🕌'
  };

  function profileAsset(){
    return document.body.dataset.profile==='bian'
      ? 'assets/bian-cosmic-scout.svg'
      : 'assets/ubay-cosmic-spider-bot.svg';
  }

  function decorateReport(){
    const card=main.querySelector('.report-card');
    document.body.classList.toggle('report-adventure',Boolean(card));
    if(!card||card.dataset.adventureReport==='1')return;

    card.dataset.adventureReport='1';

    const header=card.querySelector('.report-header');
    if(header){
      const title=header.querySelector('h2');
      const subtitle=header.querySelector('p');
      if(title)title.textContent=title.textContent.toUpperCase();
      if(subtitle)subtitle.textContent='Ringkasan performa 10 sesi latihan terakhir.';

      const visual=document.createElement('div');
      visual.className='report-hero-visual';
      const img=document.createElement('img');
      img.src=profileAsset();
      img.alt='';
      img.setAttribute('aria-hidden','true');
      visual.append(img);
      header.append(visual);
    }

    const chartPanel=card.querySelector('.report-chart');
    if(chartPanel){
      const decor=document.createElement('div');
      decor.className='report-chart-decor';
      decor.setAttribute('aria-hidden','true');
      decor.innerHTML='<span class="spark">⭐</span><span class="cup">🏆</span>';
      chartPanel.append(decor);
    }

    const tableWrap=card.querySelector('.report-table-wrap');
    const table=card.querySelector('.report-table');
    if(tableWrap&&table){
      const scroll=document.createElement('div');
      scroll.className='report-table-scroll';
      table.parentNode.insertBefore(scroll,table);
      scroll.append(table);
    }

    card.querySelectorAll('.report-table tbody tr').forEach((row)=>{
      const cells=row.querySelectorAll('td');
      if(cells.length<4)return;

      const subjectCell=cells[1];
      const subjectText=(subjectCell.textContent||'').trim();
      subjectCell.textContent='';
      const subjectWrap=document.createElement('span');
      subjectWrap.className='report-subject-cell';
      const icon=document.createElement('span');
      icon.className='report-subject-icon';
      icon.textContent=subjectIcons[subjectText.toUpperCase()]||'📘';
      const label=document.createElement('span');
      label.textContent=subjectText;
      subjectWrap.append(icon,label);
      subjectCell.append(subjectWrap);

      const scoreCell=cells[2];
      const rawScore=(scoreCell.textContent||'').trim();
      const scoreValue=parseInt(rawScore,10)||0;
      scoreCell.textContent='';
      const scorePill=document.createElement('span');
      scorePill.className=`report-score-pill ${scoreValue<50?'low':scoreValue<80?'mid':'high'}`;
      scorePill.textContent=rawScore;
      scoreCell.append(scorePill);

      const correctCell=cells[3];
      const correctText=(correctCell.textContent||'').trim();
      correctCell.textContent='';
      const correctPill=document.createElement('span');
      correctPill.className='report-correct-pill';
      correctPill.textContent=correctText;
      correctCell.append(correctPill);
    });
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(decorateReport));
  observer.observe(main,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(decorateReport,0));
  decorateReport();
})();
