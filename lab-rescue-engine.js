export const LAB_MAX_SCORE = 900;

const PROFILE_CONFIG = Object.freeze({
  bian: Object.freeze({ shiftSeconds: 75, spawnMinMs: 7000, spawnMaxMs: 10500, patienceMs: 26000, difficultyTier: 1 }),
  ubay: Object.freeze({ shiftSeconds: 90, spawnMinMs: 6200, spawnMaxMs: 9200, patienceMs: 23500, difficultyTier: 2 }),
});

const INCIDENTS = Object.freeze({
  bian: Object.freeze([
    { id: 'storm', emoji: '⛈️', title: 'Stormy Science Shift', brief: 'A storm shook the science lab. Keep every station running until backup power is stable.', callout: 'Scout says: “Stations are lighting up! Help me keep the lab calm.”' },
    { id: 'discovery', emoji: '🚚', title: 'Discovery Day Rush', brief: 'New samples are arriving all at once. Test, sort, and care for them before the queue gets too long.', callout: 'Scout says: “Incoming samples! One station at a time—we can do this.”' },
    { id: 'habitat', emoji: '🌍', title: 'Habitat Rescue Rush', brief: 'The habitat pods lost their settings. Restore the animals, materials, sensors, and greenhouse systems.', callout: 'Scout says: “The animals need the right homes. Let’s restore the lab!”' },
  ]),
  ubay: Object.freeze([
    { id: 'cascade', emoji: '⚠️', title: 'Systems Cascade', brief: 'A power surge knocked four research stations out of calibration. Stabilise the lab before the shift ends.', callout: 'Lab AI: “Multiple systems are drifting. Prioritise, process, collect, repeat.”' },
    { id: 'research-rush', emoji: '🧬', title: 'Research Rush', brief: 'Several investigations are running in parallel. Keep methods valid while new samples enter the queue.', callout: 'Lab AI: “Four benches are active. Watch the queue and protect Lab Stability.”' },
    { id: 'backup', emoji: '🔋', title: 'Backup Power Protocol', brief: 'The main grid is offline. Complete science jobs efficiently while the emergency system carries the lab.', callout: 'Lab AI: “Backup power is limited. Accurate actions will keep the core stable.”' },
  ]),
});

const STATIONS = Object.freeze({
  bian: Object.freeze([
    { id: 'greenhouse', icon: '🌱', name: 'Greenhouse', short: 'Plants', accent: 'green' },
    { id: 'materials', icon: '🧪', name: 'Material Bay', short: 'Materials', accent: 'cyan' },
    { id: 'habitat', icon: '🐾', name: 'Habitat Pod', short: 'Habitats', accent: 'violet' },
    { id: 'sensors', icon: '🛰️', name: 'Sensor Desk', short: 'Senses', accent: 'orange' },
  ]),
  ubay: Object.freeze([
    { id: 'bio', icon: '🔬', name: 'Bio Analyzer', short: 'Biology', accent: 'green' },
    { id: 'separation', icon: '⚗️', name: 'Separation Bench', short: 'Mixtures', accent: 'cyan' },
    { id: 'power', icon: '⚡', name: 'Power Bench', short: 'Circuits', accent: 'orange' },
    { id: 'matter', icon: '⚛️', name: 'Matter Pod', short: 'Particles', accent: 'violet' },
  ]),
});

