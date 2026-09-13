import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSESSMENT_DEFINITIONS,
  assessmentDefinitionForBlueprint,
  publicAssessmentDefinition,
  resolveAssessmentDefinition,
} from '../src/assessment/registry.js';
import { selectionAdapterIds } from '../src/assessment/selectors.js';

test('registry contains every current Ubay and Bian Assessment exactly once', () => {
  assert.equal(ASSESSMENT_DEFINITIONS.length, 14);
  assert.equal(new Set(ASSESSMENT_DEFINITIONS.map((item) => item.id)).size, 14);
  assert.equal(new Set(ASSESSMENT_DEFINITIONS.map((item) => item.blueprintId)).size, 14);
  assert.equal(ASSESSMENT_DEFINITIONS.filter((item) => item.profileSlug === 'bian').length, 6);
  assert.equal(ASSESSMENT_DEFINITIONS.filter((item) => item.profileSlug === 'ubay').length, 8);
});

test('registry resolves current Assessment without subject-specific branching in exam service', () => {
  const science = resolveAssessmentDefinition('bian', 'science');
  assert.equal(science.definition.id, 'bian-g2-2026-2027-s1-midterm-science');
  assert.equal(science.blueprint.id, 'bian-science-mid-s1-2026');
  assert.equal(science.definition.selectionStrategy.type, 'topic-difficulty-type-quota');

  const math = resolveAssessmentDefinition('ubay', 'math', 'ubay-g7-2026-2027-s1-midterm-math');
  assert.equal(math.definition.blueprintId, 'ubay-math-mid-s1-2026');
  assert.equal(math.definition.grade, 7);
});

test('every definition points to a registered selector adapter', () => {
  const adapters = new Set(selectionAdapterIds());
  for (const definition of ASSESSMENT_DEFINITIONS) {
    assert.ok(adapters.has(definition.selectionStrategy.adapter), `${definition.id} adapter is registered`);
  }
});

test('public academic context can be inferred from immutable blueprint id', () => {
  const definition = assessmentDefinitionForBlueprint('bian-paibp-mid-s1-2026');
  const context = publicAssessmentDefinition(definition);
  assert.deepEqual(context, {
    id: 'bian-g2-2026-2027-s1-midterm-paibp',
    profile: 'bian',
    grade: 2,
    academicYear: '2026/2027',
    semester: 1,
    assessmentType: 'midterm',
    subjectId: 'paibp',
    blueprintId: 'bian-paibp-mid-s1-2026',
    blueprintVersion: 1,
    selectionStrategy: 'validated-variant',
    status: 'active',
  });
});
