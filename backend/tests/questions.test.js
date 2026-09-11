import test from 'node:test';
import assert from 'node:assert/strict';
import { isCorrectAnswer, parsePublishedQuestions, publicQuestion, sheetConfig } from '../src/questions.js';

const header = ['ID Soal','Bab / Topik','Semester','Jenis Soal','Pertanyaan','Gambar Soal','Pilihan A','Pilihan B','Pilihan C','Pilihan D','Gambar A','Gambar B','Gambar C','Gambar D','Kunci Jawaban','Pembahasan','Kesulitan','Status','Sumber / Catatan'];

test('only Published questions enter the bank and keys stay private', () => {
  const rows = [header,
    ['m-1','Bilangan','1','Pilihan Ganda','2 + 2 =','','3','4','','','','','','','B','Karena 2 + 2 = 4','Mudah','Published',''],
    ['m-2','Bilangan','1','Pilihan Ganda','draft','','1','2','','','','','','','A','','Mudah','Draft',''],
  ];
  const questions = parsePublishedQuestions(rows);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].answerKey, 'B');
  const safe = publicQuestion(questions[0]);
  assert.equal('answerKey' in safe, false);
  assert.equal(safe.choices.length, 2);
});

test('one invalid Published row blocks the snapshot', () => {
  const rows = [header, ['x','','1','Pilihan Ganda','Soal','','A','B','','','','','','','D','','Mudah','Published','']];
  assert.throws(() => parsePublishedQuestions(rows), /Published belum valid/);
});

test('text answers support || variants without exposing normalization to client', () => {
  const q = { type:'text', answerKey:'empat||4' };
  assert.equal(isCorrectAnswer(q, ' Empat '), true);
  assert.equal(isCorrectAnswer(q, '5'), false);
});

test('profile subject mapping and sheet ids stay server-side', () => {
  const env = { UBAY_SHEET_ID:'private-ubay', BIAN_SHEET_ID:'private-bian' };
  assert.deepEqual(sheetConfig(env, 'ubay', 'math'), { spreadsheetId:'private-ubay', sheetName:'MATH' });
  assert.throws(() => sheetConfig(env, 'bian', 'informatika'), /tidak tersedia/);
});
