import test from 'node:test';
import assert from 'node:assert/strict';
import { rewardFromExamStats } from '../src/exam-rewards.js';

test('perfect Assessment keeps the 200 XP and 600 coin ceiling', () => {
  const reward = rewardFromExamStats({ correct: 30, answered: 30, autoTotal: 30, total: 30 }, true);
  assert.equal(reward.xpEarned, 200);
  assert.equal(reward.coinsEarned, 600);
  assert.equal(reward.effortXp, 50);
  assert.equal(reward.completionXp, 50);
  assert.equal(reward.accuracyXp, 100);
  assert.equal(reward.effortCoins, 100);
  assert.equal(reward.completionCoins, 100);
  assert.equal(reward.accuracyCoins, 400);
  assert.equal(reward.policyVersion, 2);
});

test('open responses contribute to effort and completion without diluting auto accuracy', () => {
  const reward = rewardFromExamStats({ correct: 12, answered: 20, autoTotal: 15, total: 20 }, true);
  assert.equal(reward.xpEarned, 180);
  assert.equal(reward.coinsEarned, 520);
  assert.equal(reward.effortXp, 50);
  assert.equal(reward.completionXp, 50);
  assert.equal(reward.accuracyXp, 80);
  assert.equal(reward.accuracyCoins, 320);
});

test('80 percent completion unlocks the qualifying completion tier', () => {
  const reward = rewardFromExamStats({ correct: 18, answered: 24, autoTotal: 30, total: 30 }, true);
  assert.equal(reward.completionQualified, true);
  assert.equal(reward.completionThreshold, 24);
  assert.equal(reward.fullCompletion, false);
  assert.equal(reward.effortXp, 40);
  assert.equal(reward.completionXp, 25);
  assert.equal(reward.accuracyXp, 60);
  assert.equal(reward.xpEarned, 125);
  assert.equal(reward.coinsEarned, 370);
});

test('below 80 percent answered earns no Assessment reward', () => {
  const reward = rewardFromExamStats({ correct: 18, answered: 23, autoTotal: 30, total: 30 }, true);
  assert.equal(reward.completionQualified, false);
  assert.equal(reward.xpEarned, 0);
  assert.equal(reward.coinsEarned, 0);
  assert.equal(reward.effortXp, 0);
  assert.equal(reward.accuracyXp, 0);
});

test('unanswered auto questions remain in the accuracy denominator', () => {
  const reward = rewardFromExamStats({ correct: 8, answered: 16, autoTotal: 15, total: 20 }, true);
  assert.equal(reward.completionQualified, true);
  assert.equal(reward.accuracyXp, 53);
  assert.equal(reward.accuracyCoins, 213);
});

test('an all-writing paper can still earn effort and completion rewards', () => {
  const reward = rewardFromExamStats({ correct: 0, answered: 20, autoTotal: 0, total: 20 }, true);
  assert.equal(reward.xpEarned, 100);
  assert.equal(reward.coinsEarned, 200);
  assert.equal(reward.accuracyXp, 0);
  assert.equal(reward.accuracyCoins, 0);
});

test('retakes do not earn additional XP or coins', () => {
  const reward = rewardFromExamStats({ correct: 30, answered: 30, autoTotal: 30, total: 30 }, false);
  assert.equal(reward.xpEarned, 0);
  assert.equal(reward.coinsEarned, 0);
  assert.equal(reward.effortXp, 0);
  assert.equal(reward.completionXp, 0);
  assert.equal(reward.accuracyXp, 0);
  assert.equal(reward.firstAttempt, false);
});
