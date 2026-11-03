'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Siswa, Kehadiran, Nilai, Jurnal, KELAS_LIST, TAHUN_AJARAN } from '@/types'
import { Users, CalendarCheck, BarChart2, BookOpenCheck, ArrowRight, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function DashboardOverviewPage() {
  const [totalSiswa, setTotalSiswa] = useState<number>(0)
  const [kehadiranHariIni, setKehadiranHariIni] = useState<{ total: number; hadir: number }>({ total: 0, hadir: 0 })
  const [totalJurnal, setTotalJurnal] = useState<number>(0)
  const [isInitializing, setIsInitializing] = useState(false)
  const [initMessage, setInitMessage] = useState('')

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

  // Inisialisasi Google Sheet jika belum ada
  const handleSetupGoogleSheet = async () => {
    setIsInitializing(true)
    setInitMessage('Sedang menyiapkan Google Spreadsheet otomatis...')
    try {
      const res = await fetch('/api/setup-sheet', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setInitMessage(`Spreadsheet berhasil dibuat! ID: ${data.spreadsheetId}`)
      } else {
        setInitMessage(`Gagal: ${data.error || 'Terjadi kesalahan'}`)
      }
    } catch (err: any) {
      setInitMessage(`Error: ${err.message}`)
    } finally {
      setIsInitializing(false)
    }
  }

  // Seed sample siswa jika database masih 0
  const handleSeedSiswa = async () => {
    setIsInitializing(true)
    setInitMessage('Sedang menambahkan data awal siswa (156 siswa)...')
    try {
      const res = await fetch('/api/seed-siswa', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setInitMessage(data.message)
      } else {
        setInitMessage(`Gagal: ${data.error}`)
      }
    } catch (err: any) {
      setInitMessage(`Error: ${err.message}`)
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
            Tahun Ajaran {TAHUN_AJARAN} • Kelola kehadiran, nilai, jurnal, dan modul belajar secara terpusat.
          </p>
        </div>
        <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20 text-xs font-medium">
          5 Kelas Aktif (7A, 7B, 8A, 8B, 9A)
        </div>
      </div>

      {/* Quick Setup Actions jika data kosong */}
      {totalSiswa === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-900">
          <div className="flex items-center gap-2 font-semibold text-base mb-1">
            <ShieldCheck className="w-5 h-5 text-amber-600" /> Setup Awal Sistem
          </div>
          <p className="text-xs text-amber-700 mb-4">
            Database Anda masih kosong atau belum memiliki spreadsheet terhubung. Klik tombol di bawah untuk inisialisasi otomatis.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSeedSiswa}
              disabled={isInitializing}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
              Generate Data Awal Siswa (156 Siswa)
            </button>
            <button
              onClick={handleSetupGoogleSheet}
              disabled={isInitializing}
              className="bg-[#1E3A5F] hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
              Buat & Hubungkan Google Spreadsheet Baru
            </button>
          </div>
          {initMessage && (
            <div className="mt-3 text-xs bg-white/70 p-2.5 rounded border border-amber-200 font-mono">
              {initMessage}
            </div>
          )}
        </div>
      )}

      {/* Statistik Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Siswa */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Siswa</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalSiswa}</h3>
            <p className="text-xs text-slate-400 mt-1">Terbagi di 5 Kelas</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

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

