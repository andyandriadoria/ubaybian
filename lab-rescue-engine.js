export const LAB_MAX_SCORE = 900;

const PROFILE_CONFIG = Object.freeze({
  bian: Object.freeze({ shiftSeconds: 70, patienceMs: 19000, unlockSecondAfter: 3 }),
  ubay: Object.freeze({ shiftSeconds: 80, patienceMs: 17500, unlockSecondAfter: 3 }),
});

const INCIDENTS = Object.freeze({
  bian: Object.freeze([
    { id:'storm', emoji:'⛈️', title:'Stormy Science Shift', brief:'A storm shook the lab. Help Scout fix the flashing stations before the shift ends.', callout:'🤖 Scout: “Follow the flashing light. Fix one station at a time!”' },
    { id:'samples', emoji:'📦', title:'Science Delivery Rush', brief:'New samples just arrived. Test them, sort them, and keep the lab moving.', callout:'🤖 Scout: “A station will flash when it needs you. Tap it and do the action!”' },
  ]),
  ubay: Object.freeze([
    { id:'cascade', emoji:'⚠️', title:'Systems Cascade', brief:'A power surge knocked several research stations out of calibration. Restore each system before shift end.', callout:'🤖 Lab AI: “Start with the flashing station. Accurate actions restore the lab fastest.”' },
    { id:'research', emoji:'🧬', title:'Research Rush', brief:'Experiments are arriving across the lab. Keep the active benches under control.', callout:'🤖 Lab AI: “One task first. Once you build momentum, a second station may activate.”' },
  ]),
});

const STATIONS = Object.freeze({
  bian: Object.freeze([
    { id:'greenhouse', icon:'🌱', name:'Plant Lab', short:'Plants', accent:'green' },
    { id:'materials', icon:'🧪', name:'Material Lab', short:'Materials', accent:'cyan' },
    { id:'discovery', icon:'🐾', name:'Discovery Pod', short:'Habitats & senses', accent:'violet' },
  ]),
  ubay: Object.freeze([
    { id:'bio', icon:'🔬', name:'Bio Lab', short:'Cells & ecosystems', accent:'green' },
    { id:'matter', icon:'⚗️', name:'Matter Bench', short:'Mixtures & particles', accent:'cyan' },
    { id:'power', icon:'⚡', name:'Energy Bench', short:'Circuits', accent:'orange' },
  ]),
});

function sliderJob(id,stationId,title,alert,label,min,max,start,targetMin,targetMax,unit,success,hint){
  return Object.freeze({ key:id,stationId,title,alert,mechanic:{kind:'slider',label,min,max,start,targetMin,targetMax,unit},success,hint });
}
function controlsJob(id,stationId,title,alert,fields,success,hint){
  return Object.freeze({ key:id,stationId,title,alert,mechanic:{kind:'controls',fields},success,hint });
}
function toolJob(id,stationId,title,alert,correctToolId,success,hint,tools){
  return Object.freeze({ key:id,stationId,title,alert,mechanic:{kind:'tools',correctToolId,tools:tools.map(([toolId,icon,label])=>({id:toolId,icon,label}))},success,hint });
}
function sortJob(id,stationId,title,alert,items,bins,success,hint){
  return Object.freeze({ key:id,stationId,title,alert,mechanic:{kind:'sort',items:items.map(([itemId,icon,label,bin])=>({id:itemId,icon,label,bin})),bins:bins.map(([binId,icon,label])=>({id:binId,icon,label}))},success,hint });
}
function connectJob(id,stationId,title,alert,nodes,sequence,success,hint){
  return Object.freeze({ key:id,stationId,title,alert,mechanic:{kind:'connect',nodes:nodes.map(([nodeId,icon,label])=>({id:nodeId,icon,label})),sequence:[...sequence]},success,hint });
}