const BIAN_JOBS = Object.freeze([
  sliderJob('plant-light','greenhouse','Wake the sleepy plant','The growth lamp dropped too low. Tune the lamp until the plant is comfortable.','Lamp power',0,100,20,65,85,'%',3200,'Plants need enough light to grow well.','Try a brighter setting, but not the maximum.'),
  sliderJob('plant-water','greenhouse','Help the dry plant','The soil sensor says the plant is too dry. Adjust the water flow.','Water flow',0,100,15,55,75,'%',3000,'Plants need enough water, but too much can also be harmful.','Aim for a healthy middle range.'),
  sliderJob('plant-temp','greenhouse','Cool the greenhouse','The greenhouse became too warm. Set a comfortable temperature.','Temperature',10,40,36,20,28,'°C',3400,'A moderate temperature helps many classroom plants stay healthy.','Move the control away from the hot end.'),
  toolJob('waterproof','materials','Prepare a rain cover','The lab bot needs a material that keeps water out. Fit the best sample into the tester','plastic','Water stays on plastic instead of soaking through easily.','Choose the sample that water does not soak through.',[
    ['paper','📄','Paper'],['plastic','🧴','Plastic'],['cotton','🧵','Cotton cloth']
  ],3000),
  toolJob('absorbent','materials','Clean the spill','A small spill reached the bench. Load an absorbent material into the cleanup slot.','sponge','A sponge absorbs water into its tiny spaces.','Look for something made to soak up liquid.',[
    ['metal','🥄','Metal spoon'],['sponge','🧽','Sponge'],['plastic','🧱','Plastic block']
  ],2600),
  toolJob('transparent','materials','Fix the light window','The light box needs a material that lets light pass through clearly.','glass','Clear glass is transparent, so light passes through it.','Choose the material you can see through clearly.',[
    ['wood','🪵','Wood'],['glass','🪟','Clear glass'],['card','📦','Cardboard']
  ],3200),
  sortJob('animal-homes','habitat','Restore the animal pods','Place each animal into the habitat pod that fits it.',[
    ['penguin','🐧','Penguin','polar'],['camel','🐪','Camel','desert'],['frog','🐸','Frog','pond']
  ],[
    ['polar','❄️','Polar'],['desert','🏜️','Desert'],['pond','💧','Pond']
  ],4000,'Animals have features and needs that suit particular habitats.','Match each animal to the place where its needs can be met.'),
  sortJob('living-places','habitat','Sort the living places','Move each animal card into its usual living place.',[
    ['fish','🐟','Fish','water'],['bird','🐦','Bird','air'],['cat','🐈','Cat','land']
  ],[
    ['water','🌊','Water'],['air','☁️','Air / sky'],['land','🌿','Land']
  ],3600,'Different animals are adapted to different places.','Think about how each animal moves and breathes.'),
  toolJob('hearing','sensors','Trace the ringing signal','A hidden bell is ringing. Install the sensor module that detects the signal.','ear','Ears detect sound vibrations and help us hear.','Which body part receives sound?',[
    ['skin','✋','Touch sensor'],['ear','👂','Hearing sensor'],['tongue','👅','Taste sensor']
  ],2500),
  toolJob('smell','sensors','Trace the flower signal','A flower is inside a vented box. Install the sensor used for smell.','nose','The nose detects smells in the air.','Think about the sense used for scents.',[
    ['nose','👃','Smell sensor'],['eye','👁️','Sight sensor'],['ear','👂','Hearing sensor']
  ],2500),
  toolJob('touch','sensors','Check the cold sample','The bot must detect whether an ice pack feels cold. Install the correct body sensor.','skin','Skin contains receptors that help us sense touch and temperature.','Which body part feels the surface directly?',[
    ['skin','✋','Skin sensor'],['nose','👃','Smell sensor'],['ear','👂','Hearing sensor']
  ],2500),
  sortJob('healthy-tray','materials','Pack the crew tray','Sort the items into “everyday fuel” and “treat”.',[
    ['water','💧','Water','fuel'],['fruit','🍎','Fruit','fuel'],['candy','🍬','Candy','treat']
  ],[
    ['fuel','🥗','Everyday fuel'],['treat','⭐','Treat']
  ],3000,'A balanced everyday meal includes nutritious foods and water; sweets are occasional treats.','Sort by what helps the crew every day.'),
]);

