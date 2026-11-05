'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Link2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { useToast } from '@/hooks/use-toast'

interface BabData {
  id: string
  judul: string
  urutan: number
  driveId: string | null
  driveEmbedUrl: string | null
  driveShareUrl: string | null
}

/** Ambil file ID dari berbagai format tautan Google Drive */
function extractDriveId(link: string): string | null {
  const m =
    link.match(/drive\.google\.com\/file\/d\/([-\w]+)/) ||
    link.match(/drive\.google\.com\/open\?id=([-\w]+)/) ||
    link.match(/drive\.google\.com\/uc\?(?:.*&)?id=([-\w]+)/) ||
    link.match(/docs\.google\.com\/(?:document|fileId)\/d\/([-\w]+)/)
  return m ? m[1] : null
}

function buildDriveUrl(id: string) {
  return {
    id,
    embed: `https://drive.google.com/file/d/${id}/preview`,
    share: `https://drive.google.com/file/d/${id}/view`,
  }
}

export default function BukuKelasPage() {
  const params = useParams()
  const kelas = (params?.kelas as string) || '7'
  const { toast } = useToast()

  // Firestore realtime state
  const [listBab, setListBab] = useState<BabData[]>([])
  const [loadingBab, setLoadingBab] = useState(true)
  const [activeBabId, setActiveBabId] = useState<string | null>(null)

  // UI state
  const [showAddBab, setShowAddBab] = useState(false)
  const [judulBaru, setJudulBaru] = useState('')
  const [editingBabId, setEditingBabId] = useState<string | null>(null)
  const [judulEdit, setJudulEdit] = useState('')
  const [linkFormOpen, setLinkFormOpen] = useState(false)
  const [linkInput, setLinkInput] = useState('')

  // Subscribe realtime daftar bab per kelas
  useEffect(() => {
    setLoadingBab(true)
    const q = query(collection(db, 'materi', kelas, 'bab'), orderBy('urutan', 'asc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: BabData[] = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            judul: (data.judul as string) || 'Bab tanpa nama',
            urutan: (data.urutan as number) || 0,
            driveId: (data.driveId as string) || null,
            driveEmbedUrl: (data.driveEmbedUrl as string) || null,
            driveShareUrl: (data.driveShareUrl as string) || null,
          }
        })
        setListBab(items)
        setLoadingBab(false)
      },
      (error) => {
        console.error('Gagal memuat daftar bab:', error)
        toast({ title: 'Gagal memuat daftar bab', description: 'Cek koneksi internet & coba refresh.', variant: 'destructive' })
        setLoadingBab(false)
      },
    )
    return unsub
  }, [kelas, toast])

  // Reset bab aktif saat pindah kelas
  useEffect(() => {
    setActiveBabId(null)
    setShowAddBab(false)
    setLinkFormOpen(false)
  }, [kelas])

  const currentBab = listBab.find((b) => b.id === activeBabId) ?? listBab[0] ?? null

  /* ---------- Handler CRUD Bab ---------- */

  const handleAddBab = async () => {
    const judul = judulBaru.trim()
    if (!judul) {
      toast({ title: 'Nama bab belum diisi' })
      return
    }
    const urutanBaru = listBab.length > 0 ? (listBab[listBab.length - 1]?.urutan ?? 0) + 1 : 1
    try {
      await addDoc(collection(db, 'materi', kelas, 'bab'), {
        judul,
        urutan: urutanBaru,
        driveId: null,
        driveEmbedUrl: null,
        driveShareUrl: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setJudulBaru('')
      setShowAddBab(false)
      toast({ title: 'Bab ditambahkan', description: judul })
    } catch (error) {
      console.error('Gagal menambah bab:', error)
      toast({ title: 'Gagal menambah bab', variant: 'destructive' })
    }
  }

  const handleRenameBab = async (id: string, judul: string) => {
    const clean = judul.trim()
    if (!clean) return
    try {
      await updateDoc(doc(db, 'materi', kelas, 'bab', id), { judul: clean, updatedAt: serverTimestamp() })
      setEditingBabId(null)
      toast({ title: 'Nama bab diperbarui' })
    } catch (error) {
      console.error('Gagal me-rename bab:', error)
      toast({ title: 'Gagal memperbarui nama bab', variant: 'destructive' })
    }
  }

  const handleMoveBab = async (id: string, arah: 'up' | 'down') => {
    const idx = listBab.findIndex((b) => b.id === id)
    const targetIdx = arah === 'up' ? idx - 1 : idx + 1
    if (idx === -1 || targetIdx < 0 || targetIdx >= listBab.length) return
    const a = listBab[idx]
    const b = listBab[targetIdx]
    try {
      const batch = writeBatch(db)
      batch.update(doc(db, 'materi', kelas, 'bab', a.id), { urutan: b.urutan, updatedAt: serverTimestamp() })
      batch.update(doc(db, 'materi', kelas, 'bab', b.id), { urutan: a.urutan, updatedAt: serverTimestamp() })
      await batch.commit()
    } catch (error) {
      console.error('Gagal memindah urutan bab:', error)
      toast({ title: 'Gagal memindah urutan bab', variant: 'destructive' })
    }
  }

  const handleDeleteBab = async (bab: BabData) => {
    if (!window.confirm(`Hapus bab "${bab.judul}"? Link PDF yang terlampir juga ikut hilang.`)) return
    try {
      await deleteDoc(doc(db, 'materi', kelas, 'bab', bab.id))
      toast({ title: 'Bab dihapus', description: bab.judul })
    } catch (error) {
      console.error('Gagal menghapus bab:', error)
      toast({ title: 'Gagal menghapus bab', variant: 'destructive' })
    }
  }

  /* ---------- Handler Lampiran PDF (Google Drive) ---------- */

  const handleAttachPdf = async () => {
    if (!currentBab) return
    const raw = linkInput.trim()
    const id = extractDriveId(raw)
    if (!id) {
      toast({
        title: 'Link tidak valid',
        description: 'Paste tautan share Google Drive (drive.google.com) berupa file PDF.',
        variant: 'destructive',
      })
      return
    }
    const urls = buildDriveUrl(id)
    try {
      await updateDoc(doc(db, 'materi', kelas, 'bab', currentBab.id), {
        driveId: urls.id,
        driveEmbedUrl: urls.embed,
        driveShareUrl: urls.share,
        updatedAt: serverTimestamp(),
      })
      setLinkInput('')
      setLinkFormOpen(false)
      toast({ title: 'PDF dilampirkan', description: `Bab "${currentBab.judul}" kini menampilkan PDF Google Drive.` })
    } catch (error) {
      console.error('Gagal melampirkan PDF:', error)
      toast({ title: 'Gagal melampirkan PDF', variant: 'destructive' })
    }
  }

  const handleRemovePdf = async () => {
    if (!currentBab) return
    if (!window.confirm(`Lepas PDF dari bab "${currentBab.judul}"?`)) return
    try {
      await updateDoc(doc(db, 'materi', kelas, 'bab', currentBab.id), {
        driveId: deleteField(),
        driveEmbedUrl: deleteField(),
        driveShareUrl: deleteField(),
        updatedAt: serverTimestamp(),
      })
      toast({ title: 'PDF dilepas dari bab' })
    } catch (error) {
      console.error('Gagal melepas PDF:', error)
      toast({ title: 'Gagal melepas PDF', variant: 'destructive' })
    }
  }

  /* ---------- Render ---------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#27272a] p-5 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 shadow-xs flex justify-between items-center">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-300 bg-pink-100 dark:bg-pink-500/10 px-2.5 py-1 rounded-full">
            Kurikulum Matematika SMP
          </span>
          <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1">Buku Modul Kelas {kelas}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola bab & rangkuman materi PDF dari Google Drive — data tersimpan permanen.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigasi Bab */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase px-1">Daftar Bab</div>

          {loadingBab && (
            <div className="p-3 rounded-xl border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 animate-pulse">
              Memuat bab...
            </div>
          )}

          {!loadingBab && listBab.length === 0 && (
            <div className="p-3 rounded-xl border-[1.5px] border-dashed border-slate-300 dark:border-slate-600 text-xs text-slate-400 dark:text-slate-500 text-center">
              Belum ada bab.
            </div>
          )}

          {listBab.map((bab, idx) => {
            const isActive = currentBab?.id === bab.id
            return (
              <div key={bab.id}>
                <div
                  className={`rounded-xl border-[1.5px] transition ${
                    isActive
                      ? 'chip-active border-pink-300 dark:border-pink-500 shadow-xs'
                      : 'bg-white dark:bg-[#27272a] text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <button
                    onClick={() => setActiveBabId(bab.id)}
                    className="w-full text-left p-3 text-xs font-semibold rounded-xl flex items-center justify-between gap-1 min-w-0"
                  >
                    <span className="truncate">{bab.judul}</span>
                    <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
                  </button>
                  {isActive && (
                    <div className="flex items-center justify-end gap-0.5 px-1.5 pb-1.5">
                      <button
                        onClick={() => handleMoveBab(bab.id, 'up')}
                        disabled={idx === 0}
                        title="Naik urutan"
                        className="p-1.5 rounded-lg hover:bg-pink-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveBab(bab.id, 'down')}
                        disabled={idx === listBab.length - 1}
                        title="Turun urutan"
                        className="p-1.5 rounded-lg hover:bg-pink-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      {editingBabId === bab.id ? null : (
                        <>
                          <button
                            onClick={() => {
                              setEditingBabId(bab.id)
                              setJudulEdit(bab.judul)
                            }}
                            title="Edit nama bab"
                            className="p-1.5 rounded-lg hover:bg-pink-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBab(bab)}
                            title="Hapus bab"
                            className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {editingBabId === bab.id && (
                    <div className="px-2 pb-2 space-y-1.5">
                      <input
                        value={judulEdit}
                        onChange={(e) => setJudulEdit(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameBab(bab.id, judulEdit)
                          if (e.key === 'Escape') setEditingBabId(null)
                        }}
                        autoFocus
                        className="w-full border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 bg-white dark:bg-[#18181b] rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="Nama bab"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleRenameBab(bab.id, judulEdit)}
                          className="btn-primary text-[11px] font-bold px-2.5 py-1 rounded-lg flex-1"
                        >
                          Simpan
                        </button>
                        <button
                          onClick={() => setEditingBabId(null)}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {showAddBab ? (
            <div className="rounded-xl border-[1.5px] border-pink-300 dark:border-pink-500/50 p-2 space-y-1.5 bg-pink-50/50 dark:bg-pink-950/20">
              <input
                value={judulBaru}
                onChange={(e) => setJudulBaru(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddBab()
                  if (e.key === 'Escape') {
                    setShowAddBab(false)
                    setJudulBaru('')
                  }
                }}
                autoFocus
                className="w-full border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 bg-white dark:bg-[#18181b] rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="Nama bab, mis. Bab 1: Bilangan Bulat..."
              />
              <div className="flex gap-1">
                <button onClick={handleAddBab} className="btn-primary text-[11px] font-bold px-2.5 py-1 rounded-lg flex-1">
                  Tambah
                </button>
                <button
                  onClick={() => {
                    setShowAddBab(false)
                    setJudulBaru('')
                  }}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddBab(true)}
              className="w-full text-left p-3 rounded-xl border-[1.5px] border-dashed border-pink-300 dark:border-pink-500/50 text-xs font-bold text-pink-600 dark:text-pink-300 flex items-center gap-1.5 hover:bg-pink-50 dark:hover:bg-pink-950/20 transition"
            >
              <Plus className="w-4 h-4" /> Tambah Bab
            </button>
          )}
        </div>

        {/* Rangkuman Materi PDF */}
        <div className="md:col-span-3 space-y-6">
          {!currentBab && !loadingBab && (
            <div className="bg-white dark:bg-[#27272a] p-12 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 shadow-xs text-center text-xs text-slate-400 dark:text-slate-500">
              Belum ada bab untuk kelas {kelas}. Tambahkan bab terlebih dahulu di panel kiri.
            </div>
          )}

          {currentBab && (
            <div className="bg-white dark:bg-[#27272a] rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 shadow-xs overflow-hidden flex flex-col">
              {/* Card Header */}
              <div className="p-5 flex flex-wrap justify-between items-center gap-3 border-b-[1.5px] border-slate-300 dark:border-b-[1px] dark:border-slate-700">
                <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white">
                  <BookOpen className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  Rangkuman Materi — {currentBab.judul}
                </div>
                {currentBab.driveEmbedUrl && (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={currentBab.driveShareUrl || currentBab.driveEmbedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] font-bold text-pink-600 dark:text-pink-300 hover:underline px-2.5 py-1.5 rounded-lg"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Buka Tab Baru
                    </a>
                    <button
                      onClick={() => {
                        setLinkFormOpen(true)
                        setLinkInput('')
                      }}
                      className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    >
                      Ganti PDF
                    </button>
                    <button
                      onClick={handleRemovePdf}
                      className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-red-600 dark:text-red-400 border-[1.5px] border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus PDF
                    </button>
                  </div>
                )}
              </div>

              {/* Viewer / Form */}
              {currentBab.driveEmbedUrl && !linkFormOpen ? (
                <div className="p-4">
                  <iframe
                    key={currentBab.driveEmbedUrl}
                    src={currentBab.driveEmbedUrl}
                    title={`Rangkuman Materi — ${currentBab.judul}`}
                    loading="lazy"
                    className="w-full h-[72vh] min-h-[480px] rounded-xl border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700"
                    allow="autoplay"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 text-center">
                    Sumber: Google Drive — pastikan file masih di-set share &quot;Anyone with the link · Viewer&quot; jika tidak tampil.
                  </p>
                </div>
              ) : linkFormOpen ? (
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                    <Link2 className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                    {currentBab.driveEmbedUrl ? 'Ganti PDF dari Google Drive' : 'Lampirkan PDF dari Google Drive'}
                  </div>
                  <input
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAttachPdf()}
                    autoFocus
                    className="w-full border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 rounded-xl px-3.5 py-2 bg-white dark:bg-[#18181b] text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Paste tautan Google Drive: https://drive.google.com/file/d/..."
                  />
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 bg-pink-50/60 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/40 rounded-xl p-3">
                    <p className="font-bold text-pink-700 dark:text-pink-300">Cara memastikan PDF bisa tampil:</p>
                    <p>1. Upload file PDF (maks 10 MB) ke Google Drive.</p>
                    <p>2. Klik kanan file → <b>Bagikan → Akses umum: Anyone with the link</b>, peran <b>Viewer</b>.</p>
                    <p>3. Salin tautan, lalu paste di kotak atas dan klik Simpan.</p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setLinkFormOpen(false)
                        setLinkInput('')
                      }}
                      className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700"
                    >
                      <X className="w-3.5 h-3.5" /> Batal
                    </button>
                    <button onClick={handleAttachPdf} className="btn-primary text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" /> Simpan & Tampilkan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-pink-500 dark:text-pink-300" />
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Belum ada PDF terlampir</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Upload rangkuman materi (maks 10 MB) ke Google Drive, lalu lampirkan tautannya di sini.
                    Tautan disimpan permanen — tetap tampil walau web di-refresh atau kamu keluar.
                  </p>
                  <button
                    onClick={() => {
                      setLinkFormOpen(true)
                      setLinkInput('')
                    }}
                    className="btn-primary text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Lampirkan Google Drive PDF
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
