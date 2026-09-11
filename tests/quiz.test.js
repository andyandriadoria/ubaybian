import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeQuestion,normalizeSession,normalizeAnswerResult} from '../quiz.js';

test('question payload never accepts a leaked answer key',()=>{
 assert.throws(()=>normalizeQuestion({id:'q1',type:'multiple-choice',prompt:'2+2?',choices:[{id:'A',text:'3'},{id:'B',text:'4'}],answerKey:'B'}),/kunci jawaban/i);
});

test('question payload keeps only display-safe fields',()=>{
 const q=normalizeQuestion({id:'q1',type:'multiple-choice',prompt:'Pilih jawaban',imageUrl:'javascript:alert(1)',choices:[{id:'A',text:'Satu'},{id:'B',text:'Dua',imageUrl:'https://example.com/b.png'}],difficulty:'easy'});
 assert.equal(q.imageUrl,'');assert.equal(q.choices[1].imageUrl,'https://example.com/b.png');assert.equal(q.choices.length,2);
});

test('session and answer responses are normalized',()=>{
 const session=normalizeSession({sessionId:'s1',progress:{current:1,total:5},question:{id:'q1',type:'text',prompt:'Jawab ini'}});
 assert.equal(session.sessionId,'s1');assert.equal(session.progress.total,5);
 const result=normalizeAnswerResult({correct:true,explanation:'Bagus',xpEarned:5,sessionComplete:true,progress:{current:5,total:5}});
 assert.equal(result.correct,true);assert.equal(result.xpEarned,5);assert.equal(result.sessionComplete,true);
});