const BIAN_JOBS = Object.freeze([
  sliderJob('plant-light','greenhouse','Wake the sleepy plant','The plant is drooping because the growth lamp is too dim.','Lamp power',0,100,20,65,85,'%','The lamp is bright enough and the plant perks up!','Try a brighter setting, but not all the way to maximum.'),
  sliderJob('plant-water','greenhouse','Help the dry plant','The soil is dry. Give the plant a healthy amount of water.','Water flow',0,100,15,55,75,'%','The soil moisture returns to a healthy level.','Aim for a healthy middle range.'),
  sliderJob('plant-temp','greenhouse','Cool the greenhouse','The greenhouse is too warm. Set a comfortable temperature.','Temperature',10,40,36,20,28,'°C','The greenhouse returns to a comfortable temperature.','Move the control away from the hot end.'),
  toolJob('waterproof','materials','Prepare a rain cover','Choose a material that keeps water out.','plastic','The plastic keeps the water on the surface.','Choose the material water does not soak through.',[['paper','📄','Paper'],['plastic','🧴','Plastic'],['cotton','🧵','Cotton']]),
  toolJob('absorbent','materials','Clean the spill','Pick something that can soak up the spill.','sponge','The sponge absorbs the water.','Look for something made to soak up liquid.',[['metal','🥄','Metal'],['sponge','🧽','Sponge'],['plastic','🧱','Plastic']]),
  toolJob('transparent','materials','Fix the light window','Choose a material that lets light pass through clearly.','glass','Clear glass lets the light pass through.','Choose the material you can see through clearly.',[['wood','🪵','Wood'],['glass','🪟','Clear glass'],['card','📦','Cardboard']]),
  sortJob('animal-homes','discovery','Restore the animal pods','Put each animal in a habitat that fits it.',[['penguin','🐧','Penguin','polar'],['camel','🐪','Camel','desert'],['frog','🐸','Frog','pond']],[['polar','❄️','Polar'],['desert','🏜️','Desert'],['pond','💧','Pond']],'All three animals are back in suitable habitats.','Think about where each animal can find the right conditions.'),
  toolJob('hearing','discovery','Trace the ringing signal','A bell is ringing. Tap the body sensor that detects sound.','ear','The hearing sensor catches the ringing signal.','Which body part receives sound?',[['skin','✋','Skin'],['ear','👂','Ears'],['tongue','👅','Tongue']]),
  toolJob('smell','discovery','Trace the flower signal','A flower is hidden in a vented box. Tap the body sensor used for smell.','nose','The smell sensor detects the flower scent.','Think about the sense used for scents.',[['nose','👃','Nose'],['eye','👁️','Eyes'],['ear','👂','Ears']]),
]);

const UBAY_JOBS = Object.freeze([
  sortJob('cell-parts','bio','Rebuild the cell model','Route each cell structure to its main function.',[['nucleus','🟣','Nucleus','control'],['membrane','⭕','Cell membrane','movement'],['chloroplast','🟢','Chloroplast','photo']],[['control','🎛️','Control / genetic material'],['movement','🚪','Movement in & out'],['photo','☀️','Photosynthesis']],'The cell model is functioning again.','Use the function of each structure, not its colour.'),
  sortJob('food-web','bio','Stabilise the food chain','Place each organism in its trophic role.',[['grass','🌱','Grass','producer'],['hopper','🦗','Grasshopper','primary'],['frog','🐸','Frog','secondary']],[['producer','☀️','Producer'],['primary','1️⃣','Primary consumer'],['secondary','2️⃣','Secondary consumer']],'Energy flow through the food chain is restored.','Start with the organism that makes its own food.'),
  toolJob('sand-water','matter','Separate sand from water','Choose the apparatus that traps an insoluble solid while liquid passes through.','filter','Filtration separates the sand from the water.','Think about particle size and a porous barrier.',[['filter','🧻','Filter funnel'],['magnet','🧲','Magnet'],['evaporator','🔥','Evaporating dish']]),
  toolJob('iron-sand','matter','Recover iron filings','Choose the tool that removes the magnetic component.','magnet','The magnet pulls the iron filings away from the sand.','Use a property that only one component has.',[['sieve','🕸️','Sieve'],['magnet','🧲','Magnet'],['filter','🧻','Filter funnel']]),
  toolJob('salt-water','matter','Recover dissolved salt','Choose the apparatus that removes solvent so crystals can form.','evaporator','Evaporation removes water and leaves the salt behind.','The salt is dissolved, so filtration will not trap it.',[['magnet','🧲','Magnet'],['evaporator','🔥','Evaporating dish'],['sieve','🕸️','Sieve']]),
  sliderJob('melt-model','matter','Melt the model sample','Raise the thermal setting until the model reaches the liquid zone.','Thermal setting',0,100,15,58,72,'%','The particle model enters the liquid state.','Move the control into the marked liquid zone.'),
  sliderJob('condense-model','matter','Condense the vapour model','Increase cooling until the gas reaches the condensation zone.','Cooling level',0,100,18,62,78,'%','The particles slow and come closer together.','Increase cooling until the chamber enters the target zone.'),
  controlsJob('fair-test','matter','Calibrate a fair test','Change temperature strongly while keeping water volume controlled.',[
    { id:'temp', label:'Temperature change', min:0, max:100, start:20, targetMin:65, targetMax:85, unit:'%' },
    { id:'water', label:'Water volume control', min:0, max:100, start:80, targetMin:45, targetMax:55, unit:'%' },
  ],'The fair-test controls are calibrated.','Change temperature strongly, but keep water volume near the centre.'),
  connectJob('simple-circuit','power','Reconnect the lamp circuit','Tap the parts in one complete loop, starting from the cell.',[['cell','🔋','Cell'],['switch','🔘','Closed switch'],['lamp','💡','Lamp'],['return','↩️','Return wire']],['cell','switch','lamp','return'],'The lamp circuit lights up.','Follow one continuous path from the cell and back.'),
  connectJob('motor-circuit','power','Route power to the motor','Build one continuous path through the wire and motor.',[['cell','🔋','Cell'],['wire','〰️','Wire'],['motor','⚙️','Motor'],['return','↩️','Return wire']],['cell','wire','motor','return'],'The motor begins to spin.','Keep the path continuous with no gaps.'),
]);

