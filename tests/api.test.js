import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanBaseUrl} from '../config.js';
import {createApiClient} from '../api.js';

test('API URL requires HTTPS outside localhost',()=>{
 assert.equal(cleanBaseUrl('https://learn.example.com/'),'https://learn.example.com');
 assert.equal(cleanBaseUrl('http://localhost:8787/'),'http://localhost:8787');
 assert.throws(()=>cleanBaseUrl('http://example.com'),/HTTPS/);
});

test('quiz calls send cookies and an idempotency key',async()=>{
 const calls=[];
 const fakeFetch=async(url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>calls.length===1?{sessionId:'s1',progress:{current:1,total:1},question:{id:'q1',type:'text',prompt:'Hi'}}:{correct:true,sessionComplete:true,progress:{current:1,total:1}}};};
 const api=createApiClient('https://api.example.com',fakeFetch);
 await api.startQuiz({profileId:'ubay',subjectId:'math',limit:1});
 await api.submitAnswer('s1',{questionId:'q1',answer:'4',idempotencyKey:'idem-1'});
 assert.equal(calls[0].options.credentials,'include');
 assert.equal(calls[1].options.headers['Idempotency-Key'],'idem-1');
});
