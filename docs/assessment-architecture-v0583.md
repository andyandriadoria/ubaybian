# Assessment Architecture — v0.5.83

UbayBian Assessment is now routed through a registry instead of subject-specific branching in `exam-service.js`.

## Flow

1. `assessment/registry.js` resolves an Assessment Definition.
2. The definition points to an immutable blueprint id/version and a Selection Strategy.
3. `assessment/selectors.js` resolves the strategy adapter.
4. The selected questions are snapshotted into `exam_session_questions`.
5. Result, Reward, Review, and Report continue to consume the stable session snapshot.

## Assessment Definition

Every current Assessment is described with:

- `profileSlug`
- `grade`
- `academicYear`
- `semester`
- `assessmentType`
- `subjectId`
- `blueprintId`
- `blueprintVersion`
- `selectionStrategy`
- `status`

The registry currently contains 6 Bian Grade 2 and 8 Ubay Grade 7 Semester 1 Midterm Assessments.

## Blueprint vs definition

The Assessment Definition identifies *when and for whom* an Assessment applies. The blueprint defines *what the paper looks like*: duration, number of questions, topic distribution, difficulty, question type, visual/stimulus constraints, and other paper rules.

Final S1, Midterm S2, Final S2, Grade 3, and Grade 8 should therefore add new definitions and new immutable blueprint versions as required by the actual school syllabus/pointer. They must not assume that a previous Midterm paper pattern is automatically reused.

## Selection Strategy

Definitions expose a strategy type while the registry currently points to compatibility adapters for the existing proven selectors. This keeps v0.5.82 behavior stable while removing branching from `exam-service.js`.

Current strategy types include:

- `topic-stimulus-quota`
- `topic-difficulty-quota`
- `topic-difficulty-visual-quota`
- `topic-difficulty-type-quota`
- `validated-variant`

Existing subject-specific selector code can be migrated into reusable generic strategies gradually without changing the registry contract.

## Academic context snapshot

Migration `0004_assessment_context.sql` adds nullable snapshot columns to `exam_sessions`:

- `assessment_definition_id`
- `academic_year`
- `grade`
- `semester`
- `assessment_type`
- `blueprint_version`
- `selection_strategy`

New Worker code is rolling-deploy safe: before migration 0004 is applied it falls back to the legacy insert, so current Assessment sessions continue working. After the migration is applied, new sessions automatically persist full academic context.

The `/v1/health` response exposes `db.assessmentContextReady` so deployment can verify that migration 0004 is active.

## Immutability rule

Once a blueprint has been used by a real session, its meaning must not be changed. Corrections to the paper specification should create a new blueprint version (`v2`, `v3`, etc.) and update the active Assessment Definition. Historical sessions remain tied to the version that created them.
