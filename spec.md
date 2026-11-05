# 📋 spec.md — Spesifikasi Teknis & Catatan Progres

> Log pengerjaan proyek. Update dokumen ini setiap kali ada perubahan signifikan.

---

## Status Proyek

| Item                    | Status                                                   |
| ----------------------- | -------------------------------------------------------- |
| PRD                     | ✅ Selesai                                                |
| context.md              | ✅ Selesai                                                |
| spec.md                 | ✅ Selesai                                                |
| GitHub Repo             | ✅ Terhubung (remote: origin)                             |
| Next.js Init            | ✅ Selesai (App Router, Tailwind, TypeScript)             |
| Firebase Setup          | ✅ Config + Firestore + Google Auth terpasang             |
| Google Sheets API Setup | ✅ Service Account + Auto Sync API terpasang             |
| Fitur Kehadiran         | ✅ Realtime Firestore + Sync Sheets + Cetak Rekap PDF     |
| Fitur Nilai             | ✅ Realtime + KKM 75 + Rekap PDF per Rentang Tanggal      |
| Jurnal Guru             | ✅ CRUD Refleksi Mengajar Firestore                      |
| Buku Materi             | ✅ Modul Kelas 7, 8, 9 (Rumus + Pembahasan + Bank Soal)  |
| Deploy Vercel           | ⏳ Siap deploy                                            |

---

## Changelog

### [2026-11-05] — Sesi 5: Fix Modul Buku Firestore, Soft Dark Pink, Branding Jurnal Guru Premium & Marquee Sambutan

- **Fix Firestore Subcollection Path Buku Modul**:
  - Mengatasi error `Uncaught FirebaseError: Invalid collection reference. Collection references must have an odd number of segments, but materi/9 has 2`.
  - Path diubah dari `materi/{kelas}` (2 segmen) menjadi `materi/{kelas}/bab` (3 segmen) di 10 titik query dan operasi mutasi Firestore (`app/dashboard/buku/[kelas]/page.tsx`).
  - Fitur Buku Modul kini berfungsi penuh: input bab bebas, CRUD bab (tambah, edit nama, naik/turun urutan, hapus), tautan embed PDF Google Drive yang disimpan permanen di Firestore, serta viewer iframe responsif per angkatan kelas (7, 8, 9).
- **Soft Dark Pink Mode**:
  - Mengganti latar banner header dark mode dari dark rose/magenta pekat (`dark:from-pink-950`) menjadi gradasi soft deep blush pink netral (`dark:from-[#321e28] dark:via-[#2b1922] dark:to-[#38202d]`) dipadu aksen border lembut `dark:border-pink-500/30`.
- **Pembaruan Branding & Copywriting Teks**:
  - Login Page: `Portal Matematika SMP` → `Jurnal Guru Premium`.
  - Sidebar & Beranda: `Portal Matematika` → `Jurnal Guru Premium`.
  - Navbar: `Modul Guru Matematika SMP` → `Modul Belajar & Administrasi Guru`.
- **Card Sambutan Dinamis & Running Text (Marquee)**:
  - Header beranda kini menyapa langsung nama guru (`Selamat Datang, {user?.displayName}! 👋✨`).
  - Menambahkan animasi running text berkecepatan santai (`animate-marquee-slow`) dengan auto-pause saat kursor di-hover, memuat pesan motivasi dan rangkuman kapabilitas fitur platform.
- **Diagnostik Error Sinkronisasi Spreadsheet (`PERMISSION_DENIED`)**:
  - Mengidentifikasi penyebab error kode 7 pada tombol "Refresh Spreadsheet": Service Account (`teaching-module-web@teaching-module-web.iam.gserviceaccount.com`) memerlukan penambahan role `Cloud Datastore User` di Google Cloud IAM agar Firebase Admin SDK server dapat membaca koleksi Firestore.
- **Verifikasi**: `tsc` 0 error, `eslint` 0 error, `next build` sukses (15 halaman).

---

### [2026-11-05] — Sesi 4c: Border Internal Dipertebal (Netral, Non-Pink)

