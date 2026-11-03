# 📐 PRD — Web Modul Belajar Matematika SMP
**Product Requirements Document** | v1.0 | 3 November 2026

---

## 1. Latar Belakang & Tujuan

Website ini dirancang sebagai **platform pedoman guru** dalam menyusun modul belajar dan menyiapkan materi/soal matematika untuk siswa SMP (Kelas 7, 8, dan 9). Data kehadiran dan nilai siswa terhubung langsung ke Google Spreadsheet sehingga dapat diperbarui secara **real-time** tanpa perlu input manual berulang.

### Skala Proyek
- **5 kelas**: 7A, 7B, 8A, 8B, 9A
- **±156 siswa** total (~30–32 siswa/kelas)
- **1 admin/guru** sebagai pengguna utama

### Tujuan Produk
- Memudahkan guru dalam mengelola administrasi kelas (kehadiran & nilai) secara digital
- Menyediakan referensi materi & soal matematika terstruktur per kelas
- Menyimpan jurnal harian guru sebagai catatan reflektif
- Semua data tersinkronisasi secara real-time melalui cloud

---

## 2. Konsep Fitur

### 2.1 🗓️ Daftar Kehadiran Siswa
- Input kehadiran langsung dari dashboard (Hadir / Izin / Sakit / Alfa)
- Data langsung tersinkronisasi ke **Google Sheets** via API
- Filter berdasarkan kelas (7A, 7B, 8A, dst) dan tanggal
- Rekapitulasi kehadiran bulanan otomatis
- Notifikasi / highlight jika siswa alfa lebih dari 3x

### 2.2 📊 Daftar Nilai Siswa
- Input nilai per KD (Kompetensi Dasar) / ulangan / UTS / UAS
- Nilai tersimpan dan disinkronkan ke **Google Sheets** secara real-time
- Kalkulasi otomatis: rata-rata, nilai tertinggi/terendah
- Warna indikator (merah: di bawah KKM, hijau: di atas KKM). KKM default: 70
- Export ke PDF atau CSV

### 2.3 📓 Jurnal Guru
- Form pencatatan jurnal harian: tanggal, kelas, topik, catatan, refleksi
- Simpan ke **Firebase Firestore** (real-time database)
- Riwayat jurnal dapat dicari berdasarkan tanggal atau kata kunci
- Mode edit & hapus entri jurnal

### 2.4 📚 Buku Kelas (7 / 8 / 9)
- Navigasi materi per bab dan sub-bab
- Setiap bab berisi:
  - **Ringkasan Materi** (teks + rumus dengan LaTeX/KaTeX)
  - **Contoh Soal** beserta pembahasan
  - **Soal Latihan** (pilihan ganda + isian)
  - **Soal HOTS** (Higher Order Thinking Skills)
- Materi dapat diperbarui oleh admin melalui dashboard
- Konten disimpan di **Firebase Firestore**

---

## 3. Tech Stack (Gratis / Free Tier)

| Layer | Teknologi | Alasan |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | SSR + SSG, performa tinggi, gratis |
| **Styling** | Tailwind CSS + shadcn/ui | Komponen siap pakai, konsisten |
| **Math Rendering** | KaTeX | Render rumus LaTeX di browser |
| **Database Real-time** | Firebase Firestore (free tier) | Real-time listener, offline support |
| **Spreadsheet Sync** | Google Sheets API v4 | Gratis via service account |
| **Auth** | Firebase Authentication | Login Google/email, gratis |
| **Hosting** | Vercel (free tier) | Deploy otomatis dari GitHub |
| **State Management** | Zustand | Ringan, mudah diintegrasikan |
| **Form** | React Hook Form + Zod | Validasi form yang kuat |
| **Charts** | Recharts | Visualisasi nilai/kehadiran |

> **Catatan Biaya**: Semua layanan memiliki free tier yang cukup untuk skala 5 kelas (~156 siswa). Firebase Firestore: 1 GB storage + 50K reads/day. Google Sheets API: 300 req/menit.

---

## 4. Konsep Design

### 4.1 Prinsip Desain
- **Clean & Professional** — cocok untuk lingkungan pendidikan
- **Mobile-first** — guru bisa akses dari HP di dalam kelas
- **High Contrast** — mudah dibaca di kondisi pencahayaan berbeda
- **Color Coding** — setiap kelas memiliki warna aksen tersendiri

### 4.2 Palet Warna

