import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LAB_RUN_SIZE,
  LAB_MAX_SCORE,
  createLabMissionRun,
  missionScore,
  finaliseRunScore,
  labRankForTotalScore,
} from '../lab-rescue-engine.js';

test('Bian run contains five grade-appropriate procedural missions', () => {
  const run = createLabMissionRun('bian', { bestScore: 0, rng: () => 0.42 });
  assert.equal(run.missions.length, LAB_RUN_SIZE);
  assert.ok(run.missions.every((mission) => mission.choices.length >= 3));
  assert.ok(run.missions.every((mission) => mission.answer));
  assert.ok(run.missions.every((mission) => mission.difficulty <= 1));
});

test('Ubay adapts to higher difficulty after stronger performance', () => {
  const run = createLabMissionRun('ubay', { bestScore: 850, lastAccuracy: 1, rng: () => 0.73 });
  assert.equal(run.difficultyTier, 3);
  assert.equal(run.missions.length, LAB_RUN_SIZE);
  assert.ok(run.missions.some((mission) => mission.difficulty >= 2));
});

test('recent mission keys are avoided when enough alternatives exist', () => {
  const first = createLabMissionRun('ubay', { bestScore: 850, rng: () => 0.31 });
  const recent = first.missions.map((mission) => mission.key);
  const second = createLabMissionRun('ubay', { bestScore: 850, recentKeys: recent, rng: () => 0.61 });
  assert.equal(second.missions.length, LAB_RUN_SIZE);
  assert.ok(second.missions.every((mission) => !recent.includes(mission.key)));
});

test('perfect five-mission run caps at 900 Lab Energy', () => {
  let score = 0;
  for (let combo = 0; combo < 5; combo += 1) score += missionScore(true, combo);
  assert.equal(score, 800);
  assert.equal(finaliseRunScore(score, 5), LAB_MAX_SCORE);
});

test('lab rank is derived from lifetime Lab Energy', () => {
  assert.equal(labRankForTotalScore(0).label, 'Junior Researcher');
  assert.equal(labRankForTotalScore(1000).label, 'Lab Explorer');
  assert.equal(labRankForTotalScore(3000).label, 'Science Specialist');
  assert.equal(labRankForTotalScore(7000).label, 'Lead Researcher');
  assert.equal(labRankForTotalScore(15000).label, 'Master Scientist');
});
