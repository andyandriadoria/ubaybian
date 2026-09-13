# UbayBian API

Cloudflare Worker backend for UbayBian.

This folder contains the Worker source, D1 migrations, tests, and deployment configuration used by Cloudflare Builds. The production Worker is expected to deploy from the `main` branch with this folder configured as the build root.

## Assessment

Assessment uses separate D1 tables so the existing practice engine remains isolated and backward compatible. The schema is defined in `migrations/0003_exam_simulation.sql`; internal table/API names keep the historical `exam_*` naming for backward compatibility.

Before using Assessment in production for the first time, apply pending D1 migrations:

```bash
npm run db:remote
```

Configured Grade 2 Semester 1 blueprints:

- `bian-english-mid-s1-2026` — English, 30 questions, 90 minutes. Question Sets that share a stimulus remain contiguous when a paper is assembled.
- `bian-math-mid-s1-2026` — Math, 30 questions, 90 minutes. Topic coverage follows the locked school pointer and the selector enforces the audited 14 Mudah / 13 Sedang / 3 Sulit mix.
- `bian-science-mid-s1-2026` — Science, 44 questions, 60 minutes. The selector follows the MHIS pointer distribution, enforces 22 Mudah / 18 Sedang / 4 Sulit, and assembles 29 multiple-choice, 12 closed short-answer, and 3 open-response questions.

Adding these blueprints does not require a new D1 migration; they use the existing Assessment schema.

Runtime secrets and Google service account credentials must be configured in Cloudflare and must never be committed to this repository.