function shuffle(items,rng=Math.random){
  const out=[...items];
  for(let i=out.length-1;i>0;i-=1){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
function profileKey(profileId){return String(profileId||'').toLowerCase()==='bian'?'bian':'ubay';}
function cloneJob(job){return JSON.parse(JSON.stringify(job));}

export function labStationsForProfile(profileId){
  return STATIONS[profileKey(profileId)].map((station)=>({...station}));
}

export function labRankForTotalScore(total){
  const n=Math.max(0,Number(total)||0);
  if(n>=15000)return{id:'master',label:'Master Scientist',icon:'🌟',nextAt:null};
  if(n>=7000)return{id:'lead',label:'Lead Researcher',icon:'🧬',nextAt:15000};
  if(n>=3000)return{id:'specialist',label:'Science Specialist',icon:'🔬',nextAt:7000};
  if(n>=1000)return{id:'explorer',label:'Lab Explorer',icon:'🧪',nextAt:3000};
  return{id:'junior',label:'Junior Researcher',icon:'🥼',nextAt:1000};
}

export function rankProgress(total){
  const rank=labRankForTotalScore(total);
  if(!rank.nextAt)return{rank,progress:100,remaining:0};
  const start={junior:0,explorer:1000,specialist:3000,lead:7000}[rank.id]||0;
  const n=Math.max(0,Number(total)||0);
  return{rank,progress:Math.max(0,Math.min(100,(n-start)/(rank.nextAt-start)*100)),remaining:Math.max(0,rank.nextAt-n)};
}

export function createLabShift(profileId,{recentKeys=[],rng=Math.random}={}){
  const key=profileKey(profileId);
  const base=PROFILE_CONFIG[key];
  const incidents=INCIDENTS[key];
  const incident=incidents[Math.floor(rng()*incidents.length)%incidents.length];
  const source=key==='bian'?BIAN_JOBS:UBAY_JOBS;
  const recent=new Set(Array.isArray(recentKeys)?recentKeys:[]);
  const fresh=source.filter((job)=>!recent.has(job.key));
  const selected=fresh.length>=6?fresh:source;
  return{
    profile:key,
    incident:{...incident},
    stations:labStationsForProfile(key),
    jobs:shuffle(selected,rng).map(cloneJob),
    config:{...base},
  };
}

export function evaluateLabAction(job,payload={}){
  const mechanic=job?.mechanic||{};
  if(mechanic.kind==='slider'){
    const value=Number(payload.value);
    return Number.isFinite(value)&&value>=mechanic.targetMin&&value<=mechanic.targetMax;
  }
  if(mechanic.kind==='controls'){
    const values=payload.values||{};
    return mechanic.fields.every((field)=>{
      const value=Number(values[field.id]);
      return Number.isFinite(value)&&value>=field.targetMin&&value<=field.targetMax;
    });
  }
  if(mechanic.kind==='tools')return String(payload.toolId||'')===String(mechanic.correctToolId||'');
  if(mechanic.kind==='sort'){
    const placements=payload.placements||{};
    return mechanic.items.every((item)=>String(placements[item.id]||'')===String(item.bin));
  }
  if(mechanic.kind==='connect'){
    const sequence=Array.isArray(payload.sequence)?payload.sequence.map(String):[];
    return sequence.length===mechanic.sequence.length&&sequence.every((id,index)=>id===String(mechanic.sequence[index]));
  }
  return false;
}

export function labJobScore({waitedMs=0,patienceMs=18000,comboBefore=0}={}){
  const patience=Math.max(1,Number(patienceMs)||18000);
  const wait=Math.max(0,Number(waitedMs)||0);
  const speedRatio=Math.max(0,Math.min(1,1-(wait/patience)));
  return Math.min(150,80+Math.round(speedRatio*40)+(Math.min(3,Math.max(0,Number(comboBefore)||0))*10));
}

export function finaliseShiftScore(scoreValue,completed=0){
  const score=Math.max(0,Math.floor(Number(scoreValue)||0));
  const completionBonus=Math.min(90,Math.max(0,Math.floor(Number(completed)||0))*10);
  return Math.min(LAB_MAX_SCORE,score+completionBonus);
}
