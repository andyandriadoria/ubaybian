import { apiBase, backendEnabled } from './config.js';
import { findProfile } from './profiles.js';
import {
  LAB_MAX_SCORE,
  createLabShift,
  evaluateLabAction,
  finaliseShiftScore,
  labJobScore,
  labRankForTotalScore,
  rankProgress,
} from './lab-rescue-engine.js';

const SESSION_KEY = 'ubaybian:family-session:v1';
const LOCAL_PREFIX = 'ubaybian:lab-rescue:v3:';
const GAME_ID = 'lab-rescue';
let activeLab = null;
let statusCache = new Map();

function token(){try{return localStorage.getItem(SESSION_KEY)||'';}catch{return '';}}
function el(tag,cls='',text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function button(label,cls='',action){const node=el('button',cls,label);node.type='button';if(action)node.addEventListener('click',action);return node;}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function formatTime(seconds){const total=Math.max(0,Math.ceil(Number(seconds)||0));return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;}
function profileFromHash(){return findProfile(location.hash.replace(/^#\/?/,'').split('/')[0]);}

async function call(path,options={},timeoutMs=4500){
  if(!backendEnabled)throw new Error('Backend belum aktif.');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  const headers=new Headers(options.headers||{});
  headers.set('Accept','application/json');
  if(options.body)headers.set('Content-Type','application/json');
  const auth=token();if(auth)headers.set('Authorization',`Bearer ${auth}`);
  try{
    const response=await fetch(`${apiBase}${path}`,{...options,headers,signal:controller.signal});
    let data=null;try{data=await response.json();}catch{}
    if(!response.ok)throw new Error(data?.message||'Lab Rescue belum tersedia.');
    return data;
  }finally{clearTimeout(timer);}
}

function loadLocal(profileId){
  try{
    const raw=localStorage.getItem(`${LOCAL_PREFIX}${profileId}`);
    const value=raw?JSON.parse(raw):{};
    return{
      recentKeys:Array.isArray(value.recentKeys)?value.recentKeys.slice(0,18):[],
      best:Math.max(0,Number(value.best)||0),
      totalScore:Math.max(0,Number(value.totalScore)||0),
      plays:Math.max(0,Number(value.plays)||0),
    };
  }catch{return{recentKeys:[],best:0,totalScore:0,plays:0};}
}
function saveLocal(profileId,value){try{localStorage.setItem(`${LOCAL_PREFIX}${profileId}`,JSON.stringify(value));}catch{}}
function gameStateFromStatus(status,local){
  const game=status?.games?.[GAME_ID]||{};
  return{
    best:Math.max(Number(game.best||0),Number(local.best||0)),
    totalScore:Math.max(Number(game.totalScore||0),Number(local.totalScore||0)),
    plays:Math.max(Number(game.plays||0),Number(local.plays||0)),
    dailyXp:Number(status?.dailyXp||0),
    dailyXpCap:Number(status?.dailyXpCap||50),
  };
}
async function loadGameStatus(profile,local,force=false){
  const cached=statusCache.get(profile.id);
  if(!force&&cached&&Date.now()-cached.at<15000)return cached.value;
  const value=await call(`/v1/games/${encodeURIComponent(profile.id)}/status`);
  statusCache.set(profile.id,{value,at:Date.now()});
  return value;
}
function rankLabel(total){const rank=labRankForTotalScore(total);return `${rank.icon} ${rank.label}`;}
function tileByName(name){return[...document.querySelectorAll('.side-tile')].find(tile=>tile.querySelector('.side-tile-text')?.textContent.trim()===name);}

function ensureLabTile(){
  const profile=profileFromHash();
  const menu=document.querySelector('.side-menu');
  if(!profile||!menu)return;
  let tile=menu.querySelector('.lab-rescue-tile');
  if(!tile){
    tile=el('div','side-tile clickable-tile lab-rescue-tile');tile.setAttribute('role','button');tile.tabIndex=0;
    const icon=el('span','side-tile-icon lab-rescue-tile-icon','🧪');
    const copy=el('div','lab-rescue-tile-copy');
    copy.append(el('div','side-tile-text','Lab Rescue'),el('div','side-tile-sub','Science shift · tap, fix, rescue'));
    tile.append(icon,copy,el('span','lab-rescue-tile-accent','⚗️'));
    const reward=tileByName('Reward Shop');if(reward?.parentNode===menu)menu.insertBefore(tile,reward);else menu.append(tile);
    const open=(event)=>{event?.preventDefault?.();event?.stopPropagation?.();openLabRescue(profile);};
    tile.addEventListener('click',open);tile.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' ')open(event);});
  }
  syncTile(profile,tile);
}

async function syncTile(profile,tile){
  if(!tile||tile.dataset.labSync==='loading')return;
  tile.dataset.labSync='loading';const local=loadLocal(profile.id);
  try{
    const status=await loadGameStatus(profile,local);
    const state=gameStateFromStatus(status,local);
    tile.querySelector('.side-tile-sub').textContent=`Best ${state.best} · ${rankLabel(state.totalScore)}`;
  }catch{
    tile.querySelector('.side-tile-sub').textContent=local.plays?`Best ${local.best} · ${rankLabel(local.totalScore)}`:'Science shift · tap, fix, rescue';
  }finally{tile.dataset.labSync='done';}
}

async function openLabRescue(profile){
  if(activeLab)activeLab.close(true);
  const previousOverflow=document.body.style.overflow;
  let local=loadLocal(profile.id);
  let bestScore=local.best,totalScore=local.totalScore,dailyXp=0,dailyCap=50;
  let pendingShift=createLabShift(profile.id,{recentKeys:local.recentKeys});
  let phase='ready',scoreValue=0,combo=0,bestCombo=0,completed=0,missed=0,endAt=0,tickTimer=0,finishing=false;
  let remoteSession=null,remoteStartPromise=null,selectedStationId='',jobDeck=[],usedKeys=[];
  let stationStates=new Map();

  const overlay=el('div','lab-rescue-overlay');
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Lab Rescue Science game');
  const shell=el('section','lab-rescue-shell');shell.dataset.profile=profile.id;
  const top=el('header','lab-rescue-top');
  const brand=el('div','lab-rescue-brand');brand.append(el('span','lab-rescue-kicker','SCIENCE ARCADE'),el('strong','lab-rescue-logo','LAB RESCUE'),el('span','lab-rescue-subtitle','TAP · FIX · RESCUE'));
  const closeButton=button('×','lab-rescue-close',()=>close());closeButton.setAttribute('aria-label','Tutup Lab Rescue');
  top.append(brand,closeButton);
  const stage=el('div','lab-rescue-stage');
  const ready=buildReadyView(),play=buildPlayView(),result=buildResultView();
  stage.append(ready.root,play.root,result.root);shell.append(top,stage);overlay.append(shell);document.body.append(overlay);
  document.body.style.overflow='hidden';activeLab={close};
  overlay.addEventListener('click',(event)=>{if(event.target===overlay)close();});
  const onKey=(event)=>{if(event.key==='Escape')close();};document.addEventListener('keydown',onKey);

  renderReady();hydrateStatus();

  function buildReadyView(){
    const root=el('section','lab-rescue-view lab-rescue-ready');
    const incident=el('div','lab-ready-incident');
    const icon=el('div','lab-incident-icon');
    const copy=el('div','lab-incident-copy');
    const title=el('h3'),brief=el('p'),callout=el('div','lab-bot-callout');
    copy.append(el('span','lab-story-eyebrow','TODAY’S LAB SHIFT'),title,brief,callout);incident.append(icon,copy);
    const preview=el('div','lab-station-preview');
    const stats=el('div','lab-ready-stats');
    const best=statBox('🏆 BEST','0'),rank=statBox('🥼 RANK','Junior Researcher'),xp=statBox('⭐ GAME XP','0/50'),duration=statBox('⏱️ SHIFT','1:10');
    stats.append(best.box,rank.box,xp.box,duration.box);
    const rankBox=el('div','lab-ready-rank');const rankLine=el('div','lab-ready-rank-line');const rankName=el('strong'),rankHint=el('span');rankLine.append(rankName,rankHint);
    const track=el('div','lab-rank-track');const fill=el('span','lab-rank-fill');track.append(fill);rankBox.append(rankLine,track);
    const how=el('div','lab-how-to');how.innerHTML='<strong>How to play</strong><span>1. Tap the flashing station</span><span>2. Fix it with the objects or controls</span><span>3. Keep going until time is up</span>';
    const start=button('START SHIFT →','lab-rescue-primary lab-start-shift',startShift);
    const note=el('p','lab-rescue-note','No queues. No collecting. Just tap the problem and fix it.');
    root.append(incident,preview,stats,rankBox,how,start,note);
    return{root,icon,title,brief,callout,preview,best:best.value,rank:rank.value,xp:xp.value,duration:duration.value,rankName,rankHint,fill,start,note};
  }

  function buildPlayView(){
    const root=el('section','lab-rescue-view lab-rescue-play');root.hidden=true;
    const hud=el('div','lab-shift-hud');
    const timer=hudCard('TIME','1:10','cyan'),score=hudCard('SCORE','0','orange'),comboCard=hudCard('COMBO','x0','pink'),progress=hudCard('RESCUED','0','green');
    hud.append(timer.card,score.card,comboCard.card,progress.card);
    const bot=el('div','lab-shift-bot');bot.append(el('div','lab-bot-avatar','🤖'),el('p','','Tap the flashing station to start.'));
    const body=el('div','lab-shift-body');
    const floor=el('div','lab-floor');
    const floorLabel=el('div','lab-floor-label','3 LAB STATIONS');
    const stations=el('div','lab-station-grid');floor.append(floorLabel,stations);
    const workbench=el('aside','lab-workbench');
    body.append(floor,workbench);root.append(hud,bot,body);
    return{root,timer:timer.value,score:score.value,combo:comboCard.value,progress:progress.value,botText:bot.lastElementChild,stations,workbench};
  }

  function buildResultView(){
    const root=el('section','lab-rescue-view lab-rescue-result');root.hidden=true;
    const badge=el('div','lab-result-badge','SHIFT COMPLETE');
    const title=el('h3','','Lab rescued!');
    const score=el('div','lab-result-score','0');
    const grid=el('div','lab-result-grid');
    const jobs=resultMetric('🧪 Stations fixed','0'),comboMetric=resultMetric('🔥 Best combo','x0'),best=resultMetric('🏆 Best run','0'),xp=resultMetric('⭐ XP earned','…');
    grid.append(jobs.card,comboMetric.card,best.card,xp.card);
    const rank=el('div','lab-result-rank'),note=el('p','lab-rescue-note');
    const actions=el('div','lab-result-actions');const replay=button('SHIFT LAGI','lab-rescue-primary',prepareReplay),done=button('Selesai','lab-rescue-ghost',()=>close());actions.append(replay,done);
    root.append(badge,title,score,el('p','lab-result-caption','Lab Score'),grid,rank,actions,note);
    return{root,title,score,jobs:jobs.value,combo:comboMetric.value,best:best.value,xp:xp.value,rank,note,replay,done};
  }

  function statBox(label,value){const box=el('div','lab-ready-stat');box.append(el('span','',label));const strong=el('strong','',value);box.append(strong);return{box,value:strong};}
  function hudCard(label,value,tone){const card=el('div',`lab-hud-card ${tone}`);card.append(el('span','',label));const strong=el('strong','',value);card.append(strong);return{card,value:strong};}
  function resultMetric(label,value){const card=el('div','lab-result-card');card.append(el('span','',label));const strong=el('strong','',value);card.append(strong);return{card,value:strong};}

  function renderReady(){
    ready.icon.textContent=pendingShift.incident.emoji;ready.title.textContent=pendingShift.incident.title;ready.brief.textContent=pendingShift.incident.brief;ready.callout.textContent=pendingShift.incident.callout;
    ready.preview.replaceChildren();
    for(const station of pendingShift.stations){const card=el('div',`lab-preview-station ${station.accent}`);card.append(el('span','lab-preview-icon',station.icon),el('strong','',station.name),el('small','',station.short));ready.preview.append(card);}
    ready.best.textContent=String(bestScore);ready.rank.textContent=labRankForTotalScore(totalScore).label;ready.xp.textContent=`${dailyXp}/${dailyCap}`;ready.duration.textContent=formatTime(pendingShift.config.shiftSeconds);
    const p=rankProgress(totalScore);ready.rankName.textContent=`${p.rank.icon} ${p.rank.label}`;ready.rankHint.textContent=p.rank.nextAt?`${p.remaining} energy to next rank`:'Max rank';ready.fill.style.width=`${p.progress}%`;
  }

  async function hydrateStatus(){
    try{
      const status=await loadGameStatus(profile,local,true);const state=gameStateFromStatus(status,local);
      bestScore=state.best;totalScore=state.totalScore;dailyXp=state.dailyXp;dailyCap=state.dailyXpCap;renderReady();
      ready.note.textContent=dailyXp>=dailyCap?'XP game hari ini sudah penuh. Kamu tetap bisa bermain untuk Best Score.':'Ready. Tap START SHIFT lalu ikuti station yang berkedip.';
    }catch{ready.note.textContent='Offline mode siap. Gameplay tetap jalan; XP tersimpan saat backend tersedia.';}
  }

  function startShift(){
    if(phase!=='ready')return;
    phase='play';ready.root.hidden=true;result.root.hidden=true;play.root.hidden=false;shell.classList.add('is-shift-live');
    const shift=pendingShift;jobDeck=[...shift.jobs];usedKeys=[];selectedStationId='';scoreValue=0;combo=0;bestCombo=0;completed=0;missed=0;
    stationStates=new Map(shift.stations.map(station=>[station.id,{meta:station,job:null}]));
    endAt=Date.now()+shift.config.shiftSeconds*1000;
    remoteSession=null;remoteStartPromise=beginRemoteSession();
    play.botText.textContent=shift.incident.callout;
    fillActiveJobs();updateHud();renderStations();renderWorkbench();
    tickTimer=window.setInterval(tick,250);
  }

  async function beginRemoteSession(){
    try{const data=await call(`/v1/games/${encodeURIComponent(profile.id)}/start`,{method:'POST',body:JSON.stringify({gameId:GAME_ID})});remoteSession=data?.sessionId?data:null;return remoteSession;}
    catch{return null;}
  }

  function activeLimit(){return completed>=pendingShift.config.unlockSecondAfter?2:1;}
  function activeJobs(){return[...stationStates.values()].filter(state=>state.job&&state.job.status==='waiting');}

  function nextJob(){
    const occupied=new Set(activeJobs().map(state=>state.meta.id));
    let index=jobDeck.findIndex(job=>!occupied.has(job.stationId));
    if(index<0){
      const refill=createLabShift(profile.id,{recentKeys:[...usedKeys,...local.recentKeys]});
      jobDeck=refill.jobs.filter(job=>!usedKeys.slice(-5).includes(job.key));
      index=jobDeck.findIndex(job=>!occupied.has(job.stationId));
    }
    if(index<0)return null;
    return jobDeck.splice(index,1)[0];
  }

  function fillActiveJobs(){
    while(activeJobs().length<activeLimit()){
      const job=nextJob();if(!job)break;
      const state=stationStates.get(job.stationId);if(!state||state.job)continue;
      state.job={...job,status:'waiting',assignedAt:Date.now(),attempts:0,placements:{},sequence:[]};
      if(!selectedStationId||activeLimit()===1)selectedStationId=state.meta.id;
      play.botText.textContent=`🤖 ${state.meta.name}: ${job.alert}`;
    }
  }

  function tick(){
    if(phase!=='play')return;
    const now=Date.now();
    for(const state of stationStates.values()){
      const job=state.job;if(!job)continue;
      if(now-job.assignedAt>pendingShift.config.patienceMs){
        usedKeys.push(job.key);missed+=1;combo=0;state.job=null;
        if(selectedStationId===state.meta.id)selectedStationId='';
        play.botText.textContent=`🤖 ${state.meta.name} reset. No worries—try the next problem.`;
      }
    }
    fillActiveJobs();updateHud();renderStations();
    if(selectedStationId&&!stationStates.get(selectedStationId)?.job){selectedStationId=activeJobs()[0]?.meta.id||'';renderWorkbench();}
    if(now>=endAt)finishShift();
  }

  function updateHud(){
    play.timer.textContent=formatTime((endAt-Date.now())/1000);play.score.textContent=String(Math.min(LAB_MAX_SCORE,Math.floor(scoreValue)));play.combo.textContent=`x${combo}`;play.progress.textContent=String(completed);
  }

  function renderStations(){
    play.stations.replaceChildren();const now=Date.now();
    for(const state of stationStates.values()){
      const job=state.job;const station=state.meta;
      const card=button('',`lab-station-card ${station.accent}${selectedStationId===station.id?' selected':''}`,()=>selectStation(station.id));
      const head=el('div','lab-station-card-top');head.append(el('span','lab-station-icon',station.icon),el('strong','',station.name));
      const status=el('span','lab-station-status',job?'NEEDS YOU':'READY');head.append(status);
      const copy=el('p','lab-station-job',job?job.title:'Waiting for the next science problem…');
      const bar=el('div','lab-station-bar');const fill=el('span');
      if(job){const age=now-job.assignedAt;const pct=clamp(age/pendingShift.config.patienceMs*100,0,100);fill.style.width=`${pct}%`;card.classList.add(pct>70?'critical':'alert');}
      else fill.style.width='0%';bar.append(fill);card.append(head,copy,bar);play.stations.append(card);
    }
  }

  function selectStation(id){
    const state=stationStates.get(id);if(!state)return;
    selectedStationId=id;renderStations();renderWorkbench();
    if(!state.job)play.botText.textContent=`🤖 ${state.meta.name} is ready. Watch for a flashing alert.`;
  }

  function renderWorkbench(message=''){
    const target=play.workbench;target.replaceChildren();const state=stationStates.get(selectedStationId);
    if(!state||!state.job){
      const idle=el('div','lab-workbench-empty');idle.append(el('div','lab-workbench-hero','👉'),el('h3','','Tap the flashing station'),el('p','','Only the station that says NEEDS YOU has a problem to fix.'));
      target.append(idle);return;
    }
    const job=state.job;const head=el('div','lab-workbench-head');head.append(el('span','lab-workbench-icon',state.meta.icon));const copy=el('div');copy.append(el('small','',state.meta.name.toUpperCase()),el('h3','',job.title));head.append(copy);target.append(head,el('p','lab-workbench-alert',job.alert));
    const action=el('div','lab-action-area');target.append(action);renderMechanic(action,state);
    if(message)target.append(el('div','lab-action-hint',message));
  }

  function renderMechanic(target,state){
    const job=state.job,mechanic=job.mechanic;
    if(mechanic.kind==='slider'){
      const panel=el('div','lab-control-panel');const value=el('strong','lab-control-value',`${mechanic.start}${mechanic.unit}`);const row=el('div','lab-control-label');row.append(el('span','',mechanic.label),value);
      const input=document.createElement('input');input.type='range';input.min=mechanic.min;input.max=mechanic.max;input.step=1;input.value=mechanic.start;input.className='lab-range';input.addEventListener('input',()=>{value.textContent=`${input.value}${mechanic.unit}`;});
      panel.append(row,input,el('div','lab-target-zone',`TARGET ${mechanic.targetMin}–${mechanic.targetMax}${mechanic.unit}`),button('TEST SETTING','lab-action-button',()=>submitAction(state,{value:Number(input.value)})));target.append(panel);return;
    }
    if(mechanic.kind==='controls'){
      const values={};const panel=el('div','lab-control-panel');
      for(const field of mechanic.fields){values[field.id]=field.start;const value=el('strong','lab-control-value',`${field.start}${field.unit}`);const row=el('div','lab-control-label');row.append(el('span','',field.label),value);const input=document.createElement('input');input.type='range';input.min=field.min;input.max=field.max;input.step=1;input.value=field.start;input.className='lab-range';input.addEventListener('input',()=>{values[field.id]=Number(input.value);value.textContent=`${input.value}${field.unit}`;});panel.append(row,input,el('div','lab-target-zone',`TARGET ${field.targetMin}–${field.targetMax}${field.unit}`));}
      panel.append(button('CALIBRATE','lab-action-button',()=>submitAction(state,{values})));target.append(panel);return;
    }
    if(mechanic.kind==='tools'){
      target.append(el('div','lab-direct-instruction','Tap the object you want to use:'));
      const rack=el('div','lab-tool-rack');
      for(const tool of mechanic.tools){const toolButton=button('', 'lab-tool',()=>submitAction(state,{toolId:tool.id}));toolButton.append(el('span','lab-tool-icon',tool.icon),el('strong','',tool.label));rack.append(toolButton);}target.append(rack);return;
    }
    if(mechanic.kind==='sort'){
      const selected={id:''};const items=el('div','lab-sort-items'),bins=el('div','lab-sort-bins');target.append(el('div','lab-direct-instruction','Tap an item, then tap where it belongs:'),items,bins);
      const draw=()=>{
        items.replaceChildren();bins.replaceChildren();
        for(const item of mechanic.items){if(job.placements[item.id])continue;const b=button('',`lab-sort-token${selected.id===item.id?' selected':''}`,()=>{selected.id=item.id;draw();});b.append(el('span','',item.icon),el('strong','',item.label));items.append(b);}
        for(const bin of mechanic.bins){const b=button('','lab-sort-bin',()=>{if(!selected.id)return;const item=mechanic.items.find(entry=>entry.id===selected.id);if(!item)return;if(item.bin===bin.id){job.placements[item.id]=bin.id;selected.id='';if(mechanic.items.every(entry=>job.placements[entry.id]===entry.bin))submitAction(state,{placements:job.placements});else draw();}else{selected.id='';combo=0;play.botText.textContent=`🤖 ${job.hint}`;draw();}});const placed=mechanic.items.filter(item=>job.placements[item.id]===bin.id);b.append(el('span','lab-bin-icon',bin.icon),el('strong','',bin.label),el('small','',placed.map(item=>item.icon).join(' ')||'tap here'));bins.append(b);}
      };draw();return;
    }
    if(mechanic.kind==='connect'){
      target.append(el('div','lab-direct-instruction','Tap the circuit parts in order:'));
      const path=el('div','lab-connect-path','Start from the cell…'),board=el('div','lab-connect-board');target.append(path,board);
      const draw=()=>{board.replaceChildren();for(const node of mechanic.nodes){const used=job.sequence.includes(node.id);const b=button('',`lab-connect-node${used?' connected':''}`,()=>{const expected=mechanic.sequence[job.sequence.length];if(node.id!==expected){job.sequence=[];combo=0;play.botText.textContent=`🤖 ${job.hint}`;path.textContent='Path reset · start again';draw();return;}job.sequence.push(node.id);path.textContent=job.sequence.map(id=>mechanic.nodes.find(entry=>entry.id===id)?.icon||'•').join(' → ');if(job.sequence.length===mechanic.sequence.length)submitAction(state,{sequence:job.sequence});else draw();});b.append(el('span','',node.icon),el('strong','',node.label));board.append(b);}};draw();
    }
  }

  function submitAction(state,payload){
    const job=state?.job;if(!job||job.status!=='waiting')return;
    if(!evaluateLabAction(job,payload)){job.attempts+=1;combo=0;play.botText.textContent=`🤖 ${job.hint}`;renderWorkbench(job.hint);updateHud();return;}
    const gain=labJobScore({waitedMs:Date.now()-job.assignedAt,patienceMs:pendingShift.config.patienceMs,comboBefore:combo});
    scoreValue=Math.min(LAB_MAX_SCORE,scoreValue+gain);combo+=1;bestCombo=Math.max(bestCombo,combo);completed+=1;usedKeys.push(job.key);job.status='success';
    play.botText.textContent=`🤖 Great! +${gain} · ${job.success}`;renderStations();renderSuccess(state,job,gain);updateHud();
    window.setTimeout(()=>{
      if(phase!=='play'||state.job!==job)return;
      state.job=null;selectedStationId='';fillActiveJobs();selectedStationId=activeJobs()[0]?.meta.id||'';renderStations();renderWorkbench();
      if(completed===pendingShift.config.unlockSecondAfter)play.botText.textContent='🤖 Nice rhythm! Two stations can now call for help at the same time.';
    },850);
  }

  function renderSuccess(state,job,gain){
    const target=play.workbench;target.replaceChildren();const panel=el('div','lab-success-panel');panel.append(el('div','lab-success-icon','✨'),el('strong','',`+${gain} SCORE`),el('p','',job.success));target.append(panel);
  }

  async function finishShift(){
    if(phase!=='play'||finishing)return;finishing=true;phase='result';if(tickTimer)clearInterval(tickTimer);tickTimer=0;shell.classList.remove('is-shift-live');play.root.hidden=true;result.root.hidden=false;
    const finalScore=finaliseShiftScore(scoreValue,completed);result.score.textContent=String(finalScore);result.jobs.textContent=String(completed);result.combo.textContent=`x${bestCombo}`;result.best.textContent=String(Math.max(bestScore,finalScore));result.xp.textContent='…';result.title.textContent=completed>=6?'Excellent shift!':completed>=3?'Lab rescued!':'Shift complete';result.note.textContent='Saving shift result…';result.replay.disabled=true;result.done.disabled=true;
    const recentKeys=[...usedKeys,...local.recentKeys.filter(key=>!usedKeys.includes(key))].slice(0,18);let xpEarned=0,savedRemotely=false;
    try{const session=await remoteStartPromise;if(session?.sessionId){const data=await call(`/v1/games/${encodeURIComponent(profile.id)}/finish`,{method:'POST',body:JSON.stringify({sessionId:session.sessionId,score:finalScore})},5000);const state=gameStateFromStatus(data,local);bestScore=Math.max(state.best,finalScore);totalScore=Math.max(state.totalScore,totalScore+finalScore);dailyXp=state.dailyXp;dailyCap=state.dailyXpCap;xpEarned=Number(data.xpEarned||0);savedRemotely=true;}}catch{}
    if(!savedRemotely){bestScore=Math.max(bestScore,finalScore);totalScore+=finalScore;}
    local={recentKeys,best:Math.max(local.best,bestScore),totalScore:Math.max(local.totalScore,totalScore),plays:local.plays+1};saveLocal(profile.id,local);
    result.best.textContent=String(bestScore);result.xp.textContent=`+${xpEarned}`;result.rank.textContent=`${rankLabel(totalScore)} · Total Lab Energy ${totalScore}`;result.note.textContent=savedRemotely?`Shift tersimpan · Game XP hari ini ${dailyXp}/${dailyCap}`:'Shift tersimpan di perangkat. XP belum ditambahkan karena backend belum merespons.';
    statusCache.delete(profile.id);const tile=document.querySelector('.lab-rescue-tile');if(tile){tile.dataset.labSync='';syncTile(profile,tile);}if(savedRemotely)window.dispatchEvent(new Event('ubaybian:progress-changed'));
    finishing=false;result.replay.disabled=false;result.done.disabled=false;
  }

  function prepareReplay(){if(finishing)return;pendingShift=createLabShift(profile.id,{recentKeys:local.recentKeys});phase='ready';result.root.hidden=true;ready.root.hidden=false;renderReady();ready.note.textContent='New shift loaded. Ready?';}
  function close(force=false){if(!force&&phase==='play'&&!confirm('Lab shift masih berjalan. Keluar sekarang?'))return;if(tickTimer)clearInterval(tickTimer);phase='closed';document.removeEventListener('keydown',onKey);overlay.remove();document.body.style.overflow=previousOverflow;if(activeLab?.close===close)activeLab=null;ensureLabTile();}
}

function scan(){ensureLabTile();}
const observer=new MutationObserver(()=>requestAnimationFrame(scan));observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('hashchange',()=>setTimeout(scan,60));
window.addEventListener('ubaybian:progress-changed',()=>{statusCache.clear();setTimeout(scan,80);});
scan();

export { openLabRescue };
