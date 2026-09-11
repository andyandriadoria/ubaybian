import {normalizeSession,normalizeAnswerResult} from './quiz.js';

const SESSION_KEY='ubaybian:family-session:v1';

export class ApiError extends Error{
 constructor(message,status=0,code='API_ERROR'){super(message);this.name='ApiError';this.status=status;this.code=code;}
}

export function getSessionToken(){
 try{return localStorage.getItem(SESSION_KEY)||'';}catch{return '';}
}
export function setSessionToken(value){
 try{if(value)localStorage.setItem(SESSION_KEY,value);else localStorage.removeItem(SESSION_KEY);}catch{/* Storage may be unavailable; login will not persist. */}
}
export function clearSessionToken(){setSessionToken('');}

async function parseResponse(response){
 let data=null;try{data=await response.json();}catch{/* A non-JSON failure still gets a safe generic message. */}
 if(!response.ok){const message=typeof data?.message==='string'?data.message:'Layanan belajar sedang tidak tersedia.';throw new ApiError(message,response.status,typeof data?.code==='string'?data.code:'HTTP_ERROR');}
 if(!data||typeof data!=='object')throw new ApiError('Respons server tidak valid.',response.status,'INVALID_RESPONSE');
 return data;
}

export function createApiClient(baseUrl,fetchImpl=globalThis.fetch){
 if(!baseUrl)throw new Error('API base URL belum dikonfigurasi.');
 if(typeof fetchImpl!=='function')throw new Error('Fetch API tidak tersedia.');
 const call=async(path,options={})=>{
  const token=getSessionToken();
  const headers={'Accept':'application/json','Content-Type':'application/json',...(token?{'Authorization':`Bearer ${token}`}:{}) ,...(options.headers??{})};
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
  async progress(profileId=''){return call(profileId?`/v1/progress/${encodeURIComponent(profileId)}`:'/v1/progress',{method:'GET'});},
  async startQuiz({profileId,subjectId,limit=10}){
   const data=await call('/v1/quiz/sessions',{method:'POST',body:JSON.stringify({profileId,subjectId,limit})});
   return normalizeSession(data);
  },
  async submitAnswer(sessionId,{questionId,answer,idempotencyKey}){
   const data=await call(`/v1/quiz/sessions/${encodeURIComponent(sessionId)}/answers`,{method:'POST',headers:{'Idempotency-Key':idempotencyKey},body:JSON.stringify({questionId,answer})});
   return normalizeAnswerResult(data);
  }
 });
}
