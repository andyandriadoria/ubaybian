import test from 'node:test';
import assert from 'node:assert/strict';
import { gameRewardForScore } from '../src/engagement.js';

test('existing game reward math stays unchanged', () => {
  assert.deepEqual(gameRewardForScore('speed-math', 12), { score: 12, rawXp: 12 });
  assert.deepEqual(gameRewardForScore('memory-grid', 5), { score: 5, rawXp: 5 });
});

test('removed games are not eligible for rewards', () => {
  assert.equal(gameRewardForScore('lab-rescue', 900), null);
});
