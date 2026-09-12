import test from 'node:test';
import assert from 'node:assert/strict';
import { rewardFromExamStats } from '../src/exam-rewards.js';

test('first Mid Exam attempt earns performance and completion rewards', () => {
  const reward = rewardFromExamStats({ correct: 24, answered: 30, total: 30 }, true);
  assert.equal(reward.xpEarned, 170);
  assert.equal(reward.coinsEarned, 480);
  assert.equal(reward.completionXp, 50);
  assert.equal(reward.completionQualified, true);
  assert.equal(reward.completionThreshold, 24);
});

test('completion XP requires at least 80 percent answered', () => {
  const reward = rewardFromExamStats({ correct: 18, answered: 23, total: 30 }, true);
  assert.equal(reward.xpEarned, 90);
  assert.equal(reward.coinsEarned, 360);
  assert.equal(reward.completionXp, 0);
  assert.equal(reward.completionQualified, false);
});

test('retakes do not earn additional XP or coins', () => {
  const reward = rewardFromExamStats({ correct: 30, answered: 30, total: 30 }, false);
  assert.equal(reward.xpEarned, 0);
  assert.equal(reward.coinsEarned, 0);
  assert.equal(reward.correctXp, 0);
  assert.equal(reward.completionXp, 0);
  assert.equal(reward.correctCoins, 0);
  assert.equal(reward.firstAttempt, false);
});
