# UbayBian API

Cloudflare Worker backend for UbayBian.

This folder contains the Worker source, D1 migrations, tests, and deployment configuration used by Cloudflare Builds. The production Worker is expected to deploy from the `main` branch with this folder configured as the build root.

## Assessment architecture

Assessment keeps the historical `exam_*` table/API naming for backward compatibility, but user-facing terminology is **Assessment**.

Since v0.5.83, Assessment is resolved through:

1. `src/assessment/registry.js` — Assessment Definition / catalog.
2. Blueprint provider — paper specification.
3. `src/assessment/selectors.js` — Selection Strategy adapter.
4. Question-bank snapshot in D1.
5. Result → Reward → Review → Report.

This removes subject-specific branching from `exam-service.js` and prepares the app for Final S1, Midterm S2, Final S2, Grade 3, Grade 8, and later academic years without changing the engine for every new paper.

The base Assessment schema is defined in `migrations/0003_exam_simulation.sql`. Migration `0004_assessment_context.sql` adds nullable academic-context snapshot fields (`grade`, `academic_year`, semester, assessment type, definition id, blueprint version, and selection strategy).

Apply pending D1 migrations with:

```bash
npm run db:remote
```

The v0.5.83 Worker is rolling-deploy safe: if migration 0004 has not yet been applied, Assessment creation falls back to the legacy session insert. `/v1/health` exposes `db.assessmentContextReady` so the deployment can verify whether the new snapshot schema is active.

## Current Assessment definitions

Configured Grade 2 Semester 1 Midterm blueprints:

- `bian-english-mid-s1-2026` — English, 30 questions, 90 minutes. Question Sets that share a stimulus remain contiguous when a paper is assembled.
- `bian-math-mid-s1-2026` — Math, 30 questions, 90 minutes. Topic coverage follows the locked school pointer and the selector enforces the audited 14 Mudah / 13 Sedang / 3 Sulit mix.
- `bian-science-mid-s1-2026` — Science, 44 questions, 60 minutes. The selector follows the MHIS pointer distribution, enforces 22 Mudah / 18 Sedang / 4 Sulit, and assembles 29 multiple-choice, 12 closed short-answer, and 3 open-response questions.
- `bian-bahasa-indonesia-mid-s1-2026` — Bahasa Indonesia, 34 questions, 90 minutes. Each paper uses one complete audited practice variant, preserves reading-stimulus blocks, and enforces 25 multiple-choice, 5 closed short-answer, 4 open-response questions with a 17 Mudah / 14 Sedang / 3 Sulit mix.
- `bian-pancasila-mid-s1-2026` — Pancasila, 26 questions, 90 minutes. The selector preserves the audited topic, type, and 13 Mudah / 10 Sedang / 3 Sulit distribution.
- `bian-paibp-mid-s1-2026` — PAIBP, 17 questions, 60 minutes operational duration until an official Assessment duration is supplied. The selector chooses only a complete validated variant with 9 multiple-choice, 3 closed short-answer, and 5 open-response questions.

Configured Grade 7 Semester 1 Midterm blueprints:

- `ubay-bahasa-indonesia-mid-s1-2026` — Bahasa Indonesia, 30 questions, 90 minutes.
- `ubay-english-mid-s1-2026` — English, 30 questions, 120 minutes, with reading sets and controlled writing/tense coverage.
- `ubay-global-citizenship-mid-s1-2026` — Global Citizenship, 30 questions, 90 minutes.
- `ubay-informatika-mid-s1-2026` — Informatika, 30 questions, 90 minutes.
- `ubay-math-mid-s1-2026` — Math, 30 questions, 120 minutes.
- `ubay-pai-mid-s1-2026` — PAI, 30 questions, 90 minutes.
- `ubay-pancasila-mid-s1-2026` — Pancasila, 30 questions, 90 minutes.
- `ubay-science-mid-s1-2026` — Science, 30 questions, 120 minutes, with a minimum visual-question target.

Blueprints already used in real sessions are treated as immutable. If a paper specification changes, create a new blueprint version and repoint the Assessment Definition instead of changing the historical meaning of the old blueprint.

## Assessment catalog API

`GET /v1/assessments/:profileId` returns active definitions for the profile's current grade. Optional filters: `subjectId`, `academicYear`, `semester`, and `assessmentType`.

`POST /v1/exam/sessions` remains backward compatible with `blueprintId`, and also accepts the preferred `assessmentId` field for registry-based launches.

## Learning analytics

Dashboard analytics combine completed Practice and Assessment sessions for streaks, total learning sessions, subject activity, and the 10-session report. Assessment sessions containing open-response items expose an `auto` score status so provisional auto-scores are not treated as final scores in report summaries.

Reward accounting remains source-specific: Practice keeps its existing reward rules, while Assessment rewards use the first qualifying attempt per subject + blueprint. Review merges wrong/unanswered auto-scored items from both Practice and Assessment.

Runtime secrets and Google service account credentials must be configured in Cloudflare and must never be committed to this repository.
