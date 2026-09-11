/* v0.5.20 — Report Final Polish
   Adds display-only learning insights derived from already rendered report data. */
(function(){
  const main=document.querySelector('#main');
  if(!main)return;

  function numberFrom(text){
    const n=parseInt(String(text||'').replace(/[^0-9-]/g,''),10);
    return Number.isFinite(n)?n:null;
  }

  function makeItem(icon,label,value,note,kind){
    const item=document.createElement('div');
    item.className=`report-learning-item ${kind||''}`.trim();

    const labelEl=document.createElement('span');
    labelEl.className='report-learning-label';
    labelEl.textContent=`${icon} ${label}`;

    const valueEl=document.createElement('strong');
    valueEl.className='report-learning-value';
    valueEl.textContent=value;

    const noteEl=document.createElement('span');
    noteEl.className='report-learning-note';
    noteEl.textContent=note;

    item.append(labelEl,valueEl,noteEl);
    return item;
  }

  function enhanceReport(){
    const card=main.querySelector('.report-card[data-adventure-report="1"].report-polish-v0519');
    if(!card||card.dataset.reportFinal==='1')return;

    const rows=[...card.querySelectorAll('.report-table tbody tr')];
    if(!rows.length)return;

    const scores=rows.map((row)=>{
      const source=row.querySelector('.report-score-pill')||row.querySelector('td:nth-child(3)');
      return numberFrom(source?.textContent);
    }).filter((v)=>v!==null);
    if(!scores.length)return;

    card.dataset.reportFinal='1';
    card.classList.add('report-final-v0520');

    const sessions=scores.length;
    const average=Math.round(scores.reduce((a,b)=>a+b,0)/sessions);
    const recentCount=Math.min(3,sessions);
    const recentScores=scores.slice(0,recentCount);
    const recentAverage=Math.round(recentScores.reduce((a,b)=>a+b,0)/recentCount);
    const delta=recentAverage-average;
    const reached50=scores.filter((v)=>v>=50).length;
    const below50=sessions-reached50;

    const subjects=rows.map((row)=>{
      const label=row.querySelector('.report-subject-cell span:last-child')||row.querySelector('td:nth-child(2)');
      return (label?.textContent||'').trim();
    }).filter(Boolean);
    const subjectCounts=new Map();
    subjects.forEach((subject)=>subjectCounts.set(subject,(subjectCounts.get(subject)||0)+1));
    let dominantSubject='—';
    let dominantCount=0;
    for(const [subject,count] of subjectCounts){
      if(count>dominantCount){dominantSubject=subject;dominantCount=count;}
    }

    const trendNote=delta>0
      ? `Naik ${delta} poin dari rata-rata keseluruhan.`
      : delta<0
        ? `${Math.abs(delta)} poin di bawah rata-rata keseluruhan.`
        : 'Sama dengan rata-rata keseluruhan.';
    const benchmarkNote=below50===0
      ? 'Semua sesi berada di 50% atau lebih.'
      : `${below50} sesi masih berada di bawah 50%.`;
    const subjectNote=dominantCount===sessions
      ? `Semua ${sessions} sesi terakhir pada subject ini.`
      : `${dominantCount} dari ${sessions} sesi terakhir.`;

    const section=document.createElement('section');
    section.className='report-learning-insights';
    section.setAttribute('aria-label','Insight belajar');

    const head=document.createElement('div');
    head.className='report-learning-head';
    const title=document.createElement('h3');
    title.textContent='Insight belajar';
    const sub=document.createElement('p');
    sub.textContent='Dihitung dari sesi yang tampil di rapor.';
    head.append(title,sub);

    const grid=document.createElement('div');
    grid.className='report-learning-grid';
    grid.append(
      makeItem('📈',`${recentCount} sesi terbaru`,`${recentAverage}%`,trendNote,'trend'),
      makeItem('🎯','Sesi ≥50%',`${reached50}/${sessions} sesi`,benchmarkNote,'benchmark'),
      makeItem('📚','Fokus latihan',dominantSubject,subjectNote,'subject')
    );

    section.append(head,grid);
    const mainGrid=card.querySelector('.report-main-grid');
    if(mainGrid)mainGrid.insertAdjacentElement('afterend',section);
    else card.append(section);
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(enhanceReport));
  observer.observe(main,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(enhanceReport,0));
  enhanceReport();
})();
