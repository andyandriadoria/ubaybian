import test from 'node:test';
import assert from 'node:assert/strict';
import { getExamBlueprint, selectExamQuestions, topicCategory } from '../src/exam-blueprints.js';

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

test('exam selector rejects an incomplete bank',()=>{
  assert.throws(()=>selectExamQuestions([makeQuestion('1','feelings')],getExamBlueprint('bian','english')),/Bank soal belum cukup/);
});
