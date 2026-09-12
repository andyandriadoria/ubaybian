const forbiddenQuestionFields=['answerKey','correctAnswer','kunciJawaban','correctOption','solutionKey'];
const allowedTypes=new Set(['multiple-choice','text','image-choice','open-response']);

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
 return Object.freeze({
   sessionId,
   subjectId:text(data.subjectId,80),
   mode:text(data.mode,30)||'normal',
   question:normalizeQuestion(data.question),
   progress:{current:Number.isFinite(current)?current:1,total:Number.isFinite(total)?total:0},
 });
}

function normalizeSummary(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 return Object.freeze({
   score:Math.max(0,Math.min(100,Number(value.score)||0)),
   correct:Math.max(0,Number(value.correct)||0),
   wrong:Math.max(0,Number(value.wrong)||0),
   skipped:Math.max(0,Number(value.skipped)||0),
   total:Math.max(0,Number(value.total)||0),
   xpEarned:Math.max(0,Number(value.xpEarned)||0),
   coinsEarned:Math.max(0,Number(value.coinsEarned)||0),
   completionXp:Math.max(0,Number(value.completionXp)||0),
   perfectBonusCoins:Math.max(0,Number(value.perfectBonusCoins)||0),
 });
}

export function normalizeAnswerResult(input){
 const data=requireObject(input,'Hasil jawaban');
 if(typeof data.correct!=='boolean')throw new Error('Status jawaban tidak valid.');
 const nextQuestion=data.nextQuestion?normalizeQuestion(data.nextQuestion):null;
 return Object.freeze({
   correct:data.correct,
   skipped:Boolean(data.skipped),
   correctAnswer:text(data.correctAnswer,1000),
   explanation:text(data.explanation,4000),
   xpEarned:Math.max(0,Number(data.xpEarned)||0),
   coinEarned:Math.max(0,Number(data.coinEarned)||0),
   sessionComplete:Boolean(data.sessionComplete),
   summary:normalizeSummary(data.summary),
   nextQuestion,
   progress:{current:Number(data.progress?.current)||0,total:Number(data.progress?.total)||0},
 });
}

export function normalizeExamState(input){
 const data=requireObject(input,'Simulasi ujian');
 const sessionId=text(data.sessionId,160);
 if(!sessionId)throw new Error('Exam session ID tidak tersedia.');
 const current=Math.max(1,Number(data.progress?.current)||1);
 const total=Math.max(1,Number(data.progress?.total)||1);
 const blueprint=data.blueprint&&typeof data.blueprint==='object'?Object.freeze({
   id:text(data.blueprint.id,160),
   title:text(data.blueprint.title,200),
   subtitle:text(data.blueprint.subtitle,300),
   semester:Math.max(0,Number(data.blueprint.semester)||0),
   durationMinutes:Math.max(0,Number(data.blueprint.durationMinutes)||0),
   targetQuestions:Math.max(0,Number(data.blueprint.targetQuestions)||0),
 }):null;
 return Object.freeze({
   sessionId,
   subjectId:text(data.subjectId,80),
   blueprintId:text(data.blueprintId,160),
   title:text(data.title,200)||blueprint?.title||'Exam Simulation',
   durationMinutes:Math.max(0,Number(data.durationMinutes)||0),
   deadlineAt:Math.max(0,Number(data.deadlineAt)||0),
   remainingSeconds:Math.max(0,Number(data.remainingSeconds)||0),
   expired:Boolean(data.expired),
   answeredCount:Math.max(0,Number(data.answeredCount)||0),
   savedAnswer:text(data.savedAnswer,1000),
   progress:{current,total},
   question:normalizeQuestion(data.question),
   blueprint,
 });
}

export function normalizeExamSave(input){
 const data=requireObject(input,'Penyimpanan jawaban ujian');
 return Object.freeze({
   saved:Boolean(data.saved),
   needsReview:Boolean(data.needsReview),
   answeredCount:Math.max(0,Number(data.answeredCount)||0),
   deadlineAt:Math.max(0,Number(data.deadlineAt)||0),
   remainingSeconds:Math.max(0,Number(data.remainingSeconds)||0),
   expired:Boolean(data.expired),
 });
}

export function normalizeExamResult(input){
 const data=requireObject(input,'Hasil simulasi ujian');
 const summary=requireObject(data.summary,'Ringkasan ujian');
 const normalizedScore=summary.score===null||summary.score===undefined?null:Math.max(0,Math.min(100,Number(summary.score)||0));
 const normalizedAutoScore=summary.autoScore===null||summary.autoScore===undefined?null:Math.max(0,Math.min(100,Number(summary.autoScore)||0));
 const results=Array.isArray(data.results)?data.results.map((item)=>Object.freeze({
   position:Math.max(1,Number(item.position)||1),
   questionId:text(item.questionId,120),
   prompt:text(item.prompt,4000),
   answer:text(item.answer,1000),
   manualReview:Boolean(item.manualReview),
   needsReview:Boolean(item.needsReview),
   correct:item.correct===null||item.correct===undefined?null:Boolean(item.correct),
   correctAnswer:text(item.correctAnswer,1000),
   explanation:text(item.explanation,4000),
 })):[];
 return Object.freeze({
   sessionId:text(data.sessionId,160),
   title:text(data.title,200)||'Exam Simulation',
   blueprintId:text(data.blueprintId,160),
   summary:Object.freeze({
     score:normalizedScore,
     autoScore:normalizedAutoScore,
     correct:Math.max(0,Number(summary.correct)||0),
     wrong:Math.max(0,Number(summary.wrong)||0),
     unanswered:Math.max(0,Number(summary.unanswered)||0),
     answered:Math.max(0,Number(summary.answered)||0),
     total:Math.max(0,Number(summary.total)||0),
     autoTotal:Math.max(0,Number(summary.autoTotal)||0),
     autoAnswered:Math.max(0,Number(summary.autoAnswered)||0),
     autoUnanswered:Math.max(0,Number(summary.autoUnanswered)||0),
     writingTotal:Math.max(0,Number(summary.writingTotal)||0),
     writingAnswered:Math.max(0,Number(summary.writingAnswered)||0),
     writingUnanswered:Math.max(0,Number(summary.writingUnanswered)||0),
     reviewPending:Math.max(0,Number(summary.reviewPending)||0),
   }),
   results:Object.freeze(results),
 });
}

export function newIdempotencyKey(){
 if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
 return `ub-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
