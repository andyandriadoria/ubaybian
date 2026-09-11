import {profiles,findProfile} from './profiles.js';
import {apiBase,backendEnabled} from './config.js';
import {createApiClient,ApiError} from './api-v040.js';
import {newIdempotencyKey} from './quiz.js';

const main=document.querySelector('#main');
const switchButton=document.querySelector('#switch-profile');
const profileNav=document.querySelector('#profile-nav');
const navHome=document.querySelector('#nav-home');
const navReport=document.querySelector('#nav-report');
const navRobot=document.querySelector('#nav-robot');
const preferenceKey='ubaybian:last-profile:v1';
const api=backendEnabled?createApiClient(apiBase):null;
let viewToken=0;
let activeQuiz=null;

const LEVELS=[
 {level:1,minXp:0,title:'Rookie Bot',emoji:'🤖'},
 {level:2,minXp:100,title:'Curious Bot',emoji:'🔎'},
 {level:3,minXp:300,title:'Smart Explorer',emoji:'🧠'},
 {level:4,minXp:700,title:'Knowledge Ranger',emoji:'🚀'},
 {level:5,minXp:1500,title:'Brain Commander',emoji:'⚡'},
 {level:6,minXp:3000,title:'UbayBian Legend',emoji:'🌟'},
];

function preference(value){
 try{if(value===undefined)return localStorage.getItem(preferenceKey);if(value===null)localStorage.removeItem(preferenceKey);else localStorage.setItem(preferenceKey,value);}catch{/* Storage preference is optional. */}
 return null;
}
function element(tag,attrs={},children=[]){
 const el=document.createElement(tag);
 for(const [key,value] of Object.entries(attrs)){
  if(value===undefined||value===null)continue;
  if(key==='class')el.className=value;
  else if(key==='text')el.textContent=value;
  else if(key==='htmlFor')el.htmlFor=value;
  else if(key==='disabled')el.disabled=Boolean(value);
  else if(key==='hidden')el.hidden=Boolean(value);
  else el.setAttribute(key,value);
 }
 for(const child of children)if(child)el.append(child);
 return el;
}
const text=(tag,value,cls)=>element(tag,{text:value,...(cls?{class:cls}:{})});
function button(label,cls,action){const el=text('button',label,cls);el.type='button';if(action)el.addEventListener('click',action);return el;}
function formatNumber(value){return new Intl.NumberFormat('id-ID').format(Number(value)||0);}
function formatDate(timestamp){return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'}).format(new Date(timestamp));}
function subjectTuple(profile,id){return profile.subjects.find((subject)=>subject[0]===id)||profile.subjects[0];}
function subjectName(profile,id){return subjectTuple(profile,id)?.[1]||id||'Pelajaran';}
function errorMessage(error){
 if(error instanceof ApiError){if(error.status===401||error.status===403)return `Sesi keluarga perlu diaktifkan lagi. [${error.code}]`;return error.message;}
 return 'Layanan belajar belum bisa dibuka. Coba lagi sebentar.';
}
function routeState(){
 const parts=location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);
 const profile=findProfile(parts[0]);
 if(!profile)return {page:'profiles',profile:null};
 const page=['report','robot'].includes(parts[1])?parts[1]:'home';
 return {page,profile};
}
function chooseProfile(id){
 if(!findProfile(id))return;
 preference(id);location.hash=`/${id}/home`;
}
function navTo(page){const state=routeState();if(state.profile)location.hash=`/${state.profile.id}/${page}`;}
function setTopbar(profile,page){
 document.body.dataset.profile=profile?.id||'';
 if(profileNav)profileNav.hidden=!profile;
 if(switchButton)switchButton.hidden=!profile;
 [[navHome,'home'],[navReport,'report'],[navRobot,'robot']].forEach(([node,id])=>{if(node)node.classList.toggle('active',page===id);});
}

