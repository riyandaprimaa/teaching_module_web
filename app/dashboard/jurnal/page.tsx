'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useTheme } from '@/contexts/ThemeContext'
import { Jurnal, KelasId } from '@/types'
import { formatTanggal, toDateString } from '@/lib/utils'
import { Plus, Trash2, FileText, Sparkles, CheckSquare, Square } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { DatePicker } from '@/components/ui/date-picker'

export default function JurnalGuruPage() {
  const { activeKelasList } = useTheme()

  const [jurnalList, setJurnalList] = useState<Jurnal[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Seleksi Massal (Select Delete)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  // Form states
  const [tanggal, setTanggal] = useState(toDateString(new Date()))
  const [kelas, setKelas] = useState<KelasId>(activeKelasList[0] || '7A')
  const [topik, setTopik] = useState('')
  const [isi, setIsi] = useState('')
  const [refleksi, setRefleksi] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'jurnal'), orderBy('tanggal', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const data: Jurnal[] = []
      snap.forEach((d) => {
        data.push({ id: d.id, ...d.data() } as Jurnal)
      })
      setJurnalList(data)
      setLoading(false)
      setSelectedIds([])
    })

    return () => unsub()
  }, [])

  // Simpan Jurnal Baru
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topik.trim() || !isi.trim()) {
      toast({ title: 'Mohon lengkapi topik dan isi catatan jurnal!', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      await addDoc(collection(db, 'jurnal'), {
        tanggal,
        kelas,
        topik,
        isi,
        refleksi,
        createdAt: new Date().toISOString(),
      })

      // Reset form
      setTopik('')
      setIsi('')
      setRefleksi('')
      toast({ title: 'Catatan Jurnal Berhasil Disimpan! ✓' })
    } catch (err: unknown) {
      toast({ title: 'Gagal Menyimpan', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle selection
  const handleToggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleToggleSelectAll = () => {
    if (selectedIds.length === jurnalList.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(jurnalList.map((j) => j.id))
    }
  }

  // Hapus Jurnal Terpilih (Select Delete)
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Hapus ${selectedIds.length} catatan jurnal yang dipilih?`)) return

    setIsDeleting(true)
    try {
      const batch = writeBatch(db)
      selectedIds.forEach((id) => {
        batch.delete(doc(db, 'jurnal', id))
      })
      await batch.commit()
      setSelectedIds([])
      toast({ title: 'Jurnal Terpilih Berhasil Dihapus' })
    } catch (err: unknown) {
      toast({ title: 'Gagal Menghapus', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  // Hapus Seluruh Jurnal
  const handleDeleteAllJurnal = async () => {
    if (jurnalList.length === 0) return
    if (!confirm('Hapus SELURUH catatan jurnal yang tersimpan?')) return

    setIsDeleting(true)
    try {
      const batch = writeBatch(db)
      jurnalList.forEach((j) => {
        batch.delete(doc(db, 'jurnal', j.id))
      })
      await batch.commit()
      setSelectedIds([])
      toast({ title: 'Seluruh Jurnal Dibersihkan' })
    } catch (err: unknown) {
      toast({ title: 'Gagal', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#27272a] p-5 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">Jurnal Pengajaran Guru</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dokumentasikan aktivitas belajar mengajar, materi yang dibahas, kendala kelas, dan refleksi harian.
          </p>
        </div>

        {jurnalList.length > 0 && (
          <button
            onClick={handleDeleteAllJurnal}
            disabled={isDeleting}
            className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/50"
          >
            <Trash2 className="w-3.5 h-3.5" /> Hapus Seluruh Jurnal
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Tambah Jurnal */}
        <div className="bg-white dark:bg-[#27272a] p-5 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 shadow-xs h-fit space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b-[1.5px] border-slate-300 dark:border-b-[1px] dark:border-slate-700">
            <Plus className="w-4 h-4 text-pink-600" /> Tulis Catatan Baru
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Tanggal</label>
                <DatePicker value={tanggal} onChange={setTanggal} className="w-full" />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Kelas</label>
                <select
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value as KelasId)}
                  className="w-full border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-bold shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  {activeKelasList.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Materi / Topik Pembahasan</label>
              <input
                type="text"
                placeholder="Misal: Operasi Perkalian Bentuk Aljabar"
                value={topik}
                onChange={(e) => setTopik(e.target.value)}
                className="w-full border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-bold shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Aktivitas & Catatan Kelas</label>
              <textarea
                rows={3}
                placeholder="Rangkuman kegiatan kelas, antusiasme siswa, soal yang dibahas..."
                value={isi}
                onChange={(e) => setIsi(e.target.value)}
                className="w-full border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Refleksi & Rencana Tindak Lanjut</label>
              <textarea
                rows={2}
                placeholder="Kendala siswa, siswa yang butuh remidial / bimbingan..."
                value={refleksi}
                onChange={(e) => setRefleksi(e.target.value)}
                className="w-full border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary font-bold py-2.5 rounded-xl shadow-xs transition"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Jurnal Baru'}
            </button>
          </form>
        </div>

        {/* Riwayat Catatan Jurnal */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-[#27272a] px-4 py-3 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleSelectAll}
                className="flex items-center gap-1.5 text-xs font-bold text-pink-700 dark:text-pink-300 hover:opacity-70 transition"
              >
                {selectedIds.length === jurnalList.length && jurnalList.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-pink-600" />
                ) : (
                  <Square className="w-4 h-4 text-pink-400" />
                )}
                Pilih Semua ({selectedIds.length}/{jurnalList.length})
              </button>

              {selectedIds.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs ml-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Terpilih ({selectedIds.length})
                </button>
              )}
            </div>

            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              {jurnalList.length} Catatan Tersimpan
            </span>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-[#27272a] p-8 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 text-center text-slate-400 dark:text-slate-500 text-xs">
              Memuat catatan jurnal...
            </div>
          ) : jurnalList.length === 0 ? (
            <div className="bg-white dark:bg-[#27272a] p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 text-center text-slate-400 dark:text-slate-500 text-xs">
              Belum ada catatan jurnal mengajar. Tulis catatan pertama pada formulir di sebelah kiri.
            </div>
          ) : (
            jurnalList.map((j) => {
              const isChecked = selectedIds.includes(j.id)
              return (
                <div
                  key={j.id}
                  className={`bg-white dark:bg-[#27272a] p-5 rounded-2xl border-2 dark:border-[1px] shadow-xs space-y-3 relative group transition ${
                    isChecked
                      ? 'border-pink-500 bg-pink-50/30 dark:bg-pink-950/30'
                      : 'border-pink-300 dark:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2.5">
                      <button
                        onClick={() => handleToggleSelectOne(j.id)}
                        className="mt-0.5 transition hover:opacity-70"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-pink-600" />
                        ) : (
                          <Square className="w-4 h-4 text-pink-300 dark:text-pink-700" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-pink-100 dark:bg-pink-500/10 text-pink-700 dark:text-pink-300 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                            Kelas {j.kelas}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {formatTanggal(j.tanggal)}
                          </span>
                        </div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                          {j.topik}
                        </h3>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        if (!confirm('Hapus catatan jurnal ini?')) return
                        await deleteDoc(doc(db, 'jurnal', j.id))
                        toast({ title: 'Jurnal Dihapus' })
                      }}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition"
                      title="Hapus Jurnal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs text-slate-900 dark:text-white leading-relaxed bg-pink-50/50 dark:bg-pink-950/20 p-3.5 rounded-xl border border-pink-100/60 dark:border-pink-900/40">
                    <div className="font-bold text-pink-800 dark:text-pink-300 mb-1 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Aktivitas Pembelajaran:
                    </div>
                    {j.isi}
                  </div>

                  {j.refleksi && (
                    <div className="text-xs text-slate-900 dark:text-white leading-relaxed bg-pink-50/60 dark:bg-pink-950/20 p-3.5 rounded-xl border border-pink-100 dark:border-pink-900/40">
                      <div className="font-bold text-pink-700 dark:text-pink-300 mb-1 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Refleksi & Evaluasi:
                      </div>
                      {j.refleksi}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
