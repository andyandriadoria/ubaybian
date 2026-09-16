import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LAB_MAX_SCORE,
  createLabShift,
  evaluateLabAction,
  finaliseShiftScore,
  labJobScore,
  labRankForTotalScore,
} from '../lab-rescue-engine.js';

test('Bian shift is station-based and contains direct-interaction jobs', () => {
  const shift = createLabShift('bian', { rng: () => 0.42 });
  assert.equal(shift.stations.length, 4);
  assert.ok(shift.config.shiftSeconds >= 60);
  assert.ok(shift.jobs.length >= 7);
  assert.ok(shift.jobs.every((job) => job.stationId));
  assert.ok(shift.jobs.every((job) => ['slider','tools','sort','connect','controls'].includes(job.mechanic.kind)));
  assert.ok(shift.jobs.every((job) => !('choices' in job)));
  assert.ok(shift.jobs.every((job) => !('answer' in job)));
});

test('Ubay shift uses deeper science stations and direct mechanics', () => {
  const shift = createLabShift('ubay', { bestScore: 850, rng: () => 0.73 });
  const ids = new Set(shift.stations.map((station) => station.id));
  assert.deepEqual(ids, new Set(['bio','separation','power','matter']));
  assert.ok(shift.jobs.some((job) => job.mechanic.kind === 'connect'));
  assert.ok(shift.jobs.some((job) => job.mechanic.kind === 'sort'));
  assert.ok(shift.jobs.some((job) => job.mechanic.kind === 'controls'));
});

test('slider action succeeds only inside its target zone', () => {
  const shift = createLabShift('bian', { rng: () => 0.1 });
  const job = shift.jobs.find((item) => item.mechanic.kind === 'slider');
  assert.ok(job);
  assert.equal(evaluateLabAction(job, { value: job.mechanic.targetMin }), true);
  assert.equal(evaluateLabAction(job, { value: job.mechanic.min }), false);
});

test('tool, sort, and connect actions validate the physical task state', () => {
  const bian = createLabShift('bian', { rng: () => 0.2 });
  const tool = bian.jobs.find((item) => item.mechanic.kind === 'tools');
  assert.equal(evaluateLabAction(tool, { toolId: tool.mechanic.correctToolId }), true);

  const sort = bian.jobs.find((item) => item.mechanic.kind === 'sort');
  const placements = Object.fromEntries(sort.mechanic.items.map((item) => [item.id, item.bin]));
  assert.equal(evaluateLabAction(sort, { placements }), true);

  const ubay = createLabShift('ubay', { rng: () => 0.3 });
  const connect = ubay.jobs.find((item) => item.mechanic.kind === 'connect');
  assert.equal(evaluateLabAction(connect, { sequence: connect.mechanic.sequence }), true);
  assert.equal(evaluateLabAction(connect, { sequence: [...connect.mechanic.sequence].reverse() }), false);
});

test('fast chained jobs score more but final shift remains capped', () => {
  const slow = labJobScore({ waitedMs: 22000, patienceMs: 24000, comboBefore: 0 });
  const fast = labJobScore({ waitedMs: 1000, patienceMs: 24000, comboBefore: 3 });
  assert.ok(fast > slow);
  assert.equal(finaliseShiftScore(1000, 100), LAB_MAX_SCORE);
});

test('lab rank is derived from lifetime Lab Energy', () => {
  assert.equal(labRankForTotalScore(0).label, 'Junior Researcher');
  assert.equal(labRankForTotalScore(1000).label, 'Lab Explorer');
  assert.equal(labRankForTotalScore(3000).label, 'Science Specialist');
  assert.equal(labRankForTotalScore(7000).label, 'Lead Researcher');
  assert.equal(labRankForTotalScore(15000).label, 'Master Scientist');
});
