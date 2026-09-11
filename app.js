import {profiles,findProfile,resolveRoute} from './profiles.js';
const main=document.querySelector('#main');
const switchButton=document.querySelector('#switch-profile');
const preferenceKey='ubaybian:last-profile:v1';
function preference(value){
 try{if(value===undefined)return localStorage.getItem(preferenceKey);if(value===null)localStorage.removeItem(preferenceKey);else localStorage.setItem(preferenceKey,value);}catch{/* Private browsing or disabled storage must not block navigation. */}
 return null;
}
function element(tag,attrs={},children=[]){
 const node=document.createElement(tag);
 for(const [key,value] of Object.entries(attrs)){
  if(key==='class')node.className=value;
  else if(key==='text')node.textContent=value;
  else node.setAttribute(key,value);
 }
 for(const child of children)node.append(child);
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
  const card=element('a',{href:`#/${p.id}/${id}`,class:'subject-card'},[text('span',icon,'subject-icon'),text('h2',name),text('span','Lihat latihan →','subject-link')]);grid.append(card);
 }
 main.append(grid,element('aside',{class:'notice'},[text('strong','Latihan sedang disiapkan'),text('p','Mata pelajaran sudah tersedia. Soalnya akan muncul setelah bank soal dihubungkan.') ]));
}
function showSubject(p,s){
 main.append(element('a',{href:`#/${p.id}`,class:'back',text:'← Semua pelajaran'}),profileStrip(p),heading(`${p.name.toUpperCase()} · GRADE ${p.grade}`,s[1],'Latihan sesuai materi yang sedang kamu pelajari.'));
 const empty=element('section',{class:'empty-state','aria-labelledby':'empty-title'},[text('span',s[2],'empty-icon'),element('h2',{id:'empty-title',text:'Soalnya belum tersedia'}),text('p','Bank soal untuk pelajaran ini sedang disiapkan. Kamu bisa melihat pelajaran lainnya dulu.'),button('Pilih pelajaran lain','primary',()=>{location.hash='/'+p.id;})]);
 main.append(empty);
}
function render(focus=true){
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
