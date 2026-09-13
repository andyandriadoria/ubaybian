# UbayBian

Ruang belajar keluarga untuk Ubay (Grade 7 / Junior High) dan Bian (Grade 2 / Primary).

UbayBian memakai frontend GitHub Pages, backend Cloudflare Worker + D1, dan bank soal privat yang dibaca melalui gateway Google Apps Script.

## Status aplikasi

Sejak v0.6.0, repo masuk fase **consolidation & maintenance**. File frontend aktif sudah memakai nama berbasis fungsi, bukan nomor release. Histori perubahan disimpan oleh Git, bukan dengan menumpuk salinan file untuk setiap patch.

Fitur utama saat ini:

- Practice + Review
- Assessment dengan registry/blueprint
- XP, coins, streak, Report, dan Achievement System
- Brain Games + Memory Grid
- Reward Shop + Parent Access
- responsive layout untuk desktop, tablet, dan HP

## Entry point aktif

Frontend:

- `index.html`
- `version.js` — single source of truth versi frontend
- `bootstrap.js`
- `app.js`
- `api.js`
- `quiz.js`
- `profiles.js`
- `config.js`

Backend aktif berada di `backend/`. Entry Worker mengikuti `backend/wrangler.jsonc`.

Beberapa fitur frontend masih memiliki lebih dari satu file semantic layer, misalnya base/polish/state. Layer tersebut **masih aktif**, bukan file orphan. Jangan menghapusnya hanya karena terlihat seperti lapisan lama; gabungkan dulu dengan urutan cascade/behavior yang sama lalu jalankan quality gate.

## Aturan file mulai v0.6.0

**Release baru tidak berarti file baru.**

- Perbaikan/polish fitur yang sudah ada → edit modul yang sama.
- File baru hanya untuk fitur/modul baru yang memang berbeda tanggung jawab.
- Histori versi disimpan oleh Git.
- `version.js` menjadi sumber versi aplikasi yang tampil ke pengguna.
- Cleanup dilakukan berdasarkan dependency/reachability, bukan umur file.

## Quality & audit

Frontend:

```bash
npm run check
npm test
npm run audit:legacy
```

`npm run check` melakukan syntax check JavaScript frontend dan memastikan asset lokal yang direferensikan tersedia.

`npm run audit:legacy` menginventarisasi referensi nama legacy, mencari kandidat frontend yang tidak direferensikan, dan mengecek reachability modul backend dari entry Worker.

Backend:

```bash
cd backend
npm install
npm run check
npm test
```

Workflow `.github/workflows/quality.yml` menjalankan pemeriksaan frontend dan backend pada setiap push ke `main` serta pull request.

## Backend & data

Backend menangani login keluarga, progress online, Practice, Assessment, rewards, achievements, games, Review, dan akses bank soal. Schema D1 berada di `backend/migrations/`.

Dokumentasi penting:

- `docs/backend-setup.md`
- `docs/api-contract.md`
- `docs/assessment-architecture-v0583.md`
- `docs/achievement-system-v0584.md`
- `docs/frontend-maintenance.md`

## Keamanan

Repo ini publik. Jangan pernah menyimpan password keluarga, token sesi, Google private key, setup token, Apps Script secret, atau credential privat lain dalam frontend/commit GitHub. Secret backend harus disimpan melalui konfigurasi/secret Cloudflare.
