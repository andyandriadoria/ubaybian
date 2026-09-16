import test from 'node:test';
import assert from 'node:assert/strict';
import { gameRewardForScore } from '../src/engagement.js';

test('existing game reward math stays unchanged', () => {
  assert.deepEqual(gameRewardForScore('speed-math', 12), { score: 12, rawXp: 12 });
  assert.deepEqual(gameRewardForScore('memory-grid', 5), { score: 5, rawXp: 5 });
});

test('Lab Rescue caps score at 900 and XP at 10 per run', () => {
  assert.deepEqual(gameRewardForScore('lab-rescue', 900), { score: 900, rawXp: 10 });
  assert.deepEqual(gameRewardForScore('lab-rescue', 450), { score: 450, rawXp: 5 });
  assert.deepEqual(gameRewardForScore('lab-rescue', 9999), { score: 900, rawXp: 10 });
});