const UBAY_JOBS = Object.freeze([
  sortJob('cell-parts','bio','Rebuild the cell model','Route each component to the function console it belongs to.',[
    ['nucleus','🟣','Nucleus','control'],['membrane','⭕','Cell membrane','movement'],['chloroplast','🟢','Chloroplast','photo']
  ],[
    ['control','🎛️','Control / genetic material'],['movement','🚪','Controls movement in & out'],['photo','☀️','Photosynthesis']
  ],4500,'Cell structures have specialised roles that help the cell function.','Use the function of each organelle, not its colour.'),
  sortJob('food-web','bio','Stabilise the food web','Route each organism to its trophic role.',[
    ['grass','🌱','Grass','producer'],['hopper','🦗','Grasshopper','primary'],['frog','🐸','Frog','secondary']
  ],[
    ['producer','☀️','Producer'],['primary','1️⃣','Primary consumer'],['secondary','2️⃣','Secondary consumer']
  ],4300,'Energy enters the food chain through producers, then passes to consumers.','Start with the organism that makes its own food.'),
  sortJob('cell-types','bio','Sort the specimen slides','Send each feature to the cell type where it belongs.',[
    ['wall','🧱','Cell wall','plant'],['chloroplast2','🟢','Chloroplast','plant'],['no-wall','🫧','No cell wall','animal']
  ],[
    ['plant','🌿','Plant cell'],['animal','🐾','Animal cell']
  ],4000,'Plant cells have a cell wall and chloroplasts; animal cells do not.','Look for plant-only structures.'),
  toolJob('sand-water','separation','Separate sand from water','Fit the apparatus that traps an insoluble solid while liquid passes through.','filter','Filtration separates an insoluble solid from a liquid.','Think about particle size and a porous barrier.',[
    ['filter','🧻','Filter funnel'],['magnet','🧲','Magnet'],['evaporator','🔥','Evaporating dish']
  ],4200),
  toolJob('iron-sand','separation','Recover iron filings','Fit the tool that removes the magnetic component from the mixture.','magnet','A magnet attracts iron and can separate it from non-magnetic sand.','Use a property that only one component has.',[
    ['sieve','🕸️','Sieve'],['magnet','🧲','Magnet'],['filter','🧻','Filter funnel']
  ],3600),
  toolJob('salt-water','separation','Recover dissolved salt','Fit the apparatus that removes solvent so crystals can form.','evaporator','Evaporation removes water and can leave the dissolved salt behind.','The solute is dissolved, so filtration will not trap it.',[
    ['magnet','🧲','Magnet'],['evaporator','🔥','Evaporating dish'],['sieve','🕸️','Large-hole sieve']
  ],4600),
  connectJob('simple-circuit','power','Reconnect the lamp circuit','Tap the components in a complete loop, starting from the cell.',[
    ['cell','🔋','Cell'],['switch','🔘','Closed switch'],['lamp','💡','Lamp'],['return','↩️','Return wire']
  ],['cell','switch','lamp','return'],3600,'A current needs a complete conducting loop and an energy source.','Follow one continuous path from the cell and back.'),
  connectJob('motor-circuit','power','Route power to the motor','Build one continuous path through the switch and motor.',[
    ['cell','🔋','Cell'],['wire','〰️','Wire'],['motor','⚙️','Motor'],['return','↩️','Return wire']
  ],['cell','wire','motor','return'],3900,'A motor works when it is part of a complete circuit.','Keep the path continuous—no gaps.'),
  connectJob('series-circuit','power','Restore the series test','Route current through both lamps before returning to the source.',[
    ['cell','🔋','Cell'],['lamp1','💡','Lamp A'],['lamp2','💡','Lamp B'],['return','↩️','Return wire']
  ],['cell','lamp1','lamp2','return'],4300,'In a simple series circuit, components share one continuous loop.','Both lamps need to sit on the same unbroken path.'),
  sliderJob('melt-model','matter','Melt the model sample','Increase the thermal setting until the model reaches the liquid zone.','Thermal setting',0,100,15,58,72,'%',4000,'Heating can give particles more energy so they move more freely as a solid melts.','Move the control into the marked liquid zone.'),
  sliderJob('condense-model','matter','Condense the vapour model','Cool the particle chamber until the model reaches the condensation zone.','Cooling level',0,100,18,62,78,'%',4100,'Cooling removes energy; gas particles slow and come closer together during condensation.','Increase cooling until the chamber enters the target zone.'),
  controlsJob('fair-test','matter','Calibrate a fair dissolving test','Set the experiment so temperature changes while water volume stays controlled.',[
    { id:'temp', label:'Temperature change', min:0, max:100, start:20, targetMin:65, targetMax:85, unit:'%' },
    { id:'water', label:'Water volume control', min:0, max:100, start:80, targetMin:45, targetMax:55, unit:'%' }
  ],4800,'A fair test changes the independent variable while keeping relevant control variables consistent.','Change temperature strongly, but keep the water-volume control near the centre.'),
]);