function loadingCard(label='Menyiapkan ruang belajar…'){
 return element('section',{class:'loading-card'},[text('span','🤖','loading-icon'),text('strong',label),text('p','Sebentar ya, data progres sedang disiapkan.')]);
}

function showProfiles(){
 setTopbar(null,'profiles');
 main.replaceChildren();
 const intro=element('section',{class:'profile-intro'},[text('p','UBAYBIAN FAMILY','eyebrow'),text('h1','Siapa yang mau belajar?'),text('p','Pilih profil. Progres, XP, coins, badge, dan review tersimpan terpisah untuk masing-masing anak.','intro')]);
 const grid=element('div',{class:'profile-grid'});
 for(const profile of profiles){
  const card=button('',`profile-card ${profile.color}`,()=>chooseProfile(profile.id));
  card.append(text('span',profile.icon,'avatar'),text('span',profile.name,'profile-name'),text('span',`Grade ${profile.grade} · ${profile.level}`,'profile-meta'),text('span',`${profile.subjects.length} mata pelajaran`,'profile-count'),text('span','Masuk →','profile-enter'));
  grid.append(card);
 }
 main.append(intro,grid,text('p','Login keluarga tetap aktif; kamu bisa berpindah profil kapan saja.','hint'));
}

function badgeList(profile,dashboard){
 const box=element('section',{class:'badge-card'});
 box.append(element('div',{class:'badge-title'},[text('span','🏅','icon'),text('span','Badges')]));
 const list=element('div',{class:'badge-list'});
 const badges=dashboard.badges||[];
 if(!badges.length)list.append(text('div','Belum ada badge. Selesaikan latihan pertama! 💪','badge-empty'));
 for(const item of badges.slice(0,6)){
  const name=item.subjectId?`${subjectName(profile,item.subjectId)} Master`:item.name;
  list.append(element('div',{class:'badge-chip'},[text('span',item.emoji||'🏅','emoji'),element('div',{class:'badge-text'},[text('span',name,'badge-name'),text('span',item.description||'Achievement terbuka.','badge-desc')])]));
 }
 box.append(list);
 if(badges.length>6)box.append(text('p',`+${badges.length-6} badge lainnya`,'badge-more'));
 return box;
}

function sidebar(profile,dashboard){
 const stats=dashboard.stats;
 const aside=element('aside',{class:'side-menu'});
 const profileCard=element('section',{class:`side-profile ${profile.color}`},[
  text('span',profile.icon,'profile-avatar'),
  element('div',{class:'profile-info'},[text('h2',profile.name),text('p',`Grade ${profile.grade} · ${profile.level}`)]),
  element('div',{class:'xp-badge'},[
   text('span',`${stats.level.emoji} ${formatNumber(stats.xp)} XP`,'xp-main'),
   text('span',`🪙 ${formatNumber(stats.coins)} coins`,'coin-main'),
   text('span',`Lv. ${stats.level.level} · ${stats.level.title}`,'xp-level'),
  ]),
 ]);
 aside.append(profileCard,badgeList(profile,dashboard));
 const reviewTile=element('div',{class:'side-tile review-tile'},[text('span','🔁','side-tile-icon'),element('div',{},[text('div','Review','side-tile-text'),text('div',stats.reviewTotal?`${stats.reviewTotal} soal perlu diulang`:'Semua aman untuk sekarang','side-tile-sub')])]);
 const games=element('div',{class:'side-tile coming-soon'},[text('span','🧠','side-tile-icon'),element('div',{},[text('div','Brain Games','side-tile-text'),text('div','Tahap berikutnya','side-tile-sub')])]);
 const memory=element('div',{class:'side-tile coming-soon'},[text('span','🧩','side-tile-icon'),element('div',{},[text('div','Memory Grid','side-tile-text'),text('div','Tahap berikutnya','side-tile-sub')])]);
 const rewards=element('div',{class:'side-tile coming-soon'},[text('span','🎁','side-tile-icon'),element('div',{},[text('div','Reward Shop','side-tile-text'),text('div','Tahap berikutnya','side-tile-sub')])]);
 aside.append(reviewTile,games,memory,rewards);
 return aside;
}

