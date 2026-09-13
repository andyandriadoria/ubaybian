// UbayBian v0.5.45 — Parent Access PIN Foundation (stability hotfix)
import { apiBase, backendEnabled } from './config.js';

const FAMILY_SESSION_KEY = 'ubaybian:family-session:v1';
const PARENT_SESSION_KEY = 'ubaybian:parent-access:v1';
const PARENT_EVENT = 'ubaybian:parent-access-change';
let pinConfigured = null;
let statusPromise = null;

function familyToken(){
  try{return localStorage.getItem(FAMILY_SESSION_KEY)||'';}catch{return '';}
}

function readParentSession(){
  try{
    const raw=sessionStorage.getItem(PARENT_SESSION_KEY);
    if(!raw)return null;
    const value=JSON.parse(raw);
    if(!value?.token||Number(value?.expiresAt||0)<=Date.now()){
      sessionStorage.removeItem(PARENT_SESSION_KEY);
      return null;
    }
    return {token:String(value.token),expiresAt:Number(value.expiresAt)};
  }catch{return null;}
}

function saveParentSession(data){
  try{
    sessionStorage.setItem(PARENT_SESSION_KEY,JSON.stringify({
      token:String(data.parentToken||''),
      expiresAt:Number(data.expiresAt||0),
    }));
  }catch{}
  window.dispatchEvent(new Event(PARENT_EVENT));
}

function clearParentSession(){
  try{sessionStorage.removeItem(PARENT_SESSION_KEY);}catch{}
  window.dispatchEvent(new Event(PARENT_EVENT));
}

function nativeFetch(){
  return window.__ubaybianParentNativeFetch||window.fetch.bind(window);
}

async function parentApi(path,options={}){
  if(!backendEnabled)throw new Error('Backend belum aktif.');
  const headers=new Headers(options.headers||{});
  headers.set('Accept','application/json');
  headers.set('Content-Type','application/json');
  const token=familyToken();
  if(token)headers.set('Authorization',`Bearer ${token}`);

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  let response;
  try{
    response=await nativeFetch()(`${apiBase}${path}`,{...options,headers,signal:controller.signal});
  }catch(error){
    if(error?.name==='AbortError')throw new Error('Parent Access terlalu lama merespons. Coba lagi.');
    throw error;
  }finally{
    clearTimeout(timer);
  }

  let data=null;
  try{data=await response.json();}catch{}
  if(!response.ok){
    const error=new Error(data?.message||'Parent Access belum tersedia.');
    error.code=data?.code||'';
    error.status=response.status;
    throw error;
  }
  return data;
}

function installResolveGuard(){
  if(window.__ubaybianParentFetchPatched)return;
  const original=window.fetch.bind(window);
  window.__ubaybianParentNativeFetch=original;
  window.__ubaybianParentFetchPatched=true;

  window.fetch=async(input,init={})=>{
    const rawUrl=typeof input==='string'?input:input?.url||'';
    let pathname='';
    try{pathname=new URL(rawUrl,location.href).pathname;}catch{}
    const needsParent=/\/v1\/rewards\/[^/]+\/requests\/[^/]+\/resolve$/.test(pathname);
    const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined));
    const parent=needsParent?readParentSession():null;
    if(parent?.token)headers.set('X-Parent-Token',parent.token);

    const response=await original(input,{...init,headers});
    if(needsParent&&response.status===403){
      try{
        const data=await response.clone().json();
        if(['PARENT_ACCESS_REQUIRED','PARENT_ACCESS_EXPIRED'].includes(data?.code))clearParentSession();
      }catch{}
    }
    return response;
  };
}

async function ensureParentStatus(force=false){
  if(force)statusPromise=null;
  if(statusPromise)return statusPromise;
  statusPromise=parentApi('/v1/parent/status')
    .then(data=>{
      pinConfigured=Boolean(data.pinConfigured);
      return data;
    })
    .catch(error=>{
      pinConfigured='error';
      throw error;
    });
  return statusPromise;
}

function create(tag,cls,text){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;
  return node;
}

function setText(node,value){
  if(!node)return;
  const next=String(value??'');
  if(node.childNodes.length===1&&node.firstChild?.nodeType===Node.TEXT_NODE){
    if(node.firstChild.data!==next)node.firstChild.data=next;
  }else if(node.textContent!==next){
    node.textContent=next;
  }
}

function closeDialog(overlay){
  if(!overlay)return;
  overlay.__cleanup?.();
  overlay.remove();
}

