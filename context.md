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
| **Skala** | Hingga 24 kelas (7A–7H, 8A–8H, 9A–9H), kelas aktif dikustomisasi user |
| **Repo GitHub** | https://github.com/riyandaprimaa/teaching_module_web.git |
| **Local Path** | `d:\bby\web_module` |
| **Bahasa UI** | Bahasa Indonesia |
| **Started** | 3 November 2026 |

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, konvensi `proxy.ts` — middleware deprecated) |
| Styling | Tailwind CSS + kelas semantik pastel (`.btn-primary`, `.chip-active`) |
| Math Render | KaTeX |
| Database | Firebase Firestore (free tier) |
| Auth | Firebase Authentication (Google Sign-in) |
| Spreadsheet | Google Sheets API v4 — **ID spreadsheet dimiliki klien (localStorage)**; sinkron UPSERT, tidak ada auto-create sheet |
| State | React hooks + `contexts/ThemeContext.tsx` (tema, spreadsheetId, kelas aktif) |
| Form | ~~React Hook Form~~ (uninstall); zod untuk validasi payload API |
| Charts | Recharts |
| Hosting | Vercel (free tier) |

---

## Keputusan Arsitektur (Sudah Dikunci)

- **Auth**: Hanya 1 user (admin/guru). Login via Google melalui Firebase Auth. Email admin: `ADMIN_EMAIL` di env (`riyandaprima69@gmail.com`) — dipakai allowlist API routes & Firestore Rules.
- **API Security**: Semua API routes memverifikasi Firebase ID Token server-side (`lib/api-auth.ts`). Client memanggil API via `fetchWithAuth` (`lib/api-client.ts`).
- **Google Sheets**: Tidak ada auto-create spreadsheet. User memasukkan ID spreadsheet di beranda (disimpan di localStorage → `ThemeContext`); semua route sync menerima `spreadsheetId` dari request (fallback env). Sinkronisasi berupa UPSERT (anti-duplikat); tombol "Refresh Spreadsheet" menjalankan sync penuh dari server.
- **Kelas**: 24 kelas (7A–7H, 8A–8H, 9A–9H); user hanya mengajar sebagian → **filter kelas aktif** (default 5 kelas) disimpan di localStorage, diatur di menu Data Siswa.
- **KKM**: **75**.
- **Penyimpanan perubahan**: input di halaman kehadiran/nilai bersifat draft lokal — data baru tersinkron ke Firestore/Sheets setelah tombol **Simpan Perubahan** ditekan.
- **Firestore**: Data kehadiran, nilai, jurnal, dan materi disimpan di Firestore. Sheets berfungsi sebagai backup & laporan.
- **Role**: Tidak ada multi-role. Semua fitur hanya bisa diakses oleh admin yang login.

---

## Struktur Data Kelas

```
Kelas 7A – 7H  (8 kelas)
Kelas 8A – 8H  (8 kelas)
Kelas 9A – 9H  (8 kelas)
Total: 24 kelas
```

> User tidak mengajar semua kelas. Sistem menyimpan **daftar kelas aktif** (default 5 kelas) di localStorage — hanya kelas aktif yang tampil sebagai tab di menu kehadiran/nilai/jurnal. Kelas aktif ditambah/dikurangi di menu **Data Siswa → Pilih Kelas Aktif**.

---

## Struktur Folder Proyek

```
d:\bby\web_module/
├── app/
│   ├── page.tsx               ← redirect ke /login
│   ├── login/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx           ← beranda (integrasi spreadsheet, statistik)
│   │   ├── siswa/page.tsx     ← data siswa + filter kelas aktif
│   │   ├── kehadiran/page.tsx
│   │   ├── nilai/page.tsx
│   │   ├── jurnal/page.tsx
│   │   └── buku/[kelas]/page.tsx
│   ├── api/
│   │   ├── seed-siswa/  setup-sheet/
│   │   ├── sync-kehadiran/  sync-nilai/  sync-all/
│   ├── layout.tsx             ← + script anti-FOUC tema
│   └── globals.css            ← palet pastel + .btn-primary/.chip-active
├── components/
│   ├── ui/                    ← toaster
│   └── layout/                ← Navbar (toggle tema), Sidebar
├── contexts/
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx       ← tema, spreadsheetId, kelas aktif (localStorage)
├── lib/
│   ├── firebase.ts  firebase-admin.ts
│   ├── sheets.ts  api-auth.ts  api-client.ts
│   └── utils.ts
├── hooks/use-toast.ts
├── types/index.ts             ← 24 KelasId, KKM=75
├── proxy.ts                   ← konvensi Next 16 (pengganti middleware)
├── firestore.rules
├── .env.example
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

