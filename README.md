# UbayBian

Ruang belajar keluarga untuk Ubay (Grade 7 / Junior High) dan Bian (Grade 2 / Primary).

## Versi 0.3 — family backend foundation

Frontend GitHub Pages kini siap memakai backend privat untuk tiga kebutuhan utama:

1. **Login keluarga** — username/password diverifikasi server, sesi memakai opaque token yang hash-nya disimpan di database.
2. **Google Sheets privat** — bank soal dibaca oleh Cloudflare Worker melalui service account Google. Browser tidak menerima credential atau Sheet ID.
3. **Progres online** — sesi kuis, jawaban, jumlah benar, jumlah dikerjakan, dan waktu latihan terakhir disimpan di Cloudflare D1.

Quiz engine tetap mendukung pilihan ganda, isian teks, pilihan gambar, progres sesi, feedback, dan pembahasan setelah menjawab. XP masih `0` sampai aturan XP keluarga ditentukan; backend tidak mengarang aturan reward.

## Status saat repo ini di-clone

Kode backend sudah tersedia di `backend/`, tetapi deployment membutuhkan akun Cloudflare, D1 database, Google service account, dan secret milik keluarga. Selama `public-config.js` belum berisi URL backend, frontend tetap masuk **mode persiapan** dan tidak meminta login.

## Struktur

- `index.html`, `app.js`, `bootstrap.js` — frontend GitHub Pages.
- `api.js`, `quiz.js` — client API dan validasi payload aman.
- `backend/src/` — login, session, Google Sheets connector, quiz service, progress.
- `backend/migrations/` — schema D1.
- `docs/api-contract.md` — kontrak frontend ↔ backend.
- `docs/backend-setup.md` — langkah deployment dan konfigurasi secret.

## Menjalankan pemeriksaan frontend

```bash
npm run check
npm test
```

Backend:

```bash
cd backend
npm install
npm run check
npm test
```

## Mengaktifkan backend

Ikuti [docs/backend-setup.md](docs/backend-setup.md). Setelah Worker aktif, set URL HTTPS-nya pada `public-config.js` lalu commit ke `main`.

## Keamanan

Repo ini publik. Jangan pernah menyimpan password keluarga, token sesi, Google private key, setup token, atau ID Sheet privat pada file frontend / commit GitHub. Secret backend dimasukkan melalui `wrangler secret put`.

Website UbaidBits dan FabianBits lama tidak diubah.