function openParentDialog(mode,onDone){
  document.querySelector('.parent-pin-dialog-overlay')?.remove();
  const overlay=create('div','parent-pin-dialog-overlay');
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  const dialog=create('section','parent-pin-dialog');
  const icon=create('div','parent-pin-dialog-icon',mode==='unlock'?'🔐':'🛡️');
  const title=create('h3','',mode==='unlock'?'Buka Parent Access':(pinConfigured?'Ganti Parent PIN':'Buat Parent PIN'));
  const note=create('p','parent-pin-dialog-note',mode==='unlock'
    ?'Masukkan PIN orang tua. Akses persetujuan akan terbuka selama 10 menit.'
    :'Untuk keamanan, konfirmasi dengan password keluarga lalu buat PIN 4–6 angka.');
  const form=create('form','parent-pin-form');
  const feedback=create('p','parent-pin-feedback','');

  if(mode==='unlock'){
    const pin=document.createElement('input');
    pin.type='password';pin.inputMode='numeric';pin.autocomplete='off';pin.maxLength=6;
    pin.placeholder='Parent PIN';pin.setAttribute('aria-label','Parent PIN');
    form.append(pin);
    setTimeout(()=>pin.focus(),0);
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const value=pin.value.trim();
      if(!/^\d{4,6}$/.test(value)){setText(feedback,'PIN harus 4–6 angka.');return;}
      const submit=form.querySelector('button[type="submit"]');
      submit.disabled=true;setText(feedback,'Membuka Parent Access…');
      try{
        const result=await parentApi('/v1/parent/unlock',{method:'POST',body:JSON.stringify({pin:value})});
        saveParentSession(result);closeDialog(overlay);onDone?.();
      }catch(error){setText(feedback,error.message);submit.disabled=false;pin.select();}
    });
  }else{
    const password=document.createElement('input');
    password.type='password';password.autocomplete='current-password';password.placeholder='Password keluarga';password.setAttribute('aria-label','Password keluarga');
    const pin=document.createElement('input');
    pin.type='password';pin.inputMode='numeric';pin.autocomplete='new-password';pin.maxLength=6;pin.placeholder='PIN baru (4–6 angka)';pin.setAttribute('aria-label','PIN baru');
    const confirm=document.createElement('input');
    confirm.type='password';confirm.inputMode='numeric';confirm.autocomplete='new-password';confirm.maxLength=6;confirm.placeholder='Ulangi PIN';confirm.setAttribute('aria-label','Ulangi PIN');
    form.append(password,pin,confirm);
    setTimeout(()=>password.focus(),0);
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(!/^\d{4,6}$/.test(pin.value.trim())){setText(feedback,'PIN harus 4–6 angka.');return;}
      if(pin.value!==confirm.value){setText(feedback,'Ulangi PIN harus sama.');return;}
      const submit=form.querySelector('button[type="submit"]');
      submit.disabled=true;setText(feedback,'Menyimpan Parent PIN…');
      try{
        await parentApi('/v1/parent/pin',{method:'POST',body:JSON.stringify({familyPassword:password.value,pin:pin.value.trim()})});
        clearParentSession();
        pinConfigured=true;
        statusPromise=Promise.resolve({pinConfigured:true,unlockTtlSeconds:600});
        closeDialog(overlay);onDone?.();
      }catch(error){setText(feedback,error.message);submit.disabled=false;}
    });
  }

  const actions=create('div','parent-pin-dialog-actions');
  const cancel=create('button','parent-pin-cancel','Batal');cancel.type='button';cancel.addEventListener('click',()=>closeDialog(overlay));
  const submit=create('button','parent-pin-submit',mode==='unlock'?'Buka Access':'Simpan PIN');submit.type='submit';
  actions.append(cancel,submit);form.append(feedback,actions);dialog.append(icon,title,note,form);overlay.append(dialog);
  overlay.addEventListener('click',event=>{if(event.target===overlay)closeDialog(overlay);});
  const onKey=event=>{if(event.key==='Escape')closeDialog(overlay);};
  document.addEventListener('keydown',onKey);
  overlay.__cleanup=()=>document.removeEventListener('keydown',onKey);
  document.body.append(overlay);
}

async function lockNow(){
  const session=readParentSession();
  if(session?.token){
    try{
      await parentApi('/v1/parent/lock',{method:'POST',headers:{'X-Parent-Token':session.token},body:JSON.stringify({})});
    }catch{}
  }
  clearParentSession();
}

