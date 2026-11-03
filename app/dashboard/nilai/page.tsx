'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Siswa, Nilai, KelasId, KELAS_LIST, JenisPenilaian, KKM, TAHUN_AJARAN } from '@/types'
import { getNilaiBadge } from '@/lib/utils'
import { BarChart2, Plus, Download, Printer, RefreshCw, CheckCircle2 } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from '@/hooks/use-toast'

export default function NilaiPage() {
  const [selectedKelas, setSelectedKelas] = useState<KelasId>('7A')
  const [selectedJenis, setSelectedJenis] = useState<JenisPenilaian>('UH')
  const [selectedMateri, setSelectedMateri] = useState<string>('Bilangan Bulat')
  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [nilaiMap, setNilaiMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

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

  // 2. Ambil nilai realtime berdasarkan kelas, jenis, dan materi
  useEffect(() => {
    const q = query(
      collection(db, 'nilai'),
      where('kelas', '==', selectedKelas),
      where('jenis', '==', selectedJenis),
      where('materi', '==', selectedMateri)
    )

    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, number> = {}
      snap.forEach((doc) => {
        const item = doc.data() as Nilai
        map[item.siswaId] = item.nilai
      })
      setNilaiMap(map)
    })

    return () => unsub()
  }, [selectedKelas, selectedJenis, selectedMateri])

  // 3. Simpan nilai siswa ke Firestore & Google Sheets
  const handleSaveNilai = async (siswa: Siswa, valStr: string) => {
    const val = parseInt(valStr, 10)
    if (isNaN(val)) return

    try {
      const docId = `${selectedKelas}_${selectedJenis}_${selectedMateri}_${siswa.id}`
      const today = new Date().toISOString().split('T')[0]

      await setDoc(doc(db, 'nilai', docId), {
        id: docId,
        siswaId: siswa.id,
        namaSiswa: siswa.nama,
        nis: siswa.nis,
        kelas: selectedKelas,
        jenis: selectedJenis,
        materi: selectedMateri,
        nilai: val,
        tanggal: today,
        createdAt: new Date().toISOString(),
      })

      // Kirim sinkronisasi ke Sheets
      fetch('/api/sync-nilai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nis: siswa.nis,
          nama: siswa.nama,
          kelas: selectedKelas,
          jenis: selectedJenis,
          materi: selectedMateri,
          nilai: val,
          tanggal: today,
        }),
      }).catch((err) => console.error('Sheet sync failed', err))

      toast({
        title: 'Nilai Tersimpan',
        description: `${siswa.nama}: ${val} (${val >= KKM ? 'Tuntas' : 'Remedial'})`,
      })
    } catch (err: any) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' })
    }
  }

  // 4. Export PDF Daftar Nilai
  const handleExportPDF = () => {
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text('DAFTAR NILAI SISWA SMP', 105, 18, { align: 'center' })
    doc.setFontSize(10)
    doc.text(
      `Kelas: ${selectedKelas} | Penilaian: ${selectedJenis} (${selectedMateri}) | KKM: ${KKM}`,
      105,
      25,
      { align: 'center' }
    )
    doc.setLineWidth(0.5)
    doc.line(14, 28, 196, 28)

    const tableData = siswaList.map((s, index) => {
      const n = nilaiMap[s.id]
      const tuntas = n !== undefined ? (n >= KKM ? 'Tuntas' : 'Remedial') : 'Belum Ada'
      return [index + 1, s.nis, s.nama, selectedKelas, n !== undefined ? n : '-', tuntas]
    })

    autoTable(doc, {
      startY: 32,
      head: [['No', 'NIS', 'Nama Siswa', 'Kelas', 'Nilai', 'Ketuntasan']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95] },
      styles: { fontSize: 9 },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 15
    doc.setFontSize(10)
    doc.text('Guru Mata Pelajaran,', 145, finalY)
    doc.text('( ................................................ )', 145, finalY + 25)

    doc.save(`Nilai_${selectedKelas}_${selectedJenis}_${selectedMateri}.pdf`)
  }

  // Statistik nilai
  const arrNilai = Object.values(nilaiMap)
  const rataRata = arrNilai.length ? Math.round(arrNilai.reduce((a, b) => a + b, 0) / arrNilai.length) : 0
  const jumlahTuntas = arrNilai.filter((n) => n >= KKM).length

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Daftar Nilai Siswa</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan nilai tugas, ulangan harian, UTS, & UAS dengan indikator KKM 70.
          </p>
        </div>

        <button
          onClick={handleExportPDF}
          disabled={siswaList.length === 0}
          className="flex items-center gap-1.5 bg-[#1E3A5F] hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm"
        >
          <Printer className="w-4 h-4" /> Cetak / Export PDF Nilai
        </button>
      </div>

      {/* Ringkasan Nilai Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Rata-Rata Kelas</div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">{rataRata || '-'}</div>
          </div>
          <div className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded">
            Target KKM: {KKM}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Siswa Tuntas</div>
            <div className="text-xl font-bold text-emerald-600 mt-0.5">{jumlahTuntas} Siswa</div>
          </div>
          <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded font-medium">
            ≥ 70 (KKM)
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Perlu Remedial</div>
            <div className="text-xl font-bold text-red-600 mt-0.5">
              {arrNilai.length - jumlahTuntas} Siswa
            </div>
          </div>
          <span className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded font-medium">
            &lt; 70
          </span>
        </div>
      </div>

      {/* Filter Kontrol Bar */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Kelas:</span>
          <div className="flex gap-1">
            {KELAS_LIST.map((k) => (
              <button
                key={k}
                onClick={() => setSelectedKelas(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedKelas === k ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Jenis:</span>
          <select
            value={selectedJenis}
            onChange={(e) => setSelectedJenis(e.target.value as JenisPenilaian)}
            className="border border-slate-300 rounded-lg text-xs px-3 py-2 bg-white text-slate-900 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="UH" className="text-slate-900 font-semibold bg-white">Ulangan Harian (UH)</option>
            <option value="Tugas" className="text-slate-900 font-semibold bg-white">Tugas</option>
            <option value="UTS" className="text-slate-900 font-semibold bg-white">UTS</option>
            <option value="UAS" className="text-slate-900 font-semibold bg-white">UAS</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Materi/KD:</span>
          <input
            type="text"
            value={selectedMateri}
            onChange={(e) => setSelectedMateri(e.target.value)}
            placeholder="Contoh: Bilangan Bulat"
            className="border border-slate-300 rounded-lg text-xs px-3 py-2 bg-white text-slate-900 placeholder:text-slate-500 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabel Nilai */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1E3A5F]" />
            Memuat data...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-28">NIS</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4 w-40 text-center">Input Nilai (0-100)</th>
                  <th className="py-3 px-4 w-32 text-center">Status KKM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {siswaList.map((siswa, index) => {
                  const val = nilaiMap[siswa.id]
                  return (
                    <tr key={siswa.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-medium">{index + 1}</td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-600">{siswa.nis}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{siswa.nama}</td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          defaultValue={val !== undefined ? val : ''}
                          key={`${siswa.id}_${val}`}
                          onBlur={(e) => handleSaveNilai(siswa, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveNilai(siswa, (e.target as HTMLInputElement).value)
                            }
                          }}
                          placeholder="Nilai"
                          className="w-20 text-center border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {val !== undefined ? (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getNilaiBadge(
                              val
                            )}`}
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
    </div>
  )
}

