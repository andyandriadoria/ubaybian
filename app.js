import {profiles,findProfile,resolveRoute} from './profiles.js';
import {apiBase,backendEnabled} from './config.js';
import {createApiClient,ApiError} from './api.js?v=0.3.6';
import {newIdempotencyKey} from './quiz.js';

const main=document.querySelector('#main');
const switchButton=document.querySelector('#switch-profile');
const preferenceKey='ubaybian:last-profile:v1';
const api=backendEnabled?createApiClient(apiBase):null;
let viewToken=0;

function preference(value){
 try{if(value===undefined)return localStorage.getItem(preferenceKey);if(value===null)localStorage.removeItem(preferenceKey);else localStorage.setItem(preferenceKey,value);}catch{/* Private browsing or disabled storage must not block navigation. */}
 return null;
}
function element(tag,attrs={},children=[]){
 const node=document.createElement(tag);
 for(const [key,value] of Object.entries(attrs)){
  if(key==='class')node.className=value;
  else if(key==='text')node.textContent=value;
  else if(key==='htmlFor')node.htmlFor=value;
  else if(key==='disabled')node.disabled=Boolean(value);
  else node.setAttribute(key,value);
 }
 for(const child of children)if(child)node.append(child);
 return node;
}
const text=(tag,content,cls)=>element(tag,{text:content,...(cls?{class:cls}:{})});
function button(label,cls,action){const b=text('button',label,cls);b.type='button';b.addEventListener('click',action);return b;}
function heading(kicker,title,description){return element('div',{class:'heading'},[text('p',kicker,'eyebrow'),text('h1',title),text('p',description,'intro')]);}
function chooseProfile(id){if(!findProfile(id))throw new Error('Profil tidak ditemukan.');preference(id);location.hash='/'+id;}
function showProfiles(){
 main.append(heading('UBAYBIAN','Siapa yang mau belajar?','Pilih namamu, lalu pilih pelajaran hari ini.'));
 const cards=element('div',{class:'profile-grid'});
 for(const p of profiles){
  const card=button('',`profile-card ${p.color}`,()=>chooseProfile(p.id));
  card.append(text('span',p.icon,'avatar'),text('span',p.name,'profile-name'),text('span',`Grade ${p.grade} · ${p.level}`,'profile-meta'),text('span',`${p.subjects.length} mata pelajaran`,'profile-count'),text('span','Masuk →','profile-enter'));
  cards.append(card);
 }
 main.append(cards,text('p','Perangkat ini akan mengingat profil yang terakhir dipilih.','hint'));
}
function profileStrip(p){return element('section',{class:`learner-strip ${p.color}`,'aria-label':'Profil terpilih'},[text('span',p.icon,'small-avatar'),element('div',{},[text('strong',p.name),text('p',`Grade ${p.grade} · ${p.level}`)]),text('span','Belajar hari ini','strip-note')]);}
function showHome(p){
 main.append(profileStrip(p),heading('PELAJARANMU',`Halo, ${p.name}!`,'Mau mulai dari pelajaran apa?'));
 const grid=element('div',{class:'subject-grid'});
 for(const [id,name,icon] of p.subjects){
  const card=element('a',{href:`#/${p.id}/${id}`,class:'subject-card'},[text('span',icon,'subject-icon'),text('h2',name),text('span',backendEnabled?'Mulai latihan →':'Buka pelajaran →','subject-link')]);grid.append(card);
 }
 main.append(grid);
 if(!backendEnabled)main.append(element('aside',{class:'notice'},[text('strong','Mode persiapan'),text('p','Daftar pelajaran sudah aktif. Latihan akan menyala setelah layanan bank soal privat dihubungkan.') ]));
}
function safeImage(url,alt=''){if(!url)return null;return element('img',{src:url,alt,class:'question-image',loading:'lazy',referrerpolicy:'no-referrer'});}
function progressNode(progress){
 const current=Math.max(1,Number(progress.current)||1);const total=Math.max(0,Number(progress.total)||0);const pct=total?Math.min(100,Math.round(((current-1)/total)*100)):0;
 return element('div',{class:'quiz-progress'},[element('div',{class:'quiz-progress-copy'},[text('span',total?`Soal ${Math.min(current,total)} dari ${total}`:`Soal ${current}`),text('span',`${pct}%`)]),element('div',{class:'progress-track'},[element('span',{style:`width:${pct}%`})])]);
}
function answerInput(question){
 if(question.type==='text'){
  const label=text('label','Jawabanmu','field-label');label.htmlFor='text-answer';
  const input=element('input',{id:'text-answer',name:'answer',class:'text-answer',type:'text',autocomplete:'off',maxlength:'500',required:'true'});
  return {node:element('div',{class:'text-answer-wrap'},[label,input]),value:()=>input.value.trim(),focus:()=>input.focus()};
 }
 const group=element('div',{class:`choice-list ${question.type==='image-choice'?'image-choices':''}`,'role':'radiogroup','aria-label':'Pilihan jawaban'});
 const radios=[];
 question.choices.forEach((choice,index)=>{
  const input=element('input',{type:'radio',name:'answer',value:choice.id,id:`choice-${index}`});radios.push(input);
  const visual=safeImage(choice.imageUrl,choice.text||`Pilihan ${choice.id}`);
  const content=element('span',{class:'choice-content'},[visual,text('span',choice.text||`Pilihan ${choice.id}`)]);
  const label=element('label',{class:'choice-card',htmlFor:`choice-${index}`},[input,text('span',choice.id,'choice-key'),content]);group.append(label);
 });
 return {node:group,value:()=>radios.find(r=>r.checked)?.value??'',focus:()=>radios[0]?.focus()};
}
function errorMessage(error){
 if(error instanceof ApiError){if(error.status===401||error.status===403)return 'Sesi keluarga belum aktif di perangkat ini.';return error.message;}
 return 'Latihan belum bisa dibuka. Coba lagi nanti.';
}
function showQuizError(p,s,message){
 const box=element('section',{class:'empty-state error-state','aria-live':'polite'},[text('span','🛠️','empty-icon'),text('h2','Latihan belum bisa dibuka'),text('p',message),button('Coba lagi','primary',()=>showSubject(p,s))]);
 main.replaceChildren(element('a',{href:`#/${p.id}`,class:'back',text:'← Semua pelajaran'}),profileStrip(p),heading(`${p.name.toUpperCase()} · GRADE ${p.grade}`,s[1],'Latihan sesuai materi yang sedang kamu pelajari.'),box);
}
function renderQuestion(p,s,session){
 const token=++viewToken;const q=session.question;
 main.replaceChildren();
 main.append(element('a',{href:`#/${p.id}`,class:'back',text:'← Keluar latihan'}),profileStrip(p));
 const shell=element('section',{class:'quiz-shell'});shell.append(progressNode(session.progress),text('p',q.difficulty?`KESULITAN · ${q.difficulty.toUpperCase()}`:'LATIHAN','eyebrow'),text('h1',q.prompt,'question-title'));
 const promptImage=safeImage(q.imageUrl,q.prompt);if(promptImage)shell.append(promptImage);
 const input=answerInput(q);shell.append(input.node);
 const actionRow=element('div',{class:'quiz-actions'});const status=text('p','','submit-status');const submit=button('Kirim jawaban','primary',async()=>{
   const answer=input.value();if(!answer){status.textContent='Pilih atau isi jawaban dulu.';input.focus();return;}
   submit.disabled=true;submit.textContent='Memeriksa…';status.textContent='';
   try{
    const result=await api.submitAnswer(session.sessionId,{questionId:q.id,answer,idempotencyKey:newIdempotencyKey()});
    if(token!==viewToken)return;
    showAnswerResult(p,s,session,result);
   }catch(error){if(token!==viewToken)return;submit.disabled=false;submit.textContent='Kirim jawaban';status.textContent=errorMessage(error);}
 });actionRow.append(submit,status);shell.append(actionRow);main.append(shell);input.focus();
}
function showAnswerResult(p,s,session,result){
 ++viewToken;
 const feedback=element('section',{class:`answer-result ${result.correct?'correct':'incorrect'}`,'aria-live':'polite'},[text('span',result.correct?'✓':'↗','result-icon'),text('h2',result.correct?'Benar!':'Belum tepat')]);
 if(result.explanation)feedback.append(text('p',result.explanation,'result-explanation'));
 if(result.xpEarned)feedback.append(text('p',`+${result.xpEarned} XP`,'xp-earned'));
 let next;
 if(result.sessionComplete||!result.nextQuestion){
  next=button('Selesai · kembali ke pelajaran','primary',()=>{location.hash=`/${p.id}`;});
  feedback.append(text('p','Sesi latihan selesai.','completion-note'),next);
 }else{
  next=button('Soal berikutnya →','primary',()=>renderQuestion(p,s,{...session,question:result.nextQuestion,progress:result.progress}));feedback.append(next);
 }
 const header=element('div',{},[element('a',{href:`#/${p.id}`,class:'back',text:'← Keluar latihan'}),profileStrip(p),heading(`${p.name.toUpperCase()} · ${s[1]}`,'Hasil jawaban','Baca pembahasannya, lalu lanjut kalau sudah siap.')]);
 main.replaceChildren(header,feedback);next.focus();
}
async function startQuiz(p,s,startButton,status){
 const token=++viewToken;startButton.disabled=true;startButton.textContent='Menyiapkan soal…';status.textContent='';
 try{const session=await api.startQuiz({profileId:p.id,subjectId:s[0],limit:10});if(token!==viewToken)return;renderQuestion(p,s,session);}catch(error){if(token!==viewToken)return;showQuizError(p,s,errorMessage(error));}
}
function showSubject(p,s){
 ++viewToken;
 main.replaceChildren();
 main.append(element('a',{href:`#/${p.id}`,class:'back',text:'← Semua pelajaran'}),profileStrip(p),heading(`${p.name.toUpperCase()} · GRADE ${p.grade}`,s[1],'Latihan sesuai materi yang sedang kamu pelajari.'));
 if(!backendEnabled){
  const ready=element('section',{class:'empty-state quiz-ready'},[text('span',s[2],'empty-icon'),text('span','QUIZ ENGINE READY','status-pill'),text('h2','Latihan belum diaktifkan'),text('p','Bank soal sudah disiapkan, tetapi layanan privatnya belum terhubung. Saat server aktif dan ada soal yang dipublikasikan, latihan akan muncul di sini.'),button('Pilih pelajaran lain','primary',()=>{location.hash='/'+p.id;})]);
  main.append(ready);return;
 }
 const status=text('p','','submit-status');const start=button('Mulai latihan','primary',()=>startQuiz(p,s,start,status));
 main.append(element('section',{class:'empty-state quiz-ready'},[text('span',s[2],'empty-icon'),text('span','SIAP LATIHAN','status-pill'),text('h2','Mulai sesi baru'),text('p','Soal diambil dari bank soal privat. Jawaban benar tidak dikirim ke browser sebelum kamu menjawab.'),start,status]));
}
function render(focus=true){
 ++viewToken;
 const state=resolveRoute(location.hash);
 main.replaceChildren();switchButton.hidden=state.page==='profiles';
 document.body.dataset.profile=state.profile?.id??'';
 if(state.profile)preference(state.profile.id);
 if(state.page==='profiles')showProfiles();else if(state.page==='home')showHome(state.profile);else showSubject(state.profile,state.subject);
 document.title=state.subject?`${state.subject[1]} · ${state.profile.name} · UbayBian`:state.profile?`${state.profile.name} · UbayBian`:'UbayBian · Ruang belajar';
 if(focus){main.focus();window.scrollTo({top:0,behavior:'instant'});}
}
function switchProfile(){preference(null);location.hash='';render();}
switchButton.addEventListener('click',switchProfile);
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();switchProfile();});
window.addEventListener('hashchange',()=>render());
if(!location.hash){const saved=findProfile(preference());if(saved)history.replaceState(null,'','#/'+saved.id);}
render(false);
if(document.modelContext?.registerTool){
 try{Promise.resolve(document.modelContext.registerTool({name:'choose_learner_profile',description:'Open the selected learner profile and remember it on this device. Does not authenticate a user.',inputSchema:{type:'object',properties:{profileId:{type:'string',enum:['ubay','bian']}},required:['profileId'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async input=>{if(!input||!findProfile(input.profileId))throw new Error('Profil tidak valid.');chooseProfile(input.profileId);render();return {profileId:input.profileId,page:'home'};}})).catch(()=>{});}catch{/* Optional browser capability. */}
}
