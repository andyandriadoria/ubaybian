import {apiBase,backendEnabled} from './config.js';
import {findProfile} from './profiles.js';

const SESSION_KEY='ubaybian:family-session:v1';
let activeNeuralGrid=null;

function sessionToken(){try{return localStorage.getItem(SESSION_KEY)||'';}catch{return '';}}
async function call(path,options={}){
  if(!backendEnabled)throw new Error('Backend belum aktif.');
  const headers=new Headers(options.headers||{});headers.set('Accept','application/json');if(options.body)headers.set('Content-Type','application/json');
  const token=sessionToken();if(token)headers.set('Authorization',`Bearer ${token}`);
  const response=await fetch(`${apiBase}${path}`,{...options,headers});let data=null;try{data=await response.json();}catch{}
  if(!response.ok)throw new Error(data?.message||'Layanan game belum tersedia.');return data;
}
function profileFromHash(){return findProfile(location.hash.replace(/^#\/?/,'').split('/')[0]);}
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function button(label,cls,fn){const node=el('button',cls,label);node.type='button';if(fn)node.addEventListener('click',fn);return node;}
function randomInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function shuffle(items){const arr=[...items];for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

function openNeuralGrid(profile){
  if(activeNeuralGrid)activeNeuralGrid.close(true);

  let sessionId='';let round=0;let scoreValue=0;let correctNumber=0;let targetIndex=0;let phase='ready';let countdownTimer=null;let bestScore=0;let dailyXp=0;let dailyCap=50;let saving=false;
  const previousBodyOverflow=document.body.style.overflow;

  const overlay=el('div','neural-overlay');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Neural Grid');
  const shell=el('section','neural-shell');const top=el('header','neural-top');const brand=el('div','neural-brand');const brandText=el('div','');
  brandText.append(el('p','neural-kicker','MEMORY GRID'),el('h2','neural-title','Neural Grid'),el('p','neural-subtitle','5 ronde · scan, ingat, lalu temukan kembali'));
  brand.append(el('div','neural-icon','🧩'),brandText);const closeBtn=button('×','neural-close',()=>close());closeBtn.setAttribute('aria-label','Tutup Neural Grid');top.append(brand,closeBtn);
  const stage=el('div','neural-stage');shell.append(top,stage);overlay.append(shell);document.body.append(overlay);document.body.style.overflow='hidden';

  /* Ready */
  const ready=el('section','neural-view neural-ready');const readyTitle=profile.id==='bian'?'Memory Grid! 🧩':'Neural Grid';
  const readyCopy=profile.id==='bian'?'Lihat angkanya baik-baik, lalu tebak angka yang tadi ada di kotak pilihan.':'Scan empat angka selama 3 detik. Setelah tertutup, temukan kembali angka di kotak yang disorot.';
  const chips=el('div','neural-chips');const bestChip=el('span','neural-chip','🏆 Best …');chips.append(el('span','neural-chip','🧠 5 ronde'),el('span','neural-chip','⏱ 3s scan'),bestChip,el('span','neural-chip','⭐ +1 XP / benar'));
  const xpCard=el('div','neural-xp-card');const xpRow=el('div','neural-xp-row');const xpLabel=el('span','','Game XP hari ini');const xpValue=el('strong','','… / 50 XP');xpRow.append(xpLabel,xpValue);const xpTrack=el('div','neural-xp-track');const xpFill=el('div','neural-xp-fill');xpTrack.append(xpFill);xpCard.append(xpRow,xpTrack);
  const readyStatus=el('p','neural-note','Menyiapkan neural data…');const startBtn=button('Mulai Scan →','neural-main-btn',()=>startGame(startBtn,readyStatus));startBtn.disabled=true;
  ready.append(el('div','neural-orb','🧩'),el('h3','',readyTitle),el('p','neural-ready-copy',readyCopy),chips,xpCard,startBtn,readyStatus);

  /* Play */
  const play=el('section','neural-view neural-play');play.hidden=true;
  const hud=el('div','neural-hud');const scoreStat=el('div','neural-stat');scoreStat.append(el('span','neural-stat-label','Score'));const scoreText=el('span','neural-stat-value','0');scoreStat.append(scoreText);
  const roundPill=el('div','neural-round','Ronde 1 / 5');const bestStat=el('div','neural-stat right');bestStat.append(el('span','neural-stat-label','Best'));const bestText=el('span','neural-stat-value','0');bestStat.append(bestText);hud.append(scoreStat,roundPill,bestStat);
  const phaseLabel=el('div','neural-phase','SIAPKAN FOKUS');
  const board=el('div','neural-board');const cells=[0,1,2,3].map(()=>el('div','neural-cell',''));cells.forEach((cell)=>board.append(cell));const countdown=el('div','neural-countdown','3');countdown.hidden=true;board.append(countdown);
  const prompt=el('div','neural-prompt','Perhatikan posisi setiap angka.');const options=el('div','neural-options');options.hidden=true;const feedback=el('div','neural-feedback','');const nextBtn=button('Ronde berikutnya →','neural-next',nextRound);nextBtn.hidden=true;
  play.append(hud,phaseLabel,board,prompt,options,feedback,nextBtn);

  /* Result */
  const result=el('section','neural-view neural-result');result.hidden=true;const complete=el('div','neural-complete','🧠 NEURAL SCAN COMPLETE');const resultTitle=el('h3','','Scan selesai');
  const scoreRing=el('div','neural-score-ring');const scoreInside=el('div','');const resultScore=el('strong','','0/5');scoreInside.append(resultScore,el('span','','jawaban benar'));scoreRing.append(scoreInside);
  const resultGrid=el('div','neural-result-grid');const bestCard=metric('🏆 Best','0/5');const xpCardResult=metric('⭐ XP didapat','+0');const dailyCard=metric('🧠 XP hari ini','0/50');resultGrid.append(bestCard.card,xpCardResult.card,dailyCard.card);
  const actions=el('div','neural-result-actions');const replay=button('Main Lagi','neural-main-btn',()=>startGame(replay,resultNote));const done=button('Selesai','neural-ghost-btn',()=>close());actions.append(replay,done);const resultNote=el('p','neural-note','');
  result.append(complete,resultTitle,scoreRing,resultGrid,actions,resultNote);

  stage.append(ready,play,result);activeNeuralGrid={close};
  closeBtn.addEventListener('click',()=>close());overlay.addEventListener('click',(event)=>{if(event.target===overlay)close();});const onKey=(event)=>{if(event.key==='Escape')close();};document.addEventListener('keydown',onKey);
  loadStatus();

  function metric(label,value){const card=el('div','neural-result-card');card.append(el('span','',label));const strong=el('strong','',value);card.append(strong);return {card,value:strong};}
  function updateXp(){const cap=Math.max(1,Number(dailyCap)||50);const current=Math.max(0,Number(dailyXp)||0);xpValue.textContent=`${current} / ${cap} XP`;xpFill.style.width=`${clamp((current/cap)*100,0,100)}%`;}

  async function loadStatus(){
    try{const state=await call(`/v1/games/${encodeURIComponent(profile.id)}/status`);bestScore=Number(state.games?.['memory-grid']?.best||0);dailyXp=Number(state.dailyXp||0);dailyCap=Number(state.dailyXpCap||50);bestChip.textContent=`🏆 Best ${bestScore}/5`;bestText.textContent=String(bestScore);updateXp();readyStatus.textContent=dailyXp>=dailyCap?'XP game harian sudah penuh. Kamu tetap boleh bermain untuk mengejar Best Score.':'Siap. Tekan Mulai Scan saat kamu mau.';startBtn.disabled=false;}
    catch(error){readyStatus.textContent=error.message;readyStatus.classList.add('error');}
  }

  async function startGame(trigger,note){
    if(saving||['show','question'].includes(phase))return;trigger.disabled=true;note.textContent='Menyalakan neural scanner…';note.classList.remove('error');
    try{const data=await call(`/v1/games/${encodeURIComponent(profile.id)}/start`,{method:'POST',body:JSON.stringify({gameId:'memory-grid'})});sessionId=data.sessionId;round=0;scoreValue=0;phase='idle';scoreText.textContent='0';bestText.textContent=String(bestScore);ready.hidden=true;result.hidden=true;play.hidden=false;startRound();}
    catch(error){trigger.disabled=false;note.textContent=error.message;note.classList.add('error');}
  }

  function startRound(){
    clearCountdown();round+=1;phase='show';roundPill.textContent=`Ronde ${round} / 5`;phaseLabel.textContent='NEURAL SCAN · HAFALKAN POSISINYA';prompt.textContent='Perhatikan posisi setiap angka.';feedback.textContent='';feedback.className='neural-feedback';options.hidden=true;options.replaceChildren();nextBtn.hidden=true;
    const numbers=[];while(numbers.length<4){const n=randomInt(1,19);if(!numbers.includes(n))numbers.push(n);}targetIndex=randomInt(0,3);correctNumber=numbers[targetIndex];
    cells.forEach((cell,index)=>{cell.textContent=String(numbers[index]);cell.className='neural-cell';});
    let count=3;countdown.textContent=String(count);countdown.hidden=false;countdownTimer=setInterval(()=>{count-=1;if(count>0){countdown.textContent=String(count);}else{clearCountdown();showQuestion();}},1000);
  }

  function showQuestion(){
    phase='question';phaseLabel.textContent='RECALL MODE · TEMUKAN ANGKANYA';cells.forEach((cell)=>{cell.className='neural-cell is-hidden';cell.textContent='';});cells[targetIndex].classList.add('is-target');prompt.textContent='Angka apa yang tadi ada di kotak yang menyala?';
    const values=new Set([correctNumber]);while(values.size<4)values.add(randomInt(1,19));options.replaceChildren();shuffle([...values]).forEach((value)=>{const choice=button(String(value),'neural-option',()=>answerRound(value,choice));choice.dataset.value=String(value);options.append(choice);});options.hidden=false;
  }

  function answerRound(value,clicked){
    if(phase!=='question')return;phase='answer';for(const option of options.querySelectorAll('button')){option.disabled=true;if(Number(option.dataset.value)===correctNumber)option.classList.add('correct');}
    const target=cells[targetIndex];target.classList.remove('is-hidden','is-target');target.textContent=String(correctNumber);target.classList.add('is-correct');
    if(Number(value)===correctNumber){scoreValue+=1;scoreText.textContent=String(scoreValue);feedback.textContent='✓ Benar! Neural match ditemukan.';feedback.className='neural-feedback success';}
    else{clicked.classList.add('wrong');feedback.textContent=`Belum tepat. Angka yang benar adalah ${correctNumber}.`;feedback.className='neural-feedback error';}
    nextBtn.textContent=round<5?'Ronde berikutnya →':'Lihat hasil →';nextBtn.hidden=false;
  }

  function nextRound(){if(phase!=='answer')return;if(round<5)startRound();else finishGame();}

  async function finishGame(){
    if(saving)return;saving=true;phase='done';nextBtn.hidden=true;play.hidden=true;result.hidden=false;const previousBest=bestScore;resultScore.textContent=`${scoreValue}/5`;resultTitle.textContent=scoreValue===5?'Scan sempurna!':scoreValue>=4?'Memori tajam!':'Scan selesai';resultNote.textContent='Menyimpan hasil scan…';replay.disabled=true;done.disabled=true;
    try{const data=await call(`/v1/games/${encodeURIComponent(profile.id)}/finish`,{method:'POST',body:JSON.stringify({sessionId,score:scoreValue})});const xpEarned=Number(data.xpEarned||0);dailyXp=Number(data.dailyXp??dailyXp);dailyCap=Number(data.dailyXpCap??dailyCap);bestScore=Number(data.games?.['memory-grid']?.best??Math.max(previousBest,scoreValue));bestCard.value.textContent=`${bestScore}/5`;xpCardResult.value.textContent=`+${xpEarned}`;dailyCard.value.textContent=`${dailyXp}/${dailyCap}`;bestChip.textContent=`🏆 Best ${bestScore}/5`;bestText.textContent=String(bestScore);updateXp();if(scoreValue>previousBest)resultTitle.textContent='Rekor baru!';resultNote.textContent=dailyXp>=dailyCap?'XP game harian sudah penuh. Main lagi tetap bisa untuk mengejar Best Score.':'Hasil tersimpan ke profilmu.';window.dispatchEvent(new Event('hashchange'));}
    catch(error){resultNote.textContent=`Hasil belum tersimpan: ${error.message}`;resultNote.classList.add('error');}
    finally{saving=false;replay.disabled=false;done.disabled=false;}
  }

  function clearCountdown(){if(countdownTimer){clearInterval(countdownTimer);countdownTimer=null;}countdown.hidden=true;}
  function close(force=false){
    if((['show','question'].includes(phase)||saving)&&!force){if(!confirm('Neural Grid masih berjalan atau sedang menyimpan hasil. Yakin mau keluar?'))return;}
    clearCountdown();phase='closed';document.removeEventListener('keydown',onKey);overlay.remove();document.body.style.overflow=previousBodyOverflow;if(activeNeuralGrid?.close===close)activeNeuralGrid=null;
  }
}

function isMemoryTile(target){const tile=target.closest?.('.side-tile');if(!tile)return null;const label=tile.querySelector('.side-tile-text')?.textContent?.trim().toLowerCase();return label==='memory grid'?tile:null;}

document.addEventListener('click',(event)=>{
  const tile=isMemoryTile(event.target);if(!tile)return;const profile=profileFromHash();if(!profile)return;
  event.preventDefault();event.stopImmediatePropagation();openNeuralGrid(profile);
},true);
