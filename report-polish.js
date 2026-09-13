/* v0.5.19 — Report Data Polish
   Derives display-only summary from already rendered report rows. */
(function(){
  const main=document.querySelector('#main');
  if(!main)return;

  function enhanceReport(){
    const card=main.querySelector('.report-card[data-adventure-report="1"]');
    if(!card||card.dataset.reportPolish==='1')return;

    const rows=[...card.querySelectorAll('.report-table tbody tr')];
    const scores=rows.map((row)=>{
      const pill=row.querySelector('.report-score-pill');
      const cell=row.querySelector('td:nth-child(3)');
      const source=pill||cell;
      const value=parseInt((source?.textContent||'').replace(/[^0-9-]/g,''),10);
      return Number.isFinite(value)?value:null;
    }).filter((value)=>value!==null);

    card.dataset.reportPolish='1';
    card.classList.add('report-polish-v0519');

    const chart=card.querySelector('.report-chart');
    const chartInner=card.querySelector('.report-chart-inner');
    if(chart&&scores.length){
      const sessions=scores.length;
      const average=Math.round(scores.reduce((sum,value)=>sum+value,0)/sessions);
      const best=Math.max(...scores);

      const insights=document.createElement('div');
      insights.className='report-insights';
      insights.innerHTML=`
        <div class="report-insight sessions">
          <span class="report-insight-label">Sesi</span>
          <strong class="report-insight-value">${sessions}</strong>
        </div>
        <div class="report-insight avg">
          <span class="report-insight-label">Rata-rata</span>
          <strong class="report-insight-value">${average}%</strong>
        </div>
        <div class="report-insight best">
          <span class="report-insight-label">Terbaik</span>
          <strong class="report-insight-value">${best}%</strong>
        </div>`;

      const heading=chart.querySelector('h3');
      if(heading)heading.insertAdjacentElement('afterend',insights);
      else chart.prepend(insights);
    }

    if(chartInner&&!chartInner.querySelector('.report-benchmark')){
      const benchmark=document.createElement('div');
      benchmark.className='report-benchmark';
      benchmark.setAttribute('aria-hidden','true');
      benchmark.innerHTML='<span>50%</span>';
      chartInner.prepend(benchmark);
    }

    const scroll=card.querySelector('.report-table-scroll');
    if(scroll){
      scroll.classList.toggle('report-no-scroll',rows.length<=7);
      scroll.classList.toggle('report-has-scroll',rows.length>7);
      scroll.dataset.rowCount=String(rows.length);
    }
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(enhanceReport));
  observer.observe(main,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(enhanceReport,0));
  enhanceReport();
})();
