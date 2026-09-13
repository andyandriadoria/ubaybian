import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BIAN_PANCASILA_BLUEPRINT,
  bianPancasilaTopicCategory,
  getBianPancasilaBlueprint,
  selectBianPancasilaQuestions,
} from '../src/bian-pancasila-assessment.js';

const slots = [
  ['Aturan sebelum berangkat sekolah','Mudah','multiple-choice','ST1'],
  ['Merapikan mainan setelah bermain','Mudah','multiple-choice',''],
  ['Tanggung jawab barang pribadi','Sedang','multiple-choice','ST1'],
  ['Mengidentifikasi lambang sila Pancasila','Mudah','multiple-choice',''],
  ['Mengurutkan bunyi sila Pancasila','Sedang','multiple-choice',''],
  ['Menyelesaikan tugas sebelum bermain','Sulit','open-response',''],
  ['Identitas diri berdasarkan hobi','Mudah','multiple-choice','ST2'],
  ['Melaksanakan kewajiban sebelum bermain','Sedang','multiple-choice','ST1'],
  ['Contoh pengamalan sila pertama','Mudah','multiple-choice',''],
  ['Contoh pengamalan sila ketiga','Sedang','multiple-choice',''],
  ['Mengidentifikasi aturan dalam teks','Sedang','multiple-choice','ST1'],
  ['Mengidentifikasi simbol dan sila Pancasila','Sedang','multiple-choice',''],
  ['Mengidentifikasi informasi identitas diri','Mudah','multiple-choice','ST2'],
  ['Jumlah sila Pancasila','Mudah','text',''],
  ['Simbol sila kelima','Mudah','text',''],
  ['Tokoh perumus Pancasila','Sedang','multiple-choice',''],
  ['Tokoh anggota BPUPKI dan perumus dasar negara','Sedang','multiple-choice',''],
  ['Aturan dan kewajiban di rumah','Mudah','multiple-choice',''],
  ['Identitas diri','Mudah','multiple-choice','ST2'],
  ['Perilaku sesuai dengan sila Pancasila','Sedang','multiple-choice',''],
  ['Informasi identitas diri dan hobi','Mudah','multiple-choice','ST2'],
  ['Menyebutkan contoh aturan di rumah','Sedang','open-response',''],
  ['Alasan melaksanakan tugas sebelum bermain','Sulit','open-response',''],
  ['Menuliskan identitas diri berdasarkan teks','Mudah','text','ST2'],
  ['Menyebutkan tokoh perumus Pancasila','Mudah','text',''],
  ['Sikap menghargai perbedaan dan persatuan','Sulit','open-response',''],
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
        stimulusId=`BIAN-PAN-S1-${variant}-${stimulusCode}`;
        stimulusOrder=(stimulusOrders.get(stimulusId)||0)+1;
        stimulusOrders.set(stimulusId,stimulusOrder);
      }
      bank.push({
        id:`BIAN-G2-PAN-S1-${String(number).padStart(3,'0')}`,
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

test('Pancasila Grade 2 Assessment blueprint is 26 questions and 90 minutes',()=>{
  const blueprint=getBianPancasilaBlueprint();
  assert.equal(blueprint.id,'bian-pancasila-mid-s1-2026');
  assert.equal(blueprint.targetQuestions,26);
  assert.equal(blueprint.durationMinutes,90);
  assert.deepEqual(blueprint.typeTargets,{'multiple-choice':18,text:4,'open-response':4});
  assert.deepEqual(blueprint.difficultyTargets,{mudah:13,sedang:10,sulit:3});
  assert.equal(Object.values(blueprint.topicTargets).reduce((a,b)=>a+b,0),26);
});

test('all 26 MHIS pointer topic labels map to distinct assessment categories',()=>{
  const categories=slots.map(([topic])=>bianPancasilaTopicCategory({topic}));
  assert.equal(categories.filter(Boolean).length,26);
  assert.equal(new Set(categories).size,26);
});

test('78-question three-variant bank returns one complete 26-question paper with intact stimulus blocks',()=>{
  const bank=makeBank();
  for(let run=0;run<80;run+=1){
    const selected=selectBianPancasilaQuestions(bank,BIAN_PANCASILA_BLUEPRINT);
    assert.equal(selected.length,26);
    assert.deepEqual(countBy(selected,(q)=>q.difficulty),{Mudah:13,Sedang:10,Sulit:3});
    assert.deepEqual(countBy(selected,(q)=>q.type),{'multiple-choice':18,'open-response':4,text:4});
    const categories=countBy(selected,bianPancasilaTopicCategory);
    assert.equal(Object.keys(categories).length,26);
    assert.ok(Object.values(categories).every((count)=>count===1));

    const variantPrefixes=new Set(selected.map((q)=>Math.floor((Number(q.id.slice(-3))-1)/26)));
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

test('selector rejects a broken 26-question variant',()=>{
  const bank=makeBank().filter((q)=>!['BIAN-G2-PAN-S1-006','BIAN-G2-PAN-S1-032','BIAN-G2-PAN-S1-058'].includes(q.id));
  assert.throws(()=>selectBianPancasilaQuestions(bank),/belum memiliki satu varian 26 soal/i);
});
