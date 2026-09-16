/* Adventure Report DOM polish
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

  function styleSessionBadge(badge){
    if(!badge)return;
    const assessment=badge.classList.contains('assessment')||/assessment/i.test(badge.textContent||'');
    badge.classList.toggle('assessment',assessment);
    Object.assign(badge.style,{
      display:'inline-flex',
      alignItems:'center',
      justifyContent:'center',
      flex:'0 0 auto',
      marginLeft:'0',
      padding:'4px 8px',
      borderRadius:'999px',
      fontSize:'9px',
      lineHeight:'1',
      fontWeight:'900',
      letterSpacing:'.02em',
      whiteSpace:'nowrap',
      verticalAlign:'middle',
      color:assessment?'#6849a6':'#236a9d',
      background:assessment?'linear-gradient(180deg,#f6f2ff,#e9e0ff)':'linear-gradient(180deg,#eef9ff,#dcefff)',
      border:assessment?'1px solid rgba(109,85,164,.22)':'1px solid rgba(47,137,195,.20)',
      boxShadow:assessment?'0 3px 8px rgba(96,72,154,.10), inset 0 1px 0 rgba(255,255,255,.88)':'0 3px 8px rgba(38,111,158,.10), inset 0 1px 0 rgba(255,255,255,.86)'
    });
  }

  function syncSessionBadges(card){
    card.querySelectorAll('.report-table tbody tr').forEach((row)=>{
      const subjectCell=row.querySelector('td:nth-child(2)');
      if(!subjectCell)return;
      const badge=subjectCell.querySelector('.report-session-type');
      if(!badge)return;
      const wrap=subjectCell.querySelector('.report-subject-cell');
      if(wrap&&badge.parentElement!==wrap)wrap.append(badge);
      styleSessionBadge(badge);
    });
  }

  function decorateReport(){
    const card=main.querySelector('.report-card');
    document.body.classList.toggle('report-adventure',Boolean(card));
    if(!card)return;

    // learning-audit can add Practice / Assessment after this report card was
    // initially decorated. Always resync those badges, even on an existing card.
    syncSessionBadges(card);
    if(card.dataset.adventureReport==='1')return;

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
    if(tableWrap&&table&&!table.parentElement?.classList.contains('report-table-scroll')){
      const scroll=document.createElement('div');
      scroll.className='report-table-scroll';
      table.parentNode.insertBefore(scroll,table);
      scroll.append(table);
    }

    card.querySelectorAll('.report-table tbody tr').forEach((row)=>{
      const cells=row.querySelectorAll('td');
      if(cells.length<4)return;

      const subjectCell=cells[1];
      const existingBadge=subjectCell.querySelector('.report-session-type');
      if(existingBadge)existingBadge.remove();
      const subjectText=(subjectCell.textContent||'').trim();
      subjectCell.textContent='';
      const subjectWrap=document.createElement('span');
      subjectWrap.className='report-subject-cell';
      const icon=document.createElement('span');
      icon.className='report-subject-icon';
      icon.textContent=subjectIcons[subjectText.toUpperCase()]||'📘';
      const label=document.createElement('span');
      label.className='report-subject-label';
      label.textContent=subjectText;
      subjectWrap.append(icon,label);
      if(existingBadge){subjectWrap.append(existingBadge);styleSessionBadge(existingBadge);}
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

    syncSessionBadges(card);
  }

  let scheduled=false;
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;decorateReport();});
  }

  const observer=new MutationObserver(schedule);
  observer.observe(main,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(decorateReport,0));
  decorateReport();
})();
