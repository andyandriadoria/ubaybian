# Menyalakan backend UbayBian v0.3

Frontend tetap diterbitkan dari GitHub Pages. Backend memakai Cloudflare Worker + D1. Google Sheets hanya dibaca oleh Worker melalui service account Google; browser tidak pernah menerima credential atau ID spreadsheet.

## 1. Siapkan Cloudflare Worker dan D1

Dari folder `backend/`:

```bash
npm install
npx wrangler login
npx wrangler d1 create ubaybian
```

Salin `database_id` hasil perintah terakhir ke `backend/wrangler.jsonc`, menggantikan `REPLACE_WITH_D1_DATABASE_ID`.

Lalu jalankan migrasi:

```bash
npm run db:remote
```

## 2. Siapkan Google service account

Buat satu service account di Google Cloud project yang mengaktifkan Google Sheets API. Buat private key JSON untuk service account tersebut.

Bagikan dua spreadsheet bank soal sebagai **Viewer** ke email service account itu:

- Bank Soal Ubaid — Grade 7
- Bank Soal Fabian — Grade 2

Jangan membuat Sheet menjadi public / anyone with the link.

## 3. Isi secret Worker

Dari folder `backend/`, jalankan satu per satu:

```bash
npx wrangler secret put SETUP_TOKEN
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GOOGLE_PRIVATE_KEY
npx wrangler secret put UBAY_SHEET_ID
npx wrangler secret put BIAN_SHEET_ID
```

`SETUP_TOKEN` adalah token acak panjang yang hanya dipakai sekali untuk membuat akun keluarga pertama. `GOOGLE_PRIVATE_KEY` adalah nilai `private_key` dari JSON service account. Dua Sheet ID tetap disimpan sebagai secret agar tidak muncul di repo publik.

## 4. Deploy backend

```bash
npm run deploy
```

Catat URL Worker HTTPS, misalnya `https://ubaybian-api.<subdomain>.workers.dev`.

## 5. Buat akun keluarga pertama

Panggil endpoint setup satu kali:

```bash
curl -X POST "https://URL-WORKER/v1/setup" \
  -H "Content-Type: application/json" \
  -H "X-Setup-Token: TOKEN-SETUP" \
  -d '{"username":"keluarga","password":"GANTI-DENGAN-PASSWORD-KUAT","displayName":"Keluarga UbayBian"}'
```

Setup otomatis membuat dua profil server-side: `ubay` (Grade 7) dan `bian` (Grade 2). Endpoint setup menolak pembuatan akun keluarga kedua setelah akun pertama ada.

## 6. Hubungkan frontend

Edit `public-config.js`:

```js
globalThis.UBAYBIAN_API_BASE = 'https://URL-WORKER';
```

Setelah commit masuk ke `main`, GitHub Pages akan meminta login keluarga sebelum menampilkan pemilih profil.

`FRONTEND_ORIGIN` pada `backend/wrangler.jsonc` harus tetap origin GitHub Pages tanpa path: `https://andyandriadoria.github.io`.

## 7. Publikasikan soal

Backend hanya membaca baris dengan kolom `Status` bernilai tepat `Published` (tidak peka huruf besar/kecil). `Draft`, baris kosong, dan template tidak masuk latihan.

Satu baris `Published` yang tidak valid akan memblokir snapshot mapel tersebut agar backend tidak diam-diam menjalankan sebagian bank soal. Perbaiki baris yang dilaporkan terlebih dahulu.

## Penyimpanan progres

Setiap jawaban yang berhasil diproses disimpan di D1 dan memperbarui ringkasan progres per profil + mapel:

- jumlah soal dijawab,
- jumlah benar,
- waktu latihan terakhir.

Sesi dan hasil terikat ke akun keluarga di server. `profileId` dari browser hanya selector dan tidak dianggap sebagai bukti hak akses.

## Secret yang tidak boleh masuk GitHub

Jangan commit nilai berikut:

- `SETUP_TOKEN`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `UBAY_SHEET_ID`
- `BIAN_SHEET_ID`
- token sesi keluarga

Untuk development lokal gunakan `.dev.vars`; file itu di-ignore dari Git.
