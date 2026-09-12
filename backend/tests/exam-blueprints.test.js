import test from 'node:test';
import assert from 'node:assert/strict';
import { getExamBlueprint, selectExamQuestions, topicCategory } from '../src/exam-blueprints.js';
import { randomizeChoicePositions } from '../src/questions.js';

const targets = [
  ['identifying animals',2],['colour vocabulary',2],['reading comprehension (place)',1],['reading comprehension (main idea)',1],
  ['animal behaviour',1],['feelings',2],['prediction',1],['punctuation',2],['sequence of events',1],
  ['vocabulary meaning',3],['grammar (nouns)',1],['reading comprehension (counting)',1],['reading comprehension (detail)',1],
  ['text evidence',2],['grammar (sentence structure)',1],['alphabet',2],['writing',2],['character identification',1],
  ['grammar (verbs)',2],['reading comprehension (reasoning)',1],
];

function makeQuestion(id,topic,{stimulusId='',stimulusOrder=0}={}){
  return {id,topic,semester:'1',difficulty:'Sedang',stimulusId,stimulusOrder};
}

function categoryCounts(questions){
  const counts={};
  for(const question of questions){
    const category=topicCategory(question);
    counts[category]=(counts[category]||0)+1;
  }
  return counts;
}

function expectedCounts(){
  const counts={};
  for(const [topic,count] of targets){
    const category=topicCategory(makeQuestion('expected',topic));
    counts[category]=count;
  }
  return counts;
}

function makeThreeVariantBank(){
  const block1=['identifying animals','colour vocabulary','reading comprehension (place)','reading comprehension (main idea)','animal behaviour','prediction'];
  const block2=['feelings','text evidence','sequence of events','vocabulary meaning','reading comprehension (detail)'];
  const block3=['identifying animals','colour vocabulary','character identification','reading comprehension (counting)','reading comprehension (reasoning)'];
  const standalone=['punctuation','punctuation','vocabulary meaning','vocabulary meaning','grammar (nouns)','grammar (sentence structure)','alphabet','alphabet','writing','writing','grammar (verbs)','grammar (verbs)','feelings','text evidence'];
  const questions=[];
  let id=1;
  for(const variant of ['A','B','C']){
    for(const [blockIndex,topics] of [block1,block2,block3].entries()){
      topics.forEach((topic,index)=>questions.push(makeQuestion(String(id++),topic,{stimulusId:`${variant}-ST-${blockIndex+1}`,stimulusOrder:index+1})));
    }
    standalone.forEach((topic)=>questions.push(makeQuestion(String(id++),topic)));
  }
  return questions;
}

test('English Grade 2 Mid Exam blueprint has 30 questions and 90 minutes',()=>{
  const blueprint=getExamBlueprint('bian','english');
  assert.equal(blueprint.targetQuestions,30);
  assert.equal(blueprint.durationMinutes,90);
  assert.equal(Object.values(blueprint.topicTargets).reduce((a,b)=>a+b,0),30);
});

test('topic aliases map MHIS pointer labels to canonical categories',()=>{
  assert.equal(topicCategory(makeQuestion('1','Grammar (verbs in context)')),'verbs');
  assert.equal(topicCategory(makeQuestion('2','Reading comprehension (reasoning)')),'reading-reasoning');
  assert.equal(topicCategory(makeQuestion('3','Vocabulary (colours)')),'colour-vocabulary');
});

test('balanced option randomizer spreads 24 four-choice answers evenly across A-D',()=>{
  const bank=Array.from({length:24},(_,index)=>({
    id:`MC-${index+1}`,
    type:'multiple-choice',
    answerKey:'A',
    choices:[
      {id:'A',text:`correct-${index+1}`,imageUrl:''},
      {id:'B',text:'wrong-b',imageUrl:''},
      {id:'C',text:'wrong-c',imageUrl:''},
      {id:'D',text:'wrong-d',imageUrl:''},
    ],
  }));
  const randomized=randomizeChoicePositions(bank);
  const counts={A:0,B:0,C:0,D:0};
  randomized.forEach((question,index)=>{
    counts[question.answerKey]+=1;
    const correct=question.choices.find((choice)=>choice.id===question.answerKey);
    assert.equal(correct.text,`correct-${index+1}`);
  });
  assert.deepEqual(counts,{A:6,B:6,C:6,D:6});
});

test('exam selector satisfies blueprint and keeps stimulus questions together',()=>{
  const questions=[];
  let id=1;
  for(const [topic,count] of targets){
    for(let i=0;i<count;i+=1){
      const options=topic==='feelings'&&i<2?{stimulusId:'STORY-1',stimulusOrder:i+1}:{};
      questions.push(makeQuestion(String(id++),topic,options));
    }
  }
  const selected=selectExamQuestions(questions,getExamBlueprint('bian','english'));
  assert.equal(selected.length,30);
  const storyPositions=selected.map((q,index)=>q.stimulusId==='STORY-1'?index:-1).filter((index)=>index>=0);
  assert.equal(storyPositions.length,2);
  assert.equal(storyPositions[1],storyPositions[0]+1);
  assert.equal(selected[storyPositions[0]].stimulusOrder,1);
  assert.equal(selected[storyPositions[1]].stimulusOrder,2);
});

test('90-question three-variant bank always assembles an exact 30-question paper',()=>{
  const blueprint=getExamBlueprint('bian','english');
  const bank=makeThreeVariantBank();
  const expected=expectedCounts();
  for(let run=0;run<60;run+=1){
    const selected=selectExamQuestions(bank,blueprint);
    assert.equal(selected.length,30);
    assert.deepEqual(categoryCounts(selected),expected);
    const stimulusIds=[...new Set(selected.map((q)=>q.stimulusId).filter(Boolean))];
    for(const stimulusId of stimulusIds){
      const positions=selected.map((q,index)=>q.stimulusId===stimulusId?index:-1).filter((index)=>index>=0);
      for(let i=1;i<positions.length;i+=1) assert.equal(positions[i],positions[i-1]+1);
    }
  }
});

test('exam selector rejects an incomplete bank',()=>{
  assert.throws(()=>selectExamQuestions([makeQuestion('1','feelings')],getExamBlueprint('bian','english')),/Bank soal belum cukup/);
});
