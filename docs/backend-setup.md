# Menyalakan backend UbayBian v0.4

Frontend tetap diterbitkan dari GitHub Pages. Backend memakai Cloudflare Worker + D1. Untuk membaca dua Google Sheets privat, UbayBian memakai **Google Apps Script Web App** yang dijalankan sebagai pemilik Sheet. Jalur ini tidak membutuhkan Google Cloud billing account, service account, kartu, atau metode pembayaran.

Arsitektur:

`GitHub Pages → Cloudflare Worker → Apps Script Web App → Google Sheets privat`

Cloudflare Worker tetap menangani login keluarga, penilaian, sesi kuis, dan progres. Apps Script hanya berfungsi sebagai gateway baca privat untuk bank soal.

## 1. Cloudflare Worker + D1

Database D1 `ubaybian` dan Worker `ubaybian-api` sudah dibuat. Binding Worker harus bernama `DB` dan menunjuk ke database `ubaybian`.

Schema database berada di `backend/migrations/0001_initial.sql`.

## 2. Buat Apps Script gateway tanpa kartu

1. Buka `https://script.google.com/` dengan akun Google yang memiliki akses ke dua Bank Soal.
2. Klik **New project** dan beri nama misalnya `UbayBian Sheets Gateway`.
3. Hapus isi `Code.gs`, lalu salin isi file `apps-script/Code.gs` dari repo UbayBian.
4. Buka **Project Settings → Script Properties**.
5. Tambahkan tiga Script Properties:
   - `GATEWAY_SECRET` = string acak panjang yang hanya kamu simpan sendiri.
   - `UBAY_SHEET_ID` = ID spreadsheet Bank Soal Ubay.
   - `BIAN_SHEET_ID` = ID spreadsheet Bank Soal Bian.
6. Simpan.

Script Properties cocok untuk konfigurasi aplikasi dan hanya tersedia di dalam project script tersebut. Jangan menaruh nilainya ke GitHub.

## 3. Deploy Apps Script sebagai Web App

1. Klik **Deploy → New deployment**.
2. Pilih **Web app**.
3. **Execute as:** `Me` / akun yang men-deploy.
4. **Who has access:** pilih akses yang mengizinkan pemanggilan tanpa login Google (biasanya `Anyone`).
5. Klik **Deploy** dan selesaikan permintaan izin Google untuk membaca spreadsheet.
6. Salin URL deployment yang berakhiran `/exec`.

Walaupun endpoint Web App dapat diakses secara jaringan, kode menolak permintaan yang tidak membawa `GATEWAY_SECRET` yang benar. Worker tidak pernah memberikan secret ini ke browser.

## 4. Isi secret Worker

Di Cloudflare Worker `ubaybian-api`, tambahkan secret berikut:

- `SETUP_TOKEN` — string acak panjang, hanya dipakai untuk membuat akun keluarga pertama.
- `APPS_SCRIPT_URL` — URL Apps Script Web App yang berakhiran `/exec`.
- `APPS_SCRIPT_SECRET` — nilainya harus sama persis dengan `GATEWAY_SECRET` di Script Properties.

Secret lama berbasis service account (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `UBAY_SHEET_ID`, `BIAN_SHEET_ID`) **tidak digunakan lagi oleh Worker**. Dua Sheet ID sekarang hanya berada di Script Properties Apps Script.

## 5. Buat akun keluarga pertama

Panggil endpoint setup satu kali:

```bash
curl -X POST "https://ubaybian-api.andyandriadoria.workers.dev/v1/setup" \
  -H "Content-Type: application/json" \
  -H "X-Setup-Token: TOKEN-SETUP" \
  -d '{"username":"keluarga","password":"GANTI-DENGAN-PASSWORD-KUAT","displayName":"Keluarga UbayBian"}'
```

Setup otomatis membuat dua profil server-side: `ubay` (Grade 7) dan `bian` (Grade 2). Endpoint setup menolak pembuatan akun keluarga kedua setelah akun pertama ada.

## 6. Hubungkan frontend

Edit `public-config.js`:

```js
globalThis.UBAYBIAN_API_BASE = 'https://ubaybian-api.andyandriadoria.workers.dev';
```

Setelah commit masuk ke `main`, GitHub Pages akan meminta login keluarga sebelum menampilkan pemilih profil.

`FRONTEND_ORIGIN` pada `backend/wrangler.jsonc` harus tetap origin GitHub Pages tanpa path: `https://andyandriadoria.github.io`.

## 7. Publikasikan soal

Backend hanya membaca baris dengan kolom `Status` bernilai `Published` (tidak peka huruf besar/kecil). `Draft`, baris kosong, dan template tidak masuk latihan.

Satu baris `Published` yang tidak valid akan memblokir snapshot mapel tersebut agar backend tidak diam-diam menjalankan sebagian bank soal.

## Penyimpanan progres

Setiap jawaban yang berhasil diproses disimpan di D1 dan memperbarui ringkasan progres per profil + mapel:

- jumlah soal dijawab,
- jumlah benar,
- waktu latihan terakhir.

Sesi dan hasil terikat ke akun keluarga di server. `profileId` dari browser hanya selector dan tidak dianggap sebagai bukti hak akses.

## Nilai yang tidak boleh masuk GitHub atau chat

- `SETUP_TOKEN`
- `GATEWAY_SECRET` / `APPS_SCRIPT_SECRET`
- ID dua spreadsheet privat
- token sesi keluarga

Untuk development lokal gunakan `.dev.vars`; file itu di-ignore dari Git.