function learningLayout(profile,dashboard,content){
 return element('div',{class:'app-main-grid'},[sidebar(profile,dashboard),element('section',{class:'main-col'},[content])]);
}

function subjectStat(dashboard,subjectId){return (dashboard.subjects||[]).find((item)=>item.subjectId===subjectId)||{attempted:0,correct:0,review:0};}

function homeContent(profile,dashboard){
 const wrapper=element('div',{});
 const defaultSubject=profile.subjects.find((subject)=>subject[0]==='math')||profile.subjects[0];
 const hero=element('section',{class:'hero-daily'},[
  element('div',{class:'hero-text'},[text('p','DAILY PRACTICE','hero-kicker'),text('h1',`Belajar hari ini, ${profile.name}!`),text('p','Pilih pelajaran dan panjang sesi. Soal akan diacak dari bank soal privat.'),text('div',`🔥 ${dashboard.stats.streak.current} hari streak · ${dashboard.stats.totalSessions} sesi selesai`,'hero-meta')]),
  element('div',{class:'hero-action'},[text('div','🏆','hero-trophy')]),
 ]);
 const controls=element('section',{class:'controls-panel'});
 const row=element('div',{class:'controls-row'});
 const subjectSelect=element('select',{id:'subject-select'});
 for(const [id,name] of profile.subjects)subjectSelect.append(element('option',{value:id,text:name}));
 subjectSelect.value=defaultSubject[0];
 const countSelect=element('select',{id:'question-count'});
 [['5','5 · Quick'],['10','10 · Standard'],['15','15 · Challenge']].forEach(([value,label])=>countSelect.append(element('option',{value,text:label})));
 countSelect.value=profile.id==='bian'?'5':'10';
 const modeSelect=element('select',{id:'quiz-mode'});
 modeSelect.append(element('option',{value:'normal',text:'Normal'}),element('option',{value:'challenge',text:'Challenge'}));
 row.append(
  element('label',{class:'controls-pill'},[text('span','Subject','control-label'),subjectSelect]),
  element('label',{class:'controls-pill'},[text('span','Questions','control-label'),countSelect]),
  element('label',{class:'controls-pill'},[text('span','Mode','control-label'),modeSelect]),
 );
 const actionRow=element('div',{class:'start-row'});
 const status=text('p','','start-status');
 const start=button('Start ⚡','start-btn',()=>startQuizFromHome(profile,dashboard,{subjectId:subjectSelect.value,limit:Number(countSelect.value),mode:modeSelect.value},start,status));
 const review=button('Review 🔁','review-btn',()=>startQuizFromHome(profile,dashboard,{subjectId:subjectSelect.value,limit:Number(countSelect.value),mode:'review'},review,status));
 const reviewInfo=text('span','','review-info');
 actionRow.append(start,review,reviewInfo,status);
 controls.append(row,actionRow);
 const rules=element('div',{class:'rules-strip'},[text('span','✅ Benar +10 XP'),text('span','🪙 Benar +50 coins'),text('span','🏁 Selesai +20 XP'),text('span','🌟 Perfect +100 coins')]);
 const summary=element('section',{class:'today-summary'},[text('strong','Aturan main baru'),text('p','Coins hanya datang dari latihan utama. Soal yang salah atau dilewati otomatis masuk Review. Level tidak pernah turun.')]);
 function refreshReview(){
  const stat=subjectStat(dashboard,subjectSelect.value);
  review.hidden=!stat.review;
  reviewInfo.textContent=stat.review?`${stat.review} soal menunggu review`:'Tidak ada review untuk subject ini';
 }
 subjectSelect.addEventListener('change',refreshReview);refreshReview();
 wrapper.append(hero,controls,rules,summary);
 return wrapper;
}

