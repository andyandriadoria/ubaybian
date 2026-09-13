/* UbayBian Home v0.5.1 · Today Mission + visual polish */
(function(){
  const LEVELS=[
    {level:1,minXp:0,title:'Rookie Bot'},
    {level:2,minXp:100,title:'Curious Bot'},
    {level:3,minXp:300,title:'Smart Explorer'},
    {level:4,minXp:700,title:'Knowledge Ranger'},
    {level:5,minXp:1500,title:'Brain Commander'},
    {level:6,minXp:3000,title:'UbayBian Legend'},
  ];
  let scheduled=false;

  function digits(value){
    const raw=String(value||'').replace(/[^0-9]/g,'');
    return Number(raw||0);
  }
  function currentLevel(xp){
    let level=LEVELS[0];
    for(const item of LEVELS)if(xp>=item.minXp)level=item;
    return level;
  }
  function nextLevel(level){return LEVELS.find((item)=>item.level===level.level+1)||null;}
  function node(tag,cls,text){
    const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;
  }
  function stat(icon,label,value,sub){
    const card=node('div','mission-stat');
    const lbl=node('span','label');lbl.append(node('span','icon',icon),document.createTextNode(label));
    card.append(lbl,node('strong','',value),node('small','',sub));return card;
  }

  function buildTodayMission(){
    const summary=document.querySelector('.today-summary');
    if(!summary||summary.dataset.missionV051==='1')return;
    summary.dataset.missionV051='1';summary.classList.add('today-mission');

    const heroMeta=document.querySelector('.hero-meta')?.textContent||'';
    const streak=(heroMeta.match(/(\d+)\s*hari streak/i)||[])[1]||'0';
    const sessions=(heroMeta.match(/(\d+)\s*sesi selesai/i)||[])[1]||'0';
    const reviewText=document.querySelector('.review-tile .side-tile-sub')?.textContent||'';
    const review=(reviewText.match(/(\d+)/)||[])[1]||'0';
    const xp=digits(document.querySelector('.xp-main')?.textContent);
    const level=currentLevel(xp);const next=nextLevel(level);
    const subject=document.querySelector('#subject-select');
    const subjectLabel=()=>subject?.selectedOptions?.[0]?.textContent?.trim()||'Pelajaran';

    const heading=node('div','mission-heading');
    const headingCopy=node('div','mission-heading-copy');
    headingCopy.append(node('span','mission-heading-icon','🤖'));
    const textBox=node('div');textBox.append(node('p','eyebrow','TODAY MISSION'),node('h3','','Langkah kecil hari ini'),node('p','','Jaga ritme belajar, bereskan Review, lalu naik level.'));
    headingCopy.append(textBox);
    const focus=node('span','mission-focus',`Fokus: ${subjectLabel()}`);
    heading.append(headingCopy,focus);

    const left=node('div','mission-left');
    const stats=node('div','mission-stats');
    stats.append(
      stat('🔥','Streak',`${streak} hari`,'Jaga supaya tidak putus'),
      stat('🔁','Review',`${review} soal`,Number(review)>0?'Siap dibereskan':'Semua aman'),
      stat('🏁','Sesi',`${sessions} selesai`,'Progres tersimpan online')
    );
    left.append(stats);

    const progress=node('div','mission-progress-card');
    const head=node('div','mission-progress-head');
    const bar=node('div','mission-progress');const fill=node('span');bar.append(fill);
    let tip='Kamu sudah mencapai level tertinggi. Pertahankan konsistensi!';
    if(next){
      const span=Math.max(1,next.minXp-level.minXp);
      const inside=Math.max(0,Math.min(span,xp-level.minXp));
      const pct=Math.round((inside/span)*100);
      head.append(node('span','',`Menuju ${next.title}`),node('strong','',`${xp} / ${next.minXp} XP`));
      fill.style.width=`${pct}%`;
      tip=`${Math.max(0,next.minXp-xp)} XP lagi untuk membuka Lv. ${next.level} · ${next.title}.`;
    }else{
      head.append(node('span','','Level tertinggi'),node('strong','',`${xp} XP`));fill.style.width='100%';
    }
    progress.append(head,bar,node('p','mission-tip',tip));left.append(progress);

    const visual=node('div','mission-visual');visual.setAttribute('aria-hidden','true');
    visual.append(node('span','mission-planet one','🪐'),node('span','mission-robot','🤖'),node('span','mission-planet two','✨'));

    summary.replaceChildren(heading,left,visual);
    subject?.addEventListener('change',()=>{focus.textContent=`Fokus: ${subjectLabel()}`;});
  }

  function cleanupVersionArtifacts(){
    document.querySelectorAll('[data-adventure-version-footer],.adventure-version-footer').forEach((el)=>el.remove());
  }

  function enhance(){
    scheduled=false;
    if(!document.querySelector('.hero-daily'))return;
    buildTodayMission();cleanupVersionArtifacts();
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(enhance);}
  const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);window.addEventListener('load',schedule);schedule();
})();
