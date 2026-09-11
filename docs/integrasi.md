# Rancangan integrasi berikutnya

Dokumen ini adalah kontrak pengembangan; layanan berikut belum diimplementasikan.

## Identitas dan akses

- Satu akun keluarga diaktifkan orang tua pada laptop Ubay dan iPad Bian.
- Pilihan profil disimpan lokal hanya sebagai preferensi. ID profil dari browser bukan bukti hak akses.
- Backend memverifikasi sesi keluarga pada setiap permintaan, termasuk pengambilan soal dan penyimpanan hasil.
- Pengaturan, pembaruan bank soal, dan persetujuan hadiah memerlukan otorisasi orang tua di server. PIN tidak boleh ditulis di frontend atau dipakai sebagai satu-satunya bukti otorisasi.
- Halaman publik tidak memuat nama lengkap anak, kunci jawaban, progres, credential, maupun URL Sheets privat.

## Pemetaan pelajaran

| Profil | ID | Nama tab Sheets |
|---|---|---|
| ubay | bahasa-indonesia | BAHASA INDONESIA |
| ubay | math | MATH |
| ubay | pancasila | PANCASILA |
| ubay | english | ENGLISH |
| ubay | science | SCIENCE |
| ubay | informatika | INFORMATIKA |
| ubay | global-citizenship | GLOBAL CITIZENSHIP |
| ubay | pai | PAI |
| bian | bahasa-indonesia | BAHASA INDONESIA |
| bian | paibp | PAIBP |
| bian | english | ENGLISH |
| bian | science | SCIENCE |
| bian | math | MATH |
| bian | pancasila | PANCASILA |

## Membaca bank soal

Server membaca Google Sheets dengan akses terbatas; tidak menggunakan CSV publik atau kunci layanan di JavaScript browser. Daftar spreadsheet yang diizinkan diatur pada server. Jangan menerima ID spreadsheet atau URL bebas dari anak.

Kolom: ID Soal, Bab / Topik, Semester, Jenis Soal, Pertanyaan, Gambar Soal, Pilihan A–D, Gambar A–D, Kunci Jawaban, Pembahasan, Kesulitan, Status, Sumber / Catatan. PETUNJUK bukan tab soal.

Aturan impor:
- Abaikan baris kosong dan Draft. Baris template yang hanya berisi jenis/status bukan soal.
- Validasi ID unik, pertanyaan, semester 1/2, jenis, kesulitan, dan satu kunci yang sesuai.
- Pilihan Ganda: 2–4 opsi berurutan; kunci huruf mengarah ke opsi yang terisi.
- Isian: variasi kunci dipisah `||`; jawaban tidak diubah otomatis menjadi angka atau tanggal.
- Pilihan Gambar: setiap pilihan memiliki URL gambar HTTPS dan teks alternatif; tolak skema URL tidak aman. Render teks sebagai teks, bukan HTML.
- Tampilkan tab/baris yang salah ke orang tua. Jangan mengaktifkan impor sebagian secara diam-diam.
- Publikasikan snapshot bank soal yang tervalidasi secara atomik. Sesi berjalan menggunakan versi snapshot awal hingga selesai.
- Kredensial, ID Sheets dan jawaban benar hanya berada di server. Pembahasan diberikan setelah jawaban dikirim.

## Progres dan hadiah

Simpan sesi, jawaban, versi soal, XP, ledger koin, dan transaksi hadiah di database online dengan pemisahan keluarga/profil. Server menghitung skor dan hadiah, bukan menerima total dari browser. Gunakan idempotency key untuk mencegah pengiriman ulang memberi koin dua kali. Penukaran hadiah membutuhkan persetujuan orang tua.

Saat koneksi gagal, tampilkan status belum tersimpan; jangan mengaku progres telah tersinkron. Jangan menyimpan progres pribadi secara publik di GitHub atau pada bank soal.

## Rencana pengujian integrasi

Uji satu sesi per anak, akses profil lain, akses tanpa login, jawaban ganda/retry, bank soal kosong, baris rusak, kegagalan Sheets, dan pemulihan koneksi. Uji pemakaian laptop dan iPad setelah login dan layanan aktif.
