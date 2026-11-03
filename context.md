# 🧠 context.md — Web Modul Belajar Matematika SMP

> Dokumen ini menjadi **referensi konteks utama** bagi LLM di setiap sesi baru.
> Selalu baca dokumen ini sebelum melanjutkan pengerjaan proyek.

---

## Identitas Proyek

| Field | Detail |
|---|---|
| **Nama Proyek** | Web Modul Belajar Matematika SMP |
| **Tujuan** | Platform pedoman guru untuk menyusun modul belajar & mengelola administrasi kelas |
| **Target Pengguna** | 1 Admin/Guru utama |
| **Skala** | 5 kelas, ±156 siswa total |
| **Repo GitHub** | https://github.com/riyandaprimaa/teaching_module_web.git |
| **Local Path** | `d:\bby\web_module` |
| **Bahasa UI** | Bahasa Indonesia |
| **Started** | 3 November 2026 |

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Math Render | KaTeX |
| Database | Firebase Firestore (free tier) |
| Auth | Firebase Authentication (Google Sign-in) |
| Spreadsheet | Google Sheets API v4 — **sheet baru dibuat otomatis oleh sistem** |
| State | Zustand |
| Form | React Hook Form + Zod |
| Charts | Recharts |
| Hosting | Vercel (free tier) |

---

## Keputusan Arsitektur (Sudah Dikunci)

- **Auth**: Hanya 1 user (admin/guru). Login via Google melalui Firebase Auth.
- **Google Sheets**: Sheet baru dibuat otomatis oleh sistem saat setup pertama. Tidak menggunakan sheet existing.
- **Firestore**: Data kehadiran, nilai, jurnal, dan materi disimpan di Firestore. Sheets berfungsi sebagai backup & laporan.
- **Role**: Tidak ada multi-role. Semua fitur hanya bisa diakses oleh admin yang login.

---

## Struktur Data Kelas

```
Kelas 7A, 7B
Kelas 8A, 8B
Kelas 9A
Total: 5 kelas, 156 siswa
```

> Distribusi siswa per kelas belum dikonfirmasi. Asumsi ±30-32 siswa/kelas.

---

## Struktur Folder Proyek

```
d:\bby\web_module/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── kehadiran/page.tsx
│   │   ├── nilai/page.tsx
│   │   ├── jurnal/page.tsx
│   │   └── buku/
│   │       ├── kelas-7/page.tsx
│   │       ├── kelas-8/page.tsx
│   │       └── kelas-9/page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                    ← shadcn/ui components
│   ├── kehadiran/
│   ├── nilai/
│   ├── jurnal/
│   └── buku/
├── lib/
│   ├── firebase.ts
│   ├── sheets.ts
│   └── utils.ts
├── hooks/
│   ├── useKehadiran.ts
│   ├── useNilai.ts
│   └── useJurnal.ts
├── store/                     ← Zustand stores
├── types/
├── public/
├── context.md                 ← (file ini)
├── spec.md
└── PRD_WebModulMatematikaSMP.md
```

---

## Fitur Utama

1. **Daftar Kehadiran** — input status hadir/izin/sakit/alfa, sync real-time ke Firestore + Google Sheets
2. **Daftar Nilai** — input nilai per KD/UH/UTS/UAS, kalkulasi rata-rata, color coding KKM, sync Sheets
3. **Jurnal Guru** — CRUD catatan harian guru (tanggal, kelas, topik, refleksi)
4. **Buku Materi** — konten materi + soal kelas 7/8/9, render rumus LaTeX via KaTeX, editable via dashboard admin

---

## Environment Variables yang Dibutuhkan

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Google Sheets API (Server-side)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=    ← akan diisi setelah sheet dibuat otomatis
```

---

## Referensi Dokumen

| Dokumen | Deskripsi |
|---|---|
| `PRD_WebModulMatematikaSMP.md` | Product Requirements Document lengkap |
| `spec.md` | Spesifikasi teknis & catatan progres pengerjaan |
| `context.md` | File ini — konteks keseluruhan proyek |

