# UbayBian

Ruang belajar keluarga untuk Ubay (Grade 7 / Junior High) dan Bian (Grade 2 / Primary).

UbayBian memakai frontend GitHub Pages, backend Cloudflare Worker + D1, dan bank soal privat yang dibaca melalui gateway Google Apps Script.

## Status aplikasi

Mulai v0.6.0, repo masuk fase **frontend consolidation**. Perilaku belajar yang sudah stabil dipertahankan, sementara file legacy yang benar-benar tidak dipakai dihapus dan pola pengembangan baru tidak lagi membuat file baru untuk setiap patch kecil.

Fitur utama saat ini:

- Practice + Review
- Assessment dengan registry/blueprint
- XP, coins, streak, Report, dan Achievement System
- Brain Games + Memory Grid
- Reward Shop + Parent Access
- responsive layout untuk desktop, tablet, dan HP

## Entry point aktif

Frontend saat ini masuk melalui:

- `index.html`
- `version.js` — single source of truth versi frontend
- `bootstrap.js`
- `app-v040.js` — core app aktif; nama lama dipertahankan sementara sampai konsolidasi modul selesai
- `api-v040.js` — API client aktif
- `quiz.js`, `profiles.js`, `config.js`

Backend aktif berada di `backend/`. Entry Worker mengikuti `backend/wrangler.jsonc`.

> Catatan: masih ada beberapa file bernama `*-v0xxx.*` yang **masih aktif sebagai cascade/polish layer**. Jangan menghapus file hanya karena nomor versinya lama. Lihat [`docs/frontend-maintenance.md`](docs/frontend-maintenance.md).

## Aturan file mulai v0.6.0

**Release baru tidak berarti file baru.**

- Perbaikan/polish fitur yang sudah ada → edit modul yang sama.
- File baru hanya untuk fitur/modul baru yang memang berbeda tanggung jawab.
- Histori versi disimpan oleh Git, bukan dengan menumpuk salinan file bernomor versi.
- `version.js` menjadi sumber versi aplikasi yang tampil ke pengguna.
- File versioned lama akan dikonsolidasikan bertahap tanpa mengubah behavior/visual yang sudah stabil.

## Pemeriksaan frontend

```bash
npm run check
npm test
```

`npm run check` otomatis:

1. melakukan syntax check seluruh file JavaScript frontend di root; dan
2. memastikan asset lokal (`.js`, `.css`, `.svg`) yang direferensikan frontend benar-benar tersedia.

Backend:

```bash
cd backend
npm install
npm run check
npm test
```

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
