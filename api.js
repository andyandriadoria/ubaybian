import {normalizeSession,normalizeAnswerResult,normalizeExamState,normalizeExamSave,normalizeExamResult} from './quiz.js';

const SESSION_KEY='ubaybian:family-session:v1';
const DASHBOARD_SOFT_TTL_MS=15_000;
const DASHBOARD_HARD_TTL_MS=120_000;
const dashboardCache=new Map();
const dashboardInflight=new Map();
const quizSessionProfiles=new Map();
const examSessionProfiles=new Map();

function dashboardKey(baseUrl,profileId){return `${baseUrl}::${String(profileId||'')}`;}
function clearDashboardCache(){dashboardCache.clear();dashboardInflight.clear();}
export function invalidateDashboardCache(profileId=''){
 const suffix=`::${String(profileId||'')}`;
 for(const key of [...dashboardCache.keys()])if(!profileId||key.endsWith(suffix))dashboardCache.delete(key);
}

export class ApiError extends Error{
 constructor(message,status=0,code='API_ERROR'){super(message);this.name='ApiError';this.status=status;this.code=code;}
}

export function getSessionToken(){
 try{return localStorage.getItem(SESSION_KEY)||'';}catch{return '';}
}
export function setSessionToken(value){
 clearDashboardCache();
 try{if(value)localStorage.setItem(SESSION_KEY,value);else localStorage.removeItem(SESSION_KEY);}catch{/* Storage may be unavailable. */}
}
export function clearSessionToken(){setSessionToken('');}

async function parseResponse(response){
 let data=null;
 try{data=await response.json();}catch{/* Keep a safe fallback for non-JSON failures. */}
 if(!response.ok){
  const message=typeof data?.message==='string'?data.message:'Layanan belajar sedang tidak tersedia.';
  throw new ApiError(message,response.status,typeof data?.code==='string'?data.code:'HTTP_ERROR');
 }
 if(!data||typeof data!=='object')throw new ApiError('Respons server tidak valid.',response.status,'INVALID_RESPONSE');
 return data;
}

export function createApiClient(baseUrl,fetchImpl=globalThis.fetch){
 if(!baseUrl)throw new Error('API base URL belum dikonfigurasi.');
 if(typeof fetchImpl!=='function')throw new Error('Fetch API tidak tersedia.');
 const call=async(path,options={})=>{
  const token=getSessionToken();
  const headers=new Headers(options.headers||{});
  if(!headers.has('Accept'))headers.set('Accept','application/json');
  if(!headers.has('Content-Type'))headers.set('Content-Type','application/json');
  if(token)headers.set('Authorization',`Bearer ${token}`);
  return parseResponse(await fetchImpl(`${baseUrl}${path}`,{...options,headers}));
 };
 const refreshDashboard=(profileId,key)=>{
  if(dashboardInflight.has(key))return dashboardInflight.get(key);
  const pending=call(`/v1/dashboard/${encodeURIComponent(profileId)}`,{method:'GET'})
   .then((data)=>{dashboardCache.set(key,{data,fetchedAt:Date.now()});return data;})
   .finally(()=>dashboardInflight.delete(key));
  dashboardInflight.set(key,pending);
  return pending;
 };
 return Object.freeze({
  async login({username,password}){
   const data=await call('/v1/auth/login',{method:'POST',body:JSON.stringify({username,password})});
   if(typeof data.token!=='string'||!data.token)throw new ApiError('Token login tidak tersedia.',200,'INVALID_LOGIN_RESPONSE');
   setSessionToken(data.token);return data;
  },
  async me(){return call('/v1/auth/me',{method:'GET'});},
  async logout(){try{return await call('/v1/auth/logout',{method:'POST',body:'{}'});}finally{clearSessionToken();}},
  async dashboard(profileId,{force=false}={}){
   const key=dashboardKey(baseUrl,profileId);
   const cached=dashboardCache.get(key);
   const age=cached?Date.now()-cached.fetchedAt:Infinity;
   if(!force&&cached&&age<DASHBOARD_HARD_TTL_MS){
    if(age>=DASHBOARD_SOFT_TTL_MS&&!dashboardInflight.has(key))refreshDashboard(profileId,key).catch(()=>{});
    return cached.data;
   }
   return refreshDashboard(profileId,key);
  },
  invalidateDashboard(profileId=''){invalidateDashboardCache(profileId);},
  async progress(profileId=''){return call(profileId?`/v1/progress/${encodeURIComponent(profileId)}`:'/v1/progress',{method:'GET'});},
  async startQuiz({profileId,subjectId,limit,mode='normal'}){
   const data=await call('/v1/quiz/sessions',{method:'POST',body:JSON.stringify({profileId,subjectId,limit,mode})});
   const normalized=normalizeSession(data);
   if(normalized?.sessionId)quizSessionProfiles.set(String(normalized.sessionId),String(profileId));
   return normalized;
  },
  async submitAnswer(sessionId,{questionId,answer='',skip=false,idempotencyKey}){
   const data=await call(`/v1/quiz/sessions/${encodeURIComponent(sessionId)}/answers`,{
    method:'POST',
    headers:{'Idempotency-Key':idempotencyKey},
    body:JSON.stringify({questionId,answer,skip}),
   });
   const profileId=quizSessionProfiles.get(String(sessionId));
   if(profileId)invalidateDashboardCache(profileId);
   return normalizeAnswerResult(data);
  },
  async startExam({profileId,subjectId,blueprintId=''}){
   const data=await call('/v1/exam/sessions',{method:'POST',body:JSON.stringify({profileId,subjectId,blueprintId})});
   const normalized=normalizeExamState(data);
   if(normalized?.sessionId)examSessionProfiles.set(String(normalized.sessionId),String(profileId));
   return normalized;
  },
  async examQuestion(sessionId,position){
   const data=await call(`/v1/exam/sessions/${encodeURIComponent(sessionId)}/questions/${encodeURIComponent(position)}`,{method:'GET'});
   return normalizeExamState(data);
  },
  async saveExamAnswer(sessionId,{questionId,answer}){
   const data=await call(`/v1/exam/sessions/${encodeURIComponent(sessionId)}/answers`,{
    method:'POST',
    body:JSON.stringify({questionId,answer}),
   });
   return normalizeExamSave(data);
  },
  async finishExam(sessionId){
   const data=await call(`/v1/exam/sessions/${encodeURIComponent(sessionId)}/finish`,{method:'POST',body:'{}'});
   const profileId=examSessionProfiles.get(String(sessionId));
   if(profileId)invalidateDashboardCache(profileId);
   return normalizeExamResult(data);
  }
 });
}
