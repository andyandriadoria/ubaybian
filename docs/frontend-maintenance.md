# Frontend maintenance policy

Baseline: **v0.6.0**

Dokumen ini menjadi acuan cleanup setelah pola additive patching v0.5.x dihentikan. Mulai v0.6.0, file frontend aktif memakai nama berdasarkan fungsi; nomor release tidak lagi menjadi bagian nama file baru.

## Prinsip

1. **Release baru tidak membuat file baru secara otomatis.**
2. Perbaikan visual/behavior fitur yang sama harus mengubah modul yang sama.
3. File baru hanya dibuat bila ada tanggung jawab/fitur baru yang memang berbeda.
4. Git menjadi histori perubahan; nomor versi tidak perlu disimpan di nama file.
5. `version.js` adalah single source of truth versi frontend yang tampil di UI.
6. Penghapusan file harus berbasis dependency/reachability, bukan umur file atau tampilannya di root repo.

## Entry point frontend aktif

- `index.html`
- `version.js`
- `bootstrap.js`
- `app.js`
- `api.js`
- `quiz.js`
- `profiles.js`
- `config.js`

Nama-nama tersebut sudah menjadi nama semantic/stabil. File lama yang pernah menjadi pendahulunya tetap tersedia melalui histori Git dan tidak perlu dipertahankan sebagai salinan di branch aktif.

## Status cleanup v0.6.0

Cleanup yang sudah dilakukan:

- orphan/superseded frontend lama dihapus;
- file frontend aktif dinormalisasi ke nama semantic;
- integrity checker ditambahkan;
- CI frontend/backend ditambahkan;
- audit dependency/reachability ditambahkan.

Audit 13 September 2026 menghasilkan:

- **Potential unreferenced frontend files: 0**
- **Backend modules reachable from Wrangler entry: 25/25**
- **Potential unreachable backend modules: 0**

Artinya file runtime yang masih ada saat ini dipertahankan karena benar-benar direferensikan atau reachable. Jangan menghapus layer aktif hanya untuk mengurangi jumlah file.

## Layer yang masih aktif

Beberapa fitur masih terdiri dari beberapa file semantic layer, misalnya base, polish, state, theme, atau responsive layer. Contohnya Home, Report, Robot Lab, Memory Grid, Brain Games, Reward Shop, Learning Deck, dan Assessment.

Layer-layer tersebut dapat dikonsolidasikan bertahap, tetapi urutan CSS dan urutan eksekusi JavaScript harus dipertahankan. Penggabungan harus dilakukan per-feature, bukan mass-delete.

Urutan aman:

1. identifikasi seluruh referensi langsung, import, dan dynamic loader;
2. gabungkan CSS dengan urutan cascade yang sama;
3. konsolidasikan JavaScript hanya bila scope/event flow tetap aman;
4. ubah referensi di `index.html`/loader;
5. jalankan `npm run check`, `npm test`, dan `npm run audit:legacy`;
6. baru hapus file sumber yang sudah benar-benar tergantikan.

## Responsive regression rules

Aturan utama dari audit responsive lama sudah digabung ke dokumen ini:

- container grid/flex yang memuat tabel, selector, label panjang, atau pertanyaan dinamis harus bisa menyusut (`min-width: 0` bila perlu);
- hindari fixed `min-width` pada kartu tanpa mobile override;
- gunakan `minmax(0, 1fr)` untuk kolom yang harus dapat menyusut;
- tabel lebar harus memakai scroll container lokal, bukan memperlebar page;
- modal/dialog harus dibatasi ke dynamic viewport dan memperhitungkan safe area;
- layout tablet/phone harus menjaga top navigation, sidebar, result card, Assessment, Report, Reward Shop, Robot Lab, Brain Games, dan Memory Grid tetap tanpa page-level horizontal overflow.

## Learning-flow invariants

Ringkasan audit learning-flow lama juga dipertahankan di sini:

- Practice dan Assessment sama-sama berkontribusi ke learning history, streak, report, dan review sesuai aturan masing-masing;
- reward Practice dan Assessment dihitung terpisah sebelum digabung ke saldo profil;
- Assessment retake yang sudah pernah mendapat reward tidak mencetak reward kedua;
- open-response tidak masuk automatic Review dan tidak boleh dianggap final score sebelum manual review selesai;
- Report membedakan score final dan provisional/auto;
- Review menggabungkan recovery dari Practice dan Assessment auto-scored items.

Dokumen audit one-off lama sudah tidak diperlukan di branch aktif karena aturan yang masih relevan sudah diringkas di sini; histori lengkap tetap tersedia di Git.

## Quality gates

`scripts/check-frontend.mjs`:

- syntax check otomatis untuk JavaScript frontend;
- validasi asset lokal `.js`, `.css`, `.svg`, dan referensi lokal lain yang dipakai frontend.

`scripts/audit-legacy.mjs`:

- menginventarisasi referensi nama legacy/versioned;
- mencari kandidat frontend yang tidak direferensikan runtime;
- memeriksa reachability modul backend dari `backend/wrangler.jsonc`.

Workflow `.github/workflows/quality.yml` menjalankan frontend integrity/test dan backend check/test pada setiap push ke `main` dan pull request.

## Naming policy

Gunakan nama berdasarkan fungsi, misalnya:

- `review-modal.css`
- `badge-showcase.js`
- `memory-grid.css`
- `assessment.js`

Hindari pola nama berbasis nomor release. Nomor versi cukup berada di `version.js`, commit/tag Git, atau catatan release bila diperlukan.
