'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
  getDocs,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Siswa, Kehadiran, KelasId, KELAS_LIST, StatusKehadiran, TAHUN_AJARAN } from '@/types'
import { formatTanggal, toDateString, getStatusColor, getStatusLabel } from '@/lib/utils'
import { Calendar, Download, Printer, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from '@/hooks/use-toast'

export default function KehadiranPage() {
  const [selectedKelas, setSelectedKelas] = useState<KelasId>('7A')
  const [selectedTanggal, setSelectedTanggal] = useState<string>(toDateString(new Date()))
  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [kehadiranMap, setKehadiranMap] = useState<Record<string, StatusKehadiran>>({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

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
    })

    return () => unsub()
  }, [selectedKelas])

  // 2. Ambil status kehadiran per tanggal & kelas terpilih secara realtime
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
      setKehadiranMap(map)
    })

    return () => unsub()
  }, [selectedKelas, selectedTanggal])

  // 3. Update status kehadiran siswa (Realtime Firestore + sync Sheets)
  const handleSetStatus = async (siswa: Siswa, status: StatusKehadiran) => {
    try {
      const docId = `${selectedTanggal}_${siswa.id}`
      await setDoc(doc(db, 'kehadiran', docId), {
        id: docId,
        siswaId: siswa.id,
        namaSiswa: siswa.nama,
        kelas: selectedKelas,
        tanggal: selectedTanggal,
        status: status,
        updatedAt: new Date().toISOString(),
      })

      // Kirim sinkronisasi ke Google Sheets API di background
      fetch('/api/sync-kehadiran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nis: siswa.nis,
          nama: siswa.nama,
          kelas: selectedKelas,
          tanggal: selectedTanggal,
          status: getStatusLabel(status),
        }),
      }).catch((err) => console.error('Background sheet sync failed', err))

      toast({
        title: 'Presensi Dicatat',
        description: `${siswa.nama} ditandai ${getStatusLabel(status)}.`,
      })
    } catch (error: any) {
      toast({
        title: 'Gagal Menyimpan',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  // Tandai semua hadir sekaligus
  const handleMarkAllHadir = async () => {
    setSyncing(true)
    try {
      for (const siswa of siswaList) {
        const docId = `${selectedTanggal}_${siswa.id}`
        await setDoc(doc(db, 'kehadiran', docId), {
          id: docId,
          siswaId: siswa.id,
          namaSiswa: siswa.nama,
          kelas: selectedKelas,
          tanggal: selectedTanggal,
          status: 'hadir',
          updatedAt: new Date().toISOString(),
        })
      }
      toast({
        title: 'Semua Hadir',
        description: `Seluruh siswa kelas ${selectedKelas} berhasil ditandai Hadir.`,
      })
    } catch (err: any) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' })
    } finally {
      setSyncing(false)
    }
  }

  // 4. Export Rekap PDF Siap Cetak
  const handleExportPDF = async () => {
    const doc = new jsPDF()

    // Header Laporan
    doc.setFontSize(16)
    doc.text('REKAPITULASI KEHADIRAN SISWA SMP', 105, 18, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`Kelas: ${selectedKelas} | Tanggal: ${selectedTanggal} | T.A: ${TAHUN_AJARAN}`, 105, 25, {
      align: 'center',
    })
    doc.setLineWidth(0.5)
    doc.line(14, 28, 196, 28)

    // Data Tabel
    const tableData = siswaList.map((s, index) => {
      const status = kehadiranMap[s.id]
      return [
        index + 1,
        s.nis,
        s.nama,
        selectedKelas,
        status ? getStatusLabel(status) : 'Belum Diabsen',
      ]
    })

    autoTable(doc, {
      startY: 32,
      head: [['No', 'NIS', 'Nama Siswa', 'Kelas', 'Keterangan Presensi']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95] },
      styles: { fontSize: 9 },
    })

    // Tanda Tangan Guru
    const finalY = (doc as any).lastAutoTable.finalY + 15
    doc.setFontSize(10)
    doc.text('Mengetahui,', 145, finalY)
    doc.text('Guru Mata Pelajaran Matematika', 145, finalY + 6)
    doc.text('( ................................................ )', 145, finalY + 28)

    doc.save(`Presensi_${selectedKelas}_${selectedTanggal}.pdf`)
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Daftar Kehadiran Siswa</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Presensi realtime terhubung langsung ke Firebase & Google Spreadsheet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleMarkAllHadir}
            disabled={syncing || siswaList.length === 0}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm"
          >
            <CheckCircle className="w-4 h-4" /> Tandai Semua Hadir
          </button>

          <button
            onClick={handleExportPDF}
            disabled={siswaList.length === 0}
            className="flex items-center gap-1.5 bg-[#1E3A5F] hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm"
          >
            <Printer className="w-4 h-4" /> Cetak / Export Rekap PDF
          </button>
        </div>
      </div>

      {/* Filter Kontrol Bar */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-slate-200">
        {/* Pilihan Kelas */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Pilih Kelas:</span>
          <div className="flex gap-1.5">
            {KELAS_LIST.map((k) => (
              <button
                key={k}
                onClick={() => setSelectedKelas(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedKelas === k
                    ? 'bg-[#1E3A5F] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Pemilih Tanggal */}
        <div className="flex items-center gap-2 ml-auto">
          <Calendar className="w-4 h-4 text-slate-600" />
          <span className="text-xs font-semibold text-slate-700">Tanggal:</span>
          <input
            type="date"
            value={selectedTanggal}
            onChange={(e) => setSelectedTanggal(e.target.value)}
            className="border border-slate-300 rounded-lg text-xs px-3 py-2 bg-white text-slate-900 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Tabel Kehadiran */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="text-xs font-semibold text-slate-700">
            Daftar Siswa Kelas {selectedKelas} • {formatTanggal(selectedTanggal)}
          </div>
          <span className="text-xs font-medium text-slate-500">
            Total: {siswaList.length} Siswa
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0D9488]" />
            Memuat data siswa kelas {selectedKelas}...
          </div>
        ) : siswaList.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Belum ada data siswa di kelas {selectedKelas}.
            <br />
            Silakan klik "Generate Data Awal Siswa" di halaman Beranda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-28">NIS</th>
                  <th className="py-3 px-4">Nama Lengkap Siswa</th>
                  <th className="py-3 px-4 w-32 text-center">Status Saat Ini</th>
                  <th className="py-3 px-4 text-center w-64">Aksi Presensi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {siswaList.map((siswa, index) => {
                  const currentStatus = kehadiranMap[siswa.id]
                  return (
                    <tr key={siswa.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-medium">{index + 1}</td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-600">{siswa.nis}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{siswa.nama}</td>
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
                        <div className="inline-flex gap-1.5 bg-slate-100 p-1 rounded-lg">
                          {(['hadir', 'izin', 'sakit', 'alfa'] as StatusKehadiran[]).map((st) => (
                            <button
                              key={st}
                              onClick={() => handleSetStatus(siswa, st)}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition ${
                                currentStatus === st
                                  ? st === 'hadir'
                                    ? 'bg-green-600 text-white'
                                    : st === 'izin'
                                    ? 'bg-blue-600 text-white'
                                    : st === 'sakit'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-red-600 text-white'
                                  : 'text-slate-600 hover:bg-white'
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
    </div>
  )
}

