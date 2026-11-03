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
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Jurnal, KELAS_LIST } from '@/types'
import { formatTanggal, toDateString } from '@/lib/utils'
import { BookOpenCheck, Plus, Trash2, Calendar, FileText, Sparkles } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function JurnalGuruPage() {
  const [jurnalList, setJurnalList] = useState<Jurnal[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [tanggal, setTanggal] = useState(toDateString(new Date()))
  const [kelas, setKelas] = useState('7A')
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
    })

    return () => unsub()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topik.trim() || !isi.trim()) {
      toast({ title: 'Mohon lengkapi topik dan isi jurnal!', variant: 'destructive' })
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
      toast({ title: 'Jurnal Berhasil Ditambahkan!' })
    } catch (err: any) {
      toast({ title: 'Gagal Menyimpan', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan jurnal ini?')) return
    try {
      await deleteDoc(doc(db, 'jurnal', id))
      toast({ title: 'Catatan Jurnal Dihapus' })
    } catch (err: any) {
      toast({ title: 'Gagal Menghapus', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <h1 className="text-xl font-bold text-slate-800">Jurnal Pengajaran Guru</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Catat aktivitas belajar mengajar, materi yang disampaikan, serta evaluasi & refleksi harian.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Tambah Jurnal */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 pb-2 border-b">
            <Plus className="w-4 h-4 text-purple-600" /> Tulis Catatan Baru
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tanggal</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Kelas</label>
                <select
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {KELAS_LIST.map((k) => (
                    <option key={k} value={k} className="text-slate-900 bg-white font-semibold">
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Materi / Topik Pembahasan</label>
              <input
                type="text"
                placeholder="Misal: Operasi Perkalian Bentuk Aljabar"
                value={topik}
                onChange={(e) => setTopik(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 placeholder:text-slate-500 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Aktivitas & Catatan Kelas</label>
              <textarea
                rows={3}
                placeholder="Rangkuman kegiatan kelas, antusiasme siswa, atau soal yang dibahas..."
                value={isi}
                onChange={(e) => setIsi(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 placeholder:text-slate-500 font-normal shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Refleksi & Rencana Tindak Lanjut</label>
              <textarea
                rows={2}
                placeholder="Kendala siswa, siswa yang butuh bimbingan ekstra, dsb..."
                value={refleksi}
                onChange={(e) => setRefleksi(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 placeholder:text-slate-500 font-normal shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-lg transition"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Jurnal'}
            </button>
          </form>
        </div>

        {/* Riwayat Catatan Jurnal */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center bg-white px-4 py-3 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Riwayat Jurnal Guru</span>
            <span className="text-xs text-slate-500">{jurnalList.length} Catatan Tersimpan</span>
          </div>

          {loading ? (
            <div className="bg-white p-8 rounded-xl border text-center text-slate-400 text-xs">
              Memuat catatan jurnal...
            </div>
          ) : jurnalList.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">
              Belum ada catatan jurnal. Tulis catatan pertama Anda pada formulir di sebelah kiri.
            </div>
          ) : (
            jurnalList.map((j) => (
              <div
                key={j.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 relative group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded text-[11px] mr-2">
                      Kelas {j.kelas}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {formatTanggal(j.tanggal)}
                    </span>
                    <h3 className="text-sm font-bold text-slate-800 mt-1">{j.topik}</h3>
                  </div>

                  <button
                    onClick={() => handleDelete(j.id)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded transition opacity-0 group-hover:opacity-100"
                    title="Hapus Jurnal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="font-semibold text-slate-500 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Aktivitas Pembelajaran:
                  </div>
                  {j.isi}
                </div>

                {j.refleksi && (
                  <div className="text-xs text-amber-800 leading-relaxed bg-amber-50/70 p-3 rounded-lg border border-amber-100">
                    <div className="font-semibold text-amber-700 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Refleksi & Tindak Lanjut:
                    </div>
                    {j.refleksi}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

