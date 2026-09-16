import test from 'node:test';
import assert from 'node:assert/strict';
import { gameRewardForScore } from '../src/engagement.js';

test('active game reward math stays unchanged', () => {
  assert.deepEqual(gameRewardForScore('speed-math', 12), { score: 12, rawXp: 12 });
  assert.deepEqual(gameRewardForScore('memory-grid', 5), { score: 5, rawXp: 5 });
});
