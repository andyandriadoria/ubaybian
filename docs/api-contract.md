# Kontrak API UbayBian v0.2

Dokumen ini mendefinisikan batas antara GitHub Pages (frontend publik) dan layanan privat yang nanti membaca bank soal, memverifikasi sesi keluarga, menilai jawaban, dan menyimpan progres.

## Prinsip keamanan

- Frontend tidak menyimpan credential Google, ID spreadsheet, session secret, kunci jawaban, atau total XP/koin yang dapat dipercaya server.
- Browser mengirim cookie sesi dengan `credentials: include`; backend menentukan keluarga dan hak akses dari sesi, bukan dari `profileId` saja.
- `profileId` dan `subjectId` hanya selector. Backend wajib memastikan profil tersebut milik keluarga pada sesi aktif.
- Soal yang dikirim sebelum siswa menjawab **tidak boleh** memuat `answerKey`, `correctAnswer`, `kunciJawaban`, `correctOption`, atau `solutionKey`.
- URL gambar dari bank soal harus HTTPS dan telah divalidasi server.
- Semua endpoint produksi menggunakan HTTPS dan CORS hanya mengizinkan origin UbayBian yang sah.
- Penilaian, XP, koin, dan hadiah dihitung server. Endpoint jawaban mendukung `Idempotency-Key` agar retry tidak menggandakan reward.

## POST `/v1/quiz/sessions`

Memulai satu sesi latihan.

Request:

```json
{
  "profileId": "ubay",
  "subjectId": "math",
  "limit": 10
}
```

Response:

```json
{
  "sessionId": "opaque-session-id",
  "progress": {"current": 1, "total": 10},
  "question": {
    "id": "opaque-question-id",
    "type": "multiple-choice",
    "prompt": "Teks soal",
    "imageUrl": "",
    "difficulty": "Sedang",
    "choices": [
      {"id": "A", "text": "Pilihan A", "imageUrl": ""},
      {"id": "B", "text": "Pilihan B", "imageUrl": ""}
    ]
  }
}
```

Jenis soal frontend v0.2: `multiple-choice`, `text`, dan `image-choice`.

Backend hanya memilih baris berstatus publikasi yang valid. Baris kosong, Draft, template, atau tab `PETUNJUK` tidak boleh masuk sesi.

## POST `/v1/quiz/sessions/:sessionId/answers`

Header wajib:

```text
Idempotency-Key: <uuid>
```

Request:

```json
{
  "questionId": "opaque-question-id",
  "answer": "B"
}
```

Untuk soal isian, `answer` adalah teks siswa. Normalisasi dan pencocokan variasi jawaban dilakukan server.

Response saat masih ada soal:

```json
{
  "correct": true,
  "explanation": "Pembahasan yang boleh dilihat setelah menjawab.",
  "xpEarned": 5,
  "sessionComplete": false,
  "progress": {"current": 2, "total": 10},
  "nextQuestion": {
    "id": "opaque-next-question-id",
    "type": "text",
    "prompt": "Soal berikutnya",
    "imageUrl": "",
    "difficulty": "Mudah",
    "choices": []
  }
}
```

Response pada soal terakhir mengirim `sessionComplete: true` dan tanpa `nextQuestion`.

## Error

Gunakan JSON konsisten:

```json
{
  "code": "NO_PUBLISHED_QUESTIONS",
  "message": "Belum ada soal yang siap untuk pelajaran ini."
}
```

Status yang penting untuk frontend:

- `401`: belum login / sesi keluarga habis.
- `403`: profil atau sumber tidak diizinkan untuk keluarga tersebut.
- `404`: sesi atau soal tidak ditemukan.
- `409`: sesi sudah selesai / versi sesi tidak sesuai.
- `422`: request valid secara JSON tetapi tidak valid secara domain.
- `503`: layanan bank soal atau database sementara tidak tersedia.

## Konfigurasi frontend

GitHub Pages tidak memiliki secret. Satu-satunya konfigurasi yang dibutuhkan frontend adalah URL publik backend dalam global `UBAYBIAN_API_BASE`, yang nanti diinjeksi pada deployment atau file konfigurasi publik. Nilai ini bukan credential.

Jika URL belum dikonfigurasi, aplikasi tetap berjalan dalam **mode persiapan** dan tidak mencoba membaca Google Sheets langsung dari browser.
