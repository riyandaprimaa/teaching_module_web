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
import { Siswa, Nilai, KelasId, JenisPenilaian, KKM } from '@/types'
import { fetchWithAuth, parseApiResponse } from '@/lib/api-client'
import {
  BarChart2,
  Printer,
  RefreshCw,
  Save,
  Trash2,
  CheckSquare,
  Square,
  Trophy,
  AlertCircle,
  Calendar,
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from '@/hooks/use-toast'
import { DatePicker } from '@/components/ui/date-picker'

export default function NilaiPage() {
  const { activeKelasList, spreadsheetId } = useTheme()

  const [selectedKelas, setSelectedKelas] = useState<KelasId>(activeKelasList[0] || '7A')
  const [selectedJenis, setSelectedJenis] = useState<JenisPenilaian>('UH')
  const [selectedMateri, setSelectedMateri] = useState<string>('Bilangan Bulat')
  const [selectedTanggal, setSelectedTanggal] = useState<string>(new Date().toISOString().split('T')[0])

  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [loading, setLoading] = useState(true)

  // Draft lokal sebelum tombol "Simpan Perubahan" ditekan
  const [draftNilai, setDraftNilai] = useState<Record<string, number>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Seleksi Massal (Select Delete)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  // Modal Ekspor PDF Rentang Tanggal / Gabungan
  const [showExportModal, setShowExportModal] = useState(false)
  const [pdfKelasMode, setPdfKelasMode] = useState<'single' | 'allActive'>('single')
  const [pdfStartDate, setPdfStartDate] = useState<string>(selectedTanggal)
  const [pdfEndDate, setPdfEndDate] = useState<string>(selectedTanggal)

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

  useEffect(() => {
    if (!activeKelasList.includes(selectedKelas)) {
      setSelectedKelas(activeKelasList[0] || '7A')
    }
  }, [activeKelasList, selectedKelas])

  // 2. Ambil nilai realtime berdasarkan kelas, jenis, materi, dan tanggal
  useEffect(() => {
    const q = query(
      collection(db, 'nilai'),
      where('kelas', '==', selectedKelas),
      where('jenis', '==', selectedJenis),
      where('materi', '==', selectedMateri),
      where('tanggal', '==', selectedTanggal)
    )

    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, number> = {}
      snap.forEach((doc) => {
        const item = doc.data() as Nilai
        map[item.siswaId] = item.nilai
      })
      setDraftNilai(map)
      setHasChanges(false)
    })

    return () => unsub()
  }, [selectedKelas, selectedJenis, selectedMateri, selectedTanggal])

  // Ubah nilai di draft lokal
  const handleDraftChange = (siswaId: string, valStr: string) => {
    const val = parseInt(valStr, 10)
    setDraftNilai((prev) => {
      const copy = { ...prev }
      if (isNaN(val)) {
        delete copy[siswaId]
      } else {
        copy[siswaId] = Math.min(100, Math.max(0, val))
      }
      return copy
    })
    setHasChanges(true)
  }

  // Simpan Perubahan Nilai ke Firestore & Google Sheets
  const handleSaveAllChanges = async () => {
    setIsSaving(true)
    try {
      // Ambil dokumen pada lingkup ini (kelas+jenis+materi+tanggal) agar
      // dokumen lama (docId tanpa tanggal) maupun baru bisa di-resolve
      const scopeSnap = await getDocs(
        query(
          collection(db, 'nilai'),
          where('kelas', '==', selectedKelas),
          where('jenis', '==', selectedJenis),
          where('materi', '==', selectedMateri),
          where('tanggal', '==', selectedTanggal)
        )
      )
      const existingBySiswa = new Map<string, string>()
      scopeSnap.forEach((d) => {
        const item = d.data() as Nilai
        existingBySiswa.set(item.siswaId, d.id)
      })

      const batch = writeBatch(db)
      const rowsToSync: {
        nis: string
        nama: string
        kelas: KelasId
        jenis: JenisPenilaian
        materi: string
        nilai: number
        tanggal: string
      }[] = []

      for (const siswa of siswaList) {
        const val = draftNilai[siswa.id]
        const existingId = existingBySiswa.get(siswa.id)
        const docId =
          existingId ||
          `${selectedKelas}_${selectedJenis}_${selectedMateri}_${selectedTanggal}_${siswa.id}`
        const docRef = doc(db, 'nilai', docId)

        if (val !== undefined) {
          batch.set(docRef, {
            id: docId,
            siswaId: siswa.id,
            namaSiswa: siswa.nama,
            nis: siswa.nis,
            kelas: selectedKelas,
            jenis: selectedJenis,
            materi: selectedMateri,
            nilai: val,
            tanggal: selectedTanggal,
            createdAt: new Date().toISOString(),
          })

          rowsToSync.push({
            nis: siswa.nis,
            nama: siswa.nama,
            kelas: selectedKelas,
            jenis: selectedJenis,
            materi: selectedMateri,
            nilai: val,
            tanggal: selectedTanggal,
          })
        } else if (existingId) {
          // Input dikosongkan → hapus dokumen tanggal ini
          batch.delete(docRef)
        }
      }

      await batch.commit()

      // Sinkron batch ke Sheets (1 request, error tidak membatalkan penyimpanan nilai)
      // Catatan: penghapusan murni (input dikosongkan) tidak dikirim ke Sheets —
      // baris akan direkonsiliasi oleh tombol "Refresh Spreadsheet" (sync penuh).
      if (rowsToSync.length > 0) {
        fetchWithAuth('/api/sync-nilai', {
          method: 'POST',
          body: JSON.stringify({ rows: rowsToSync, spreadsheetId: spreadsheetId || undefined }),
        })
          .then((res) => parseApiResponse(res))
          .catch((e) => console.warn('Sinkronisasi Sheets gagal:', e.message))
      }

      setHasChanges(false)
      toast({
        title: 'Nilai Berhasil Disimpan! ✓',
        description: `Seluruh penilaian kelas ${selectedKelas} telah tercatat di database.`,
      })
    } catch (err: unknown) {
      toast({ title: 'Gagal Menyimpan Nilai', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle selection
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

  // Hapus Nilai Siswa Terpilih (Select Delete)
  const handleDeleteSelectedScores = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Hapus nilai ${selectedIds.length} siswa terpilih untuk materi ${selectedMateri} tanggal ${selectedTanggal}?`)) return

    setIsDeleting(true)
    try {
      const scopeSnap = await getDocs(
        query(
          collection(db, 'nilai'),
          where('kelas', '==', selectedKelas),
          where('jenis', '==', selectedJenis),
          where('materi', '==', selectedMateri),
          where('tanggal', '==', selectedTanggal)
        )
      )
      const batch = writeBatch(db)
      let count = 0
      scopeSnap.forEach((d) => {
        const item = d.data() as Nilai
        if (selectedIds.includes(item.siswaId)) {
          batch.delete(d.ref)
          count++
        }
      })
      if (count > 0) await batch.commit()
      setSelectedIds([])
      toast({ title: 'Nilai Terpilih Dihapus', description: `${count} nilai berhasil dihapus.` })
    } catch (err: unknown) {
      toast({ title: 'Gagal Menghapus', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  // Hapus Semua Nilai Materi Ini (seluruh tanggal)
  const handleDeleteAllScoresInMateri = async () => {
    if (!confirm(`Hapus SELURUH nilai kelas ${selectedKelas} materi ${selectedMateri} (semua tanggal)?`)) return

    setIsDeleting(true)
    try {
      const snap = await getDocs(
        query(
          collection(db, 'nilai'),
          where('kelas', '==', selectedKelas),
          where('jenis', '==', selectedJenis),
          where('materi', '==', selectedMateri)
        )
      )
      if (snap.empty) {
        toast({ title: 'Tidak Ada Nilai', description: 'Materi ini belum memiliki nilai tersimpan.' })
        return
      }
      const batch = writeBatch(db)
      snap.forEach((d) => batch.delete(d.ref))
      await batch.commit()
      setSelectedIds([])
      toast({ title: 'Nilai Materi Dikosongkan', description: `${snap.size} dokumen nilai dihapus (semua tanggal).` })
    } catch (err: unknown) {
      toast({ title: 'Gagal', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  // Cari Siswa Tertinggi & Terendah (mendukung banyak nama saat nilai sama)
  const entries = Object.entries(draftNilai)
  const scored: { nama: string; nilai: number }[] = entries.map(([sId, val]) => {
    const siswa = siswaList.find((s) => s.id === sId)
    return { nama: siswa ? siswa.nama : 'Siswa', nilai: val }
  })

  const maxVal = scored.length > 0 ? Math.max(...scored.map((s) => s.nilai)) : null
  const minVal = scored.length > 0 ? Math.min(...scored.map((s) => s.nilai)) : null
  const maxNames = maxVal === null ? [] : scored.filter((s) => s.nilai === maxVal).map((s) => s.nama)
  const minNames = minVal === null ? [] : scored.filter((s) => s.nilai === minVal).map((s) => s.nama)

  // Statistik nilai
  const arrNilai = Object.values(draftNilai)
  const rataRata = arrNilai.length ? Math.round(arrNilai.reduce((a, b) => a + b, 0) / arrNilai.length) : 0
  const jumlahTuntas = arrNilai.filter((n) => n >= KKM).length

  // Generate Ekspor PDF Nilai
  const handleGeneratePdfReport = async () => {
    try {
      toast({ title: 'Menyiapkan Rekap Nilai PDF...' })
      const doc = new jsPDF()

      const targetKelas = pdfKelasMode === 'single' ? [selectedKelas] : activeKelasList

      const siswaSnap = await getDocs(
        query(collection(db, 'siswa'), where('kelas', 'in', targetKelas))
      )
      const allSiswa: Siswa[] = []
      siswaSnap.forEach((d) => allSiswa.push(d.data() as Siswa))
      allSiswa.sort((a, b) => a.kelas.localeCompare(b.kelas) || a.nama.localeCompare(b.nama))

      const nilaiSnap = await getDocs(
        query(
          collection(db, 'nilai'),
          where('kelas', 'in', targetKelas),
          where('jenis', '==', selectedJenis),
          where('materi', '==', selectedMateri)
        )
      )

      // Kumpulkan nilai per siswa dalam rentang tanggal (filter klien —
      // query equality saja agar tidak perlu composite index)
      const scoresBySiswa: Record<string, number[]> = {}
      nilaiSnap.forEach((d) => {
        const item = d.data() as Nilai
        if (item.tanggal >= pdfStartDate && item.tanggal <= pdfEndDate) {
          if (!scoresBySiswa[item.siswaId]) scoresBySiswa[item.siswaId] = []
          scoresBySiswa[item.siswaId].push(item.nilai)
        }
      })

      // Header PDF
      doc.setFontSize(15)
      doc.text('REKAPITULASI DAFTAR NILAI SISWA MATEMATIKA SMP', 105, 18, { align: 'center' })
      doc.setFontSize(10)
      const kelasText = pdfKelasMode === 'single' ? `Kelas: ${selectedKelas}` : `Gabungan: ${targetKelas.join(', ')}`
      const periodeText =
        pdfStartDate === pdfEndDate
          ? `Tanggal: ${pdfStartDate}`
          : `Periode: ${pdfStartDate} s/d ${pdfEndDate}`
      doc.text(`${kelasText} | Penilaian: ${selectedJenis} (${selectedMateri})`, 105, 25, {
        align: 'center',
      })
      doc.text(`${periodeText} | Standar KKM: ${KKM}`, 105, 30, { align: 'center' })
      doc.setLineWidth(0.5)
      doc.line(14, 33, 196, 33)

      const tableData = allSiswa.map((s, idx) => {
        const scores = scoresBySiswa[s.id] || []
        if (scores.length === 0) {
          return [idx + 1, s.nis, s.nama, s.kelas, 0, '-', '-', '-', 'Belum Ada']
        }
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        const max = Math.max(...scores)
        const min = Math.min(...scores)
        const ketuntasan = avg >= KKM ? 'Tuntas' : 'Remedial'
        return [idx + 1, s.nis, s.nama, s.kelas, scores.length, avg, max, min, ketuntasan]
      })

      autoTable(doc, {
        startY: 37,
        head: [
          ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Jml', 'Rata²', 'Tertinggi', 'Terendah', `Ketuntasan (KKM ${KKM})`],
        ],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [190, 24, 93] },
        styles: { fontSize: 8 },
      })

      const docWithTable = doc as unknown as { lastAutoTable?: { finalY: number } }
      const finalY = (docWithTable.lastAutoTable?.finalY ?? 0) + 15
      doc.setFontSize(9)
      doc.text('Mengetahui,', 145, finalY)
      doc.text('Guru Mata Pelajaran Matematika', 145, finalY + 5)
      doc.text('( ................................................ )', 145, finalY + 25)

      doc.save(
        `Rekap_Nilai_${pdfKelasMode === 'single' ? selectedKelas : 'Gabungan'}_${selectedJenis}_${selectedMateri}_${pdfStartDate}_${pdfEndDate}.pdf`
      )
      setShowExportModal(false)
      toast({ title: 'Dokumen Nilai PDF Berhasil Diunduh! 📄' })
    } catch (err: unknown) {
      toast({ title: 'Gagal Unduh PDF', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#27272a] p-5 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">Daftar Nilai Siswa</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Standar KKM 75 • Tinjau nilai siswa, periksa peraih nilai tertinggi/terendah, dan tekan Simpan Perubahan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Simpan Perubahan */}
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

          {/* Cetak PDF */}
          <button
            onClick={() => {
              setPdfStartDate(selectedTanggal)
              setPdfEndDate(selectedTanggal)
              setShowExportModal(true)
            }}
            className="flex items-center gap-1.5 btn-primary text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Rekap PDF
          </button>
        </div>
      </div>

      {/* Bar Statistik Nilai & Kartu Nilai Tertinggi / Terendah */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rata-Rata Kelas */}
        <div className="bg-white dark:bg-[#27272a] p-4 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] font-bold text-pink-500 uppercase">Rata-Rata Kelas</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {rataRata || '-'}
            </div>
            <div className="text-[11px] text-pink-600 dark:text-pink-400 font-bold mt-0.5">
              Standar KKM: {KKM}
            </div>
          </div>
          <div className="w-10 h-10 bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-300 rounded-xl flex items-center justify-center font-bold">
            <BarChart2 className="w-5 h-5" />
          </div>
        </div>

        {/* Siswa Tuntas */}
        <div className="bg-white dark:bg-[#27272a] p-4 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] font-bold text-emerald-600 uppercase">Siswa Tuntas</div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">{jumlahTuntas} Siswa</div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
              Nilai &ge; {KKM}
            </div>
          </div>
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
            ✓
          </div>
        </div>

        {/* Nilai Tertinggi */}
        <div className="bg-white dark:bg-[#27272a] p-4 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 flex items-center justify-between shadow-xs overflow-hidden">
          <div className="min-w-0 flex-1 mr-3">
            <div className="text-[11px] font-bold text-amber-500 uppercase flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Nilai Tertinggi
            </div>
            <div className="text-xl font-black text-amber-500 mt-0.5">
              {maxVal !== null ? `${maxVal} Poin` : '-'}
            </div>
            <div className="text-[11px] font-bold text-slate-900 dark:text-white mt-0.5 overflow-hidden">
              {maxNames.length === 0 ? (
                'Belum diisi'
              ) : maxNames.length === 1 ? (
                <span className="block truncate">{maxNames[0]}</span>
              ) : (
                <div className="overflow-hidden whitespace-nowrap">
                  <div className="flex w-max animate-marquee">
                    <span className="shrink-0 pr-4">{maxNames.join(' • ')}</span>
                    <span className="shrink-0 pr-4" aria-hidden="true">{maxNames.join(' • ')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/60 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
        </div>

        {/* Nilai Terendah */}
        <div className="bg-white dark:bg-[#27272a] p-4 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 flex items-center justify-between shadow-xs overflow-hidden">
          <div className="min-w-0 flex-1 mr-3">
            <div className="text-[11px] font-bold text-pink-500 uppercase flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-pink-500" /> Nilai Terendah
            </div>
            <div className="text-xl font-black text-pink-500 mt-0.5">
              {minVal !== null ? `${minVal} Poin` : '-'}
            </div>
            <div className="text-[11px] font-bold text-slate-900 dark:text-white mt-0.5 overflow-hidden">
              {minNames.length === 0 ? (
                'Belum diisi'
              ) : minNames.length === 1 ? (
                <span className="block truncate">{minNames[0]}</span>
              ) : (
                <div className="overflow-hidden whitespace-nowrap">
                  <div className="flex w-max animate-marquee">
                    <span className="shrink-0 pr-4">{minNames.join(' • ')}</span>
                    <span className="shrink-0 pr-4" aria-hidden="true">{minNames.join(' • ')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="w-10 h-10 bg-pink-50 dark:bg-pink-500/10 text-pink-500 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Kontrol Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-[#27272a] p-4 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">Kelas:</span>
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

        <div className="flex flex-wrap items-center gap-3">
          {/* Jenis Penilaian */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Jenis:</span>
            <select
              value={selectedJenis}
              onChange={(e) => setSelectedJenis(e.target.value as JenisPenilaian)}
              className="border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 rounded-xl text-xs px-2.5 py-1.5 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-bold shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="UH">Ulangan Harian (UH)</option>
              <option value="Tugas">Tugas</option>
              <option value="UTS">UTS</option>
              <option value="UAS">UAS</option>
            </select>
          </div>

          {/* Materi / KD */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Materi:</span>
            <input
              type="text"
              value={selectedMateri}
              onChange={(e) => setSelectedMateri(e.target.value)}
              placeholder="Contoh: Bilangan Bulat"
              className="border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 rounded-xl text-xs px-2.5 py-1.5 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-bold shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500 w-36 sm:w-44"
            />
          </div>

          {/* Tanggal Penilaian */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-pink-500" />
            <DatePicker value={selectedTanggal} onChange={setSelectedTanggal} />
          </div>
        </div>
      </div>

      {/* Tabel Nilai dengan Select Delete */}
      <div className="bg-white dark:bg-[#27272a] rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 overflow-hidden shadow-xs">
        {/* Bar Aksi Seleksi */}
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
                onClick={handleDeleteSelectedScores}
                disabled={isDeleting}
                className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Nilai Terpilih ({selectedIds.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Kelas {selectedKelas} • {selectedJenis} ({selectedMateri})
            </span>

            {siswaList.length > 0 && (
              <button
                onClick={handleDeleteAllScoresInMateri}
                disabled={isDeleting}
                className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/30 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900/40"
              >
                <Trash2 className="w-3 h-3" /> Hapus Semua Nilai Materi Ini
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-pink-500" />
            Memuat nilai...
          </div>
        ) : siswaList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
            Belum ada siswa di kelas {selectedKelas}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white dark:bg-slate-800/60 border-b-[1.5px] border-slate-300 dark:border-b-[1px] dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-10 text-center">Pilih</th>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-28">NIS</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4 w-40 text-center">Input Nilai (0-100)</th>
                  <th className="py-3 px-4 w-32 text-center">Status KKM (75)</th>
                </tr>
              </thead>
              <tbody className="divide-y-[1.5px] divide-slate-200 dark:divide-y-[1px] dark:divide-slate-700/60">
                {siswaList.map((siswa, idx) => {
                  const isChecked = selectedIds.includes(siswa.id)
                  const val = draftNilai[siswa.id]
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
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{siswa.nama}</td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={val !== undefined ? val : ''}
                          onChange={(e) => handleDraftChange(siswa.id, e.target.value)}
                          placeholder="0-100"
                          className="w-24 text-center border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-900 dark:text-white bg-white dark:bg-[#18181b] focus:bg-pink-50 dark:focus:bg-pink-950/40 focus:ring-2 focus:ring-pink-500 shadow-xs"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {val !== undefined ? (
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                              val >= KKM
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                : 'bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300'
                            }`}
                          >
                            {val >= KKM ? 'Tuntas' : 'Remedial'}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Filter Ekspor Rekap Nilai PDF */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#27272a] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border-2 border-pink-300 dark:border-[1px] dark:border-slate-700">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Printer className="w-4 h-4 text-pink-600" /> Ekspor Rekap Nilai PDF
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  Cakupan Kelas Nilai
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

              {/* Rentang Tanggal Rekap */}
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
                * PDF merangkum rata-rata, nilai tertinggi, dan terendah tiap siswa pada rentang tanggal tersebut.
              </p>

              <div className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                <div>Penilaian: <b>{selectedJenis}</b></div>
                <div>Materi: <b>{selectedMateri}</b></div>
                <div>
                  Periode:{' '}
                  <b>{pdfStartDate === pdfEndDate ? pdfStartDate : `${pdfStartDate} s/d ${pdfEndDate}`}</b>
                </div>
                <div>Standar Kelulusan: <b>KKM {KKM}</b></div>
              </div>

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