- **Semua border internal light mode dipertebal tipis**: input nilai, search bar, chip filter, dropdown, kotak-kotak dalam card → `border-[1.5px] border-slate-300` (1.5px abu lebih gelap dari #e4e4e7); **dark tetap persis** (reset `dark:border-[1px] dark:border-slate-700`).
- **Garis tabel**: `divide-y divide-slate-100` → `divide-y-[1.5px] divide-slate-200` (kehadiran, nilai, siswa); header tabel `border-b` → 1.5px `slate-300`; toolbar/status panel separator `border-b`/`border-t` → 1.5px.
- **Card catatan jurnal** disesuaikan: base `border-2` + warna non-aktif `border-pink-300` (sama dgn card lain), terpilih tetap `border-pink-500`; dark tetap 1px.
- Sidebar border-r & border atas/bawah logo ikut naik warna ke slate-300 (navbar border-b ikut 1.5px).
- **Verifikasi**: `tsc` 0 error, `eslint` 0 error, `next build` sukses (15 halaman).

---

### [2026-11-05] — Sesi 4b: Border Card Aksen Pink & Toggle Tema di Login

- **Border card light mode terlihat jelas**: 32 card putih (rounded-2xl) di 6 halaman dashboard → `border-2 border-pink-300` + `dark:border-[1px] dark:border-slate-700` — light: 2px pink pastel (mengikuti warna CTA); **dark tetap persis seperti sebelumnya** (1px abu). Input, chip, button dan elemen inner `rounded-xl` tidak diubah (tetap 1px).
- **Toggle tema di halaman login**: tombol fixed kanan-atas (`top-4 right-4`), gaya identik dengan navbar (pink pastel/ikon sun-moon), tersedia saat loading & sesudahnya — mode gelap kini bisa dipilih sebelum login.
- **Verifikasi**: `tsc` 0 error, `eslint` 0 error, `next build` sukses (15 halaman).

---

### [2026-11-05] — Hotfix Sesi 4: Toggle Tema Berfungsi & Dark Mode Abu Gelap

- **Fix akar masalah toggle tema**: Tailwind v4 memakai `prefers-color-scheme` untuk variant `dark:` secara default → `dark:` classes mengikuti OS (toggle `.dark` di `<html>` diabaikan; situs "stuck" gelap kalau OS gelap). Fix: tambah `@custom-variant dark (&:where(.dark, .dark *));` di `globals.css` — kini tingklik tombol bulan/matahari benar-benar mengubah tema & tersimpan di localStorage.
- **Dark mode: navy → abu gelap (keinginan user)**: palet `slate` dinetralkan ke zinc via `@theme` (slate-50…950 → #fafafa…#101012) sehingga semua `border-slate-*`, `dark:bg-slate-800/60`, teks slate dsb. jadi abu netral di TERANG & GELAP. Hex eksplisit diganti: `#0f172a` → `#18181b` (bg utama), `#1e293b` → `#27272a` (card), `#334155` → `#3f3f46` (border input), `#94a3b8` → `#a1a1aa` (placeholder) — di 11 file + rule `.dark input/select` di globals.css.
- **Aksen "rose gelap" → tint pink transparan**: chip Navbar "Modul Guru Matematika SMP", tombol toggle tema, kotak profil user, logo box login & sidebar, banner "Portal Modul Belajar" chip, tile-ikon statistik beranda & nilai, badge kelas buku, badge jurnal, badge Remedial → `dark:bg-pink-500/10` + border `dark:border-pink-500/20` (tanpa blok magenta pekat `pink-950` lagi).
- **Verifikasi**: `tsc` 0 error, `eslint` 0 error, `next build` sukses (15 halaman).
- Catatan: laporan awal user "tema belum berubah" memang terjadi karena bug `@custom-variant` di atas — bukan cache.

---

### [2026-11-05] — Sesi 4: Sidebar Netral, Rose → Pink, Light Mode Putih Penuh

- **Sidebar** (`components/layout/Sidebar.tsx`): gradien rose terang & gradien maroon gelap (`#2e0919/#260715/#17030c`) + `shadow-xl` dihapus → `bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-700` (light putih, dark netral identik bg utama, bukan maroon lagi). Menu aktif → `bg-pink-300 text-pink-950 dark:bg-pink-500 dark:text-white` (sama dgn CTA `.btn-primary`); non-aktif → teks slate, hover `bg-pink-100` + teks pink (light) / `bg-slate-800` (dark). Logo box → `bg-pink-100 border-pink-200`; teks brand → hitam/putih; garis atas/bawah/footer → slate; dot kelas 7/8 → pink-300/pink-400 (tetap bisa dibedakan).
- **Rose → pink (1:1)** — sisanya dihapus: beranda (banner `via-rose-200/dark:via-rose-950` → pink, semua teks banner, label "Presensi Hari Ini", tile ikon, card Nilai), nilai (kartu Nilai Terendah ×4, badge Remedial), jurnal (kotak Refleksi). Warna semantik emerald/blue/amber/merah presensi tidak diubah.
- **Light mode putih penuh**: `bg-slate-50` → `bg-white` di 10 titik (toolbar, header tabel, kotak catatan, box tingkat siswa, status box beranda, chip group, chip status berborder) — dark semua tetap (`dark:bg-slate-800/60` dll). Chip kelas non-aktif borderless → putih **+ border slate baru** agar tetap tampak; tombol disabled `bg-slate-100` tetap.
- **Aksen hover baris tabel**: `hover:bg-slate-50` → `hover:bg-pink-50/60` (kehadiran, nilai, siswa); dark tetap `dark:hover:bg-slate-800/40`.
- Banner beranda tetap gradien pink (kartu aksen), dark mode lain tak berubah.
- **Verifikasi**: `tsc --noEmit` 0 error, `eslint` 0 error/warning, `next build` sukses (15 halaman).

---

### [2026-11-04] — Sesi 3: Tema Pastel, Spreadsheet dari Klien & Rekap Bertanggal

- **Tema pink pastel + mode gelap**: palet baru di `globals.css` (`--btn-bg: #f9a8d4` terang / `#ec4899` gelap, teks rose gelap — kontras aman), kelas semantik `.btn-primary` & `.chip-active` dipakai di seluruh CTA/chip terpilih (18 titik). Banner beranda, sidebar (mode terang kini pastel lembut), navbar, login page, halaman buku materi, dan loading screen di-tema ulang; login & buku kini mendukung dark mode (sebelumnya tidak). `app/page.tsx` (landing default) → redirect `/login`. Anti-FOUC: script inline di `layout.tsx` menerapkan `.dark` sebelum paint.
- **ID spreadsheet dimiliki klien**: `lib/sheets.ts` menerima `spreadsheetId` via parameter + helper `resolveSpreadsheetId()` (prioritas ID dari klien → fallback env). Route `/api/sync-kehadiran`, `/api/sync-nilai`, `/api/sync-all` menerima & memvalidasi `spreadsheetId` dari body (zod regex). Kehadiran/nilai page & tombol Refresh beranda mengirim ID dari ThemeContext (localStorage) → sync tetap jalan setelah restart server/deploy Vercel. Fitur "buat spreadsheet baru otomatis" sudah dihapus (setup hanya verifikasi ID existing).
- **Nilai per tanggal**: query realtime nilai kini filter `tanggal == selectedTanggal` (4 filter equality — tanpa composite index); docId baru menyertakan tanggal, resolve dokumen existing via query sehingga **data lama (docId tanpa tanggal) tetap terbaca**; input nilai yang dikosongkan kini benar-benar menghapus dokumen (bug fix); hapus-terpilih via query scope; "Hapus Semua Nilai Materi" kini lintas tanggal. `/api/sync-all` mengurutkan baris nilai per tanggal → "baris terbaru menang" deterministik.
- **Rekap PDF nilai bertanggal**: modal ekspor punya rentang tanggal (default = tanggal terpilih, reset tiap dibuka); tabel PDF memuat Jumlah/Rata²/Tertinggi/Terendah/Ketuntasan per siswa dalam rentang; nama file menyertakan rentang.
- **Kelas 24 (7A–7H, 8A–8H, 9A–9H)** + filter kelas aktif (localStorage via ThemeContext, default 5 kelas). **KKM = 75**.
- **Fitur CRUD baru di semua menu**: Simpan Perubahan (draft lokal, tidak langsung sync), Select Delete, Hapus Semua (per menu), Auto Generate Siswa tetap selalu tersedia.
- **Import CSV divalidasi** terhadap daftar 24 kelas (baris invalid dilewati & dilaporkan).
- **Interaktivitas**: audit hover/active/disabled semua tombol (select-all & checkbox baris dapat feedback hover).
- **Kebersihan**: 17 warning eslint → **0**; `tsc` 0 error; **`next build` sukses** (15 halaman).

---

### [2026-11-04] — Sesi 2: Hardening Keamanan & Perbaikan Sync Sheets

- **Keamanan API routes**: seluruh endpoint (`/api/seed-siswa`, `/api/setup-sheet`, `/api/sync-kehadiran`, `/api/sync-nilai`, `/api/sync-all`) kini memverifikasi Firebase ID Token server-side (`lib/api-auth.ts` → `verifyIdToken` Admin SDK) + allowlist email admin (`ADMIN_EMAIL` di env). Payload divalidasi dengan zod.
- **Client helper auth**: `lib/api-client.ts` (`fetchWithAuth`) mengirim `Authorization: Bearer <idToken>` otomatis; digunakan di halaman kehadiran, nilai, dan dashboard.
- **Guard seed**: `/api/seed-siswa` menolak jika data siswa sudah ada (tanpa `force: true`).
- **Firestore Rules diketatkan** (`firestore.rules`): read/write hanya untuk `riyandaprima69@gmail.com`. Jangan lupa deploy rules ke Firebase Console.
- **middleware.ts → proxy.ts**: migrasi ke konvensi Next 16 (middleware deprecated).
- **Sync Sheets anti-duplikat**: `lib/sheets.ts` dirombak — UPSERT berbasis kunci (Kehadiran: `NIS+Tanggal`; Nilai: `NIS+Kelas+Jenis+Materi`), bukan append. Baris existing di-update in-place (1x read + 1x batchUpdate), sinkron parsial aman (orphan hanya dibersihkan dalam lingkup kelas+tanggal terkirim), sinkron penuh (`authoritative: true`) membersihkan semua orphan.
- **Batching**: halaman kehadiran & nilai kini mengirim 1 request per simpan (sebelumnya 1 fetch per siswa, maksimal ±32 request). 
- **Endpoint baru `/api/sync-all`**: server membaca Firestore langsung (Admin SDK) → upsert penuh; tombol "Refresh Spreadsheet" di dashboard kini 1 request (sebelumnya loop ±150 fetch dari browser).
- **Fix `/api/setup-sheet`**: penulisan `.env.local` dibuat non-fatal (di Vercel filesystem read-only, verifikasi spreadsheet tetap sukses); ID spreadsheet yang dikirim divalidasi regex.
- **Bersih-bersih dependency**: uninstall `zustand` & `react-hook-form` (unused). `zod` kini terpakai di API routes; `recharts`, `katex`, `clsx`/`tailwind-merge` dipertahankan untuk fitur berikutnya.
- **.env.example** dibuat sebagai template.
- **Lint 0 error** (28 warning unused-vars lama tersisa); **build sukses**; bonus: perbaikan type-error di jurnal & nilai (WIP sebelumnya), rule `react-hooks/set-state-in-effect` dinonaktifkan dengan catatan karena pola eksisting terverifikasi.

---

### [2026-11-03] — Sesi 1: Perencanaan & Setup Awal

- Dibuat PRD lengkap (`PRD_WebModulMatematikaSMP.md`)
- Dibuat `context.md` dan `spec.md`
- GitHub repo terhubung: `https://github.com/riyandaprimaa/teaching_module_web.git`
- Keputusan final:
  - 5 kelas (7A, 7B, 8A, 8B, 9A), 156 siswa
  - 1 admin/guru
  - Google Sheets baru dibuat otomatis oleh sistem

---

## Spesifikasi Teknis Detail

### Firebase Firestore Rules (Rencana)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Hanya user yang terautentikasi bisa baca/tulis
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Google Sheets Schema

**Sheet: Kehadiran**
| NIS | Nama | Kelas | Tanggal | Status | Timestamp |
|---|---|---|---|---|---|
| 001 | ... | 7A | 2026-11-03 | Hadir | ... |

**Sheet: Nilai**
| NIS | Nama | Kelas | Jenis | KD/Materi | Nilai | Tanggal |
|---|---|---|---|---|---|---|
| 001 | ... | 7A | UH | Aljabar | 85 | ... |

### Struktur Firestore Collections

```
/siswa/{siswaId}
  - nis: string
  - nama: string
  - kelas: "7A" | "7B" | ... | "9H" (24 kelas: 7A–7H, 8A–8H, 9A–9H)
  - createdAt: timestamp

/kehadiran/{tahun-bulan-tanggal_kelas}/{siswaId}
  - status: "hadir" | "izin" | "sakit" | "alfa"
  - timestamp: timestamp
  - synced_to_sheets: boolean

/nilai/{siswaId}/{nilaiId}
  - jenis: "UH" | "UTS" | "UAS" | "Tugas"
  - kd: string
  - nilai: number
  - tanggal: timestamp
  - synced_to_sheets: boolean

/jurnal/{jurnalId}
  - tanggal: timestamp
  - kelas: string
  - topik: string
  - isi: string
  - refleksi: string
  - createdAt: timestamp
  - updatedAt: timestamp

/materi/{kelas}/{babId}
  - judul: string
  - urutan: number
  - deskripsi: string
  - konten: string        ← Markdown + LaTeX
  - contoh_soal: array
  - latihan: array
  - soal_hots: array
  - updatedAt: timestamp
```

### KKM (Kriteria Ketuntasan Minimal)

- Default KKM: **75**
- Nilai < 75 → warna merah (belum tuntas)
- Nilai ≥ 75 → warna hijau (tuntas)
- KKM bisa diubah di settings admin

### Batasan & Catatan Teknis

- Google Sheets API: max 300 request/menit → implementasi write debounce 2 detik
- Firebase Firestore free tier: 50K reads/day, 20K writes/day, 20K deletes/day
- Estimasi usage harian: ~500 reads, ~200 writes (aman di free tier)
- Firestore offline persistence: diaktifkan agar tetap bisa input saat internet putus

---

## Next Steps (Sesi Berikutnya)

- **Deploy Vercel** (satu-satunya item yang belum selesai di tabel Status).
- [SELESI — 2026-11-05] ~~Sesi 4: Sidebar Netral, Rose → Pink, Light Mode Putih Penuh~~ → ✅ selesai, lihat changelog di atas.
- Catatan konteks Sesi 3 (sudah selesai): DatePicker calendar (`components/ui/date-picker.tsx`, 7 input diganti), kartu tertinggi/terendah multi-nama + marquee, tema putih/hitam per mode, dark netral slate.

---

## Keputusan Final (Dikunci)

> ⚠️ **Sebagian sudah diperbarui di Sesi 3** (lihat changelog): kelas **24** (7A–7H, 8A–8H, 9A–9H), **KKM = 75**, spreadsheet memakai **ID milik user** (tanpa auto-create sheet). Bagian di bawah ini tetap sebagai arsip keputusan awal.

- [x] Distribusi siswa per kelas: asumsi ±30-32/kelas (tidak perlu dikonfirmasi)
- [x] Nama sekolah: **tidak ditampilkan**, pakai header umum
- [x] Fitur cetak/print rekap kehadiran: **YA**, perlu export PDF untuk print
- [x] Format nama kelas: **7A, 7B, 8A, 8B, 9A**
- [x] Tahun ajaran: **2026/2027**
