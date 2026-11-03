'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where, writeBatch, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Siswa, Kehadiran, KELAS_LIST, KelasId, TAHUN_AJARAN } from '@/types'
import { Users, CalendarCheck, BarChart2, BookOpenCheck, ArrowRight, ShieldCheck, ExternalLink, RefreshCw } from 'lucide-react'
import Link from 'next/link'

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
  const [totalSiswa, setTotalSiswa] = useState<number>(0)
  const [kehadiranHariIni, setKehadiranHariIni] = useState<{ total: number; hadir: number }>({ total: 0, hadir: 0 })
  const [totalJurnal, setTotalJurnal] = useState<number>(0)
  const [isInitializing, setIsInitializing] = useState(false)
  const [initMessage, setInitMessage] = useState('')
  const [customSheetId, setCustomSheetId] = useState('')
  const [activeSheetUrl, setActiveSheetUrl] = useState<string | null>(null)

  useEffect(() => {
    // 1. Listen data siswa
    const qSiswa = collection(db, 'siswa')
    const unsubSiswa = onSnapshot(qSiswa, (snap) => {
      setTotalSiswa(snap.size)
    }, (err) => console.error('Error snapshot siswa:', err))

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
    }, (err) => console.error('Error snapshot kehadiran:', err))

    // 3. Listen jurnal
    const qJurnal = collection(db, 'jurnal')
    const unsubJurnal = onSnapshot(qJurnal, (snap) => {
      setTotalJurnal(snap.size)
    }, (err) => console.error('Error snapshot jurnal:', err))

    return () => {
      unsubSiswa()
      unsubKehadiran()
      unsubJurnal()
    }
  }, [])

  // Hubungkan atau buat Google Sheet baru
  const handleSetupGoogleSheet = async (forceCreate = false) => {
    setIsInitializing(true)
    setInitMessage('Sedang memproses koneksi Google Spreadsheet...')
    try {
      const res = await fetch('/api/setup-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherEmail: user?.email,
          existingSpreadsheetId: customSheetId ? customSheetId.trim() : undefined,
          forceCreate,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setActiveSheetUrl(data.url)
        setInitMessage(`Spreadsheet terhubung! Akses telah dibagikan ke: ${user?.email || 'email login'}`)
      } else {
        setInitMessage(`Gagal: ${data.error || 'Terjadi kesalahan'}`)
      }
    } catch (err: any) {
      setInitMessage(`Error: ${err.message}`)
    } finally {
      setIsInitializing(false)
    }
  }

  // Seed sample siswa dummy langsung dari browser user yang sudah login!
  const handleSeedSiswa = async () => {
    if (!user) {
      setInitMessage('Silakan login terlebih dahulu untuk menambah data.')
      return
    }

    setIsInitializing(true)
    setInitMessage('Sedang membuat 156 siswa dengan akun guru Anda...')

    try {
      const batch = writeBatch(db)
      const siswaRef = collection(db, 'siswa')

      const pembagian: Record<KelasId, number> = {
        '7A': 31,
        '7B': 31,
        '8A': 31,
        '8B': 31,
        '9A': 32,
      }

      let nisCounter = 26001

      KELAS_LIST.forEach((kelas) => {
        const count = pembagian[kelas]
        for (let i = 1; i <= count; i++) {
          const docRef = doc(siswaRef)
          const depan = NAMA_DEPAN[Math.floor(Math.random() * NAMA_DEPAN.length)]
          const belakang = NAMA_BELAKANG[Math.floor(Math.random() * NAMA_BELAKANG.length)]
          const nama = `${depan} ${belakang}`

          batch.set(docRef, {
            id: docRef.id,
            nis: nisCounter.toString(),
            nama: nama,
            kelas: kelas,
            createdAt: new Date().toISOString(),
          })

          nisCounter++
        }
      })

      await batch.commit()
      setInitMessage('Berhasil membuat 156 siswa di 5 kelas (7A, 7B, 8A, 8B, 9A)!')
    } catch (error: any) {
      console.error('Error seeding siswa:', error)
      setInitMessage(`Gagal: ${error.message}`)
    } finally {
      setIsInitializing(false)
    }
  }

  const persentaseKehadiran = kehadiranHariIni.total > 0
    ? Math.round((kehadiranHariIni.hadir / kehadiranHariIni.total) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#1E3A5F] to-[#0D9488] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Selamat Datang di Portal Matematika SMP</h1>
          <p className="text-white/80 text-sm mt-1">
            Tahun Ajaran {TAHUN_AJARAN} • Kelola data siswa asli, kehadiran, nilai, jurnal, dan buku modul.
          </p>
        </div>
        <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20 text-xs font-medium">
          5 Kelas Aktif (7A, 7B, 8A, 8B, 9A)
        </div>
      </div>

      {/* Panel Pengaturan Spreadsheet & Data Awal */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
            <ShieldCheck className="w-4 h-4 text-teal-600" /> Pengaturan Database & Google Spreadsheet
          </div>
          {activeSheetUrl && (
            <a
              href={activeSheetUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200"
            >
              Buka Google Spreadsheet <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Kolom 1: Otomatisasi Buat Baru */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="font-semibold text-slate-700">1. Buat Spreadsheet Otomatis</div>
            <p className="text-slate-500 leading-relaxed">
              Sistem akan membuat Spreadsheet baru dengan sheet Siswa, Kehadiran, & Nilai, serta membagikan akses edit langsung ke email Google Anda ({user?.email || 'email login'}).
            </p>
            <button
              onClick={() => handleSetupGoogleSheet(false)}
              disabled={isInitializing}
              className="bg-[#1E3A5F] hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-lg transition"
            >
              Hubungkan / Buat Spreadsheet Baru
            </button>
          </div>

          {/* Kolom 2: Sambung Spreadsheet yang Ada */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="font-semibold text-slate-700">2. Hubungkan Spreadsheet yang Sudah Ada</div>
            <p className="text-slate-500">
              Masukkan ID Spreadsheet Google Anda jika ingin menggunakan file yang sudah ada:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ID Spreadsheet (dari URL)"
                value={customSheetId}
                onChange={(e) => setCustomSheetId(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs font-mono"
              />
              <button
                onClick={() => handleSetupGoogleSheet(false)}
                disabled={isInitializing || !customSheetId.trim()}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-3 py-1.5 rounded-lg transition"
              >
                Sambungkan
              </button>
            </div>
          </div>
        </div>

        {initMessage && (
          <div className="text-xs bg-slate-100 p-2.5 rounded border border-slate-200 font-mono text-slate-700">
            {initMessage}
          </div>
        )}

        {totalSiswa === 0 && (
          <div className="pt-2 flex items-center justify-between border-t text-xs">
            <span className="text-slate-500">Database siswa masih kosong:</span>
            <div className="flex gap-2">
              <Link
                href="/dashboard/siswa"
                className="text-[#1E3A5F] font-semibold hover:underline"
              >
                + Input Siswa Asli / Import CSV
              </Link>
              <span className="text-slate-300">|</span>
              <button
                onClick={handleSeedSiswa}
                disabled={isInitializing}
                className="text-amber-700 font-semibold hover:underline"
              >
                Generate Data Siswa Dummy (156 Siswa)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Statistik Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Siswa */}
        <Link
          href="/dashboard/siswa"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-400 transition"
        >
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Siswa</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalSiswa}</h3>
            <p className="text-xs text-blue-600 font-medium mt-1">Kelola Siswa &rarr;</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </Link>

        {/* Card 2: Kehadiran Hari Ini */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Kehadiran Hari Ini</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{persentaseKehadiran}%</h3>
            <p className="text-xs text-slate-400 mt-1">{kehadiranHariIni.hadir} dari {kehadiranHariIni.total} diabsen</p>
          </div>
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Jurnal Catatan */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Jurnal Pengajaran</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalJurnal}</h3>
            <p className="text-xs text-slate-400 mt-1">Total Catatan Kelas</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <BookOpenCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: KKM Standard */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Standar KKM</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">70</h3>
            <p className="text-xs text-emerald-600 font-medium mt-1">Target Ketuntasan</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <BarChart2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Akses Cepat Menu */}
      <h2 className="text-lg font-bold text-slate-800 pt-2">Menu Utama Pengajaran</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Link
          href="/dashboard/kehadiran"
          className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-[#0D9488] hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center mb-3">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-slate-800 group-hover:text-[#0D9488] transition-colors">
              Presensi & Kehadiran Siswa
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Catat kehadiran harian, sinkron realtime ke Spreadsheet, dan cetak rekap kehadiran per kelas.
            </p>
          </div>
          <div className="flex items-center text-xs font-semibold text-[#0D9488] mt-4">
            Buka Presensi <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/dashboard/nilai"
          className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-[#1E3A5F] hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 bg-blue-50 text-[#1E3A5F] rounded-lg flex items-center justify-center mb-3">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-slate-800 group-hover:text-[#1E3A5F] transition-colors">
              Daftar Nilai Siswa
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Input UH, UTS, UAS, otomatis hitung rata-rata dan indikator ketuntasan KKM 70.
            </p>
          </div>
          <div className="flex items-center text-xs font-semibold text-[#1E3A5F] mt-4">
            Kelola Nilai <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/dashboard/jurnal"
          className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-purple-600 hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-3">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-slate-800 group-hover:text-purple-600 transition-colors">
              Jurnal Refleksi Guru
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Catatan materi ajar harian, kendala kelas, serta tindak lanjut proses pembelajaran siswa.
            </p>
          </div>
          <div className="flex items-center text-xs font-semibold text-purple-600 mt-4">
            Buka Jurnal <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  )
}
