# 📋 spec.md — Spesifikasi Teknis & Catatan Progres

> Log pengerjaan proyek. Update dokumen ini setiap kali ada perubahan signifikan.

---

## Status Proyek

| Item | Status |
|---|---|
| PRD | ✅ Selesai |
| context.md | ✅ Selesai |
| spec.md | ✅ Selesai |
| GitHub Repo | ✅ Terhubung (remote: origin) |
| Next.js Init | ⏳ Belum dimulai |
| Firebase Setup | ⏳ Belum dimulai |
| Google Sheets API Setup | ⏳ Belum dimulai |
| Fitur Kehadiran | ⏳ Belum dimulai |
| Fitur Nilai | ⏳ Belum dimulai |
| Jurnal Guru | ⏳ Belum dimulai |
| Buku Materi | ⏳ Belum dimulai |
| Deploy Vercel | ⏳ Belum dimulai |

---

## Changelog

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
  - kelas: "7A" | "7B" | "8A" | "8B" | "9A"
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
- Default KKM: **70**
- Nilai < 70 → warna merah (belum tuntas)
- Nilai ≥ 70 → warna hijau (tuntas)
- KKM bisa diubah di settings admin

### Batasan & Catatan Teknis
- Google Sheets API: max 300 request/menit → implementasi write debounce 2 detik
- Firebase Firestore free tier: 50K reads/day, 20K writes/day, 20K deletes/day
- Estimasi usage harian: ~500 reads, ~200 writes (aman di free tier)
- Firestore offline persistence: diaktifkan agar tetap bisa input saat internet putus

---

## Next Steps (Sesi Berikutnya)

1. **Setup Next.js project** di `d:\bby\web_module`
   ```bash
   npx create-next-app@latest . --typescript --tailwind --app --eslint
   ```
2. **Install dependencies tambahan**:
   ```bash
   npm install firebase zustand react-hook-form zod recharts katex
   npx shadcn@latest init
   ```
3. **Buat Firebase project** di https://console.firebase.google.com
4. **Setup Google Cloud project** + aktifkan Google Sheets API + buat Service Account
5. **Isi `.env.local`** dengan credentials
6. **Push initial commit** ke GitHub

---

## Pertanyaan Terbuka

- [ ] Distribusi siswa per kelas (asumsi sementara ±30-32/kelas)
- [ ] Nama sekolah untuk ditampilkan di header website
- [ ] Apakah perlu fitur cetak/print rekapitulasi kehadiran?
- [ ] Format nama kelas: "7A" / "Kelas 7A" / "VII-A"?
- [ ] Tahun ajaran yang ditampilkan?