async function startQuizFromHome(profile,dashboard,settings,startButton,status){
 const token=++viewToken;
 startButton.disabled=true;status.textContent='';
 const old=startButton.textContent;startButton.textContent='Menyiapkan…';
 try{
  const session=await api.startQuiz({profileId:profile.id,...settings});
  if(token!==viewToken)return;
  activeQuiz={profile,dashboard,settings,session,correct:0,skipped:0,locked:false,lastResult:null};
  renderQuiz();
 }catch(error){if(token!==viewToken)return;startButton.disabled=false;startButton.textContent=old;status.textContent=errorMessage(error);}
}

function progressNode(session,answered=false){
 const current=Math.max(1,Number(session.progress.current)||1);const total=Math.max(1,Number(session.progress.total)||1);
 const done=Math.min(total,answered?current:current-1);const pct=Math.round((done/total)*100);
 return element('div',{class:'progress-wrapper'},[element('div',{class:'progress-label-row'},[text('span',`${pct}% complete`),text('span',`Question ${Math.min(current,total)} of ${total}`)]),element('div',{class:'progress-bar'},[element('span',{class:'progress-fill',style:`width:${pct}%`})])]);
}

function renderQuiz(){
 const state=activeQuiz;if(!state)return;
 const {profile,dashboard,session}=state;const question=session.question;const subject=subjectTuple(profile,state.settings.subjectId);
 setTopbar(profile,'home');main.replaceChildren();
 const card=element('section',{class:'quiz-card'});
 const header=element('div',{class:'quiz-header'},[element('div',{class:'quiz-header-left'},[element('div',{class:'tag-row'},[text('span',subject[1],'category'),text('span',question.difficulty||'Latihan')]),text('h2',state.settings.mode==='review'?'Review dulu, lalu lanjut lebih kuat! 🔁':'Fokus sebentar, lalu kita rayakan skornya! 🎉')]),element('div',{class:'score-pill'},[text('span','⭐','icon'),text('span',`Benar sesi ini: ${state.correct}`)])]);
 card.append(header,progressNode(session,false),text('div',question.prompt,'question-text'));
 if(question.imageUrl)card.append(element('div',{class:'question-image-wrap'},[element('img',{src:question.imageUrl,alt:'Gambar soal',loading:'lazy',referrerpolicy:'no-referrer'})]));
 const answerArea=element('div',{class:'answer-area'});
 if(question.type==='text'){
  const input=element('input',{id:'text-answer',class:'text-answer',type:'text',autocomplete:'off',maxlength:'500',placeholder:'Tulis jawaban di sini'});
  const check=button('Cek ✅','check-btn',()=>submitQuizAnswer(input.value.trim(),null,false));
  input.addEventListener('keydown',(event)=>{if(event.key==='Enter'){event.preventDefault();submitQuizAnswer(input.value.trim(),null,false);}});
  answerArea.append(input,check);
  setTimeout(()=>input.focus(),0);
 }else{
  const options=element('div',{class:`options ${question.type==='image-choice'?'image-grid':''}`});
  question.choices.forEach((choice)=>{
   const btn=button('',`option-btn ${question.type==='image-choice'?'image-option':''}`,()=>submitQuizAnswer(choice.id,btn,false));btn.dataset.choice=choice.id;
   btn.append(text('span',choice.id,'option-label'));
   if(choice.imageUrl)btn.append(element('span',{class:'option-img-wrapper'},[element('img',{src:choice.imageUrl,alt:choice.text||`Pilihan ${choice.id}`,loading:'lazy',referrerpolicy:'no-referrer'})]));
   if(choice.text)btn.append(text('span',choice.text,'option-text'));
   options.append(btn);
  });
  answerArea.append(options);
 }
 const feedback=text('div','','feedback');
 const rewards=element('div',{class:'answer-rewards'});
 const next=button('Berikutnya ➜','secondary next-btn',goToNextQuestion);next.disabled=true;
 const skip=button('Lewati ⏭️','secondary outline skip-btn',()=>submitQuizAnswer('',null,true));
 const bottom=element('div',{class:'feedback-row'},[element('div',{class:'feedback-stack'},[feedback,rewards]),element('div',{class:'bottom-actions'},[skip,next])]);
 card.append(answerArea,bottom);
 state.nodes={card,answerArea,feedback,rewards,next,skip};
 main.append(learningLayout(profile,dashboard,card));
}

