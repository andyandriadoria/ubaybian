import test from 'node:test';
import assert from 'node:assert/strict';
import {clearSessionToken,createApiClient,setSessionToken} from '../api.js';
import {cleanBaseUrl} from '../config.js';

test('API URL requires HTTPS outside localhost',()=>{
 assert.equal(cleanBaseUrl('https://learn.example.com/'),'https://learn.example.com');
 assert.equal(cleanBaseUrl('http://localhost:8787/'),'http://localhost:8787');
 assert.throws(()=>cleanBaseUrl('http://example.com'),/HTTPS/);
});

test('quiz calls send bearer session and idempotency key',async()=>{
 const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 setSessionToken('family-token');
 const calls=[];
 const fakeFetch=async(url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>calls.length===1?{sessionId:'s1',progress:{current:1,total:1},question:{id:'q1',type:'text',prompt:'Hi'}}:{correct:true,sessionComplete:true,progress:{current:1,total:1}}};};
 const api=createApiClient('https://api.example.com',fakeFetch);
 await api.startQuiz({profileId:'ubay',subjectId:'math',limit:1});
 await api.submitAnswer('s1',{questionId:'q1',answer:'4',idempotencyKey:'idem-1'});
 assert.equal(calls[0].options.headers.get('Authorization'),'Bearer family-token');
 assert.equal(calls[1].options.headers.get('Idempotency-Key'),'idem-1');
 clearSessionToken();
});
