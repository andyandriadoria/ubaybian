import {normalizeSession,normalizeAnswerResult,normalizeExamState,normalizeExamSave,normalizeExamResult} from './quiz.js?v=0.5.51';

const SESSION_KEY='ubaybian:family-session:v1';

export class ApiError extends Error{
 constructor(message,status=0,code='API_ERROR'){super(message);this.name='ApiError';this.status=status;this.code=code;}
}

export function getSessionToken(){
 try{return localStorage.getItem(SESSION_KEY)||'';}catch{return '';}
}
export function setSessionToken(value){
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
 return Object.freeze({
  async login({username,password}){
   const data=await call('/v1/auth/login',{method:'POST',body:JSON.stringify({username,password})});
   if(typeof data.token!=='string'||!data.token)throw new ApiError('Token login tidak tersedia.',200,'INVALID_LOGIN_RESPONSE');
   setSessionToken(data.token);return data;
  },
  async me(){return call('/v1/auth/me',{method:'GET'});},
  async logout(){try{return await call('/v1/auth/logout',{method:'POST',body:'{}'});}finally{clearSessionToken();}},
  async dashboard(profileId){return call(`/v1/dashboard/${encodeURIComponent(profileId)}`,{method:'GET'});},
  async progress(profileId=''){return call(profileId?`/v1/progress/${encodeURIComponent(profileId)}`:'/v1/progress',{method:'GET'});},
  async startQuiz({profileId,subjectId,limit,mode='normal'}){
   const data=await call('/v1/quiz/sessions',{method:'POST',body:JSON.stringify({profileId,subjectId,limit,mode})});
   return normalizeSession(data);
  },
  async submitAnswer(sessionId,{questionId,answer='',skip=false,idempotencyKey}){
   const data=await call(`/v1/quiz/sessions/${encodeURIComponent(sessionId)}/answers`,{
    method:'POST',
    headers:{'Idempotency-Key':idempotencyKey},
    body:JSON.stringify({questionId,answer,skip}),
   });
   return normalizeAnswerResult(data);
  },
  async startExam({profileId,subjectId,blueprintId=''}){
   const data=await call('/v1/exam/sessions',{method:'POST',body:JSON.stringify({profileId,subjectId,blueprintId})});
   return normalizeExamState(data);
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
   return normalizeExamResult(data);
  }
 });
}
