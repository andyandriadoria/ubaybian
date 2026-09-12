import {apiBase,backendEnabled} from './config.js';
import {createApiClient,ApiError} from './api-v040.js?v=0.5.51';
import {findProfile} from './profiles.js';

const main=document.querySelector('#main');
const api=backendEnabled?createApiClient(apiBase):null;
let activeExam=null;
let examTimer=null;
let finishing=false;

function el(tag,attrs={},children=[]){
 const node=document.createElement(tag);
 for(const [key,value] of Object.entries(attrs)){
  if(value===undefined||value===null)continue;
  if(key==='class')node.className=value;
  else if(key==='text')node.textContent=value;
  else if(key==='hidden')node.hidden=Boolean(value);
  else if(key==='disabled')node.disabled=Boolean(value);
  else node.setAttribute(key,value);
 }
 for(const child of children)if(child)node.append(child);
 return node;
}
const text=(tag,value,cls)=>el(tag,{text:value,...(cls?{class:cls}:{})});
function button(label,cls,handler){const node=text('button',label,cls);node.type='button';if(handler)node.addEventListener('click',handler);return node;}

function currentProfile(){return findProfile(document.body.dataset.profile||'');}
function errorMessage(error){
 if(error instanceof ApiError)return error.message;
 return 'Simulasi belum bisa dibuka. Coba lagi sebentar.';
}
function examAvailable(profile,subjectId){return profile?.id==='bian'&&subjectId==='english';}

function setSessionOptions(panel){
 const profile=currentProfile();
 const subject=panel.querySelector('#subject-select');
 const session=panel.querySelector('#question-count');
 const mode=panel.querySelector('#quiz-mode');
 const start=panel.querySelector('.start-btn');
 const review=panel.querySelector('.review-btn');
 if(!profile||!subject||!session||!mode||!start)return;

 const previous=session.value;
 session.replaceChildren();
 session.append(
  el('option',{value:'5',text:'⚡ Quick Practice · 5 soal'}),
  el('option',{value:'10',text:'📚 Practice · 10 soal'}),
 );
 if(examAvailable(profile,subject.value))session.append(el('option',{value:'exam',text:'📝 Mid Exam Simulation · 30 soal'}));
 if([...session.options].some((option)=>option.value===previous))session.value=previous;
 else session.value=profile.id==='bian'?'5':'10';
 mode.value='normal';
 const modeLabel=mode.closest('label');if(modeLabel)modeLabel.hidden=true;
 const sessionLabel=session.closest('label')?.querySelector('.control-label');if(sessionLabel)sessionLabel.textContent='Session';

 const sync=()=>{
  const isExam=session.value==='exam';
  start.textContent=isExam?'Mulai Simulasi 📝':'Mulai Latihan ⚡';
  start.classList.toggle('exam-start-btn',isExam);
  if(review)review.style.display=isExam?'none':'';
  panel.classList.toggle('exam-session-selected',isExam);
 };
 sync();
 if(session.dataset.examSelectBound!=='1'){
  session.dataset.examSelectBound='1';
  session.addEventListener('change',sync);
 }
}

function enhanceHome(root=document){
 const panels=[];
 if(root.nodeType===1&&root.matches?.('.controls-panel'))panels.push(root);
 root.querySelectorAll?.('.controls-panel').forEach((panel)=>panels.push(panel));
 for(const panel of panels){
  if(panel.querySelector('#question-count')&&panel.querySelector('#subject-select')){
   setSessionOptions(panel);
   const subject=panel.querySelector('#subject-select');
   if(subject.dataset.examSubjectBound!=='1'){
    subject.dataset.examSubjectBound='1';
    subject.addEventListener('change',()=>queueMicrotask(()=>setSessionOptions(panel)));
   }
  }
 }
}

