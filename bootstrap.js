import {apiBase,backendEnabled} from './config.js';
import {ApiError,clearSessionToken,createApiClient,getSessionToken} from './api-v037.js';

const main=document.querySelector('#main');
const switchButton=document.querySelector('#switch-profile');
const api=backendEnabled?createApiClient(apiBase):null;

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
 switchButton.hidden=true;
 main.replaceChildren();
 const card=node('section',{class:'login-card','aria-labelledby':'login-title'});
 card.append(text('span','🔐','login-icon'),text('p','UBAYBIAN FAMILY','eyebrow'),node('h1',{id:'login-title',text:'Masuk ke ruang belajar'}),text('p','Login keluarga menjaga bank soal dan progres Ubay & Bian tetap privat.','intro'));
 const form=node('form',{class:'login-form'});
 const usernameLabel=node('label',{htmlFor:'family-username',text:'Username keluarga',class:'field-label'});
 const username=node('input',{id:'family-username',name:'username',autocomplete:'username',required:'true',maxlength:'40',class:'text-answer',placeholder:'username keluarga'});
 const passwordLabel=node('label',{htmlFor:'family-password',text:'Password',class:'field-label'});
 const password=node('input',{id:'family-password',name:'password',type:'password',autocomplete:'current-password',required:'true',maxlength:'200',class:'text-answer',placeholder:'password keluarga'});
 const status=text('p',message,'login-status');
 const submit=node('button',{type:'submit',class:'primary',text:'Masuk'});
 form.append(usernameLabel,username,passwordLabel,password,submit,status);card.append(form);main.append(card);
 form.addEventListener('submit',async event=>{
  event.preventDefault();submit.disabled=true;submit.textContent='Memeriksa…';status.textContent='';
  try{await api.login({username:username.value,password:password.value});location.reload();}
  catch(error){submit.disabled=false;submit.textContent='Masuk';status.textContent=error instanceof ApiError?error.message:'Login belum berhasil. Coba lagi.';}
 });
 username.focus();
}

function installLogout(family){
 const topbar=document.querySelector('.topbar');
 const old=document.querySelector('#logout-family');if(old)old.remove();
 const logout=node('button',{id:'logout-family',class:'quiet family-logout',type:'button',text:'Keluar'});
 logout.title=`Keluar dari ${family?.displayName||'akun keluarga'}`;
 logout.addEventListener('click',async()=>{logout.disabled=true;try{await api.logout();}catch{clearSessionToken();}location.hash='';location.reload();});
 topbar.append(logout);
}

async function start(){
 if(!backendEnabled){await import('./app.js?v=0.3.7');return;}
 if(!getSessionToken()){showLogin();return;}
 try{const account=await api.me();installLogout(account.family);await import('./app.js?v=0.3.7');}
 catch(error){clearSessionToken();showLogin(error instanceof ApiError&&error.status===401?'Sesi sudah berakhir. Silakan masuk lagi.':'Tidak dapat memverifikasi sesi keluarga.');}
}

start();