function formatRemaining(expiresAt){
  const seconds=Math.max(0,Math.ceil((expiresAt-Date.now())/1000));
  return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
}

function ensureGate(panel){
  let gate=panel.querySelector(':scope > .parent-access-gate');
  if(gate)return gate;
  gate=create('div','parent-access-gate');
  const copy=create('div','parent-access-gate-copy');
  copy.append(create('strong','parent-access-state',''),create('span','parent-access-detail',''));
  gate.append(copy,create('div','parent-access-gate-actions'));
  const history=panel.querySelector('.ub-request-list');
  if(history)history.before(gate);else panel.append(gate);
  return gate;
}

function renderActions(gate,mode){
  const actions=gate.querySelector('.parent-access-gate-actions');
  if(!actions||gate.dataset.actionMode===mode)return;
  gate.dataset.actionMode=mode;
  actions.replaceChildren();

  if(mode==='error'){
    const retry=create('button','parent-access-small','Coba lagi');retry.type='button';
    retry.addEventListener('click',async()=>{
      pinConfigured=null;statusPromise=null;renderAll();
      try{await ensureParentStatus(true);}catch{}
      renderAll();
    });
    actions.append(retry);
  }else if(mode==='setup'){
    const setup=create('button','parent-access-open','Buat Parent PIN');setup.type='button';
    setup.addEventListener('click',()=>openParentDialog('setup',renderAll));actions.append(setup);
  }else if(mode==='unlocked'){
    const change=create('button','parent-access-small','Ganti PIN');change.type='button';
    change.addEventListener('click',()=>openParentDialog('setup',renderAll));
    const lock=create('button','parent-access-lock','Kunci');lock.type='button';lock.addEventListener('click',lockNow);
    actions.append(change,lock);
  }else if(mode==='locked'){
    const open=create('button','parent-access-open','🔐 Buka dengan PIN');open.type='button';
    open.addEventListener('click',()=>openParentDialog('unlock',renderAll));actions.append(open);
  }
}

function renderGate(panel){
  if(!panel?.isConnected)return;
  const gate=ensureGate(panel);
  const state=gate.querySelector('.parent-access-state');
  const detail=gate.querySelector('.parent-access-detail');
  const parent=readParentSession();
  const unlocked=Boolean(parent);
  panel.classList.toggle('parent-access-unlocked',unlocked);
  panel.classList.toggle('parent-access-locked',!unlocked);

  let mode='loading';
  let stateText='Memeriksa Parent Access…';
  let detailText='Sebentar ya.';
  if(!backendEnabled){
    mode='none';stateText='Parent Access belum aktif';detailText='Backend UbayBian belum terhubung.';
  }else if(pinConfigured==='error'){
    mode='error';stateText='Parent Access belum siap';detailText='Worker backend belum merespons dengan benar. Coba lagi.';
  }else if(pinConfigured===false){
    mode='setup';stateText='Parent PIN belum dibuat';detailText='Buat PIN sekali dengan password keluarga.';
  }else if(pinConfigured===true&&unlocked){
    mode='unlocked';stateText='Parent Access terbuka';detailText=`Terkunci otomatis dalam ${formatRemaining(parent.expiresAt)}.`;
  }else if(pinConfigured===true){
    mode='locked';stateText='Parent Access terkunci';detailText='Masukkan PIN untuk Setujui atau Tolak reward.';
  }

  setText(state,stateText);setText(detail,detailText);renderActions(gate,mode);
}

function decoratePanel(panel){
  if(!panel.closest('.reward-chamber'))return;
  panel.classList.add('parent-access-v0545');
  renderGate(panel);
}

function renderAll(){
  document.querySelectorAll('.reward-parent-panel').forEach(decoratePanel);
}

function scan(){
  renderAll();
  if(backendEnabled&&pinConfigured===null&&!statusPromise){
    ensureParentStatus().catch(()=>{}).finally(renderAll);
  }
}

installResolveGuard();
scan();
window.addEventListener(PARENT_EVENT,renderAll);

// Observe only when a Parent Access panel itself is added. This avoids the
// previous self-triggering MutationObserver loop that could freeze Reward Shop.
const observer=new MutationObserver(records=>{
  for(const record of records){
    for(const node of record.addedNodes){
      if(node.nodeType!==1)continue;
      if(node.matches?.('.reward-parent-panel')||node.querySelector?.('.reward-parent-panel')){
        scan();
        return;
      }
    }
  }
});
observer.observe(document.documentElement,{childList:true,subtree:true});
setInterval(renderAll,1000);
