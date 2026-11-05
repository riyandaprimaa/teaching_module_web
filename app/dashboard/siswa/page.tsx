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
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useTheme } from '@/contexts/ThemeContext'
import { Siswa, KelasId, ALL_KELAS_LIST } from '@/types'
import {
  Plus,
  Edit2,
  Trash2,
  Upload,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  Filter,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function SiswaPage() {
  const { activeKelasList, toggleActiveKelas } = useTheme()

  const [selectedKelas, setSelectedKelas] = useState<KelasId>(activeKelasList[0] || '7A')
  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Selection state untuk opsi Select Delete
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  // Modal Form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSiswa, setEditingSiswa] = useState<Siswa | null>(null)
  const [nama, setNama] = useState('')
  const [nis, setNis] = useState('')
  const [kelas, setKelas] = useState<KelasId>(selectedKelas)

  // State filter pengaturan kelas aktif
  const [showKelasFilter, setShowKelasFilter] = useState(false)

  // Ambil daftar siswa kelas terpilih
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
      setSelectedIds([])
    })

    return () => unsub()
  }, [selectedKelas])

  // Pastikan selectedKelas valid jika activeKelasList berubah
  useEffect(() => {
    if (!activeKelasList.includes(selectedKelas)) {
      setSelectedKelas(activeKelasList[0] || '7A')
    }
  }, [activeKelasList, selectedKelas])

  // Toggle selection untuk 1 siswa
  const handleToggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // Toggle Select All
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredList.map((s) => s.id))
    }
  }

  // Hapus Siswa Terpilih (Select Delete)
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Hapus ${selectedIds.length} siswa yang dipilih?`)) return

    setIsDeleting(true)
    try {
      const batch = writeBatch(db)
      selectedIds.forEach((id) => {
        batch.delete(doc(db, 'siswa', id))
      })
      await batch.commit()
      setSelectedIds([])
      toast({ title: 'Berhasil Dihapus', description: `${selectedIds.length} siswa berhasil dihapus.` })
    } catch (err: unknown) {
      toast({ title: 'Gagal Menghapus', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  // Hapus Seluruh Siswa di Kelas Ini
  const handleDeleteAllInClass = async () => {
    if (siswaList.length === 0) return
    if (!confirm(`Hapus SEMUA siswa (${siswaList.length} orang) di kelas ${selectedKelas}?`)) return

    setIsDeleting(true)
    try {
      const batch = writeBatch(db)
      siswaList.forEach((s) => {
        batch.delete(doc(db, 'siswa', s.id))
      })
      await batch.commit()
      setSelectedIds([])
      toast({ title: 'Kelas Dibersihkan', description: `Semua data siswa kelas ${selectedKelas} telah dihapus.` })
    } catch (err: unknown) {
      toast({ title: 'Gagal Menghapus', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  // Buka Modal Tambah
  const handleOpenAdd = () => {
    setEditingSiswa(null)
    setNama('')
    setNis('')
    setKelas(selectedKelas)
    setIsModalOpen(true)
  }

  // Buka Modal Edit
  const handleOpenEdit = (s: Siswa) => {
    setEditingSiswa(s)
    setNama(s.nama)
    setNis(s.nis)
    setKelas(s.kelas)
    setIsModalOpen(true)
  }

  // Simpan Tambah/Edit Siswa
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
    } catch (err: unknown) {
      toast({ title: 'Gagal Menyimpan', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    }
  }

  // Import Siswa via file CSV (Format: NIS,Nama,Kelas)
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split('\n')
        const batch = writeBatch(db)
        const siswaRef = collection(db, 'siswa')
        let count = 0
        let skipped = 0

        for (const line of lines) {
          const parts = line.split(',')
          if (parts.length >= 2) {
            const rowNis = parts[0].trim()
            const rowNama = parts[1].trim()
            const rawKelas = (parts[2]?.trim() || '').toUpperCase()

            if (rowNis.toLowerCase() === 'nis') continue

            // Validasi kelas terhadap daftar 24 kelas (7A–7H, 8A–8H, 9A–9H)
            let rowKelas: KelasId
            if (!rawKelas) {
              rowKelas = selectedKelas
            } else if ((ALL_KELAS_LIST as string[]).includes(rawKelas)) {
              rowKelas = rawKelas as KelasId
            } else {
              skipped++
              continue
            }

            if (rowNama && rowNis) {
              const docRef = doc(siswaRef)
              batch.set(docRef, {
                id: docRef.id,
                nis: rowNis,
                nama: rowNama,
                kelas: rowKelas,
                createdAt: new Date().toISOString(),
              })
              count++
            }
          }
        }

        if (count === 0) {
          toast({
            title: 'Tidak Ada Data Diimpor',
            description:
              skipped > 0
                ? `Semua baris dilewati karena kelas tidak valid (${skipped} baris).`
                : 'Format CSV harus: NIS,Nama,Kelas.',
            variant: 'destructive',
          })
          return
        }

        await batch.commit()
        toast({
          title: 'Import Sukses',
          description:
            `Berhasil menambahkan ${count} siswa.` +
            (skipped > 0 ? ` ${skipped} baris dilewati (kelas tidak valid).` : ''),
        })
      } catch (err: unknown) {
        toast({ title: 'Gagal Import CSV', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
      } finally {
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
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#27272a] p-5 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">Manajemen Data Siswa & Kelas</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar 24 kelas (7A–7H, 8A–8H, 9A–9H). Pilih kelas aktif yang diajar, input manual atau import file CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Pengaturan Kelas Aktif */}
          <button
            onClick={() => setShowKelasFilter(!showKelasFilter)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition ${
              showKelasFilter
                ? 'chip-active border-pink-300 dark:border-pink-500'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Pilih Kelas Aktif ({activeKelasList.length})
          </button>

          {/* Import CSV */}
          <label className="flex items-center gap-1.5 bg-white dark:bg-[#27272a] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 py-2 rounded-xl border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-pink-600" /> Import CSV
            <input type="file" accept=".csv,.txt" onChange={handleCSVUpload} className="hidden" />
          </label>

          {/* Tambah Siswa Baru */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 btn-primary text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs"
          >
            <Plus className="w-4 h-4" /> Tambah Siswa
          </button>
        </div>
      </div>

      {/* Drawer Filter Kelas Aktif yang Diajar (24 Kelas) */}
      {showKelasFilter && (
        <div className="bg-white dark:bg-[#27272a] p-5 rounded-2xl border-2 border-pink-300 dark:border-pink-800 shadow-md space-y-3">
          <div className="flex justify-between items-center border-b-[1.5px] border-slate-300 dark:border-b-[1px] dark:border-slate-700/70 pb-2">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wide text-pink-700 dark:text-pink-300">
                Pilih Kelas yang Anda Ajar (Total 24 Kelas)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Centang kelas yang sedang Anda ajar semester ini agar tab navigasi presensi & nilai rapi.
              </p>
            </div>
            <button
              onClick={() => setShowKelasFilter(false)}
              className="text-xs font-bold text-pink-600 hover:text-pink-800"
            >
              Tutup
            </button>
          </div>

          {/* Grid 3 Tingkatan Kelas (7, 8, 9) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {['7', '8', '9'].map((tingkat) => {
              const listInTingkat = ALL_KELAS_LIST.filter((k) => k.startsWith(tingkat))
              return (
                <div key={tingkat} className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Kelas {tingkat} ({tingkat}A – {tingkat}H)
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {listInTingkat.map((k) => {
                      const isActive = activeKelasList.includes(k)
                      return (
                        <button
                          key={k}
                          onClick={() => toggleActiveKelas(k)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                            isActive
                              ? 'chip-active shadow-xs'
                              : 'bg-white dark:bg-[#18181b] text-slate-700 dark:text-slate-300 border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {k}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bar Kontrol Kelas Aktif & Pencarian */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-[#27272a] p-4 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700">
        {/* Pilihan Kelas Aktif */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">Kelas Aktif:</span>
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

        {/* Input Pencarian */}
        <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama atau NIS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-[#18181b] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
      </div>

      {/* Tabel Siswa dengan Fitur Select Delete & Hapus Semua */}
      <div className="bg-white dark:bg-[#27272a] rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 overflow-hidden shadow-xs space-y-0">
        {/* Bar Aksi Massal */}
        <div className="p-4 border-b-[1.5px] border-slate-300 dark:border-b-[1px] dark:border-slate-700 flex flex-wrap justify-between items-center gap-3 bg-white dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-bold text-pink-700 dark:text-pink-300 hover:opacity-70 transition"
            >
              {selectedIds.length === filteredList.length && filteredList.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-pink-600" />
              ) : (
                <Square className="w-4 h-4 text-pink-400" />
              )}
              Pilih Semua ({selectedIds.length}/{filteredList.length})
            </button>

            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Terpilih ({selectedIds.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              Total: {filteredList.length} Siswa
            </span>

            {siswaList.length > 0 && (
              <button
                onClick={handleDeleteAllInClass}
                disabled={isDeleting}
                className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/30 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900/40"
              >
                <Trash2 className="w-3 h-3" /> Hapus Semua di Kelas {selectedKelas}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-pink-500" />
            Memuat data siswa kelas {selectedKelas}...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
            Belum ada data siswa di kelas {selectedKelas}.
            <div className="mt-2 text-slate-500 dark:text-slate-400 font-semibold">
              Gunakan tombol &quot;Tambah Siswa&quot; atau &quot;Import CSV&quot; di atas.
            </div>
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
                  <th className="py-3 px-4 w-24 text-center">Kelas</th>
                  <th className="py-3 px-4 w-24 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y-[1.5px] divide-slate-200 dark:divide-y-[1px] dark:divide-slate-700/60">
                {filteredList.map((s, idx) => {
                  const isChecked = selectedIds.includes(s.id)
                  return (
                    <tr
                      key={s.id}
                      className={`transition-colors ${
                        isChecked
                          ? 'bg-pink-100/50 dark:bg-pink-950/50'
                          : 'hover:bg-pink-50/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => handleToggleSelectOne(s.id)} className="transition hover:opacity-70">
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
                        {s.nis}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{s.nama}</td>
                      <td className="py-3 px-4 text-center font-bold text-pink-600 dark:text-pink-400">
                        {s.kelas}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 text-pink-600 hover:bg-pink-100 dark:hover:bg-pink-900/40 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Hapus ${s.nama}?`)) return
                              await deleteDoc(doc(db, 'siswa', s.id))
                              toast({ title: 'Siswa Dihapus' })
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Modal Form Tambah / Edit Siswa */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#27272a] rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border-2 border-pink-300 dark:border-[1px] dark:border-slate-700">
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              {editingSiswa ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            </h3>

            <form onSubmit={handleSaveSiswa} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">NIS</label>
                <input
                  type="text"
                  placeholder="Contoh: 26001"
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  className="w-full border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Nama Siswa"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Kelas</label>
                <select
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value as KelasId)}
                  className="w-full border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-bold"
                >
                  {ALL_KELAS_LIST.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t-[1.5px] border-slate-300 dark:border-t-[1px] dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 btn-primary font-bold rounded-xl shadow-xs"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
