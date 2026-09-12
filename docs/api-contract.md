# Kontrak API UbayBian v0.3

Frontend publik berkomunikasi dengan backend privat melalui HTTPS. Setelah login, frontend menyimpan **opaque family session token** pada perangkat dan mengirimkannya sebagai `Authorization: Bearer <token>`. Database hanya menyimpan hash token, bukan token mentah.

## Auth

### `POST /v1/auth/login`

```json
{"username":"keluarga","password":"..."}
```

Response berisi `token`, waktu kedaluwarsa, data keluarga, dan profil yang diizinkan.

### `GET /v1/auth/me`

Memerlukan Bearer token. Mengembalikan keluarga dan daftar profil server-side.

### `POST /v1/auth/logout`

Menghapus sesi dari database dan frontend menghapus token lokal.

## Progress

### `GET /v1/progress`

Mengembalikan ringkasan semua profil milik keluarga.

### `GET /v1/progress/:profileId`

Mengembalikan ringkasan satu profil setelah backend memastikan profil itu milik keluarga pada sesi aktif.

Ringkasan: `attempted`, `correct`, dan `lastPracticedAt` per subject.

## Quiz

### `POST /v1/quiz/sessions`

```json
{"profileId":"ubay","subjectId":"math","limit":10}
```

Backend:
1. memverifikasi akun keluarga dan profil,
2. memetakan mapel ke tab Sheet yang diizinkan,
3. membaca Sheet privat melalui gateway Apps Script,
4. memvalidasi semua baris `Aktif` / `Published`,
5. jika ada `Stimulus ID`, membaca tab `STIMULUS` dan memvalidasi mapel, semester, serta urutan set,
6. memilih soal; pada mode Normal/Challenge satu stimulus diperlakukan sebagai satu blok sehingga set tidak dipecah dan urutannya tetap,
7. membuat snapshot sesi di D1,
8. mengirim soal pertama tanpa kunci jawaban.

Payload soal tetap hanya berisi field tampilan: `id`, `type`, `prompt`, `imageUrl`, `difficulty`, dan `choices`. Pada versi stimulus awal, judul + passage + posisi soal dalam set digabung ke `prompt` ketika snapshot dibuat. Dengan demikian kontrak frontend lama tetap kompatibel.

Mode Review boleh mengambil satu pertanyaan yang salah secara individual. Jika pertanyaan itu terhubung ke stimulus, konteks stimulus tetap dimasukkan ke `prompt` review.

### `POST /v1/quiz/sessions/:sessionId/answers`

Header:

```text
Authorization: Bearer <session-token>
Idempotency-Key: <uuid>
```

Body:

```json
{"questionId":"...","answer":"B"}
```

Backend menilai jawaban dari snapshot privat, menyimpan hasil, memperbarui progress, lalu baru mengirim `correct` dan `explanation`. Retry dengan idempotency key yang sama mengembalikan respons yang sama dan tidak menambah progres dua kali.

## Google Sheets

Frontend tidak mengetahui credential Google atau Sheet ID. Backend hanya menerima mapel dari daftar yang telah dipetakan; browser tidak boleh mengirim spreadsheet ID atau nama tab bebas.

Status yang dipakai:
- `Aktif` atau `Published`: boleh masuk sesi setelah seluruh validasi lulus.
- `Draft` / kosong / lainnya: tidak masuk sesi.

Kolom opsional soal setelah `Sumber / Catatan`:
- `Stimulus ID`
- `Urutan Dalam Set`

Tab `STIMULUS` menggunakan kolom:

`Stimulus ID | Mapel | Semester | Judul | Teks / Passage | Gambar | Status | Sumber / Catatan`

Satu `Stimulus ID` hanya boleh dipakai untuk satu mapel dan satu semester. Urutan pertanyaan untuk satu stimulus harus lengkap `1, 2, 3, ...` tanpa duplikat atau lompatan.

## Error penting

- `401 LOGIN_REQUIRED` / `SESSION_EXPIRED`
- `403 PROFILE_FORBIDDEN` / `SUBJECT_FORBIDDEN`
- `409 SESSION_COMPLETE` / `QUESTION_MISMATCH`
- `422 NO_PUBLISHED_QUESTIONS` / `INVALID_PUBLISHED_BANK`
- `422 INVALID_STIMULUS_BANK` / `STIMULUS_NOT_FOUND` / `STIMULUS_ORDER_INVALID`
- `503 GOOGLE_NOT_CONFIGURED` / `SHEET_READ_FAILED`
