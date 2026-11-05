# 📝 revision.md — Daftar Revisi & Rencana Pengerjaan Mendatang

Dokumen ini mencatat seluruh daftar perbaikan, perubahan fitur, dan penyesuaian teknis yang diperlukan untuk pengembangan web modul pembelajaran matematika SMP ke depan.

---

## 📌 Status Tracker Revisi

| ID | Fitur / Modul | Ringkasan Revisi | Status | Prioritas |
| :--- | :--- | :--- | :--- | :--- |
| **REV-01** | Rekapitulasi Kehadiran & Nilai | Penyesuaian format & struktur tabel rekapitulasi (menunggu contoh) | ⏳ Menunggu Contoh User | Tinggi |

---

## 📋 Detail Revisi & Rencana Implementasi

### [REV-01] Penyesuaian Format Tabel Rekapitulasi Kehadiran & Nilai
* **Modul Terkait**: 
  - `app/dashboard/kehadiran/page.tsx` (Tabel presensi & ekspor PDF rekapitulasi)
  - `app/dashboard/nilai/page.tsx` (Tabel daftar nilai & ekspor PDF rekapitulasi)
  - `lib/sheets.ts` / Skema Spreadsheet (bila berpengaruh pada format ekspor/tampilan)
* **Keterangan**:
  - Format tabel rekapitulasi untuk menu Kehadiran dan Nilai perlu diubah susunan kolom/tata letaknya.
  - Detail acuan dan contoh struktur tabel yang diinginkan akan dikirimkan oleh user menyusul.
  - Setelah contoh diberikan, agent akan menyesuaikan struktur komponen tabel di web dan generator dokumen PDF.
* **Status**: ⏳ *Menunggu rincian format / file contoh dari user.*
* **Checklist Pengerjaan**:
  - [ ] Menerima dan mempelajari format contoh tabel dari user.
  - [ ] Menyesuaikan struktur header dan baris data tabel di halaman Kehadiran.
  - [ ] Menyesuaikan struktur header dan baris data tabel di halaman Nilai.
  - [ ] Menyesuaikan tabel ekspor PDF `autoTable` (jsPDF) agar identik dengan format baru.
  - [ ] Verifikasi `tsc --noEmit` & `next build`.
  - [ ] Dokumentasi ke `spec.md` & commit/push ke GitHub.

---

## ➕ Format Tambahan Revisi Berikutnya (Template)
*(Gunakan blok ini untuk mencatat revisi baru yang masuk)*

```markdown
### [REV-XX] Judul Revisi
* **Modul Terkait**: ...
* **Keterangan**: ...
* **Status**: ⏳ Pending / 🔄 In Progress / ✅ Done
* **Checklist Pengerjaan**:
  - [ ] ...
```
