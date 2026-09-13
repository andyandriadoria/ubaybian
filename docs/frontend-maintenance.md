# Frontend maintenance policy

Baseline: **v0.6.0**

Dokumen ini dibuat setelah audit dependency frontend karena repo v0.5.x memakai pola additive patching: setiap polish sering menambah file CSS/JS baru dengan suffix versi. Pola tersebut membuat cascade makin panjang dan sulit dibaca.

## Prinsip mulai v0.6.0

1. **Release baru tidak membuat file baru secara otomatis.**
2. Perbaikan visual/behavior fitur yang sama harus mengubah file modul yang sama.
3. File baru hanya dibuat jika ada tanggung jawab/fitur baru yang memang berbeda.
4. Git menjadi histori perubahan; nomor versi tidak perlu dimasukkan ke nama file baru.
5. `version.js` adalah single source of truth versi frontend yang tampil di UI.
6. Jangan menghapus file lama hanya karena namanya terlihat usang. Pastikan lebih dulu file tersebut tidak direferensikan langsung, di-import, atau dimuat dinamis oleh JavaScript lain.

## Entry point frontend aktif

- `index.html`
- `version.js`
- `bootstrap.js`
- `app.js`
- `api.js`
- `quiz.js`
- `profiles.js`
- `config.js`

`app.js` dan `api.js` masih memakai nama versioned karena keduanya adalah core aktif yang belum dipindahkan pada cleanup pertama. Rename/consolidation core dilakukan hanya ketika seluruh import sudah siap dipindahkan bersama.

## Cleanup yang sudah selesai pada v0.6.0

File berikut sudah diaudit sebagai superseded/orphan dan dihapus dari `main`:

- `app.js`
- `app-v037.js`
- `api.js`
- `api-v037.js`
- `styles.css`
- `login.css`
- `exam-simulation-v0550.js`

Test API root dipindahkan ke client aktif `api.js` sebelum `api.js` dihapus.

Modul yang aktif dan masih sering dirawat sudah mulai memakai nama stabil tanpa nomor release:

- `learning-audit.css` / `learning-audit.js`
- `responsive.css`
- `review-modal.css` / `review-modal.js`
- `badge-showcase.css` / `badge-showcase.js`
- `guided-setup.css` / `guided-setup.js`
- `wikimedia-image-fallback.js`
- `session-selector.js`
- `assessment-terminology.js`
- `open-response-terminology.js`

Rename tersebut memakai blob yang sama dengan file sebelumnya; perubahan ini tidak mengubah behavior aplikasi, hanya merapikan ownership/naming modul.

## File lama yang masih aktif

Beberapa keluarga file versioned **masih sengaja dipertahankan** karena browser masih menggunakannya sebagai cascade/behavior layer. Contoh:

- `adventure-v050...v053`
- `report-adventure-v0518`, `report-polish-v0519`, `report-final-v0520`
- `robot-lab-v0521...v0526`
- `learning-deck-v0546...v0556`
- `memory-grid-v046...v0538` dan tablet polish v0587/v0588
- `reward-shop-v0540...v0543`
- Assessment/result/theme layers

Sebagian asset bahkan dimuat secara dinamis. Contoh: Memory Grid dan Reward Shop memiliki JavaScript yang memasang CSS tambahan saat runtime. Karena itu penghapusan harus dilakukan setelah layer digabung, bukan berdasarkan nama file semata.

## Target konsolidasi bertahap

Arah akhir yang diinginkan adalah modul semantik seperti:

```text
styles/
  base.css
  shell.css
  home.css
  practice.css
  assessment.css
  report.css
  robot-lab.css
  reward-shop.css
  brain-games.css
  memory-grid.css
  responsive.css

features/
  home.js
  practice.js
  assessment.js
  review.js
  achievements.js
  report.js
  robot-lab.js
  reward-shop.js
  brain-games.js
  memory-grid.js
```

Migrasi dilakukan per-feature. Urutan aman:

1. gabungkan CSS dalam urutan cascade yang sama;
2. gabungkan/dekomposisi JavaScript tanpa mengubah event flow;
3. ganti referensi di `index.html`/dynamic loader;
4. jalankan `npm run check` dan `npm test`;
5. baru hapus file legacy feature tersebut.

## Quality gates

`scripts/check-frontend.mjs` melakukan dua guardrail dasar:

- syntax check otomatis untuk seluruh JavaScript frontend root;
- validasi file lokal `.js`, `.css`, dan `.svg` yang direferensikan dari HTML/JavaScript.

Workflow `.github/workflows/quality.yml` menjalankan frontend integrity/test dan backend check/test pada setiap push ke `main` serta pull request. Tujuannya agar cleanup berikutnya tidak menghasilkan missing asset/import atau regression yang lolos diam-diam.

## Naming policy baru

Gunakan nama berdasarkan fungsi, misalnya:

- `review-modal.css`
- `badge-showcase.js`
- `memory-grid.css`

Hindari pola baru seperti:

- `review-modal-v0597.css`
- `memory-grid-v0612.js`

Nomor release cukup berada di `version.js`, commit, tag/release Git, dan changelog/dokumentasi bila diperlukan.
