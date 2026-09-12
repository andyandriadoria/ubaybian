# UbayBian API

Cloudflare Worker backend for UbayBian.

This folder contains the Worker source, D1 migrations, tests, and deployment configuration used by Cloudflare Builds. The production Worker is expected to deploy from the `main` branch with this folder configured as the build root.

## Exam Simulation

Exam Simulation uses separate D1 tables so the existing practice engine remains isolated and backward compatible. The schema is defined in `migrations/0003_exam_simulation.sql`.

Before using Exam Simulation in production for the first time, apply pending D1 migrations:

```bash
npm run db:remote
```

Configured Grade 2 Semester 1 blueprints:

- `bian-english-mid-s1-2026` — English, 30 questions, 90 minutes. Question Sets that share a stimulus remain contiguous when a paper is assembled.
- `bian-math-mid-s1-2026` — Math, 30 questions, 90 minutes. Topic coverage follows the locked Mid Exam pointer and the selector also enforces the audited 14 Mudah / 13 Sedang / 3 Sulit difficulty mix.

Adding the Math blueprint does not require a new D1 migration; it uses the existing Exam Simulation schema.

Runtime secrets and Google service account credentials must be configured in Cloudflare and must never be committed to this repository.
