export const profiles = Object.freeze([
  {id:'ubay',name:'Ubay',formalName:'Ubaid',grade:7,level:'Junior High',icon:'🤖',color:'blue',subjects:[
    ['bahasa-indonesia','BAHASA INDONESIA','📚'],['math','MATH','🧮'],['pancasila','PANCASILA','🇮🇩'],['english','ENGLISH','💬'],['science','SCIENCE','🔬'],['informatika','INFORMATIKA','💻'],['global-citizenship','GLOBAL CITIZENSHIP','🌏'],['pai','PAI','📖']
  ]},
  {id:'bian',name:'Bian',formalName:'Fabian',grade:2,level:'Primary',icon:'👾',color:'orange',subjects:[
    ['bahasa-indonesia','BAHASA INDONESIA','📚'],['paibp','PAIBP','📖'],['english','ENGLISH','💬'],['science','SCIENCE','🔬'],['math','MATH','🧮'],['pancasila','PANCASILA','🇮🇩']
  ]}
]);
export function findProfile(id){return profiles.find(p=>p.id===id)??null;}
export function findSubject(profile,id){return profile?.subjects.find(s=>s[0]===id)??null;}
export function resolveRoute(hash){
 const parts=hash.replace(/^#\/?/,'').split('/');
 const profile=findProfile(parts[0]);
 if(!profile)return {page:'profiles'};
 const subject=findSubject(profile,parts[1]);
 return {page:subject?'subject':'home',profile,subject};
}