function formatClock(seconds){
 const safe=Math.max(0,Math.floor(seconds));
 const minutes=Math.floor(safe/60);const secs=safe%60;
 return `${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}
function remainingSeconds(){return Math.max(0,Math.ceil((Number(activeExam?.deadlineAt||0)-Date.now())/1000));}
function startTimer(){
 clearInterval(examTimer);
 const tick=()=>{
  const timer=document.querySelector('#exam-timer');
  const remaining=remainingSeconds();
  if(timer)timer.textContent=formatClock(remaining);
  if(remaining<=300)timer?.classList.add('exam-timer-warning');
  if(remaining<=0&&!finishing){clearInterval(examTimer);finishExam(true);}
 };
 tick();examTimer=setInterval(tick,1000);
}

function isWritingQuestion(question){return question?.type==='open-response';}
function isTextQuestion(question){return question?.type==='text'||isWritingQuestion(question);}

function answerValue(){
 if(!activeExam)return '';
 const question=activeExam.question;
 if(isTextQuestion(question))return document.querySelector('#exam-text-answer')?.value.trim()||'';
 return document.querySelector('.exam-option.selected')?.dataset.choice||'';
}

async function persistCurrent(){
 if(!activeExam)return;
 const answer=answerValue();
 if(!answer||answer===activeExam.savedAnswer)return;
 const saveState=document.querySelector('#exam-save-state');
 if(saveState)saveState.textContent='Menyimpan…';
 const saved=await api.saveExamAnswer(activeExam.sessionId,{questionId:activeExam.question.id,answer});
 activeExam={...activeExam,savedAnswer:answer,answeredCount:saved.answeredCount,remainingSeconds:saved.remainingSeconds,expired:saved.expired};
 if(saveState)saveState.textContent=saved.needsReview?'Tersimpan · writing akan direview ✓':'Tersimpan ✓';
 const answered=document.querySelector('#exam-answered');if(answered)answered.textContent=`Answered ${activeExam.answeredCount} / ${activeExam.progress.total}`;
}

async function goToPosition(position){
 if(!activeExam)return;
 const nextPosition=Math.max(0,Math.min(activeExam.progress.total-1,position));
 const navButtons=[...document.querySelectorAll('.exam-nav button,.exam-finish-btn')];navButtons.forEach((node)=>node.disabled=true);
 const status=document.querySelector('#exam-save-state');
 try{
  await persistCurrent();
  const next=await api.examQuestion(activeExam.sessionId,nextPosition);
  activeExam={...activeExam,...next,blueprint:activeExam.blueprint};
  renderExam();
 }catch(error){
  navButtons.forEach((node)=>node.disabled=false);
  if(status)status.textContent=errorMessage(error);
 }
}

function optionButton(choice){
 const node=button('', 'exam-option', async()=>{
  document.querySelectorAll('.exam-option').forEach((item)=>item.classList.remove('selected'));
  node.classList.add('selected');
  const status=document.querySelector('#exam-save-state');
  try{await persistCurrent();}catch(error){if(status)status.textContent=errorMessage(error);}
 });
 node.dataset.choice=choice.id;
 node.append(text('span',choice.id,'exam-option-letter'));
 if(choice.imageUrl)node.append(el('img',{src:choice.imageUrl,alt:choice.text||`Pilihan ${choice.id}`,loading:'lazy',referrerpolicy:'no-referrer'}));
 if(choice.text)node.append(text('span',choice.text,'exam-option-text'));
 if(activeExam.savedAnswer===choice.id)node.classList.add('selected');
 return node;
}

function renderExam(){
 if(!activeExam)return;
 const question=activeExam.question;
 const current=activeExam.progress.current;
 const total=activeExam.progress.total;
 const writing=isWritingQuestion(question);
 const card=el('section',{class:'exam-shell'});
 const top=el('div',{class:'exam-topbar'},[
  el('div',{class:'exam-heading'},[
   text('p','MID EXAM SIMULATION','eyebrow'),
   text('h1',activeExam.title||'Mid Exam Simulation'),
   text('p',activeExam.blueprint?.subtitle||'Kerjakan seperti ujian sungguhan. Jawaban dan nilai baru dibuka setelah submit.','exam-subtitle'),
  ]),
  el('div',{class:'exam-meta'},[
   el('div',{class:'exam-timer-box'},[text('span','⏱','exam-meta-icon'),text('strong',formatClock(remainingSeconds()),'exam-timer'),text('small','remaining')]),
   el('div',{class:'exam-answered-box'},[text('strong',`Answered ${activeExam.answeredCount} / ${total}`,'exam-answered'),text('small',`Question ${current} of ${total}`)]),
  ]),
 ]);
 top.querySelector('.exam-timer').id='exam-timer';
 top.querySelector('.exam-answered').id='exam-answered';

 const progress=el('div',{class:'exam-progress'},[el('span',{style:`width:${Math.round((current/total)*100)}%`})]);
 const tags=[text('span','ENGLISH'),text('span',question.difficulty||'Grade 2')];
 if(writing)tags.push(text('span','WRITING · REVIEWED','exam-writing-tag'));
 const body=el('div',{class:'exam-question-card'},[
  el('div',{class:'exam-question-head'},[
   el('div',{class:'exam-tags'},tags),
   text('span',`Question ${current} / ${total}`,'exam-question-number'),
  ]),
  text('div',question.prompt,'exam-question-text'),
 ]);
 if(question.imageUrl)body.append(el('div',{class:'exam-image-wrap'},[el('img',{src:question.imageUrl,alt:'Gambar soal',loading:'lazy',referrerpolicy:'no-referrer'})]));

 const answer=el('div',{class:'exam-answer'});
 if(isTextQuestion(question)){
  const input=el('textarea',{id:'exam-text-answer',rows:writing?'5':'3',maxlength:writing?'1000':'500',placeholder:writing?'Write your sentence(s) here…':'Write your answer here…'});
  input.value=activeExam.savedAnswer||'';
  answer.append(input);
  if(writing)answer.append(text('p','Writing is not checked by exact-match. Your response will be marked for review after the simulation.','exam-writing-hint'));
 }else{
  const options=el('div',{class:`exam-options ${question.type==='image-choice'?'exam-image-options':''}`});
  question.choices.forEach((choice)=>options.append(optionButton(choice)));answer.append(options);
 }
 body.append(answer);

 const saveState=text('span',activeExam.savedAnswer?(writing?'Tersimpan · writing akan direview ✓':'Tersimpan ✓'):'Jawaban belum disimpan','exam-save-state');saveState.id='exam-save-state';
 const previous=button('← Previous','exam-secondary',()=>goToPosition(current-2));previous.disabled=current<=1;
 const next=button('Next →','exam-primary',()=>goToPosition(current));next.disabled=current>=total;
 const finish=button('Finish Exam','exam-finish-btn',()=>finishExam(false));
 const nav=el('div',{class:'exam-nav'},[el('div',{class:'exam-save-wrap'},[saveState]),el('div',{class:'exam-nav-actions'},[previous,next,finish])]);

 card.append(top,progress,body,nav);
 main.replaceChildren(card);
 document.body.classList.add('exam-mode-active');
 startTimer();
 window.scrollTo({top:0,behavior:'instant'});
}

async function finishExam(auto=false){
 if(!activeExam||finishing)return;
 const unanswered=Math.max(0,activeExam.progress.total-activeExam.answeredCount-(answerValue()&&!activeExam.savedAnswer?1:0));
 if(!auto&&unanswered>0&&!window.confirm(`Masih ada sekitar ${unanswered} soal yang belum dijawab. Tetap submit ujian?`))return;
 if(!auto&&!window.confirm('Submit Mid Exam Simulation sekarang? Setelah submit jawaban tidak dapat diubah.'))return;
 finishing=true;
 const status=document.querySelector('#exam-save-state');if(status)status.textContent=auto?'Waktu habis. Menyimpan ujian…':'Mengirim ujian…';
 try{
  try{await persistCurrent();}catch(error){if(!(error instanceof ApiError&&error.code==='EXAM_TIME_EXPIRED'))throw error;}
  const result=await api.finishExam(activeExam.sessionId);
  clearInterval(examTimer);renderExamResult(result);
 }catch(error){
  finishing=false;if(status)status.textContent=errorMessage(error);
 }
}

function resultEmoji(score){if(score===null)return '📝';if(score>=80)return '🏆';if(score>=60)return '🚀';return '🌱';}

function renderExamResult(result){
 document.body.classList.remove('exam-mode-active');
 const summary=result.summary;
 const hasWriting=summary.writingTotal>0;
 const displayScore=hasWriting?summary.autoScore:summary.score;
 const card=el('section',{class:'exam-result'});
 card.append(
  text('p','SIMULATION COMPLETE','eyebrow'),
  text('div',resultEmoji(displayScore),'exam-result-emoji'),
  text('h1',result.title),
 );
 if(displayScore!==null){
  card.append(el('div',{class:'exam-result-score'},[text('strong',String(displayScore)),text('span',hasWriting?'/100 auto-score':'/100')]));
 }else{
  card.append(text('div','Writing review pending','exam-result-pending-title'));
 }
 card.append(el('div',{class:'exam-result-stats'},[
  text('span',`✅ ${summary.correct} auto-correct`),
  text('span',`❌ ${summary.wrong} auto-wrong`),
  hasWriting?text('span',`📝 ${summary.reviewPending} writing to review`):null,
  text('span',`⬜ ${summary.unanswered} unanswered`),
 ]));
 if(hasWriting){
  card.append(text('p',`Auto-score dihitung hanya dari ${summary.autoTotal} soal yang bisa dinilai otomatis. ${summary.writingAnswered} dari ${summary.writingTotal} writing response tersimpan untuk review; nilai akhir belum ditetapkan.`,`exam-result-note exam-writing-result-note`));
 }else{
  card.append(text('p','Nilai baru dibuka setelah seluruh simulasi selesai, seperti ujian sungguhan.','exam-result-note'));
 }

 const review=el('section',{class:'exam-review'});review.append(text('h2','Review Answers'));
 for(const item of result.results){
  const unanswered=!item.answer;
  const status=item.manualReview
   ? (unanswered?'— Unanswered writing':'📝 Needs review')
   : (item.correct?'✓ Correct':unanswered?'— Unanswered':'✕ Check again');
  const cls=item.manualReview?'is-review':item.correct?'is-correct':'is-wrong';
  const bodyChildren=[
   item.prompt?text('p',item.prompt,'exam-review-prompt'):null,
   text('p',`Your answer: ${item.answer||'—'}`),
  ];
  if(item.manualReview){
   bodyChildren.push(text('p','This writing response is not graded by exact-match.','exam-writing-review-label'));
  }else{
   bodyChildren.push(text('p',`Correct answer: ${item.correctAnswer||'—'}`));
  }
  if(item.explanation)bodyChildren.push(text('p',item.explanation,'exam-review-explanation'));
  const detail=el('details',{class:`exam-review-item ${cls}`});
  detail.append(
   el('summary',{},[text('span',`Question ${item.position}`),text('strong',status)]),
   el('div',{class:'exam-review-body'},bodyChildren),
  );review.append(detail);
 }
 card.append(review);
 card.append(button('Kembali ke Home','exam-home-btn',()=>{activeExam=null;finishing=false;location.hash=`/${currentProfile()?.id||'bian'}/home`;window.dispatchEvent(new HashChangeEvent('hashchange'));}));
 main.replaceChildren(card);
 window.scrollTo({top:0,behavior:'instant'});
}

async function launchExam(profile,subjectId,start,status){
 if(!api||!profile)return;
 start.disabled=true;const old=start.textContent;start.textContent='Menyiapkan paper…';status.textContent='';
 try{
  activeExam=await api.startExam({profileId:profile.id,subjectId});
  finishing=false;renderExam();
 }catch(error){start.disabled=false;start.textContent=old;status.textContent=errorMessage(error);}
}

document.addEventListener('click',(event)=>{
 const start=event.target.closest('.start-btn');
 if(start){
  const panel=start.closest('.controls-panel');
  const session=panel?.querySelector('#question-count');
  if(session?.value==='exam'){
   event.preventDefault();event.stopImmediatePropagation();
   const profile=currentProfile();const subject=panel.querySelector('#subject-select');const status=panel.querySelector('.start-status');
   launchExam(profile,subject?.value||'',start,status);
  }
 }
 const review=event.target.closest('.review-btn');
 if(review){
  const session=review.closest('.controls-panel')?.querySelector('#question-count');
  if(session?.value==='exam')session.value='5';
 }
},true);

const observer=new MutationObserver((records)=>{
 for(const record of records){
  for(const node of record.addedNodes){if(node.nodeType===1)enhanceHome(node);}
 }
});
observer.observe(document.body,{childList:true,subtree:true});
enhanceHome();
