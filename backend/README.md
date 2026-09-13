# UbayBian API

Cloudflare Worker backend for UbayBian.

This folder contains the Worker source, D1 migrations, tests, and deployment configuration used by Cloudflare Builds. The production Worker is expected to deploy from the `main` branch with this folder configured as the build root.

## Assessment

Assessment uses separate D1 tables so the existing Practice engine remains isolated and backward compatible. The schema is defined in `migrations/0003_exam_simulation.sql`; internal table/API names keep the historical `exam_*` naming for backward compatibility.

Before using Assessment in production for the first time, apply pending D1 migrations:

```bash
npm run db:remote
```

Configured Grade 2 Semester 1 blueprints:

- `bian-english-mid-s1-2026` — English, 30 questions, 90 minutes. Question Sets that share a stimulus remain contiguous when a paper is assembled.
- `bian-math-mid-s1-2026` — Math, 30 questions, 90 minutes. Topic coverage follows the locked school pointer and the selector enforces the audited 14 Mudah / 13 Sedang / 3 Sulit mix.
- `bian-science-mid-s1-2026` — Science, 44 questions, 60 minutes. The selector follows the MHIS pointer distribution, enforces 22 Mudah / 18 Sedang / 4 Sulit, and assembles 29 multiple-choice, 12 closed short-answer, and 3 open-response questions.
- `bian-bahasa-indonesia-mid-s1-2026` — Bahasa Indonesia, 34 questions, 90 minutes. Each paper uses one complete audited practice variant, preserves reading-stimulus blocks, and enforces 25 multiple-choice, 5 closed short-answer, 4 open-response questions with a 17 Mudah / 14 Sedang / 3 Sulit mix.
- `bian-pancasila-mid-s1-2026` — Pancasila, 26 questions, 90 minutes. The selector preserves the audited topic, type, and 13 Mudah / 10 Sedang / 3 Sulit distribution.
- `bian-paibp-mid-s1-2026` — PAIBP, 17 questions, 60 minutes operational duration until an official Assessment duration is supplied. The selector chooses only a complete validated variant with 9 multiple-choice, 3 closed short-answer, and 5 open-response questions.

Configured Grade 7 Semester 1 blueprints:

- `ubay-bahasa-indonesia-mid-s1-2026` — Bahasa Indonesia, 30 questions, 90 minutes.
- `ubay-english-mid-s1-2026` — English, 30 questions, 120 minutes, with reading sets and controlled writing/tense coverage.
- `ubay-global-citizenship-mid-s1-2026` — Global Citizenship, 30 questions, 90 minutes.
- `ubay-informatika-mid-s1-2026` — Informatika, 30 questions, 90 minutes.
- `ubay-math-mid-s1-2026` — Math, 30 questions, 120 minutes.
- `ubay-pai-mid-s1-2026` — PAI, 30 questions, 90 minutes.
- `ubay-pancasila-mid-s1-2026` — Pancasila, 30 questions, 90 minutes.
- `ubay-science-mid-s1-2026` — Science, 30 questions, 120 minutes, with a minimum visual-question target.

Adding or revising these blueprints does not require a new D1 migration; they use the existing Assessment schema.

## Learning analytics

Dashboard analytics combine completed Practice and Assessment sessions for streaks, total learning sessions, subject activity, and the 10-session report. Assessment sessions containing open-response items expose an `auto` score status so provisional auto-scores are not treated as final scores in report summaries.

Reward accounting remains source-specific: Practice keeps its existing reward rules, while Assessment rewards use the first qualifying attempt per subject + blueprint. Review merges wrong/unanswered auto-scored items from both Practice and Assessment.

Runtime secrets and Google service account credentials must be configured in Cloudflare and must never be committed to this repository.