async function submitQuizAnswer(answer,selectedButton,skip){
 const state=activeQuiz;if(!state||state.locked)return;
 if(!skip&&!String(answer||'').trim()){state.nodes.feedback.textContent='Isi atau pilih jawaban dulu ya 😊';state.nodes.feedback.className='feedback wrong';return;}
 state.locked=true;state.nodes.skip.disabled=true;
 for(const btn of state.nodes.answerArea.querySelectorAll('button,input'))btn.disabled=true;
 state.nodes.feedback.textContent='Memeriksa…';state.nodes.feedback.className='feedback';
 try{
  const result=await api.submitAnswer(state.session.sessionId,{questionId:state.session.question.id,answer,skip,idempotencyKey:newIdempotencyKey()});
  state.lastResult=result;
  if(result.correct)state.correct+=1;if(result.skipped)state.skipped+=1;
  const optionButtons=[...state.nodes.answerArea.querySelectorAll('.option-btn')];
  for(const btn of optionButtons){if(btn.dataset.choice===result.correctAnswer)btn.classList.add('correct');}
  if(selectedButton&&!result.correct)selectedButton.classList.add('wrong');
  if(result.skipped){state.nodes.feedback.textContent=`Dilewati. Jawaban benar: ${result.correctAnswer||'—'}. ${result.explanation||''}`;state.nodes.feedback.className='feedback wrong';}
  else if(result.correct){state.nodes.feedback.textContent=`Benar! ${result.explanation||''}`;state.nodes.feedback.className='feedback correct';}
  else{state.nodes.feedback.textContent=`Belum tepat. Jawaban benar: ${result.correctAnswer||'—'}. ${result.explanation||''}`;state.nodes.feedback.className='feedback wrong';}
  state.nodes.rewards.replaceChildren();
  if(result.xpEarned)state.nodes.rewards.append(text('span',`+${result.xpEarned} XP`,'reward-chip'));
  if(result.coinEarned)state.nodes.rewards.append(text('span',`+${result.coinEarned} coins`,'reward-chip coin'));
  const progress=state.nodes.card.querySelector('.progress-wrapper');if(progress)progress.replaceWith(progressNode(state.session,true));
  state.nodes.next.disabled=false;state.nodes.next.textContent=result.sessionComplete?'Lihat Hasil 🏁':'Berikutnya ➜';
 }catch(error){
  state.locked=false;state.nodes.skip.disabled=false;for(const btn of state.nodes.answerArea.querySelectorAll('button,input'))btn.disabled=false;state.nodes.feedback.textContent=errorMessage(error);state.nodes.feedback.className='feedback wrong';
 }
}

function goToNextQuestion(){
 const state=activeQuiz;if(!state?.lastResult)return;
 const result=state.lastResult;
 if(result.sessionComplete||!result.nextQuestion){showResult(state,result.summary);return;}
 state.session={...state.session,question:result.nextQuestion,progress:result.progress};state.locked=false;state.lastResult=null;renderQuiz();
}

