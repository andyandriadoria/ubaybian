# UbayBian

Ruang belajar Ubay (Grade 7 / Junior High) dan Bian (Grade 2 / Primary).

## Versi 0.2 — quiz-ready frontend

Fondasi antarmuka sudah memiliki pilihan profil, profil terakhir pada perangkat, daftar pelajaran terpisah, routing, serta halaman latihan. Versi 0.2 menambahkan kontrak API dan quiz engine frontend yang siap menerima soal aman dari backend privat.

Quiz engine mendukung:
- pilihan ganda,
- isian teks,
- pilihan gambar,
- progres sesi,
- feedback dan pembahasan setelah menjawab,
- XP dari server,
- idempotency key untuk pengiriman jawaban,
- validasi payload agar kunci jawaban tidak ikut terkirim sebelum siswa menjawab.

Jika backend belum dikonfigurasi, website masuk **mode persiapan** dan tidak mencoba membuka Google Sheets dari browser.

Belum tersedia: login keluarga, backend, koneksi runtime ke Google Sheets, penyimpanan progres online, laporan orang tua, ledger koin/hadiah, dan soal berstatus publikasi. Memilih profil **bukan autentikasi**. Jangan menaruh informasi privat pada frontend publik.

## Menjalankan

Sajikan folder ini melalui server HTTP statis (misalnya `python3 -m http.server 8000`), lalu buka `http://localhost:8000`. Tidak membutuhkan instalasi dependency.

Pemeriksaan:

```bash
npm run check
npm test
```

## GitHub Pages

Deployment: Settings → Pages → Deploy from a branch → `main` → `/(root)`.

Semua file frontend yang diterbitkan dapat dilihat pengunjung. Credential, ID Google Sheets, kunci jawaban, dan data progres privat tidak boleh disimpan di repo.

## Bank soal

Dua Google Sheets privat telah disiapkan terpisah untuk Ubay dan Bian. Struktur tab mapel dan header sudah sesuai rancangan integrasi. Pada pengecekan v0.2, bank masih berupa template/Draft; aplikasi tidak membuat soal contoh seolah-olah sebagai data nyata.

Kolom dan aturan impor ada di [rancangan integrasi](docs/integrasi.md). Kontrak antara frontend dan backend ada di [kontrak API](docs/api-contract.md).

## Konfigurasi backend

Frontend membaca URL layanan dari global `UBAYBIAN_API_BASE`. Produksi harus HTTPS; HTTP hanya diterima untuk `localhost` saat development. URL backend bukan secret, tetapi semua credential dan akses Sheets tetap berada di server.

## Tahap selanjutnya

1. Implementasikan backend + login keluarga dan endpoint sesuai `docs/api-contract.md`.
2. Hubungkan Google Sheets privat di backend, validasi seluruh baris, lalu publikasikan snapshot soal yang valid.
3. Isi dan review soal per mapel; hanya status publikasi yang masuk latihan.
4. Simpan hasil lintas perangkat, lalu tambahkan dashboard orang tua, XP/koin, badge, dan approval hadiah.

Website UbaidBits dan FabianBits lama tidak diubah.
