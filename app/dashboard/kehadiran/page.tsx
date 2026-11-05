'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  writeBatch,
  getDocs,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useTheme } from '@/contexts/ThemeContext'
import { Siswa, Kehadiran, KelasId, StatusKehadiran, TAHUN_AJARAN } from '@/types'
import { formatTanggal, toDateString, getStatusColor, getStatusLabel } from '@/lib/utils'
import { fetchWithAuth, parseApiResponse } from '@/lib/api-client'
import {
  Calendar,
  Printer,
  CheckCircle,
  RefreshCw,
  Save,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from '@/hooks/use-toast'
import { DatePicker } from '@/components/ui/date-picker'

export default function KehadiranPage() {
  const { activeKelasList, spreadsheetId } = useTheme()

  const [selectedKelas, setSelectedKelas] = useState<KelasId>(activeKelasList[0] || '7A')
  const [selectedTanggal, setSelectedTanggal] = useState<string>(toDateString(new Date()))
  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [loading, setLoading] = useState(true)

  // Draft lokal sebelum tombol "Simpan Perubahan" ditekan
  const [draftKehadiran, setDraftKehadiran] = useState<Record<string, StatusKehadiran>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // State untuk Opsi Seleksi (Select Delete)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  // State Modal Ekspor PDF Rentang Tanggal / Multi-Kelas
  const [showExportModal, setShowExportModal] = useState(false)
  const [pdfKelasMode, setPdfKelasMode] = useState<'single' | 'allActive'>('single')
  const [pdfStartDate, setPdfStartDate] = useState<string>(toDateString(new Date()))
  const [pdfEndDate, setPdfEndDate] = useState<string>(toDateString(new Date()))

  // 1. Ambil daftar siswa kelas terpilih
  useEffect(() => {
    setLoading(true)
    const q = query(collection(db, 'siswa'), where('kelas', '==', selectedKelas))
    const unsub = onSnapshot(q, (snap) => {
      const data: Siswa[] = []
      snap.forEach((doc) => data.push(doc.data() as Siswa))
      data.sort((a, b) => a.nama.localeCompare(b.nama))
      setSiswaList(data)
      setLoading(false)
      setSelectedIds([])
    })

    return () => unsub()
  }, [selectedKelas])

  // Pastikan kelas terpilih selalu valid
  useEffect(() => {
    if (!activeKelasList.includes(selectedKelas)) {
      setSelectedKelas(activeKelasList[0] || '7A')
    }
  }, [activeKelasList, selectedKelas])

  // 2. Ambil status kehadiran realtime per tanggal & kelas terpilih
  useEffect(() => {
    const q = query(
      collection(db, 'kehadiran'),
      where('kelas', '==', selectedKelas),
      where('tanggal', '==', selectedTanggal)
    )

    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, StatusKehadiran> = {}
      snap.forEach((doc) => {
        const item = doc.data() as Kehadiran
        map[item.siswaId] = item.status
      })
      setDraftKehadiran(map)
      setHasChanges(false)
    })

    return () => unsub()
  }, [selectedKelas, selectedTanggal])

  // Ubah status di DRAFT lokal (belum langsung ke Firestore)
  const handleChangeStatusLocal = (siswaId: string, status: StatusKehadiran) => {
    setDraftKehadiran((prev) => ({
      ...prev,
      [siswaId]: status,
    }))
    setHasChanges(true)
  }

  // Tandai semua hadir di draft
  const handleMarkAllHadirDraft = () => {
    const nextDraft = { ...draftKehadiran }
    siswaList.forEach((s) => {
      nextDraft[s.id] = 'hadir'
    })
    setDraftKehadiran(nextDraft)
    setHasChanges(true)
  }

  // Simpan Perubahan ke Database Firestore & Sync ke Spreadsheet jika tombol ditekan
  const handleSaveAllChanges = async () => {
    setIsSaving(true)
    try {
      const batch = writeBatch(db)
      const rowsToSync: {
        nis: string
        nama: string
        kelas: KelasId
        tanggal: string
        status: string
      }[] = []

      for (const siswa of siswaList) {
        const status = draftKehadiran[siswa.id]
        if (status) {
          const docId = `${selectedTanggal}_${siswa.id}`
          const docRef = doc(db, 'kehadiran', docId)
          batch.set(docRef, {
            id: docId,
            siswaId: siswa.id,
            namaSiswa: siswa.nama,
            nis: siswa.nis || '',
            kelas: selectedKelas,
            tanggal: selectedTanggal,
            status: status,
            updatedAt: new Date().toISOString(),
          })

          rowsToSync.push({
            nis: siswa.nis || '',
            nama: siswa.nama,
            kelas: selectedKelas,
            tanggal: selectedTanggal,
            status: status, // kirim lowercase enum langsung (hadir/izin/sakit/alfa)
          })
        }
      }

      await batch.commit()

      // Sinkron batch ke Sheets (1 request, dikirim setelah Firestore sukses;
      // error Sheets tidak membatalkan penyimpanan presensi)
      if (rowsToSync.length > 0) {
        fetchWithAuth('/api/sync-kehadiran', {
          method: 'POST',
          body: JSON.stringify({ rows: rowsToSync, spreadsheetId: spreadsheetId || undefined }),
        })
          .then((res) => parseApiResponse(res))
          .catch((e) => console.warn('Sinkronisasi Sheets gagal:', e.message))
      }

      setHasChanges(false)
      toast({
        title: 'Perubahan Disimpan! ✓',
        description: `Presensi kelas ${selectedKelas} (${formatTanggal(selectedTanggal)}) telah tersimpan.`,
      })
    } catch (err: unknown) {
      toast({ title: 'Gagal Menyimpan', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle selection untuk select delete
  const handleToggleSelectOne = (siswaId: string) => {
    if (selectedIds.includes(siswaId)) {
      setSelectedIds(selectedIds.filter((id) => id !== siswaId))
    } else {
      setSelectedIds([...selectedIds, siswaId])
    }
  }

  const handleToggleSelectAll = () => {
    if (selectedIds.length === siswaList.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(siswaList.map((s) => s.id))
    }
  }

  // Hapus Data Presensi yang Dipilih
  const handleDeleteSelectedAttendance = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Hapus data presensi untuk ${selectedIds.length} siswa terpilih pada tanggal ${selectedTanggal}?`)) return

    setIsDeleting(true)
    try {
      const batch = writeBatch(db)
      selectedIds.forEach((siswaId) => {
        const docId = `${selectedTanggal}_${siswaId}`
        batch.delete(doc(db, 'kehadiran', docId))
      })
      await batch.commit()
      setSelectedIds([])
      toast({ title: 'Presensi Dihapus', description: 'Data terpilih telah dibersihkan.' })
    } catch (err: unknown) {
      toast({ title: 'Gagal Menghapus', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  // Hapus Semua Presensi di Tanggal & Kelas Ini
  const handleDeleteAllAttendanceToday = async () => {
    if (!confirm(`Hapus SELURUH data presensi kelas ${selectedKelas} pada tanggal ${selectedTanggal}?`)) return

    setIsDeleting(true)
    try {
      const batch = writeBatch(db)
      siswaList.forEach((s) => {
        const docId = `${selectedTanggal}_${s.id}`
        batch.delete(doc(db, 'kehadiran', docId))
      })
      await batch.commit()
      setSelectedIds([])
      toast({ title: 'Presensi Dikosongkan' })
    } catch (err: unknown) {
      toast({ title: 'Gagal', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  // Export Rekap PDF (Mendukung Rentang Tanggal & Pilihan Kelas Tunggal/Gabungan)
  const handleGeneratePdfReport = async () => {
    try {
      toast({ title: 'Menyiapkan Rekap PDF...' })
      const doc = new jsPDF()

      const targetKelas = pdfKelasMode === 'single' ? [selectedKelas] : activeKelasList

      // Ambil data siswa untuk kelas target
      const siswaSnap = await getDocs(
        query(collection(db, 'siswa'), where('kelas', 'in', targetKelas))
      )
      const allSiswa: Siswa[] = []
      siswaSnap.forEach((d) => allSiswa.push(d.data() as Siswa))
      allSiswa.sort((a, b) => a.kelas.localeCompare(b.kelas) || a.nama.localeCompare(b.nama))

      // Ambil kehadiran untuk kelas target (filter rentang tanggal di sisi klien agar tidak membutuhkan composite index)
      const kehadiranSnap = await getDocs(
        query(
          collection(db, 'kehadiran'),
          where('kelas', 'in', targetKelas)
        )
      )

      // Rekapitulasi per siswa dalam rentang tanggal
      const summary: Record<string, { hadir: number; izin: number; sakit: number; alfa: number }> = {}
      kehadiranSnap.forEach((d) => {
        const item = d.data() as Kehadiran
        if (item.tanggal >= pdfStartDate && item.tanggal <= pdfEndDate) {
          if (!summary[item.siswaId]) {
            summary[item.siswaId] = { hadir: 0, izin: 0, sakit: 0, alfa: 0 }
          }
          if (item.status === 'hadir') summary[item.siswaId].hadir++
          if (item.status === 'izin') summary[item.siswaId].izin++
          if (item.status === 'sakit') summary[item.siswaId].sakit++
          if (item.status === 'alfa') summary[item.siswaId].alfa++
        }
      })

      // Header PDF
      doc.setFontSize(15)
      doc.text('REKAPITULASI PRESENSI SISWA MATEMATIKA SMP', 105, 18, { align: 'center' })
      doc.setFontSize(10)
      const kelasText = pdfKelasMode === 'single' ? `Kelas: ${selectedKelas}` : `Gabungan Kelas: ${targetKelas.join(', ')}`
      const rentangText = pdfStartDate === pdfEndDate ? `Tanggal: ${pdfStartDate}` : `Periode: ${pdfStartDate} s/d ${pdfEndDate}`
      doc.text(`${kelasText} | ${rentangText} | T.A: ${TAHUN_AJARAN}`, 105, 25, { align: 'center' })
      doc.setLineWidth(0.5)
      doc.line(14, 28, 196, 28)

      const tableData = allSiswa.map((s, idx) => {
        const st = summary[s.id] || { hadir: 0, izin: 0, sakit: 0, alfa: 0 }
        return [
          idx + 1,
          s.nis,
          s.nama,
          s.kelas,
          st.hadir,
          st.izin,
          st.sakit,
          st.alfa,
        ]
      })

      autoTable(doc, {
        startY: 32,
        head: [['No', 'NIS', 'Nama Siswa', 'Kelas', 'Hadir', 'Izin', 'Sakit', 'Alfa']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [190, 24, 93] }, // Pink Dark
        styles: { fontSize: 8 },
      })

      const docWithTable = doc as unknown as { lastAutoTable?: { finalY: number } }
      const finalY = (docWithTable.lastAutoTable?.finalY ?? 0) + 15
      doc.setFontSize(9)
      doc.text('Mengetahui,', 145, finalY)
      doc.text('Guru Mata Pelajaran Matematika', 145, finalY + 5)
      doc.text('( ................................................ )', 145, finalY + 25)

      doc.save(`Rekap_Presensi_${pdfKelasMode === 'single' ? selectedKelas : 'Gabungan'}_${pdfStartDate}_${pdfEndDate}.pdf`)
      setShowExportModal(false)
      toast({ title: 'PDF Berhasil Dibuat! 📄' })
    } catch (err: unknown) {
      toast({ title: 'Gagal Generate PDF', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#27272a] p-5 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">Daftar Kehadiran Siswa</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Lakukan absensi kelas, review perubahan, dan tekan tombol Simpan Perubahan agar tersimpan permanen.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Simpan Perubahan Utama */}
          <button
            onClick={handleSaveAllChanges}
            disabled={!hasChanges || isSaving}
            className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition ${
              hasChanges
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
            }`}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Menyimpan...' : hasChanges ? 'Simpan Perubahan *' : 'Tersimpan'}
          </button>

          {/* Tandai Semua Hadir */}
          <button
            onClick={handleMarkAllHadirDraft}
            disabled={siswaList.length === 0}
            className="flex items-center gap-1.5 bg-white dark:bg-[#27272a] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 py-2 rounded-xl border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700"
          >
            <CheckCircle className="w-3.5 h-3.5 text-pink-600" />
            Semua Hadir
          </button>

          {/* Buka Dialog Ekspor PDF */}
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 btn-primary text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Rekap PDF
          </button>
        </div>
      </div>

      {/* Bar Filter Kelas Aktif & Tanggal */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-[#27272a] p-4 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700">
        {/* Pilihan Kelas Aktif */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">Pilih Kelas:</span>
          <div className="flex gap-1.5 flex-nowrap">
            {activeKelasList.map((k) => (
              <button
                key={k}
                onClick={() => setSelectedKelas(k)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                  selectedKelas === k
                    ? 'chip-active shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Pemilih Tanggal */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-pink-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tanggal:</span>
          <DatePicker value={selectedTanggal} onChange={setSelectedTanggal} />
        </div>
      </div>

      {/* Tabel Kehadiran Siswa */}
      <div className="bg-white dark:bg-[#27272a] rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 overflow-hidden shadow-xs">
        {/* Bar Sub-Aksi (Pilih Delete & Status Bar) */}
        <div className="p-4 border-b-[1.5px] border-slate-300 dark:border-b-[1px] dark:border-slate-700 flex flex-wrap justify-between items-center gap-3 bg-white dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-bold text-pink-700 dark:text-pink-300 hover:opacity-70 transition"
            >
              {selectedIds.length === siswaList.length && siswaList.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-pink-600" />
              ) : (
                <Square className="w-4 h-4 text-pink-400" />
              )}
              Pilih ({selectedIds.length}/{siswaList.length})
            </button>

            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelectedAttendance}
                disabled={isDeleting}
                className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Presensi Terpilih ({selectedIds.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Kelas {selectedKelas} • {formatTanggal(selectedTanggal)}
            </span>

            {siswaList.length > 0 && (
              <button
                onClick={handleDeleteAllAttendanceToday}
                disabled={isDeleting}
                className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/30 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900/40"
              >
                <Trash2 className="w-3 h-3" /> Hapus Presensi Hari Ini
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-pink-500" />
            Memuat data siswa kelas {selectedKelas}...
          </div>
        ) : siswaList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
            Tidak ada siswa terdaftar di kelas {selectedKelas}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white dark:bg-slate-800/60 border-b-[1.5px] border-slate-300 dark:border-b-[1px] dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-10 text-center">Pilih</th>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-28">NIS</th>
                  <th className="py-3 px-4">Nama Lengkap Siswa</th>
                  <th className="py-3 px-4 w-32 text-center">Status Presensi</th>
                  <th className="py-3 px-4 text-center w-64">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y-[1.5px] divide-slate-200 dark:divide-y-[1px] dark:divide-slate-700/60">
                {siswaList.map((siswa, idx) => {
                  const isChecked = selectedIds.includes(siswa.id)
                  const currentStatus = draftKehadiran[siswa.id]
                  return (
                    <tr
                      key={siswa.id}
                      className={`transition-colors ${
                        isChecked
                          ? 'bg-pink-100/50 dark:bg-pink-950/50'
                          : 'hover:bg-pink-50/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => handleToggleSelectOne(siswa.id)} className="transition hover:opacity-70">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-pink-600" />
                          ) : (
                            <Square className="w-4 h-4 text-pink-300 dark:text-pink-700" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 dark:text-slate-500 font-semibold">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {siswa.nis}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {siswa.nama}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {currentStatus ? (
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusColor(
                              currentStatus
                            )}`}
                          >
                            {getStatusLabel(currentStatus)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Belum Presensi</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex gap-1.5 bg-white dark:bg-slate-800/60 p-1 rounded-xl border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700">
                          {(['hadir', 'izin', 'sakit', 'alfa'] as StatusKehadiran[]).map((st) => (
                            <button
                              key={st}
                              onClick={() => handleChangeStatusLocal(siswa.id, st)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                                currentStatus === st
                                  ? st === 'hadir'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : st === 'izin'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : st === 'sakit'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-red-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Filter Ekspor PDF (Rentang Tanggal & Pilihan Kelas) */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#27272a] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border-2 border-pink-300 dark:border-[1px] dark:border-slate-700">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Printer className="w-4 h-4 text-pink-600" /> Ekspor Rekap Presensi PDF
            </h3>

            <div className="space-y-3.5 text-xs">
              {/* Opsi Target Kelas */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  Cakupan Kelas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPdfKelasMode('single')}
                    className={`py-2 px-3 rounded-xl font-bold border transition ${
                      pdfKelasMode === 'single'
                        ? 'chip-active border-pink-300 dark:border-pink-500'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Kelas Ini Saja ({selectedKelas})
                  </button>
                  <button
                    onClick={() => setPdfKelasMode('allActive')}
                    className={`py-2 px-3 rounded-xl font-bold border transition ${
                      pdfKelasMode === 'allActive'
                        ? 'chip-active border-pink-300 dark:border-pink-500'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Gabungan {activeKelasList.length} Kelas Aktif
                  </button>
                </div>
              </div>

              {/* Rentang Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Dari Tanggal
                  </label>
                  <DatePicker value={pdfStartDate} onChange={setPdfStartDate} className="w-full" />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Hingga Tanggal
                  </label>
                  <DatePicker value={pdfEndDate} onChange={setPdfEndDate} className="w-full" />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                * PDF akan memuat akumulasi jumlah Hadir, Izin, Sakit, dan Alfa masing-masing siswa pada rentang tersebut.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t-[1.5px] border-slate-300 dark:border-t-[1px] dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-3.5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  onClick={handleGeneratePdfReport}
                  className="px-4 py-2 btn-primary font-bold rounded-xl shadow-xs"
                >
                  Unduh Dokumen PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
