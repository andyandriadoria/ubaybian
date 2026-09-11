import {apiBase,backendEnabled} from './config.js';
import {findProfile} from './profiles.js';

const SESSION_KEY='ubaybian:family-session:v1';
let activeReactor=null;

function sessionToken(){try{return localStorage.getItem(SESSION_KEY)||'';}catch{return '';}}
async function call(path,options={}){
  if(!backendEnabled)throw new Error('Backend belum aktif.');
  const headers=new Headers(options.headers||{});
  headers.set('Accept','application/json');
  if(options.body)headers.set('Content-Type','application/json');
  const token=sessionToken();if(token)headers.set('Authorization',`Bearer ${token}`);
  const response=await fetch(`${apiBase}${path}`,{...options,headers});
  let data=null;try{data=await response.json();}catch{}
  if(!response.ok)throw new Error(data?.message||'Layanan game belum tersedia.');
  return data;
}
function profileFromHash(){return findProfile(location.hash.replace(/^#\/?/,'').split('/')[0]);}
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function button(label,cls,fn){const node=el('button',cls,label);node.type='button';if(fn)node.addEventListener('click',fn);return node;}
function randomInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

function openMathReactor(profile){
  if(activeReactor)activeReactor.close(true);

  let sessionId='';
  let timerId=null;
  let flashTimer=null;
  let timeLeft=60;
  let scoreValue=0;
  let correctAnswer=0;
  let playing=false;
  let saving=false;
  let bestScore=0;
  let dailyXp=0;
  let dailyCap=50;
  let remainingDailyXp=50;
  let previousBodyOverflow=document.body.style.overflow;

  const overlay=el('div','reactor-overlay');
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Speed Math Reactor');
  const shell=el('section','reactor-shell');
  const top=el('header','reactor-top');
  const brand=el('div','reactor-brand');
  const brandText=el('div','');
  brandText.append(el('p','reactor-kicker','BRAIN GAMES'),el('h2','reactor-title','Speed Math Reactor'),el('p','reactor-subtitle','60 detik · fokus, cepat, dan terus bergerak'));
  brand.append(el('div','reactor-bolt','⚡'),brandText);
  const closeBtn=button('×','reactor-close',()=>close());closeBtn.setAttribute('aria-label','Tutup Math Reactor');
  top.append(brand,closeBtn);
  const stage=el('div','reactor-stage');
  shell.append(top,stage);overlay.append(shell);document.body.append(overlay);document.body.style.overflow='hidden';

  /* Ready */
  const ready=el('section','reactor-view reactor-ready');
  const readyTitle=profile.id==='bian'?'Speed Math! ⚡':'Math Reactor';
  const readyCopy=profile.id==='bian'?'Yuk jawab sebanyak-banyaknya sebelum waktunya habis!':'Seberapa banyak soal yang bisa kamu selesaikan dalam satu misi 60 detik?';
  const chips=el('div','reactor-mission-chips');
  const bestChip=el('span','reactor-chip','🏆 Best …');
  chips.append(el('span','reactor-chip','⏱ 60s Mission'),bestChip,el('span','reactor-chip','⭐ +1 XP / benar'));
  const xpCard=el('div','reactor-xp-card');
  const xpRow=el('div','reactor-xp-row');const xpLabel=el('span','','Game XP hari ini');const xpValue=el('strong','','… / 50 XP');xpRow.append(xpLabel,xpValue);
  const xpTrack=el('div','reactor-xp-track');const xpFill=el('div','reactor-xp-fill');xpTrack.append(xpFill);xpCard.append(xpRow,xpTrack);
  const readyStatus=el('p','reactor-save-note','Menyiapkan mission data…');
  const startBtn=button('Mulai Misi →','reactor-main-btn',()=>startMission(startBtn,readyStatus));startBtn.disabled=true;
  ready.append(el('div','reactor-orb','⚡'),el('h3','',readyTitle),el('p','reactor-ready-copy',readyCopy),chips,xpCard,startBtn,readyStatus);

  /* Playing */
  const play=el('section','reactor-view reactor-play');play.hidden=true;
  const hud=el('div','reactor-hud');
  const scoreStat=el('div','reactor-stat');scoreStat.append(el('span','reactor-stat-label','Score'));const scoreText=el('span','reactor-stat-value','0');scoreStat.append(scoreText);
  const timerWrap=el('div','reactor-timer-wrap');const timer=el('div','reactor-timer');timer.style.setProperty('--progress','100');const timerCore=el('div','reactor-timer-core');const timerInside=el('div','');const timerNumber=el('div','reactor-timer-number','60');timerInside.append(timerNumber,el('span','reactor-timer-unit','detik'));timerCore.append(timerInside);timer.append(timerCore);timerWrap.append(timer);
  const bestStat=el('div','reactor-stat right');bestStat.append(el('span','reactor-stat-label','Best'));const bestText=el('span','reactor-stat-value','0');bestStat.append(bestText);
  hud.append(scoreStat,timerWrap,bestStat);
  const finalLabel=el('div','reactor-final-label','');
  const questionCard=el('div','reactor-question-card');const question=el('div','reactor-question','');questionCard.append(question);
  const answerDock=el('div','reactor-answer-dock');const input=el('input','reactor-input');input.type='text';input.inputMode='numeric';input.autocomplete='off';input.placeholder='ketik jawaban…';input.setAttribute('aria-label','Jawaban Speed Math');const submit=button('Jawab','reactor-submit',submitAnswer);answerDock.append(input,submit);
  const playMeta=el('div','reactor-play-meta');const xpDuring=el('span','','Game XP hari ini: 0/50');playMeta.append(xpDuring,el('span','reactor-key','Enter ↵ untuk jawab'));
  const flash=el('div','reactor-flash','');
  play.append(hud,finalLabel,questionCard,answerDock,playMeta,flash);

  /* Result */
  const result=el('section','reactor-view reactor-result');result.hidden=true;
  const complete=el('div','reactor-complete-badge','⚡ REACTOR COMPLETE');
  const resultTitle=el('h3','','Misi selesai');
  const resultScore=el('div','reactor-result-score','0');
  const resultCaption=el('p','reactor-result-caption','jawaban benar');
  const newBestBadge=el('div','reactor-new-best','🎉 NEW BEST!');newBestBadge.hidden=true;
  const resultGrid=el('div','reactor-result-grid');
  const bestCard=metricCard('🏆 Best','0');const xpCardResult=metricCard('⭐ XP didapat','+0');const dailyCard=metricCard('🧠 XP hari ini','0/50');
  resultGrid.append(bestCard.card,xpCardResult.card,dailyCard.card);
  const resultActions=el('div','reactor-result-actions');const replay=button('Main Lagi','reactor-main-btn',()=>startMission(replay,resultNote));const done=button('Selesai','reactor-ghost-btn',()=>close());resultActions.append(replay,done);
  const resultNote=el('p','reactor-save-note','');
  result.append(complete,resultTitle,resultScore,resultCaption,newBestBadge,resultGrid,resultActions,resultNote);

  stage.append(ready,play,result);
  activeReactor={close};

  input.addEventListener('keydown',(event)=>{if(event.key==='Enter'){event.preventDefault();submitAnswer();}});
  overlay.addEventListener('click',(event)=>{if(event.target===overlay)close();});
  const onKey=(event)=>{if(event.key==='Escape')close();};document.addEventListener('keydown',onKey);

  loadStatus();

  function metricCard(label,value){const card=el('div','reactor-result-card');card.append(el('span','',label));const strong=el('strong','',value);card.append(strong);return {card,value:strong};}

  function updateXpBar(){
    const safeCap=Math.max(1,Number(dailyCap)||50);const safeXp=Math.max(0,Number(dailyXp)||0);
    xpValue.textContent=`${safeXp} / ${safeCap} XP`;xpFill.style.width=`${clamp((safeXp/safeCap)*100,0,100)}%`;
    xpDuring.textContent=`Game XP hari ini: ${safeXp}/${safeCap}`;
  }

  async function loadStatus(){
    try{
      const state=await call(`/v1/games/${encodeURIComponent(profile.id)}/status`);
      bestScore=Number(state.games?.['speed-math']?.best||0);dailyXp=Number(state.dailyXp||0);dailyCap=Number(state.dailyXpCap||50);remainingDailyXp=Math.max(0,dailyCap-dailyXp);
      bestChip.textContent=`🏆 Best ${bestScore}`;bestText.textContent=String(bestScore);updateXpBar();
      readyStatus.textContent=dailyXp>=dailyCap?'XP game harian sudah penuh. Kamu tetap boleh main untuk mengejar rekor.':'Siap. Tekan Mulai Misi saat kamu mau.';
      startBtn.disabled=false;
    }catch(error){readyStatus.textContent=error.message;readyStatus.classList.add('error');}
  }

  async function startMission(trigger,note){
    if(playing||saving)return;
    trigger.disabled=true;note.textContent='Menyalakan reactor…';note.classList.remove('error');
    try{
      const data=await call(`/v1/games/${encodeURIComponent(profile.id)}/start`,{method:'POST',body:JSON.stringify({gameId:'speed-math'})});
      sessionId=data.sessionId;remainingDailyXp=Number(data.remainingDailyXp??remainingDailyXp);timeLeft=60;scoreValue=0;playing=true;
      ready.hidden=true;result.hidden=true;play.hidden=false;scoreText.textContent='0';bestText.textContent=String(bestScore);finalLabel.textContent='';
      play.classList.remove('is-warning','is-critical','flash-correct','flash-wrong');timerNumber.textContent='60';timer.style.setProperty('--progress','100');
      xpDuring.textContent=`Sisa XP games hari ini: ${Math.max(0,remainingDailyXp)}`;nextQuestion();
      timerId=setInterval(tick,1000);
    }catch(error){trigger.disabled=false;note.textContent=error.message;note.classList.add('error');}
  }

  function tick(){
    if(!playing)return;timeLeft=Math.max(0,timeLeft-1);timerNumber.textContent=String(timeLeft);timer.style.setProperty('--progress',String((timeLeft/60)*100));
    play.classList.toggle('is-warning',timeLeft<=10&&timeLeft>5);play.classList.toggle('is-critical',timeLeft<=5);
    finalLabel.textContent=timeLeft<=5&&timeLeft>0?`${timeLeft} DETIK TERAKHIR`:timeLeft<=10&&timeLeft>5?'FINAL 10':'';
    if(timeLeft<=0)finishMission();
  }

  function nextQuestion(){
    const op=Math.random()<.5?'+':'−';let a=randomInt(1,50),b=randomInt(1,50);if(op==='−'&&b>a)[a,b]=[b,a];correctAnswer=op==='+'?a+b:a-b;
    question.textContent=`${a} ${op} ${b} = ?`;question.classList.remove('is-entering');void question.offsetWidth;question.classList.add('is-entering');input.value='';requestAnimationFrame(()=>input.focus());
  }

  function submitAnswer(){
    if(!playing)return;const raw=input.value.trim();if(!raw){showFlash('Isi dulu jawabanmu','wrong');input.focus();return;}
    const correct=Number(raw)===correctAnswer;
    if(correct){scoreValue+=1;scoreText.textContent=String(scoreValue);scoreText.classList.remove('reactor-score-pop');void scoreText.offsetWidth;scoreText.classList.add('reactor-score-pop');showFlash('✓ BENAR  +1','correct');pulseArena('correct');}
    else{showFlash('✕ BELUM PAS','wrong');pulseArena('wrong');}
    nextQuestion();
  }

  function showFlash(message,kind){
    if(flashTimer)clearTimeout(flashTimer);flash.textContent=message;flash.className=`reactor-flash ${kind} show`;flashTimer=setTimeout(()=>{flash.className='reactor-flash';},650);
  }
  function pulseArena(kind){play.classList.remove('flash-correct','flash-wrong');void play.offsetWidth;play.classList.add(kind==='correct'?'flash-correct':'flash-wrong');setTimeout(()=>play.classList.remove('flash-correct','flash-wrong'),360);}

  async function finishMission(){
    if(!playing)return;playing=false;saving=true;if(timerId){clearInterval(timerId);timerId=null;}timeLeft=0;timerNumber.textContent='0';timer.style.setProperty('--progress','0');input.blur();input.disabled=true;submit.disabled=true;finalLabel.textContent='';
    const previousBest=bestScore;ready.hidden=true;play.hidden=true;result.hidden=false;resultScore.textContent=String(scoreValue);resultNote.textContent='Menyimpan hasil misi…';resultNote.classList.remove('error');replay.disabled=true;done.disabled=true;
    try{
      const data=await call(`/v1/games/${encodeURIComponent(profile.id)}/finish`,{method:'POST',body:JSON.stringify({sessionId,score:scoreValue})});
      const xpEarned=Number(data.xpEarned||0);dailyXp=Number(data.dailyXp??dailyXp);dailyCap=Number(data.dailyXpCap??dailyCap);bestScore=Number(data.games?.['speed-math']?.best??Math.max(previousBest,scoreValue));remainingDailyXp=Math.max(0,dailyCap-dailyXp);
      const isNewBest=scoreValue>previousBest;newBestBadge.hidden=!isNewBest;bestCard.value.textContent=String(bestScore);xpCardResult.value.textContent=`+${xpEarned}`;dailyCard.value.textContent=`${dailyXp}/${dailyCap}`;bestChip.textContent=`🏆 Best ${bestScore}`;bestText.textContent=String(bestScore);updateXpBar();
      resultTitle.textContent=isNewBest?'Rekor baru!':'Misi selesai';resultNote.textContent=dailyXp>=dailyCap?'XP game harian sudah penuh. Main lagi tetap bisa untuk mengejar Best Score.':'Hasil tersimpan ke profilmu.';
      animateScore(resultScore,scoreValue);
      window.dispatchEvent(new Event('hashchange'));
    }catch(error){resultNote.textContent=`Hasil belum tersimpan: ${error.message}`;resultNote.classList.add('error');}
    finally{saving=false;replay.disabled=false;done.disabled=false;input.disabled=false;submit.disabled=false;}
  }

  function animateScore(node,target){
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){node.textContent=String(target);return;}
    const start=performance.now();const duration=430;function frame(now){const progress=clamp((now-start)/duration,0,1);node.textContent=String(Math.round(target*(1-Math.pow(1-progress,3))));if(progress<1)requestAnimationFrame(frame);}requestAnimationFrame(frame);
  }

  function close(force=false){
    if((playing||saving)&&!force){if(!confirm('Speed Math masih berjalan atau sedang menyimpan hasil. Yakin mau keluar?'))return;}
    playing=false;if(timerId)clearInterval(timerId);if(flashTimer)clearTimeout(flashTimer);document.removeEventListener('keydown',onKey);overlay.remove();document.body.style.overflow=previousBodyOverflow;if(activeReactor?.close===close)activeReactor=null;
  }
}

function isBrainGamesTile(target){
  const tile=target.closest?.('.side-tile');if(!tile)return null;const label=tile.querySelector('.side-tile-text')?.textContent?.trim().toLowerCase();return label==='brain games'?tile:null;
}

document.addEventListener('click',(event)=>{
  const tile=isBrainGamesTile(event.target);if(!tile)return;
  const profile=profileFromHash();if(!profile)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();openMathReactor(profile);
},true);

document.addEventListener('keydown',(event)=>{
  if(!['Enter',' '].includes(event.key))return;const tile=isBrainGamesTile(event.target);if(!tile)return;
  const profile=profileFromHash();if(!profile)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();openMathReactor(profile);
},true);