function resultTone(score){
 if(score===100)return {emoji:'🌟',title:'Perfect!',message:'Semua soal benar. Bonus Perfect masuk ke coins kamu!'};
 if(score>=80)return {emoji:'🏆',title:'Keren banget!',message:'Nilaimu sudah tinggi. Review soal yang masih salah supaya makin mantap.'};
 if(score>=50)return {emoji:'🚀',title:'Lumayan, kita push lagi!',message:'Belajar pelan-pelan tapi rutin. Review akan membantu bagian yang masih lemah.'};
 return {emoji:'🌱',title:'Awal yang bagus!',message:'Tidak masalah kalau masih banyak salah. Soal yang belum dikuasai sudah masuk Review.'};
}

function showResult(state,summary){
 if(!summary){renderHome(state.profile,true);return;}
 const tone=resultTone(summary.score);const profile=state.profile;
 const card=element('section',{class:'result-panel'},[
  text('div',tone.emoji,'result-emoji'),text('p','SESI SELESAI','eyebrow'),element('div',{class:'result-score'},[text('strong',String(summary.score)),text('span','/100')]),text('h2',tone.title),text('p',tone.message,'result-message'),
  element('div',{class:'result-stats'},[text('span',`✅ ${summary.correct} benar`),text('span',`❌ ${summary.wrong} salah`),text('span',`⏭️ ${summary.skipped} skip`)]),
  element('div',{class:'result-rewards'},[text('span',`⭐ +${summary.xpEarned} XP`),text('span',`🪙 +${summary.coinsEarned} coins`)]),
 ]);
 const actions=element('div',{class:'result-actions'});
 const again=button('Ulangi sesi 🔄','primary',async()=>{const fake=text('p','','start-status');await startQuizFromHome(profile,state.dashboard,state.settings,again,fake);});
 const home=button('Kembali Home','secondary',()=>{activeQuiz=null;renderHome(profile,true);});actions.append(again,home);card.append(actions);
 main.replaceChildren(learningLayout(profile,state.dashboard,card));
 api.dashboard(profile.id).then((fresh)=>{state.dashboard=fresh;}).catch(()=>{});
}

