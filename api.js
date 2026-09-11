import {normalizeSession,normalizeAnswerResult} from './quiz.js';

export class ApiError extends Error{
 constructor(message,status=0,code='API_ERROR'){super(message);this.name='ApiError';this.status=status;this.code=code;}
}

async function parseResponse(response){
 let data=null;try{data=await response.json();}catch{/* A non-JSON failure still gets a safe generic message. */}
 if(!response.ok){const message=typeof data?.message==='string'?data.message:'Layanan belajar sedang tidak tersedia.';throw new ApiError(message,response.status,typeof data?.code==='string'?data.code:'HTTP_ERROR');}
 if(!data||typeof data!=='object')throw new ApiError('Respons server tidak valid.',response.status,'INVALID_RESPONSE');
 return data;
}

export function createApiClient(baseUrl,fetchImpl=globalThis.fetch){
 if(!baseUrl)throw new Error('API base URL belum dikonfigurasi.');
 if(typeof fetchImpl!=='function')throw new Error('Fetch API tidak tersedia.');
 const call=async(path,options={})=>parseResponse(await fetchImpl(`${baseUrl}${path}`,{credentials:'include',headers:{'Accept':'application/json','Content-Type':'application/json',...(options.headers??{})},...options}));
 return Object.freeze({
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
