export const LAB_RUN_SIZE = 5;
export const LAB_MAX_SCORE = 900;

const TYPE_META = {
  diagnose:['DIAGNOSE','🔍'], fix:['FIX THE LAB','🛠️'], predict:['PREDICT','🔮'],
  sequence:['SEQUENCE','🧩'], evidence:['EVIDENCE CHECK','📊'], variable:['VARIABLE LAB','🎛️'],
};

const BIAN = [
  {id:'habitat',type:'fix',d:1,topic:'Habitats',variants:[
    ['penguin','🐧','cold ocean','polar habitat',['desert','rainforest']],
    ['camel','🐪','hot and dry land','desert',['pond','polar habitat']],
    ['frog','🐸','wet place near fresh water','pond',['desert','icy mountain']],
    ['monkey','🐒','warm place with many tall trees','rainforest',['polar habitat','open ocean']],
  ]},
  {id:'plant',type:'diagnose',d:1,topic:'Plants',variants:[
    ['dark','The plant has water, but it has been kept in a dark cupboard.','Move it into the light',['Add ice','Cover it with a box'],'Plants need enough light to stay healthy and grow.'],
    ['dry','The plant is in sunlight, but the soil is very dry.','Give it water',['Put it in a freezer','Remove all the soil'],'Plants need enough water to stay healthy and grow.'],
  ]},
  {id:'material',type:'predict',d:1,topic:'Materials',variants:[
    ['sponge','🧽','A sponge gets drops of water.','The sponge absorbs the water',['The water turns into metal','The sponge becomes a magnet'],'A sponge is absorbent, so it can soak up water.'],
    ['plastic','🧴','Water is poured on a plastic sheet.','Most water stays on the surface',['The plastic drinks the water','The plastic becomes paper'],'Plastic is usually waterproof, so water does not soak through easily.'],
  ]},
  {id:'food',type:'fix',d:1,topic:'Healthy choices',variants:[
    ['meal1','Rice, grilled fish, vegetables, and water',['Only sweets and soda','Only potato chips']],
    ['meal2','Bread, egg, fruit, and water',['Three candies and cola','Only ice cream']],
  ]},
  {id:'sense',type:'diagnose',d:1,topic:'Human body',variants:[
    ['sound','🔔','A bell rings behind a screen.','hearing','Use your ears',['Use your tongue','Use your skin'],'We use our ears for hearing.'],
    ['smell','🌸','A flower is hidden inside a box with small holes.','smell','Use your nose',['Use your knees','Use your elbows'],'We use our nose for smell.'],
  ]},
  {id:'shadow',type:'predict',d:2,topic:'Light',variants:[
    ['close','A toy is moved closer to a lamp.','Its shadow can become larger',['The shadow disappears forever','The toy becomes transparent']],
    ['block','A solid book is placed between a torch and the wall.','A shadow forms on the wall',['The wall becomes a mirror','The book starts glowing']],
  ]},
  {id:'force',type:'evidence',d:2,topic:'Forces',variants:[
    ['push',[['Trial 1','small push','short distance'],['Trial 2','bigger push','longer distance']],'A bigger push can make the toy travel farther',['The toy moved because of its colour','A push always makes things stop']],
    ['surface',[['Smooth floor','car travels far'],['Rough mat','car stops sooner']],'The rough mat slows the car more',['The car changes material','The smooth floor makes the car heavier']],
  ]},
  {id:'sequence',type:'sequence',d:2,topic:'Working scientifically',variants:[
    ['observe','Observe → Predict → Test → Record',['Record → Sleep → Guess → Test','Test → Forget → Guess → Stop']],
    ['material','Choose material → Add water → Observe → Record',['Record → Add water → Choose material → Ignore','Add water → Throw away → Guess → Stop']],
  ]},
];