| Elemen | Warna | Hex |
|---|---|---|
| Primary | Biru Tua | `#1E3A5F` |
| Accent | Teal/Hijau | `#0D9488` |
| Kelas 7 | Biru Muda | `#3B82F6` |
| Kelas 8 | Ungu | `#8B5CF6` |
| Kelas 9 | Oranye | `#F59E0B` |
| Danger | Merah | `#EF4444` |
| Success | Hijau | `#22C55E` |
| Background | Abu Muda | `#F8FAFC` |

### 4.3 Layout & Navigasi

```
┌─────────────────────────────────────────────────┐
│  LOGO  │  Kehadiran │ Nilai │ Jurnal │ Buku    │
├────────┬────────────────────────────────────────┤
│        │                                        │
│ SIDE   │         MAIN CONTENT AREA             │
│ BAR    │                                        │
│        │  ┌──────────┐  ┌──────────┐           │
│ - K7   │  │  CARD 1  │  │  CARD 2  │           │
│ - K8   │  └──────────┘  └──────────┘           │
│ - K9   │                                        │
│        │         TABLE / FORM                   │
└────────┴────────────────────────────────────────┘
```

---

## 5. Arsitektur Sistem

```
[Guru/Browser] → [Next.js - Vercel]
                      ↓               ↓
               [Firebase Firestore]  [Google Sheets API]
               [Firebase Auth]
```

### Alur Data Real-time
1. Guru input kehadiran di web
2. Data ditulis ke **Firestore** → semua device update otomatis via `onSnapshot`
3. Sistem sync ke **Google Sheets** (debounce 2 detik untuk hemat kuota API)
4. Toast notifikasi: "Data tersimpan ✓"

---

## 6. Alur Pengerjaan (Development Roadmap)

### Phase 1 — Setup & Fondasi (Minggu 1)
- [ ] Init project Next.js 14 + Tailwind CSS + shadcn/ui
- [ ] Setup Firebase project (Auth + Firestore)
- [ ] Setup Google Cloud project + Sheets API credentials
- [ ] Buat layout utama: Navbar, Sidebar, routing dasar
- [ ] Implementasi Firebase Authentication (login Google)

### Phase 2 — Fitur Kehadiran (Minggu 2)
- [ ] Halaman daftar siswa per kelas
- [ ] Form input kehadiran harian
- [ ] Real-time sync ke Firestore
- [ ] Sinkronisasi ke Google Sheets
- [ ] Rekapitulasi kehadiran bulanan + chart

### Phase 3 — Fitur Nilai (Minggu 3)
- [ ] Halaman daftar nilai per kelas & KD
- [ ] Form input nilai
- [ ] Real-time sync ke Firestore + Google Sheets
- [ ] Kalkulasi rata-rata otomatis
- [ ] Color coding KKM + export PDF/CSV

### Phase 4 — Jurnal Guru (Minggu 4)
- [ ] Form tambah jurnal
- [ ] Daftar riwayat jurnal (with search & filter)
- [ ] Fitur edit & hapus
- [ ] Real-time sync Firestore

### Phase 5 — Buku Materi (Minggu 5–6)
- [ ] Struktur navigasi Kelas 7 / 8 / 9
- [ ] Render konten materi + rumus (KaTeX)
- [ ] CRUD materi via admin dashboard
- [ ] Halaman contoh soal + latihan + HOTS

### Phase 6 — Polish & Deploy (Minggu 7)
- [ ] Responsive design (mobile)
- [ ] Loading states & error handling
- [ ] Deploy ke Vercel
- [ ] Testing end-to-end

---

## 7. Struktur Folder Proyek

```
web_module/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── kehadiran/page.tsx
│   │   ├── nilai/page.tsx
│   │   ├── jurnal/page.tsx
│   │   └── buku/kelas-[7|8|9]/page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/ui/ kehadiran/ nilai/ jurnal/ buku/
├── lib/firebase.ts  sheets.ts  utils.ts
├── hooks/useKehadiran.ts  useNilai.ts  useJurnal.ts
├── store/
├── types/
└── public/
```

---

## 8. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Google Sheets API rate limit | Batching write, debounce 2 detik |
| Firebase free tier habis | Monitor usage, archive data lama |
| Koneksi internet putus | Firestore offline persistence diaktifkan |
| Akses tidak sah | Firebase Auth + Firestore Security Rules |

---

*Dokumen ini akan diperbarui seiring perkembangan pengerjaan.*

