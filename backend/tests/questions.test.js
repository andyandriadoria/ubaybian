import test from 'node:test';
import assert from 'node:assert/strict';
import {
  attachStimuli,
  isCorrectAnswer,
  parsePublishedQuestions,
  parsePublishedStimuli,
  publicQuestion,
  questionForSnapshot,
  selectGroupedQuestions,
  sheetConfig,
} from '../src/questions.js';

const header = ['ID Soal','Bab / Topik','Semester','Jenis Soal','Pertanyaan','Gambar Soal','Pilihan A','Pilihan B','Pilihan C','Pilihan D','Gambar A','Gambar B','Gambar C','Gambar D','Kunci Jawaban','Pembahasan','Kesulitan','Status','Sumber / Catatan','Stimulus ID','Urutan Dalam Set'];
const stimulusHeader = ['Stimulus ID','Mapel','Semester','Judul','Teks / Passage','Gambar','Status','Sumber / Catatan'];

test('Aktif/Published questions enter the bank and keys stay private', () => {
  const rows = [header,
    ['m-1','Bilangan','1','Pilihan Ganda','2 + 2 =','','3','4','','','','','','','B','Karena 2 + 2 = 4','Mudah','Aktif','','',''],
    ['m-2','Bilangan','1','Pilihan Ganda','draft','','1','2','','','','','','','A','','Mudah','Draft','','',''],
  ];
  const questions = parsePublishedQuestions(rows);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].answerKey, 'B');
  const safe = publicQuestion(questions[0]);
  assert.equal('answerKey' in safe, false);
  assert.equal(safe.choices.length, 2);
});

test('one invalid live row blocks the snapshot', () => {
  const rows = [header, ['x','','1','Pilihan Ganda','Soal','','A','B','','','','','','','D','','Mudah','Published','','','']];
  assert.throws(() => parsePublishedQuestions(rows), /Aktif\/Published belum valid/);
});

test('text answers support || variants without exposing normalization to client', () => {
  const q = { type:'text', answerKey:'empat||4' };
  assert.equal(isCorrectAnswer(q, ' Empat '), true);
  assert.equal(isCorrectAnswer(q, '5'), false);
});

test('profile subject mapping stays server-side', () => {
  assert.deepEqual(sheetConfig('ubay', 'math'), { profileSlug:'ubay', sheetName:'MATH' });
  assert.throws(() => sheetConfig('bian', 'informatika'), /tidak tersedia/);
});

test('stimulus is attached to related questions with strict order', () => {
  const rows = [header,
    ['e-1','Reading','1','Pilihan Ganda','Where is Nia?','','Home','Park','','','','','','','B','','Mudah','Aktif','','BIAN-ENG-ST-001','1'],
    ['e-2','Reading','1','Pilihan Ganda','How does Nia feel?','','Happy','Sad','','','','','','','A','','Sedang','Aktif','','BIAN-ENG-ST-001','2'],
  ];
  const stimulusRows = [stimulusHeader,
    ['BIAN-ENG-ST-001','ENGLISH','1','At the Park','Nia goes to the park. She smiles when she sees her friend.','','Aktif','MHIS practice'],
  ];
  const questions = parsePublishedQuestions(rows);
  const stimuli = parsePublishedStimuli(stimulusRows);
  const attached = attachStimuli(questions, stimuli, 'ENGLISH');
  assert.equal(attached[0].stimulus.total, 2);
  assert.equal(attached[1].stimulus.order, 2);
  const snapshot = questionForSnapshot(attached[0]);
  assert.match(snapshot.prompt, /At the Park/);
  assert.match(snapshot.prompt, /Question 1 of 2/);
  assert.match(snapshot.prompt, /Where is Nia\?/);
});

test('normal/challenge selection keeps one stimulus set together and ordered', () => {
  const base = { type:'multiple-choice', choices:[{id:'A',text:'A',imageUrl:''},{id:'B',text:'B',imageUrl:''}], answerKey:'A', explanation:'', semester:'1', difficulty:'Mudah', topic:'Reading', imageUrl:'' };
  const questions = [1, 2, 3].map((order) => ({ ...base, id:`q-${order}`, prompt:`Q${order}`, stimulusId:'s-1', stimulusOrder:order }));
  const selected = selectGroupedQuestions(questions, 3, 'bian', 'normal');
  assert.deepEqual(selected.map((q) => q.id), ['q-1','q-2','q-3']);
});