const UBAY = [
  {id:'dissolve-var',type:'variable',d:1,topic:'Scientific enquiry',variants:[
    ['temperature','water temperature','time taken for sugar to dissolve','volume of water',['colour of the beaker','student name']],
    ['stirring','stirring speed','time taken for a tablet to dissolve','volume of water',['table colour','day of the week']],
  ]},
  {id:'plant-var',type:'variable',d:2,topic:'Scientific enquiry',variants:[
    ['light','light intensity','plant growth','plant species',['final plant height','growth rate']],
    ['water','amount of water','plant growth','type of soil',['height after two weeks','number of leaves measured']],
  ]},
  {id:'particles',type:'predict',d:1,topic:'Particles and states',variants:[
    ['melt','A solid is heated until it melts.','Its particles can move past one another more freely',['Its particles disappear','Its particles stop moving completely']],
    ['condense','A gas is cooled until it condenses.','Its particles become closer together',['Its particles grow much larger','All particles lose their mass']],
  ]},
  {id:'friction',type:'evidence',d:2,topic:'Forces',variants:[
    ['surface',[['Smooth tile','2.8 m'],['Wood','2.0 m'],['Rough mat','0.9 m']],'The rougher surface produced more friction',['The rough mat removed gravity','The car gained mass on the mat']],
    ['wet',[['Dry floor','short stopping distance'],['Wet floor','longer stopping distance']],'Reduced friction on the wet floor increased stopping distance',['Water removed gravity','Friction is always larger on wet surfaces']],
  ]},
  {id:'ecosystem',type:'diagnose',d:2,topic:'Ecosystems',variants:[
    ['frog','grass → grasshopper → frog → snake','frog population falls sharply','Grasshopper numbers may increase',['Grass becomes a snake','All ecosystem energy disappears immediately']],
    ['fish','algae → small fish → large fish','small fish population decreases','Large fish may have less food available',['Algae becomes a large fish','Large fish no longer need energy']],
  ]},
  {id:'cell',type:'fix',d:1,topic:'Cells',variants:[
    ['nucleus','The control centre of the cell model is missing.','Add a nucleus',['Add a wheel','Add a metal battery'],'The nucleus contains genetic material and controls many cell activities.'],
    ['chloroplast','A plant-cell model cannot show where photosynthesis happens.','Add chloroplasts',['Add a speaker','Remove the cell membrane'],'Chloroplasts contain chlorophyll and are a main site of photosynthesis in plant cells.'],
  ]},
  {id:'energy',type:'sequence',d:2,topic:'Energy',variants:[
    ['torch','Chemical store → electrical transfer → light + thermal energy',['Light → battery → chemical store → nothing','Thermal energy → mass → gravity → battery']],
    ['kettle','Electrical transfer → heating element → thermal energy of water',['Water → electrical energy → battery → sound','Chemical store → gravity → light → water']],
  ]},
  {id:'mixture',type:'fix',d:2,topic:'Mixtures',variants:[
    ['sand','sand and water','Use filtration',['Use a magnet only','Use a thermometer only'],'Filtration separates an insoluble solid from a liquid.'],
    ['salt','salt dissolved in water','Use evaporation or crystallisation',['Use a large-hole sieve','Use a magnet'],'Evaporation or crystallisation can recover a soluble solid from a solution.'],
  ]},
  {id:'data',type:'evidence',d:3,topic:'Data interpretation',variants:[
    ['temp',[['20°C','95 s'],['40°C','61 s'],['60°C','34 s']],'Higher temperature was associated with shorter dissolving time',['Temperature had no relationship with dissolving time','All solids dissolve instantly at 60°C']],
    ['stir',[['No stirring','120 s'],['Slow stirring','82 s'],['Fast stirring','47 s']],'Faster stirring was associated with shorter dissolving time',['Stirring always changes solute mass','Fast stirring makes dissolving impossible']],
  ]},
  {id:'method',type:'sequence',d:1,topic:'Working scientifically',variants:[
    ['investigation','Question → Hypothesis → Method → Results → Conclusion',['Conclusion → Results → Question → Ignore data','Method → Guess → Stop → Conclusion']],
    ['repeat','Measure → Repeat → Calculate a mean → Compare results',['Measure once → Delete result → Guess','Compare first → Change every variable → Stop']],
  ]},
  {id:'circuit',type:'diagnose',d:2,topic:'Electricity',variants:[
    ['open','The lamp does not light because one wire is disconnected.','Close the gap in the circuit',['Remove the cell','Replace the wire with paper']],
    ['cell','The circuit is complete but the cell has been removed.','Reconnect an energy source',['Add an open switch','Cut another wire']],
  ]},
];