function reportContent(profile,dashboard){
 const report=dashboard.report||[];const card=element('section',{class:'report-card'},[element('div',{class:'report-header'},[element('div',{},[text('h2',`Rapor ${profile.name}`),text('p','Ringkasan maksimal 10 sesi latihan terakhir.')]),text('span',report.length?`${dashboard.stats.totalSessions} sesi · ${Math.round(report.reduce((sum,row)=>sum+row.score,0)/report.length)}% avg`:'Belum ada sesi','report-badge')])]);
 if(!report.length){card.append(text('p','Selesaikan minimal satu sesi latihan untuk melihat grafik.','report-empty'));return card;}
 const chart=element('div',{class:'report-chart-inner'});
 for(const row of [...report].reverse()){
  const bar=element('div',{class:'report-bar-wrap'},[element('div',{class:`report-bar ${row.score<50?'low':row.score<80?'mid':'high'}`,style:`height:${Math.max(10,row.score*1.35)}px`},[text('span',`${row.score}%`,'report-bar-value')]),text('span',new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',timeZone:'Asia/Jakarta'}).format(new Date(row.completedAt)),'report-bar-label')]);chart.append(bar);
 }
 const table=element('table',{class:'report-table'});table.append(element('thead',{},[element('tr',{},[text('th','Tanggal'),text('th','Subject'),text('th','Nilai'),text('th','Benar / Total')]) ]));const body=element('tbody');
 for(const row of report)body.append(element('tr',{},[text('td',formatDate(row.completedAt)),text('td',subjectName(profile,row.subjectId)),text('td',`${row.score}%`,row.score<50?'score-low':row.score<80?'score-mid':'score-high'),text('td',`${row.correct} / ${row.total}`)]));table.append(body);
 card.append(element('div',{class:'report-main-grid'},[element('div',{class:'report-chart'},[text('h3','Perkembangan Nilai'),chart]),element('div',{class:'report-table-wrap'},[text('h3','Detail Sesi'),table])]));return card;
}

function robotContent(profile,dashboard){
 const stats=dashboard.stats;const level=stats.level;const card=element('section',{class:'robotlab-card'},[text('h2','🤖 Robot Lab'),text('p','XP menaikkan level robot. Level tidak pernah turun.'),text('div',level.emoji,'robotlab-robot-emoji'),text('div',`Lv. ${level.level} — ${level.title}`,'robotlab-level-title')]);
 const label=level.nextXp?`${formatNumber(stats.xp)} / ${formatNumber(level.nextXp)} XP`:`${formatNumber(stats.xp)} XP · Max level`;
 card.append(element('div',{class:'robotlab-xpbar'},[element('div',{class:'robotlab-xpbar-label'},[text('span',label),text('span',level.nextXp?`Next: ${level.nextXp} XP`:'Legend!')]),element('div',{class:'robotlab-xpbar-track'},[element('span',{class:'robotlab-xpbar-fill',style:`width:${level.progressPercent}%`})])]),element('div',{class:'robotlab-stats'},[element('div',{class:'robotlab-stat'},[text('strong',formatNumber(stats.xp),'stat-number'),text('span','Total XP','stat-label')]),element('div',{class:'robotlab-stat'},[text('strong',String(stats.totalSessions),'stat-number'),text('span','Sesi','stat-label')]),element('div',{class:'robotlab-stat'},[text('strong',String(stats.perfectSessions),'stat-number'),text('span','Perfect','stat-label')])]));
 const list=element('div',{class:'robotlab-upgrade-list'});for(const item of LEVELS){const unlocked=stats.xp>=item.minXp;list.append(element('div',{class:`robotlab-upgrade-item ${unlocked?'':'upgrade-locked'}`},[text('span',item.emoji,'upgrade-icon'),element('div',{class:'upgrade-info'},[text('div',`Lv. ${item.level} — ${item.title}`,'upgrade-name'),text('div',unlocked?'Unlocked ✔':`Locked — ${item.minXp} XP needed`,'upgrade-status')]) ]));}card.append(text('h3','Robot upgrades','robotlab-upgrade-title'),list);return card;
}

async function loadDashboardPage(profile,page,force=false){
 const token=++viewToken;setTopbar(profile,page);preference(profile.id);main.replaceChildren(loadingCard());
 try{
  const dashboard=await api.dashboard(profile.id);if(token!==viewToken)return;
  const content=page==='report'?reportContent(profile,dashboard):page==='robot'?robotContent(profile,dashboard):homeContent(profile,dashboard);
  main.replaceChildren(learningLayout(profile,dashboard,content));
 }catch(error){if(token!==viewToken)return;main.replaceChildren(element('section',{class:'loading-card error-state'},[text('span','🛠️','loading-icon'),text('strong','Ruang belajar belum bisa dibuka'),text('p',errorMessage(error))]));}
}
function renderHome(profile){location.hash=`/${profile.id}/home`;}

function render(){
 activeQuiz=null;const state=routeState();
 if(state.page==='profiles'){showProfiles();return;}
 loadDashboardPage(state.profile,state.page);
 document.title=`${state.profile.name} · UbayBian`;
 window.scrollTo({top:0,behavior:'instant'});
}

if(switchButton)switchButton.addEventListener('click',()=>{preference(null);location.hash='';});
if(navHome)navHome.addEventListener('click',()=>navTo('home'));
if(navReport)navReport.addEventListener('click',()=>navTo('report'));
if(navRobot)navRobot.addEventListener('click',()=>navTo('robot'));
const brand=document.querySelector('.brand');if(brand)brand.addEventListener('click',(event)=>{event.preventDefault();const state=routeState();if(state.profile)navTo('home');else location.hash='';});
window.addEventListener('hashchange',render);
if(!location.hash){const saved=findProfile(preference());if(saved)history.replaceState(null,'',`#/${saved.id}/home`);}
render();
