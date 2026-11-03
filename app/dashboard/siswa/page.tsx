'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Siswa, KelasId, KELAS_LIST } from '@/types'
import { Users, Plus, Edit2, Trash2, Upload, RefreshCw, CheckCircle, Search } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function SiswaPage() {
  const [selectedKelas, setSelectedKelas] = useState<KelasId>('7A')
  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSiswa, setEditingSiswa] = useState<Siswa | null>(null)
  const [nama, setNama] = useState('')
  const [nis, setNis] = useState('')
  const [kelas, setKelas] = useState<KelasId>('7A')

  // CSV Import State
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    setLoading(true)
    const q = query(collection(db, 'siswa'), where('kelas', '==', selectedKelas))
    const unsub = onSnapshot(q, (snap) => {
      const data: Siswa[] = []
      snap.forEach((d) => {
        data.push({ id: d.id, ...d.data() } as Siswa)
      })
      data.sort((a, b) => a.nama.localeCompare(b.nama))
      setSiswaList(data)
      setLoading(false)
    })

    return () => unsub()
  }, [selectedKelas])

  const handleOpenAdd = () => {
    setEditingSiswa(null)
    setNama('')
    setNis('')
    setKelas(selectedKelas)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (s: Siswa) => {
    setEditingSiswa(s)
    setNama(s.nama)
    setNis(s.nis)
    setKelas(s.kelas)
    setIsModalOpen(true)
  }

  const handleSaveSiswa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nama.trim() || !nis.trim()) {
      toast({ title: 'Mohon isi nama dan NIS!', variant: 'destructive' })
      return
    }

    try {
      if (editingSiswa) {
        await updateDoc(doc(db, 'siswa', editingSiswa.id), {
          nama: nama.trim(),
          nis: nis.trim(),
          kelas: kelas,
        })
        toast({ title: 'Data Siswa Diperbarui' })
      } else {
        await addDoc(collection(db, 'siswa'), {
          nama: nama.trim(),
          nis: nis.trim(),
          kelas: kelas,
          createdAt: new Date().toISOString(),
        })
        toast({ title: 'Siswa Baru Ditambahkan' })
      }
      setIsModalOpen(false)
    } catch (err: any) {
      toast({ title: 'Gagal Menyimpan', description: err.message, variant: 'destructive' })
    }
  }

  const handleDeleteSiswa = async (s: Siswa) => {
    if (!confirm(`Hapus data siswa: ${s.nama}?`)) return
    try {
      await deleteDoc(doc(db, 'siswa', s.id))
      toast({ title: 'Siswa Berhasil Dihapus' })
    } catch (err: any) {
      toast({ title: 'Gagal Menghapus', description: err.message, variant: 'destructive' })
    }
  }

  // Import Siswa via file CSV (Format: NIS,Nama,Kelas)
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split('\n')
        let count = 0

        for (const line of lines) {
          const parts = line.split(',')
          if (parts.length >= 2) {
            const rowNis = parts[0].trim()
            const rowNama = parts[1].trim()
            const rowKelas = (parts[2]?.trim() || selectedKelas) as KelasId

            // Lewati baris header jika ada
            if (rowNis.toLowerCase() === 'nis') continue

            if (rowNama && rowNis) {
              await addDoc(collection(db, 'siswa'), {
                nis: rowNis,
                nama: rowNama,
                kelas: rowKelas,
                createdAt: new Date().toISOString(),
              })
              count++
            }
          }
        }
        toast({ title: 'Import Sukses', description: `Berhasil menambahkan ${count} siswa.` })
      } catch (err: any) {
        toast({ title: 'Gagal Import CSV', description: err.message, variant: 'destructive' })
      } finally {
        setIsImporting(false)
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  const filteredList = siswaList.filter(
    (s) =>
      s.nama.toLowerCase().includes(search.toLowerCase()) ||
      s.nis.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Manajemen Data Siswa</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola nama siswa asli per kelas atau import langsung dari daftar file CSV/Excel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Import CSV */}
          <label className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition">
            <Upload className="w-4 h-4 text-slate-500" />
            {isImporting ? 'Mengimport...' : 'Import CSV'}
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleCSVUpload}
              className="hidden"
              disabled={isImporting}
            />
          </label>

          {/* Tombol Tambah Manual */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-[#1E3A5F] hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Siswa Baru
          </button>
        </div>
      </div>

      {/* Filter Kontrol Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Pilih Kelas:</span>
          <div className="flex gap-1.5">
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

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama atau NIS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 placeholder:text-slate-500 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabel Siswa */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="text-xs font-semibold text-slate-700">
            Daftar Siswa Kelas {selectedKelas}
          </span>
          <span className="text-xs font-medium text-slate-500">
            Total: {filteredList.length} Siswa
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1E3A5F]" />
            Memuat data siswa...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Tidak ada siswa ditemukan di kelas {selectedKelas}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-32">NIS</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4 w-28 text-center">Kelas</th>
                  <th className="py-3 px-4 w-28 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">{s.nis}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{s.nama}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-600">{s.kelas}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSiswa(s)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Tambah / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-800">
              {editingSiswa ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            </h3>

            <form onSubmit={handleSaveSiswa} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">NIS</label>
                <input
                  type="text"
                  placeholder="Contoh: 26001"
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Nama Siswa"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Kelas</label>
                <select
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value as KelasId)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-medium"
                >
                  {KELAS_LIST.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1E3A5F] hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

