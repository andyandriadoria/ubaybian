import {apiBase,backendEnabled} from './config.js';
import {ApiError,clearSessionToken,createApiClient,getSessionToken} from './api-v040.js?v=0.5.52';

const main=document.querySelector('#main');
const switchButton=document.querySelector('#switch-profile');
const profileNav=document.querySelector('#profile-nav');
const api=backendEnabled?createApiClient(apiBase):null;
const FAMILY_USERNAME=String(globalThis.UBAYBIAN_FAMILY_USERNAME||'keluarga').trim();

function node(tag,attrs={},children=[]){
 const el=document.createElement(tag);
 for(const [key,value] of Object.entries(attrs)){
  if(key==='class')el.className=value;
  else if(key==='text')el.textContent=value;
  else if(key==='htmlFor')el.htmlFor=value;
  else el.setAttribute(key,value);
 }
 for(const child of children)el.append(child);
 return el;
}
const text=(tag,value,cls)=>node(tag,{text:value,...(cls?{class:cls}:{})});

function showLogin(message=''){
 document.body.dataset.profile='';
 document.body.classList.add('login-gateway');
 if(switchButton)switchButton.hidden=true;
 if(profileNav)profileNav.hidden=true;
 main.replaceChildren();

 const scene=node('div',{class:'login-scene'});
 const decor=node('div',{class:'login-decor','aria-hidden':'true'});
 [['d1','📚'],['d2','✏️'],['d3','🔭'],['d4','📐'],['d5','🧪'],['d6','📝']].forEach(([cls,symbol])=>decor.append(text('span',symbol,cls)));

 const card=node('section',{class:'login-card','aria-labelledby':'login-title'});
 card.append(text('span','🛡️','login-icon'),text('p','UBAYBIAN FAMILY','eyebrow'),node('h1',{id:'login-title',text:'Masuk ke ruang belajar'}));
 const form=node('form',{class:'login-form'});
 const passwordLabel=node('label',{htmlFor:'family-password',text:'Password keluarga',class:'field-label'});
 const password=node('input',{id:'family-password',name:'password',type:'password',autocomplete:'current-password',required:'true',maxlength:'200',class:'text-answer',placeholder:'masukkan password keluarga'});
 const passwordWrap=node('span',{class:'login-input-wrap'},[text('span','🔒','login-input-icon'),password]);
 const status=text('p',message,'login-status');
 const submit=node('button',{type:'submit',class:'primary',text:'Masuk'});
 form.append(passwordLabel,passwordWrap,submit,status);card.append(form);

 const welcomeBot=text('span','🤖','login-welcome-bot');welcomeBot.setAttribute('aria-hidden','true');
 scene.append(decor,card,welcomeBot);main.append(scene);
 form.addEventListener('submit',async event=>{
  event.preventDefault();submit.disabled=true;submit.textContent='Memeriksa…';status.textContent='';
  try{await api.login({username:FAMILY_USERNAME,password:password.value});location.reload();}
  catch(error){submit.disabled=false;submit.textContent='Masuk';status.textContent=error instanceof ApiError?error.message:'Login belum berhasil. Coba lagi.';}
 });
 password.focus();
}

function installLogout(family){
 document.body.classList.remove('login-gateway');
 const topbar=document.querySelector('.topbar');
 const old=document.querySelector('#logout-family');if(old)old.remove();
 const logout=node('button',{id:'logout-family',class:'quiet family-logout',type:'button',text:'Keluar'});
 logout.title=`Keluar dari ${family?.displayName||'akun keluarga'}`;
 logout.addEventListener('click',async()=>{logout.disabled=true;try{await api.logout();}catch{clearSessionToken();}location.hash='';location.reload();});
 topbar.append(logout);
}

document.addEventListener('click',(event)=>{
 const trigger=event.target.closest('#nav-home,.brand,.result-actions .secondary');
 if(!trigger||!document.querySelector('.result-panel'))return;
 const profileId=document.body.dataset.profile;
 if(!profileId)return;
 queueMicrotask(()=>{if(document.querySelector('.result-panel'))location.hash=`/${profileId}/home/`;});
});

async function start(){
 if(!backendEnabled){await import('./app-v040.js?v=0.5.52');return;}
 if(!getSessionToken()){showLogin();return;}
 try{const account=await api.me();installLogout(account.family);await import('./app-v040.js?v=0.5.52');}
 catch(error){clearSessionToken();showLogin(error instanceof ApiError&&error.status===401?'Sesi sudah berakhir. Silakan masuk lagi.':'Tidak dapat memverifikasi sesi keluarga.');}
}

start();