function shuffle(items,rng=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function choicePack(correct,wrong,rng){const rows=shuffle([correct,...wrong],rng).map((text,i)=>({id:String.fromCharCode(65+i),text}));return {choices:rows,answer:rows.find(x=>x.text===correct).id};}
function base(seed,v,key,title,scenario,question,correct,wrong,explanation,visual,rng){const [label,icon]=TYPE_META[seed.type];const c=choicePack(correct,wrong,rng);return {key:`${seed.id}:${key}`,type:seed.type,typeLabel:label,typeIcon:icon,topic:seed.topic,difficulty:seed.d,title,scenario,question,...c,explanation,visual};}

function makeBian(seed,v,rng){
  if(seed.id==='habitat')return base(seed,v,v[0],'Build the right habitat',`${v[1]} The lab is preparing a home for a ${v[0]}. It needs a ${v[2]}.`,'Which habitat should the lab build?',v[3],v[4],`A ${v[0]} is suited to a ${v[3]}.`,{kind:'habitat',emoji:v[1],labels:['HOME','FOOD','WATER']},rng);
  if(seed.id==='plant')return base(seed,v,v[0],'Save the plant',`🌱 ${v[1]}`,'What should the scientist do first?',v[2],v[3],v[4],{kind:'meters',items:v[0]==='dark'?[['Light',15],['Water',75]]:[['Light',80],['Water',15]]},rng);
  if(seed.id==='material')return base(seed,v,v[0],'What happens next?',`${v[1]} ${v[2]}`,'What is the best prediction?',v[3],v[4],v[5],{kind:'specimen',emoji:v[1],badge:'MATERIAL TEST'},rng);
  if(seed.id==='food')return base(seed,v,v[0],'Power the lunch station','🥗 The crew needs a balanced meal before the next experiment.','Which tray is the best choice?',v[1],v[2],'A balanced meal includes different food groups and water.',{kind:'stations',items:['ENERGY','GROWTH','HEALTH']},rng);
  if(seed.id==='sense')return base(seed,v,v[0],'Choose the sense tool',`${v[1]} ${v[2]}`,`Which body part helps you use your sense of ${v[3]}?`,v[4],v[5],v[6],{kind:'scanner',emoji:v[1],badge:'SENSE SCAN'},rng);
  if(seed.id==='shadow')return base(seed,v,v[0],'Predict the shadow',`🔦 ${v[1]}`,'What is most likely to happen?',v[2],v[3],'A shadow forms when an opaque object blocks light. Distance can change shadow size.',{kind:'beam',items:['TORCH','OBJECT','WALL']},rng);
  if(seed.id==='force')return base(seed,v,v[0],'Read the evidence','🚗 A toy-car test produced these observations.','Which conclusion matches the evidence?',v[2],v[3],'Use the observations to choose the conclusion that is actually supported.',{kind:'table',rows:v[1]},rng);
  return base(seed,v,v[0],'Repair the experiment order','🧪 The lab computer mixed up the steps.','Which sequence makes the most sense?',v[1],v[2],'Scientists use a clear sequence so observations and results can be recorded carefully.',{kind:'sequence',steps:['1','2','3','4']},rng);
}

function makeUbay(seed,v,rng){
  if(seed.type==='variable')return base(seed,v,v[0],'Stabilise the fair test',`🎛️ A student investigates how ${v[1]} affects ${v[2]}.`,'Which variable should be kept the same?',v[3],v[4],`Keeping ${v[3]} constant helps isolate the effect of ${v[1]}.`,{kind:'variables',items:[['CHANGE',v[1]],['MEASURE',v[2]],['CONTROL','?']]},rng);
  if(seed.id==='particles')return base(seed,v,v[0],'Predict the particle change',`⚛️ ${v[1]}`,'Which particle-model statement is best?',v[2],v[3],'Changes of state alter particle spacing and movement; particles do not disappear.',{kind:'particles',state:v[0]},rng);
  if(seed.id==='friction'||seed.id==='data')return base(seed,v,v[0],seed.id==='data'?'Interpret the lab data':'Decode the force data','📊 The lab recorded these results.','Which conclusion is best supported?',v[2],v[3],'A scientific conclusion should match the measured pattern without claiming more than the evidence shows.',{kind:'table',rows:v[1]},rng);
  if(seed.id==='ecosystem')return base(seed,v,v[0],'Repair the food-web forecast',`🌿 Food chain: ${v[1]}. The ${v[2]}.`,'Which effect is most likely?',v[3],v[4],'Changing one population can affect connected feeding relationships.',{kind:'chain',text:v[1]},rng);
  if(seed.id==='cell')return base(seed,v,v[0],'Repair the cell model',`🔬 ${v[1]}`,'Which repair makes the model scientifically useful?',v[2],v[3],v[4],{kind:'specimen',emoji:'🔬',badge:'CELL MODEL'},rng);
  if(seed.id==='energy'||seed.id==='method')return base(seed,v,v[0],seed.id==='energy'?'Reconnect the energy pathway':'Restore the investigation protocol','🧪 The sequence has been scrambled.','Which sequence is scientifically sensible?',v[1],v[2],seed.id==='energy'?'Energy is transferred between stores and pathways; it is not created from nothing.':'A clear method makes results easier to evaluate and repeat.',{kind:'sequence',steps:['1','2','3','4']},rng);
  if(seed.id==='mixture')return base(seed,v,v[0],'Choose the separation tool',`⚗️ The lab needs to separate ${v[1]}.`,'Which method is most suitable?',v[2],v[3],v[4],{kind:'stations',items:['FILTER','HEAT','MAGNET']},rng);
  return base(seed,v,v[0],'Diagnose the circuit',`💡 ${v[1]}`,'Which change should restore the circuit?',v[2],v[3],'A working simple circuit needs a complete conducting path and an energy source.',{kind:'circuit',state:v[0]},rng);
}

function tier(profile,best=0,acc=null){const a=Number(acc);if(profile==='bian')return best>=700||a>=.8?2:1;if(best>=760||a>=.8)return 3;if(best>=480||a>=.6)return 2;return 1;}
function candidates(profile,maxTier,rng){const source=profile==='bian'?BIAN:UBAY;const out=[];for(const s of source.filter(x=>x.d<=maxTier))for(const v of s.variants)out.push(profile==='bian'?makeBian(s,v,rng):makeUbay(s,v,rng));return out;}

export function createLabMissionRun(profileId,{recentKeys=[],bestScore=0,lastAccuracy=null,rng=Math.random}={}){
  const difficultyTier=tier(profileId,bestScore,lastAccuracy);const all=candidates(profileId,difficultyTier,rng);const recent=new Set(recentKeys);let pool=all.filter(x=>!recent.has(x.key));if(pool.length<LAB_RUN_SIZE)pool=all;
  const byType=new Map();for(const m of shuffle(pool,rng)){if(!byType.has(m.type))byType.set(m.type,[]);byType.get(m.type).push(m);}const chosen=[];for(const t of shuffle([...byType.keys()],rng)){chosen.push(byType.get(t)[0]);if(chosen.length===LAB_RUN_SIZE)break;}for(const m of shuffle(pool,rng)){if(chosen.length===LAB_RUN_SIZE)break;if(!chosen.some(x=>x.key===m.key))chosen.push(m);}return {missions:chosen,difficultyTier};
}

export function missionScore(correct,comboBefore=0){return correct?120+Math.max(0,Number(comboBefore)||0)*20:0;}
export function finaliseRunScore(score,solved){return Math.min(LAB_MAX_SCORE,Math.max(0,Math.floor(Number(score)||0))+(Number(solved)===LAB_RUN_SIZE?100:0));}
export function labRankForTotalScore(total){const n=Math.max(0,Number(total)||0);if(n>=15000)return{id:'master',label:'Master Scientist',icon:'🌟',nextAt:null};if(n>=7000)return{id:'lead',label:'Lead Researcher',icon:'🧬',nextAt:15000};if(n>=3000)return{id:'specialist',label:'Science Specialist',icon:'🔬',nextAt:7000};if(n>=1000)return{id:'explorer',label:'Lab Explorer',icon:'🧪',nextAt:3000};return{id:'junior',label:'Junior Researcher',icon:'🥼',nextAt:1000};}
export function rankProgress(total){const rank=labRankForTotalScore(total);if(!rank.nextAt)return{rank,progress:100,remaining:0};const start={junior:0,explorer:1000,specialist:3000,lead:7000}[rank.id]||0;const n=Number(total)||0;return{rank,progress:Math.max(0,Math.min(100,(n-start)/(rank.nextAt-start)*100)),remaining:Math.max(0,rank.nextAt-n)};}
