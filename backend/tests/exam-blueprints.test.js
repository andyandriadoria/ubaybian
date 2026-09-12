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

const mathTargets = [
  ['N2.2D Mental Subtraction',5],
  ['N2.1D Number Words',2],
  ['N2.2E Add Three 1-digit Numbers',2],
  ['N2.1B Number Line and Zero',1],
  ['N2.1F Compare and Order',4],
  ['N2.2F Mathematical Statements',2],
  ['N2.1E Place Value and Expanded Form',2],
  ['N2.2C Mental Addition',2],
  ['N2.1G Rounding to Nearest 10',1],
  ['N2.2A Number Bonds to 20',2],
  ['N2.1H Ordinal Numbers',2],
  ['N2.1C Number Patterns',2],
  ['Extension (S) 3-digit Mental Calculation',1],
  ['Extension (S) 3-digit Algorithm',1],
  ['Extension (S) Number Words to 1000',1],
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

function expectedCounts(sourceTargets){
  const counts={};
  for(const [topic,count] of sourceTargets){
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

function makeThreeVariantMathBank(){
  const questions=[];
  let id=1;
  for(const variant of ['A','B','C']){
    for(const [topic,count] of mathTargets){
      for(let index=0;index<count;index+=1){
        questions.push(makeQuestion(`M-${variant}-${id++}`,topic));
      }
    }
  }
  return questions;
}

test('English Grade 2 Mid Exam blueprint has 30 questions and 90 minutes',()=>{
  const blueprint=getExamBlueprint('bian','english');
  assert.equal(blueprint.targetQuestions,30);
  assert.equal(blueprint.durationMinutes,90);
  assert.equal(Object.values(blueprint.topicTargets).reduce((a,b)=>a+b,0),30);
});

test('Math Grade 2 Mid Exam blueprint has 30 questions and 90 minutes',()=>{
  const blueprint=getExamBlueprint('bian','math');
  assert.equal(blueprint.id,'bian-math-mid-s1-2026');
  assert.equal(blueprint.targetQuestions,30);
  assert.equal(blueprint.durationMinutes,90);
  assert.equal(Object.values(blueprint.topicTargets).reduce((a,b)=>a+b,0),30);
});

test('topic aliases map MHIS pointer labels to canonical categories',()=>{
  assert.equal(topicCategory(makeQuestion('1','Grammar (verbs in context)')),'verbs');
  assert.equal(topicCategory(makeQuestion('2','Reading comprehension (reasoning)')),'reading-reasoning');
  assert.equal(topicCategory(makeQuestion('3','Vocabulary (colours)')),'colour-vocabulary');
  assert.equal(topicCategory(makeQuestion('4','N2.2D Mental Subtraction')),'math-mental-subtraction');
  assert.equal(topicCategory(makeQuestion('5','N2.1F Compare and Order')),'math-compare-order');
  assert.equal(topicCategory(makeQuestion('6','Extension (S) Number Words to 1000')),'math-extension-number-words');
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

test('English exam selector satisfies blueprint and keeps stimulus questions together',()=>{
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

test('English 90-question three-variant bank always assembles an exact 30-question paper',()=>{
  const blueprint=getExamBlueprint('bian','english');
  const bank=makeThreeVariantBank();
  const expected=expectedCounts(targets);
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

test('Math 90-question three-variant bank always assembles exact pointer coverage',()=>{
  const blueprint=getExamBlueprint('bian','math');
  const bank=makeThreeVariantMathBank();
  const expected=expectedCounts(mathTargets);
  for(let run=0;run<60;run+=1){
    const selected=selectExamQuestions(bank,blueprint);
    assert.equal(selected.length,30);
    assert.deepEqual(categoryCounts(selected),expected);
  }
});

test('exam selector rejects an incomplete bank',()=>{
  assert.throws(()=>selectExamQuestions([makeQuestion('1','feelings')],getExamBlueprint('bian','english')),/Bank soal belum cukup/);
  assert.throws(()=>selectExamQuestions([makeQuestion('1','N2.2D Mental Subtraction')],getExamBlueprint('bian','math')),/Bank soal belum cukup/);
});
