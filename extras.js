import {apiBase,backendEnabled} from './config.js';
import {findProfile} from './profiles.js';

const SESSION_KEY='ubaybian:family-session:v1';
const cache=new Map();
let syncTimer=null;
let activeModal=null;

function sessionToken(){try{return localStorage.getItem(SESSION_KEY)||'';}catch{return '';}}
async function call(path,options={}){
 if(!backendEnabled)throw new Error('Backend belum aktif.');
 const headers=new Headers(options.headers||{});headers.set('Accept','application/json');headers.set('Content-Type','application/json');
 const token=sessionToken();if(token)headers.set('Authorization',`Bearer ${token}`);
 const response=await fetch(`${apiBase}${path}`,{...options,headers});let data=null;try{data=await response.json();}catch{}
 if(!response.ok)throw new Error(data?.message||'Layanan belum tersedia.');return data;
}
function profileFromHash(){return findProfile(location.hash.replace(/^#\/?/,'').split('/')[0]);}
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function button(label,cls,fn){const node=el('button',cls,label);node.type='button';if(fn)node.addEventListener('click',fn);return node;}
function setText(node,value){if(node&&node.textContent!==value)node.textContent=value;}
function number(value){return new Intl.NumberFormat('id-ID').format(Number(value)||0);}
function randomInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function shuffle(items){const arr=[...items];for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
function refreshApp(){window.dispatchEvent(new Event('hashchange'));}
function status(text,kind=''){return el('p',`ub-modal-status ${kind}`,text);}

function modal(title,icon='🤖'){
 if(activeModal)activeModal.close(true);
 const overlay=el('div','ub-modal-overlay');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 const box=el('section','ub-modal-box');const top=el('div','ub-modal-top');const heading=el('div','ub-modal-heading');
 heading.append(el('span','ub-modal-icon',icon),el('h2','',title));const closeButton=button('✕','ub-modal-close');closeButton.setAttribute('aria-label','Tutup');top.append(heading,closeButton);box.append(top);overlay.append(box);document.body.append(overlay);
 let canClose=()=>true;let cleanup=()=>{};
 const onKey=(event)=>{if(event.key==='Escape')close();};document.addEventListener('keydown',onKey);
 function close(force=false){if(!force&&!canClose())return;cleanup();document.removeEventListener('keydown',onKey);overlay.remove();if(activeModal?.overlay===overlay)activeModal=null;}
 closeButton.addEventListener('click',()=>close());overlay.addEventListener('click',(event)=>{if(event.target===overlay)close();});
 activeModal={overlay,box,close,setCanClose:(fn)=>{canClose=fn;},setCleanup:(fn)=>{cleanup=fn;}};return activeModal;
}

async function openReview(profile){
 const {box}=modal('Review','🔁');const loading=status('Menyiapkan daftar soal yang perlu diulang…');box.append(loading);
 try{
  const dashboard=await call(`/v1/dashboard/${encodeURIComponent(profile.id)}`);loading.remove();box.append(el('p','ub-modal-copy','Pilih mata pelajaran. Review hanya mengambil soal yang terakhir masih salah atau dilewati.'));
  const list=el('div','ub-review-list');const rows=(dashboard.subjects||[]).filter((item)=>Number(item.review)>0);
  if(!rows.length)list.append(status('Tidak ada soal Review. Semua sudah aman untuk sekarang 🎉','success'));
  for(const row of rows){const subject=profile.subjects.find((item)=>item[0]===row.subjectId);if(!subject)continue;const item=button('','ub-review-item',()=>startReview(profile,row.subjectId));item.append(el('span','ub-review-icon',subject[2]),el('span','ub-review-name',subject[1]),el('span','ub-review-count',`${row.review} soal`));list.append(item);}box.append(list);
 }catch(error){loading.textContent=error.message;loading.classList.add('error');}
}
function startReview(profile,subjectId){
 if(activeModal)activeModal.close(true);const target=`#/${profile.id}/home`;if(location.hash!==target)location.hash=target;else refreshApp();let tries=0;
 const timer=setInterval(()=>{tries+=1;const select=document.querySelector('#subject-select');const review=document.querySelector('.review-btn');if(select&&review){clearInterval(timer);select.value=subjectId;select.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(()=>{if(!review.hidden)review.click();},100);}else if(tries>40)clearInterval(timer);},100);
}

async function openSpeedMath(profile){
 const ui=modal('Speed Math 60s','⚡');const {box}=ui;let sessionId='';let timerId=null;let timeLeft=60;let scoreValue=0;let correctAnswer=0;let playing=false;
 ui.setCanClose(()=>!playing||confirm('Speed Math masih berjalan. Yakin mau keluar?'));ui.setCleanup(()=>{playing=false;if(timerId)clearInterval(timerId);});
 const info=el('div','ub-game-info');const timer=el('span','ub-game-pill','⏱️ 60s');const score=el('span','ub-game-pill','Score: 0');const best=el('span','ub-game-pill','Best: …');info.append(timer,score,best);
 const question=el('div','ub-game-question','Tekan Start untuk mulai.');const input=el('input','ub-game-input');input.type='number';input.placeholder='Jawaban…';input.disabled=true;const feedback=status('Setiap jawaban benar = +1 XP. Maksimal 50 XP dari games per hari.');const actions=el('div','ub-modal-actions');
 const start=button('Start','ub-primary',begin);const submit=button('Submit','ub-secondary',answer);submit.disabled=true;actions.append(start,submit);box.append(info,question,input,feedback,actions);
 try{const state=await call(`/v1/games/${profile.id}/status`);best.textContent=`Best: ${state.games?.['speed-math']?.best||0}`;feedback.textContent=`Game XP hari ini: ${state.dailyXp}/${state.dailyXpCap}.`;}catch(error){feedback.textContent=error.message;feedback.classList.add('error');}
 function nextQuestion(){const op=Math.random()<.5?'+':'−';let a=randomInt(1,50),b=randomInt(1,50);if(op==='−'&&b>a)[a,b]=[b,a];correctAnswer=op==='+'?a+b:a-b;question.textContent=`${a} ${op} ${b} = ?`;input.value='';input.focus();}
 async function begin(){try{start.disabled=true;feedback.textContent='Menyiapkan game…';const data=await call(`/v1/games/${profile.id}/start`,{method:'POST',body:JSON.stringify({gameId:'speed-math'})});sessionId=data.sessionId;timeLeft=60;scoreValue=0;playing=true;submit.disabled=false;input.disabled=false;timer.textContent='⏱️ 60s';score.textContent='Score: 0';feedback.textContent=`Sisa XP games hari ini: ${data.remainingDailyXp}.`;nextQuestion();timerId=setInterval(()=>{timeLeft-=1;timer.textContent=`⏱️ ${timeLeft}s`;if(timeLeft<=0)finish();},1000);}catch(error){start.disabled=false;feedback.textContent=error.message;feedback.className='ub-modal-status error';}}
 function answer(){if(!playing)return;const raw=input.value.trim();if(!raw){feedback.textContent='Isi dulu jawabannya 😊';return;}if(Number(raw)===correctAnswer){scoreValue+=1;score.textContent=`Score: ${scoreValue}`;feedback.textContent='Benar! Lanjut 💪';feedback.className='ub-modal-status success';}else{feedback.textContent='Belum tepat, coba soal berikutnya.';feedback.className='ub-modal-status error';}nextQuestion();}
 async function finish(){if(!playing)return;playing=false;if(timerId)clearInterval(timerId);timerId=null;input.disabled=true;submit.disabled=true;start.disabled=false;timer.textContent='⏱️ 0s';question.textContent='Waktu habis!';try{const data=await call(`/v1/games/${profile.id}/finish`,{method:'POST',body:JSON.stringify({sessionId,score:scoreValue})});best.textContent=`Best: ${data.games?.['speed-math']?.best||scoreValue}`;feedback.textContent=`Skor ${scoreValue} · +${data.xpEarned} XP · Game XP hari ini ${data.dailyXp}/${data.dailyXpCap} 🎉`;feedback.className='ub-modal-status success';cache.delete(profile.id);syncSidebar();refreshApp();}catch(error){feedback.textContent=error.message;feedback.className='ub-modal-status error';}}
 input.addEventListener('keydown',(event)=>{if(event.key==='Enter'){event.preventDefault();answer();}});
}

async function openMemoryGrid(profile){
 const ui=modal('Memory Grid','🧩');const {box}=ui;let sessionId='';let round=0;let scoreValue=0;let correctNumber=0;let phase='idle';let timeoutId=null;
 ui.setCanClose(()=>!['show','question'].includes(phase)||confirm('Memory Grid masih berjalan. Yakin mau keluar?'));ui.setCleanup(()=>{if(timeoutId)clearTimeout(timeoutId);phase='idle';});
 const info=el('div','ub-game-info');const roundEl=el('span','ub-game-pill','Round: 0/5');const score=el('span','ub-game-pill','Score: 0');const best=el('span','ub-game-pill','Best: …');info.append(roundEl,score,best);
 const grid=el('div','ub-memory-grid');const cells=[0,1,2,3].map(()=>el('div','ub-memory-cell',''));cells.forEach((cell)=>grid.append(cell));const question=el('div','ub-game-question','Tekan Start untuk mulai.');const options=el('div','ub-memory-options');const feedback=status('5 ronde · angka terlihat selama 3 detik · +1 XP untuk jawaban benar.');const actions=el('div','ub-modal-actions');const start=button('Start','ub-primary',begin);const next=button('Next','ub-secondary',nextRound);next.disabled=true;actions.append(start,next);box.append(info,grid,question,options,feedback,actions);
 try{const state=await call(`/v1/games/${profile.id}/status`);best.textContent=`Best: ${state.games?.['memory-grid']?.best||0}`;}catch(error){feedback.textContent=error.message;}
 async function begin(){try{start.disabled=true;const data=await call(`/v1/games/${profile.id}/start`,{method:'POST',body:JSON.stringify({gameId:'memory-grid'})});sessionId=data.sessionId;round=0;scoreValue=0;score.textContent='Score: 0';startRound();}catch(error){start.disabled=false;feedback.textContent=error.message;feedback.className='ub-modal-status error';}}
 function startRound(){round+=1;phase='show';roundEl.textContent=`Round: ${round}/5`;next.disabled=true;options.replaceChildren();feedback.textContent='Perhatikan angka di setiap kotak…';feedback.className='ub-modal-status';question.textContent='Hafalkan posisi angkanya…';const numbers=[];while(numbers.length<4){const n=randomInt(1,19);if(!numbers.includes(n))numbers.push(n);}const targetIndex=randomInt(0,3);correctNumber=numbers[targetIndex];cells.forEach((cell,index)=>cell.textContent=String(numbers[index]));timeoutId=setTimeout(()=>showQuestion(targetIndex),3000);}
 function showQuestion(targetIndex){phase='question';cells.forEach((cell)=>cell.textContent='?');question.textContent=`Angka berapa yang tadi ada di kotak ${targetIndex+1}?`;feedback.textContent='';const values=new Set([correctNumber]);while(values.size<4)values.add(randomInt(1,19));shuffle([...values]).forEach((value,index)=>{const option=button('','ub-memory-option',()=>answerRound(value,option));option.append(el('span','ub-option-label','ABCD'[index]),el('span','',String(value)));option.dataset.value=String(value);options.append(option);});}
 function answerRound(value,clicked){if(phase!=='question')return;phase='answer';for(const option of options.querySelectorAll('button')){option.disabled=true;if(Number(option.dataset.value)===correctNumber)option.classList.add('correct');}if(value===correctNumber){scoreValue+=1;score.textContent=`Score: ${scoreValue}`;feedback.textContent='Benar! 👏';feedback.className='ub-modal-status success';}else{clicked.classList.add('wrong');feedback.textContent=`Belum tepat. Yang benar: ${correctNumber}.`;feedback.className='ub-modal-status error';}if(round<5)next.disabled=false;else finish();}
 function nextRound(){if(phase==='answer'&&round<5)startRound();}
 async function finish(){phase='done';next.disabled=true;start.disabled=false;question.textContent='Game selesai! 👏';try{const data=await call(`/v1/games/${profile.id}/finish`,{method:'POST',body:JSON.stringify({sessionId,score:scoreValue})});best.textContent=`Best: ${data.games?.['memory-grid']?.best||scoreValue}`;feedback.textContent=`Skor ${scoreValue}/5 · +${data.xpEarned} XP · Game XP hari ini ${data.dailyXp}/${data.dailyXpCap}`;feedback.className='ub-modal-status success';cache.delete(profile.id);syncSidebar();refreshApp();}catch(error){feedback.textContent=error.message;feedback.className='ub-modal-status error';}}
}

async function openRewardShop(profile){
 const {box}=modal('Reward Shop','🎁');const loading=status('Memuat saldo dan reward…');box.append(loading);
 async function render(shop){
  box.querySelectorAll('.ub-shop-content').forEach((node)=>node.remove());loading.remove();const content=el('div','ub-shop-content');const wallet=el('div','ub-wallet');wallet.append(el('div','ub-wallet-main',`🪙 ${number(shop.balance)} coins`),el('div','ub-wallet-sub',shop.reserved?`${number(shop.reserved)} coins sedang menunggu persetujuan`:`${number(shop.available)} coins tersedia`));content.append(wallet);
  const list=el('div','ub-reward-list');for(const reward of shop.rewards||[]){const card=el('article','ub-reward-card');const copy=el('div','ub-reward-copy');copy.append(el('strong','',reward.name),el('p','',reward.desc),el('span','ub-reward-cost',`${number(reward.cost)} coins`));const request=button(shop.available>=reward.cost?'Minta Tukar':'Coins belum cukup','ub-primary',async()=>{request.disabled=true;try{const result=await call(`/v1/rewards/${profile.id}/requests`,{method:'POST',body:JSON.stringify({rewardId:reward.id})});await render(result.shop);cache.delete(profile.id);syncSidebar();}catch(error){alert(error.message);request.disabled=false;}});request.disabled=shop.available<reward.cost;card.append(el('span','ub-reward-icon','🎁'),copy,request);list.append(card);}content.append(el('h3','ub-section-title','Pilihan hadiah'),list);
  const history=el('div','ub-request-list');const requests=shop.requests||[];if(!requests.length)history.append(status('Belum ada permintaan penukaran.'));
  for(const item of requests){const row=el('div','ub-request-row');const info=el('div','');info.append(el('strong','',item.rewardName),el('span','',`${number(item.cost)} coins · ${item.status==='pending'?'menunggu':item.status==='approved'?'disetujui':'ditolak'}`));row.append(info);if(item.status==='pending'){const controls=el('div','ub-parent-actions');controls.append(button('Setujui','ub-approve',()=>resolve(item.id,'approved')),button('Tolak','ub-reject',()=>resolve(item.id,'rejected')));row.append(controls);}history.append(row);}content.append(el('h3','ub-section-title','Persetujuan orang tua'),el('p','ub-modal-copy','Permintaan anak tidak langsung memotong coins. Setujui di sini setelah orang tua siap memberikan hadiahnya.'),history);box.append(content);
  async function resolve(id,decision){try{const result=await call(`/v1/rewards/${profile.id}/requests/${id}/resolve`,{method:'POST',body:JSON.stringify({decision})});await render(result.shop);cache.delete(profile.id);syncSidebar();refreshApp();}catch(error){alert(error.message);}}
 }
 try{await render(await call(`/v1/rewards/${profile.id}`));}catch(error){loading.textContent=error.message;loading.classList.add('error');}
}

function tileByName(name){return [...document.querySelectorAll('.side-tile')].find((tile)=>tile.querySelector('.side-tile-text')?.textContent.trim()===name);}
function subtitle(tile,value){const node=tile?.querySelector('.side-tile-sub');setText(node,value);}
function enhanceTiles(){
 const profile=profileFromHash();if(!profile)return;let changed=false;
 const actions={Review:()=>openReview(profile),'Brain Games':()=>openSpeedMath(profile),'Memory Grid':()=>openMemoryGrid(profile),'Reward Shop':()=>openRewardShop(profile)};
 for(const [name,action] of Object.entries(actions)){
  const tile=tileByName(name);if(!tile||tile.dataset.extraEnhanced)continue;changed=true;tile.dataset.extraEnhanced='1';tile.classList.remove('coming-soon');tile.classList.add('clickable-tile');tile.setAttribute('role','button');tile.tabIndex=0;tile.addEventListener('click',action);tile.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();action();}});
  if(name==='Brain Games')subtitle(tile,'Speed Math 60 detik');if(name==='Memory Grid')subtitle(tile,'Ingat posisi 4 angka');if(name==='Reward Shop')subtitle(tile,'Tukar coins dengan hadiah');
 }
 if(changed)scheduleSync();
}
function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(syncSidebar,180);}
async function syncSidebar(){
 const profile=profileFromHash();if(!profile)return;const brain=tileByName('Brain Games'),memory=tileByName('Memory Grid'),reward=tileByName('Reward Shop');if(!brain&&!memory&&!reward)return;
 let data=cache.get(profile.id);if(!data||Date.now()-data.at>15000){try{const [games,shop]=await Promise.all([call(`/v1/games/${profile.id}/status`),call(`/v1/rewards/${profile.id}`)]);data={games,shop,at:Date.now()};cache.set(profile.id,data);}catch{return;}}
 subtitle(brain,`Best ${data.games.games?.['speed-math']?.best||0} · XP hari ini ${data.games.dailyXp}/${data.games.dailyXpCap}`);subtitle(memory,`Best ${data.games.games?.['memory-grid']?.best||0}/5`);subtitle(reward,`🪙 ${number(data.shop.balance)} coins${data.shop.reserved?` · ${number(data.shop.reserved)} pending`:''}`);
}

const observer=new MutationObserver(enhanceTiles);observer.observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('hashchange',()=>setTimeout(enhanceTiles,80));enhanceTiles();
