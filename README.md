# UbayBian

Ruang belajar Ubay (Ubaid, Grade 7 / Junior High) dan Bian (Fabian, Grade 2 / Primary).

## Versi 0.1

Fondasi antarmuka: pilihan profil, profil terakhir pada perangkat, daftar pelajaran terpisah, dan halaman latihan dengan kondisi soal belum tersedia. Responsif untuk laptop, iPad, dan layar kecil. Navigasi bisa digunakan dengan keyboard.

Belum tersedia: login keluarga, koneksi Google Sheets, kuis dan penilaian, penyimpanan progres online, laporan orang tua, serta XP/koin/hadiah. Memilih profil **bukan autentikasi**. Jangan menaruh informasi privat pada versi ini.

## Menjalankan

Sajikan folder ini melalui server HTTP statis (misalnya `python3 -m http.server 8000`), lalu buka `http://localhost:8000`. Tidak membutuhkan instalasi dependency. Pemeriksaan: `npm run check` dan `npm test`.

## GitHub Pages

Jika ingin menerbitkan tampilan awal: Settings → Pages → Deploy from a branch → main → /(root). Tidak ada deployment otomatis dalam commit ini. Semua file frontend yang diterbitkan dapat dilihat pengunjung.

## Bank soal

Dua Google Sheets privat telah disiapkan terpisah: Bank Soal Ubaid — Grade 7 dan Bank Soal Fabian — Grade 2. ID spreadsheet dan kredensial tidak disimpan di frontend publik. Lihat [rancangan integrasi](docs/integrasi.md).

Soal lama belum dipindahkan karena perlu peninjauan jenjang. Tidak ada soal atau progres contoh yang ditampilkan sebagai data nyata.

## Tahap selanjutnya

1. Aktifkan backend dan login keluarga. Batasi data berdasarkan keluarga dan profil anak.
2. Sambungkan Sheets privat melalui server dan validasi soal sebelum publikasi.
3. Tambahkan kuis, penilaian server, dan penyimpanan hasil lintas perangkat.
4. Tambahkan laporan, persetujuan hadiah, robot, XP, koin, dan badge.

HTML, CSS, dan modul JavaScript dipisahkan agar setiap bagian mudah diperbarui. Website UbaidBits dan FabianBits lama tidak diubah.
