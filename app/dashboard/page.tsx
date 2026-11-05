'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where, getDocs, writeBatch, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Kehadiran, KelasId, TAHUN_AJARAN, KKM } from '@/types'
import {
  Users,
  CalendarCheck,
  BarChart2,
  BookOpenCheck,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Trash2,
  CheckCircle,
  Link as LinkIcon,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from '@/hooks/use-toast'
import { fetchWithAuth, parseApiResponse } from '@/lib/api-client'

const NAMA_DEPAN = [
  'Ahmad', 'Aditya', 'Aisyah', 'Anisa', 'Bagas', 'Bayu', 'Bunga', 'Citra',
  'Dimas', 'Dina', 'Eko', 'Fajar', 'Farhan', 'Gita', 'Hafiz', 'Indah',
  'Irfan', 'Joko', 'Kurnia', 'Lestari', 'Maulana', 'Nabila', 'Putra', 'Putri',
  'Rafi', 'Rani', 'Rian', 'Rizky', 'Siti', 'Tri', 'Wahyu', 'Zahra'
]

const NAMA_BELAKANG = [
  'Pratama', 'Saputra', 'Wijaya', 'Kusuma', 'Santoso', 'Ramadhan', 'Hidayat',
  'Permana', 'Nugroho', 'Wibowo', 'Setiawan', 'Siregar', 'Lubis', 'Purnomo'
]

export default function DashboardOverviewPage() {
  const { user } = useAuth()
  const { spreadsheetId, setSpreadsheetId, activeKelasList } = useTheme()

  const [totalSiswa, setTotalSiswa] = useState<number>(0)
  const [kehadiranHariIni, setKehadiranHariIni] = useState<{ total: number; hadir: number }>({ total: 0, hadir: 0 })
  const [totalJurnal, setTotalJurnal] = useState<number>(0)
  const [inputSheetId, setInputSheetId] = useState<string>('')
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [isSeeding, setIsSeeding] = useState<boolean>(false)
  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false)

  useEffect(() => {
    setInputSheetId(spreadsheetId)
  }, [spreadsheetId])

  useEffect(() => {
    // 1. Listen data siswa
    const qSiswa = collection(db, 'siswa')
    const unsubSiswa = onSnapshot(qSiswa, (snap) => {
      setTotalSiswa(snap.size)
    })

    // 2. Listen kehadiran hari ini
    const today = new Date().toISOString().split('T')[0]
    const qKehadiran = query(collection(db, 'kehadiran'), where('tanggal', '==', today))
    const unsubKehadiran = onSnapshot(qKehadiran, (snap) => {
      let hadirCount = 0
      snap.forEach((doc) => {
        const data = doc.data() as Kehadiran
        if (data.status === 'hadir') hadirCount++
      })
      setKehadiranHariIni({ total: snap.size, hadir: hadirCount })
    })

    // 3. Listen jurnal
    const qJurnal = collection(db, 'jurnal')
    const unsubJurnal = onSnapshot(qJurnal, (snap) => {
      setTotalJurnal(snap.size)
    })

    return () => {
      unsubSiswa()
      unsubKehadiran()
      unsubJurnal()
    }
  }, [])

  // Simpan / Hubungkan ID Spreadsheet
  const handleSaveSpreadsheetId = async () => {
    if (!inputSheetId.trim()) {
      toast({ title: 'Masukkan ID Spreadsheet terlebih dahulu!', variant: 'destructive' })
      return
    }

    const cleanId = inputSheetId.trim()
    setIsSyncing(true)
    try {
      const res = await fetchWithAuth('/api/setup-sheet', {
        method: 'POST',
        body: JSON.stringify({ existingSpreadsheetId: cleanId }),
      })
      const data = await res.json()
      if (res.ok) {
        setSpreadsheetId(cleanId)
        toast({
          title: 'Spreadsheet Terhubung!',
          description: `ID: ${cleanId} telah disimpan & diverifikasi.`,
        })
      } else {
        toast({
          title: 'Gagal Menghubungkan',
          description: data.error || 'Pastikan service account sudah di-invite sebagai Editor.',
          variant: 'destructive',
        })
      }
    } catch (err: unknown) {
      toast({ title: 'Error Koneksi', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setIsSyncing(false)
    }
  }

  // Hapus ID Spreadsheet
  const handleRemoveSpreadsheetId = () => {
    if (!confirm('Apakah Anda yakin ingin melepas ID Spreadsheet ini?')) return
    setSpreadsheetId('')
    setInputSheetId('')
    toast({ title: 'Koneksi Spreadsheet Dilepas', description: 'ID spreadsheet telah dihapus dari sistem.' })
  }

  // Tombol Refresh: Sinkron penuh Firestore → Spreadsheet (dari server, 1 request)
  const handleRefreshSyncSheet = async () => {
    if (!spreadsheetId) {
      toast({ title: 'Hubungkan ID Spreadsheet terlebih dahulu!', variant: 'destructive' })
      return
    }

    setIsSyncing(true)
    try {
      const res = await fetchWithAuth('/api/sync-all', {
        method: 'POST',
        body: JSON.stringify({ spreadsheetId }),
      })
      const data = await parseApiResponse<{
        kehadiran: { terkirim: number; updated: number; inserted: number }
        nilai: { terkirim: number; updated: number; inserted: number }
      }>(res)

      toast({
        title: 'Spreadsheet Berhasil Di-refresh!',
        description: `${data.kehadiran.terkirim} presensi (${data.kehadiran.updated} update, ${data.kehadiran.inserted} baru) & ${data.nilai.terkirim} nilai (${data.nilai.updated} update, ${data.nilai.inserted} baru) telah disinkronkan.`,
      })
    } catch (err: unknown) {
      toast({ title: 'Gagal Refresh Spreadsheet', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setIsSyncing(false)
    }
  }

  // Auto Generate Siswa (tetap tersedia setiap saat)
  const handleAutoGenerateSiswa = async () => {
    if (!user) {
      toast({ title: 'Silakan login terlebih dahulu!', variant: 'destructive' })
      return
    }

    setIsSeeding(true)
    try {
      const batch = writeBatch(db)
      const siswaRef = collection(db, 'siswa')

      // Generate untuk kelas yang sedang aktif diajar (atau default 5 kelas)
      const targetKelas = activeKelasList.length > 0 ? activeKelasList : (['7A', '7B', '8A', '8B', '9A'] as KelasId[])
      let counter = 26001

      targetKelas.forEach((kelas) => {
        // Buat 10-15 siswa per kelas
        for (let i = 1; i <= 12; i++) {
          const docRef = doc(siswaRef)
          const depan = NAMA_DEPAN[Math.floor(Math.random() * NAMA_DEPAN.length)]
          const belakang = NAMA_BELAKANG[Math.floor(Math.random() * NAMA_BELAKANG.length)]
          const nama = `${depan} ${belakang}`

          batch.set(docRef, {
            id: docRef.id,
            nis: counter.toString(),
            nama: nama,
            kelas: kelas,
            createdAt: new Date().toISOString(),
          })
          counter++
        }
      })

      await batch.commit()
      toast({
        title: 'Generate Siswa Berhasil! 🎉',
        description: `Berhasil menambahkan data siswa ke ${targetKelas.length} kelas aktif.`,
      })
    } catch (err: unknown) {
      toast({ title: 'Gagal Generate Siswa', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setIsSeeding(false)
    }
  }

  // Hapus Seluruh Data Sistem (Reset Database)
  const handleDeleteAllSystemData = async () => {
    const confirmation = prompt(
      '⚠️ PERINGATAN: Ketik "HAPUS SEMUA" untuk mengonfirmasi penghapusan seluruh data siswa, kehadiran, nilai, dan jurnal.'
    )
    if (confirmation !== 'HAPUS SEMUA') {
      toast({ title: 'Dibatalkan', description: 'Konfirmasi tidak sesuai.' })
      return
    }

    setIsDeletingAll(true)
    try {
      const collections = ['siswa', 'kehadiran', 'nilai', 'jurnal']
      for (const colName of collections) {
        const snap = await getDocs(collection(db, colName))
        const batch = writeBatch(db)
        snap.forEach((d) => batch.delete(d.ref))
        await batch.commit()
      }
      toast({ title: 'Seluruh Data Berhasil Dihapus', description: 'Database kembali bersih.' })
    } catch (err: unknown) {
      toast({ title: 'Gagal Menghapus Data', description: err instanceof Error ? err.message : 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setIsDeletingAll(false)
    }
  }

  const persentaseKehadiran = kehadiranHariIni.total > 0
    ? Math.round((kehadiranHariIni.hadir / kehadiranHariIni.total) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Banner Utama Beranda Pink */}
      <div className="bg-gradient-to-r from-pink-200 via-pink-200 to-pink-300 dark:from-[#321e28] dark:via-[#2b1922] dark:to-[#38202d] rounded-2xl p-6 text-pink-950 dark:text-pink-100 shadow-md border border-pink-300/70 dark:border-pink-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 overflow-hidden">
        <div className="flex-1 min-w-0 max-w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/80 dark:bg-pink-500/20 px-3 py-0.5 rounded-full text-xs font-semibold text-pink-800 dark:text-pink-200 border border-pink-300/40 dark:border-pink-500/30 backdrop-blur-xs">
              ✨ Jurnal Guru Premium
            </span>
            <span className="text-pink-700/90 dark:text-pink-300 text-xs font-medium">T.A. {TAHUN_AJARAN}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Selamat Datang, {user?.displayName || 'Guru Hebat'}! 👋✨
          </h1>
          {/* Teks Sambutan Marquee */}
          <div className="relative overflow-hidden w-full mt-2 py-1">
            <div className="flex whitespace-nowrap animate-marquee-slow text-xs text-pink-900/90 dark:text-pink-200/90 font-medium">
              <span className="inline-block pr-12">
                🌸 Selamat datang di platform Jurnal Guru Premium! Di sini kamu bisa mengelola modul belajar, presensi harian siswa, rekap nilai terintegrasi KKM 75, catatan jurnal refleksi mengajar, dan sinkronisasi otomatis Google Sheets dengan mudah, cepat, dan rapi! 🚀📚 Semangat mendidik generasi penerus bangsa! ✨
              </span>
              <span className="inline-block pr-12">
                🌸 Selamat datang di platform Jurnal Guru Premium! Di sini kamu bisa mengelola modul belajar, presensi harian siswa, rekap nilai terintegrasi KKM 75, catatan jurnal refleksi mengajar, dan sinkronisasi otomatis Google Sheets dengan mudah, cepat, dan rapi! 🚀📚 Semangat mendidik generasi penerus bangsa! ✨
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleAutoGenerateSiswa}
            disabled={isSeeding}
            className="flex items-center gap-1.5 bg-white/90 hover:bg-white text-pink-800 text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm dark:bg-pink-500/20 dark:hover:bg-pink-500/30 dark:text-pink-100 border border-pink-200/60 dark:border-pink-500/30"
          >
            <Sparkles className="w-4 h-4 text-pink-500 dark:text-pink-300" />
            {isSeeding ? 'Mengenerate...' : 'Auto Generate Nama Siswa'}
          </button>

          <button
            onClick={handleDeleteAllSystemData}
            disabled={isDeletingAll}
            className="flex items-center gap-1.5 bg-white/80 hover:bg-white text-red-700 text-xs font-semibold px-3 py-2 rounded-xl border border-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-300 dark:border-red-900/50"
            title="Hapus seluruh data siswa, nilai, presensi, & jurnal"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeletingAll ? 'Menghapus...' : 'Reset Semua Data'}
          </button>
        </div>
      </div>

      {/* Panel Integrasi Google Sheets */}
      <div className="bg-white dark:bg-[#27272a] border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-[1.5px] border-slate-300 dark:border-b-[1px] dark:border-slate-700 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-pink-600 dark:text-pink-400" /> Integrasi Google Spreadsheet
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hubungkan ID Google Sheets Anda. ID tersimpan permanen dan data otomatis di-update setiap kali tombol Refresh ditekan.
            </p>
          </div>

          {spreadsheetId && (
            <a
              href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-600 dark:text-pink-300 bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-300 hover:bg-pink-100 px-3 py-1.5 rounded-xl border border-pink-200 dark:border-pink-500/20"
            >
              Buka Dokumen Sheets <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Form Input ID atau Status Terhubung */}
        {spreadsheetId ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-800/60 border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Spreadsheet Aktif Terhubung
                </span>
              </div>
              <div className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                ID: {spreadsheetId}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshSyncSheet}
                disabled={isSyncing}
                className="flex items-center gap-1.5 btn-primary text-xs font-bold px-4 py-2 rounded-xl shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Menyinkronkan...' : 'Refresh Spreadsheet'}
              </button>

              <button
                onClick={handleRemoveSpreadsheetId}
                disabled={isSyncing}
                className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus ID
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              placeholder="Paste ID Google Spreadsheet di sini..."
              value={inputSheetId}
              onChange={(e) => setInputSheetId(e.target.value)}
              className="flex-1 border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 rounded-xl px-3.5 py-2 bg-white dark:bg-[#18181b] text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <button
              onClick={handleSaveSpreadsheetId}
              disabled={isSyncing || !inputSheetId.trim()}
              className="btn-primary text-xs font-bold px-4 py-2 rounded-xl shadow-xs shrink-0"
            >
              {isSyncing ? 'Memverifikasi...' : 'Simpan & Hubungkan ID'}
            </button>
          </div>
        )}
      </div>

      {/* Ringkasan Statistik Cards (Pink Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Siswa */}
        <Link
          href="/dashboard/siswa"
          className="bg-white dark:bg-[#27272a] p-5 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 shadow-xs flex items-center justify-between hover:border-pink-400 dark:hover:border-pink-700 group transition-all"
        >
          <div>
            <p className="text-[11px] font-bold text-pink-500 uppercase tracking-wider">Total Siswa</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalSiswa}</h3>
            <p className="text-xs text-pink-600 dark:text-pink-400 font-semibold mt-1 group-hover:translate-x-1 transition-transform">
              Kelola Siswa &rarr;
            </p>
          </div>
          <div className="w-12 h-12 bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-300 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </Link>

        {/* Card 2: Kehadiran Hari Ini */}
        <div className="bg-white dark:bg-[#27272a] p-5 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-pink-500 uppercase tracking-wider">Presensi Hari Ini</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{persentaseKehadiran}%</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {kehadiranHariIni.hadir} dari {kehadiranHariIni.total} siswa
            </p>
          </div>
          <div className="w-12 h-12 bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-300 rounded-2xl flex items-center justify-center">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Jurnal Catatan */}
        <div className="bg-white dark:bg-[#27272a] p-5 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-fuchsia-500 uppercase tracking-wider">Jurnal Mengajar</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalJurnal}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Catatan Refleksi</p>
          </div>
          <div className="w-12 h-12 bg-fuchsia-50 dark:bg-fuchsia-950/80 text-fuchsia-600 dark:text-fuchsia-300 rounded-2xl flex items-center justify-center">
            <BookOpenCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: KKM Standard 75 */}
        <div className="bg-white dark:bg-[#27272a] p-5 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-pink-500 uppercase tracking-wider">Standar KKM</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{KKM}</h3>
            <p className="text-xs text-pink-600 dark:text-pink-400 font-bold mt-1">Batas Kelulusan</p>
          </div>
          <div className="w-12 h-12 bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-300 rounded-2xl flex items-center justify-center">
            <BarChart2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Akses Cepat Menu Pengajaran */}
      <h2 className="text-base font-bold text-slate-900 dark:text-white pt-1">Menu Utama Pembelajaran</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Link
          href="/dashboard/kehadiran"
          className="group bg-white dark:bg-[#27272a] p-5 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 shadow-xs hover:border-pink-400 dark:hover:border-pink-600 hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 bg-pink-100 dark:bg-pink-500/10 text-pink-600 dark:text-pink-300 rounded-xl flex items-center justify-center mb-3">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
              Presensi & Rekap Kehadiran
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Presensi harian siswa dengan tombol Simpan Perubahan, serta ekspor PDF per kelas tunggal maupun rentang tanggal gabungan.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-pink-600 dark:text-pink-400 mt-4">
            Buka Presensi <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/dashboard/nilai"
          className="group bg-white dark:bg-[#27272a] p-5 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 shadow-xs hover:border-pink-400 dark:hover:border-pink-600 hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 bg-pink-100 dark:bg-pink-500/10 text-pink-600 dark:text-pink-300 rounded-xl flex items-center justify-center mb-3">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
              Daftar Nilai Siswa (KKM 75)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Input UH, Tugas, UTS, UAS, kartu nilai tertinggi & terendah, filter tanggal, dan konfirmasi simpan perubahan.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-pink-600 dark:text-pink-400 mt-4">
            Kelola Nilai <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/dashboard/jurnal"
          className="group bg-white dark:bg-[#27272a] p-5 rounded-2xl border-2 border-pink-300 dark:border-[1px] dark:border-slate-700 shadow-xs hover:border-pink-400 dark:hover:border-pink-600 hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-600 dark:text-fuchsia-300 rounded-xl flex items-center justify-center mb-3">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors">
              Jurnal Refleksi Pengajaran
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Dokumentasi aktivitas kelas, materi pokok, dan tindak lanjut perkembangan siswa setiap pertemuan.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400 mt-4">
            Buka Jurnal <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  )
}
