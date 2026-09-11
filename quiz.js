const forbiddenQuestionFields=['answerKey','correctAnswer','kunciJawaban','correctOption','solutionKey'];
const allowedTypes=new Set(['multiple-choice','text','image-choice']);

function text(value,max=4000){return typeof value==='string'?value.trim().slice(0,max):'';}
function safeHttpsUrl(value){
 const raw=text(value,2000);if(!raw)return '';
 try{const url=new URL(raw);return url.protocol==='https:'?url.toString():'';}catch{return '';}
}
function requireObject(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${label} tidak valid.`);return value;}

export function normalizeQuestion(input){
 const q=requireObject(input,'Soal');
 for(const field of forbiddenQuestionFields)if(field in q)throw new Error('Payload soal memuat kunci jawaban sebelum dijawab.');
 const id=text(q.id,120);const prompt=text(q.prompt,4000);const type=text(q.type,40);
 if(!id||!prompt||!allowedTypes.has(type))throw new Error('Payload soal belum lengkap.');
 const choices=Array.isArray(q.choices)?q.choices.map((choice,index)=>{
   const item=requireObject(choice,`Pilihan ${index+1}`);
   const choiceId=text(item.id,20);const choiceText=text(item.text,1000);const imageUrl=safeHttpsUrl(item.imageUrl);
   if(!choiceId||(!choiceText&&!imageUrl))throw new Error('Pilihan jawaban tidak valid.');
   return Object.freeze({id:choiceId,text:choiceText,imageUrl});
 }):[];
 if((type==='multiple-choice'||type==='image-choice')&&choices.length<2)throw new Error('Pilihan jawaban belum lengkap.');
 return Object.freeze({id,type,prompt,imageUrl:safeHttpsUrl(q.imageUrl),choices,difficulty:text(q.difficulty,30)});
}

export function normalizeSession(input){
 const data=requireObject(input,'Sesi');const sessionId=text(data.sessionId,160);
 if(!sessionId)throw new Error('Session ID tidak tersedia.');
 const current=Number(data.progress?.current??1);const total=Number(data.progress?.total??0);
 return Object.freeze({sessionId,question:normalizeQuestion(data.question),progress:{current:Number.isFinite(current)?current:1,total:Number.isFinite(total)?total:0}});
}

export function normalizeAnswerResult(input){
 const data=requireObject(input,'Hasil jawaban');
 if(typeof data.correct!=='boolean')throw new Error('Status jawaban tidak valid.');
 const nextQuestion=data.nextQuestion?normalizeQuestion(data.nextQuestion):null;
 return Object.freeze({correct:data.correct,explanation:text(data.explanation,4000),xpEarned:Math.max(0,Number(data.xpEarned)||0),sessionComplete:Boolean(data.sessionComplete),nextQuestion,progress:{current:Number(data.progress?.current)||0,total:Number(data.progress?.total)||0}});
}

export function newIdempotencyKey(){
 if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
 return `ub-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