function sliderJob(id,stationId,title,alert,label,min,max,start,targetMin,targetMax,unit,processingMs,success,hint){
  return Object.freeze({ key:id,stationId,title,alert,processingMs,mechanic:{kind:'slider',label,min,max,start,targetMin,targetMax,unit},success,hint });
}
function controlsJob(id,stationId,title,alert,fields,processingMs,success,hint){
  return Object.freeze({ key:id,stationId,title,alert,processingMs,mechanic:{kind:'controls',fields},success,hint });
}
function toolJob(id,stationId,title,alert,correctToolId,success,hint,tools,processingMs){
  return Object.freeze({ key:id,stationId,title,alert,processingMs,mechanic:{kind:'tools',correctToolId,tools:tools.map(([toolId,icon,label])=>({id:toolId,icon,label}))},success,hint });
}
function sortJob(id,stationId,title,alert,items,bins,processingMs,success,hint){
  return Object.freeze({ key:id,stationId,title,alert,processingMs,mechanic:{kind:'sort',items:items.map(([itemId,icon,label,bin])=>({id:itemId,icon,label,bin})),bins:bins.map(([binId,icon,label])=>({id:binId,icon,label}))},success,hint });
}
function connectJob(id,stationId,title,alert,nodes,sequence,processingMs,success,hint){
  return Object.freeze({ key:id,stationId,title,alert,processingMs,mechanic:{kind:'connect',nodes:nodes.map(([nodeId,icon,label])=>({id:nodeId,icon,label})),sequence:[...sequence]},success,hint });
}

function shuffle(items,rng=Math.random){
  const out=[...items];
  for(let i=out.length-1;i>0;i-=1){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}

function profileKey(profileId){return String(profileId||'').toLowerCase()==='bian'?'bian':'ubay';}

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

export function createLabShift(profileId,{recentKeys=[],bestScore=0,rng=Math.random}={}){
  const key=profileKey(profileId);
  const base=PROFILE_CONFIG[key];
  const incidents=INCIDENTS[key];
  const incident=incidents[Math.floor(rng()*incidents.length)%incidents.length];
  const source=key==='bian'?BIAN_JOBS:UBAY_JOBS;
  const recent=new Set(Array.isArray(recentKeys)?recentKeys:[]);
  const fresh=source.filter((job)=>!recent.has(job.key));
  const deck=shuffle(fresh.length>=7?fresh:source,rng).map((job)=>structuredCloneJob(job));
  const bonus=Math.min(2,Math.floor(Math.max(0,Number(bestScore)||0)/350));
  return{
    profile:key,
    incident:{...incident},
    stations:labStationsForProfile(key),
    jobs:deck,
    config:{
      ...base,
      difficultyTier:base.difficultyTier+bonus,
      spawnMinMs:Math.max(4800,base.spawnMinMs-(bonus*450)),
      spawnMaxMs:Math.max(7000,base.spawnMaxMs-(bonus*550)),
      patienceMs:Math.max(18000,base.patienceMs-(bonus*1200)),
    },
  };
}

function structuredCloneJob(job){
  return JSON.parse(JSON.stringify(job));
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

export function labJobScore({waitedMs=0,patienceMs=24000,comboBefore=0}={}){
  const patience=Math.max(1,Number(patienceMs)||24000);
  const wait=Math.max(0,Number(waitedMs)||0);
  const speedRatio=Math.max(0,Math.min(1,1-(wait/patience)));
  return Math.min(150,70+Math.round(speedRatio*40)+(Math.min(4,Math.max(0,Number(comboBefore)||0))*10));
}

export function finaliseShiftScore(scoreValue,stability=100){
  const score=Math.max(0,Math.floor(Number(scoreValue)||0));
  const stabilityBonus=Math.round(Math.max(0,Math.min(100,Number(stability)||0))*0.5);
  return Math.min(LAB_MAX_SCORE,score+stabilityBonus);
}
