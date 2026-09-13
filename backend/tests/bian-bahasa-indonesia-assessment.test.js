import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BIAN_BAHASA_INDONESIA_BLUEPRINT,
  bianBahasaIndonesiaTopicCategory,
  getBianBahasaIndonesiaBlueprint,
  selectBianBahasaIndonesiaQuestions,
} from '../src/bian-bahasa-indonesia-assessment.js';

const slots = [
  ['Membaca Teks Keluarga','Mudah','multiple-choice','ST1'],
  ['Informasi Kegiatan Keluarga','Mudah','multiple-choice','ST1'],
  ['Informasi Keluarga','Sedang','multiple-choice','ST1'],
  ['Perasaan terhadap Keluarga','Sedang','open-response','ST1'],
  ['Hobi dan Kegemaran','Mudah','multiple-choice','ST2'],
  ['Informasi tentang Hobi','Mudah','multiple-choice','ST2'],
  ['Sikap terhadap Hobi','Sedang','multiple-choice','ST2'],
  ['Pantang Menyerah dalam Hobi','Sedang','multiple-choice','ST2'],
  ['Tokoh dan Penulis Cerita','Sedang','multiple-choice','ST3'],
  ['Judul dan Informasi Cerita','Mudah','multiple-choice','ST3'],
  ['Watak Tokoh dalam Cerita','Sulit','multiple-choice','ST3'],
  ['Sikap Membantu Keluarga','Sedang','open-response','ST3'],
  ['Informasi Kalimat Sederhana','Mudah','multiple-choice','ST4'],
  ['Tanda Baca Kalimat Tanya','Mudah','text','ST4'],
  ['di sebagai Kata Depan','Mudah','multiple-choice','ST4'],
  ['di- sebagai Awalan','Sedang','multiple-choice','ST4'],
  ['Kalimat Perintah','Mudah','multiple-choice','ST4'],
  ['Unsur Cerita: Ilustrator','Mudah','text','ST5'],
  ['Unsur Cerita: Tokoh','Mudah','multiple-choice','ST5'],
  ['Unsur Cerita: Latar','Mudah','multiple-choice','ST5'],
  ['Unsur Cerita: Penulis','Mudah','multiple-choice','ST5'],
  ['Unsur Cerita dan Kalimat','Sedang','multiple-choice','ST5'],
  ['Tanda Baca','Sedang','multiple-choice',''],
  ['Tanda Koma dalam Pemerincian','Sedang','multiple-choice',''],
  ['Tanda Tanya','Mudah','text',''],
  ['Tanda Seru','Mudah','multiple-choice',''],
  ['Tanda Titik','Mudah','text',''],
  ['Kalimat Berpola SPO','Sedang','multiple-choice',''],
  ['Menulis Kalimat Berpola SPO','Sulit','open-response',''],
  ['Macam-macam Perasaan','Mudah','text',''],
  ['Mengidentifikasi Kalimat Perintah','Sedang','multiple-choice',''],
  ['Menuliskan Kalimat Perintah','Sulit','open-response',''],
  ['Membedakan di sebagai Kata Depan','Sedang','multiple-choice',''],
  ['Membedakan di- sebagai Awalan','Sedang','multiple-choice',''],
];

function makeBank(){
  const bank=[];
  let number=1;
  for(const variant of ['A','B','C']){
    const stimulusOrders=new Map();
    for(const [topic,difficulty,type,stimulusCode] of slots){
      let stimulusId='';
      let stimulusOrder=0;
      if(stimulusCode){
        stimulusId=`BIAN-BI-S1-${variant}-${stimulusCode}`;
        stimulusOrder=(stimulusOrders.get(stimulusId)||0)+1;
        stimulusOrders.set(stimulusId,stimulusOrder);
      }
      bank.push({
        id:`BIAN-G2-BI-S1-${String(number).padStart(3,'0')}`,
        topic,
        semester:'1',
        difficulty,
        type,
        stimulusId,
        stimulusOrder,
        answerKey:type==='multiple-choice'?'A':type==='text'?'x':'',
        choices:type==='multiple-choice'?[{id:'A',text:'benar'},{id:'B',text:'salah'}]:[],
      });
      number+=1;
    }
  }
  return bank;
}

function countBy(items,keyFn){
  const counts={};
  for(const item of items){
    const key=keyFn(item);
    counts[key]=(counts[key]||0)+1;
  }
  return counts;
}

test('Bahasa Indonesia Grade 2 Assessment blueprint is 34 questions and 90 minutes',()=>{
  const blueprint=getBianBahasaIndonesiaBlueprint();
  assert.equal(blueprint.id,'bian-bahasa-indonesia-mid-s1-2026');
  assert.equal(blueprint.targetQuestions,34);
  assert.equal(blueprint.durationMinutes,90);
  assert.deepEqual(blueprint.typeTargets,{'multiple-choice':25,text:5,'open-response':4});
  assert.deepEqual(blueprint.difficultyTargets,{mudah:17,sedang:14,sulit:3});
  assert.equal(Object.values(blueprint.topicTargets).reduce((a,b)=>a+b,0),34);
});

test('all 34 MHIS pointer topic labels map to distinct assessment categories',()=>{
  const categories=slots.map(([topic])=>bianBahasaIndonesiaTopicCategory({topic}));
  assert.equal(categories.filter(Boolean).length,34);
  assert.equal(new Set(categories).size,34);
});

test('102-question three-variant bank returns one complete 34-question paper with intact stimulus blocks',()=>{
  const bank=makeBank();
  for(let run=0;run<80;run+=1){
    const selected=selectBianBahasaIndonesiaQuestions(bank,BIAN_BAHASA_INDONESIA_BLUEPRINT);
    assert.equal(selected.length,34);
    assert.deepEqual(countBy(selected,(q)=>q.difficulty),{Mudah:17,Sedang:14,Sulit:3});
    assert.deepEqual(countBy(selected,(q)=>q.type),{'multiple-choice':25,'open-response':4,text:5});
    const categories=countBy(selected,bianBahasaIndonesiaTopicCategory);
    assert.equal(Object.keys(categories).length,34);
    assert.ok(Object.values(categories).every((count)=>count===1));

    const variantPrefixes=new Set(selected.map((q)=>Math.floor((Number(q.id.slice(-3))-1)/34)));
    assert.equal(variantPrefixes.size,1);

    const stimulusIds=[...new Set(selected.map((q)=>q.stimulusId).filter(Boolean))];
    for(const stimulusId of stimulusIds){
      const group=selected.filter((q)=>q.stimulusId===stimulusId);
      const positions=group.map((q)=>selected.indexOf(q));
      for(let i=1;i<positions.length;i+=1)assert.equal(positions[i],positions[i-1]+1);
      assert.deepEqual(group.map((q)=>q.stimulusOrder),Array.from({length:group.length},(_,i)=>i+1));
    }
  }
});

test('selector rejects a broken 34-question variant',()=>{
  const bank=makeBank().filter((q)=>q.id!=='BIAN-G2-BI-S1-029'&&q.id!=='BIAN-G2-BI-S1-063'&&q.id!=='BIAN-G2-BI-S1-097');
  assert.throws(()=>selectBianBahasaIndonesiaQuestions(bank),/belum memiliki satu varian 34 soal/i);
});
