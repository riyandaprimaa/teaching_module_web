import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { KKM, type StatusKehadiran } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format tanggal ke string Indonesia
export function formatTanggal(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Format tanggal pendek: "03 Nov 2026"
export function formatTanggalPendek(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Format bulan: "November 2026"
export function formatBulan(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

// Tanggal ke string YYYY-MM-DD
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Warna badge status kehadiran
export function getStatusColor(status: StatusKehadiran): string {
  const colors: Record<StatusKehadiran, string> = {
    hadir: 'bg-green-100 text-green-800 border-green-200',
    izin: 'bg-blue-100 text-blue-800 border-blue-200',
    sakit: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    alfa: 'bg-red-100 text-red-800 border-red-200',
  }
  return colors[status]
}

export function getStatusLabel(status: StatusKehadiran): string {
  const labels: Record<StatusKehadiran, string> = {
    hadir: 'Hadir',
    izin: 'Izin',
    sakit: 'Sakit',
    alfa: 'Alfa',
  }
  return labels[status]
}

// Warna nilai berdasarkan KKM
export function getNilaiColor(nilai: number): string {
  if (nilai >= KKM) return 'text-green-600 font-semibold'
  return 'text-red-600 font-semibold'
}

export function getNilaiBadge(nilai: number): string {
  if (nilai >= 90) return 'bg-green-100 text-green-800'
  if (nilai >= KKM) return 'bg-blue-100 text-blue-800'
  if (nilai >= 60) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

// Hitung rata-rata
export function hitungRataRata(nilai: number[]): number {
  if (nilai.length === 0) return 0
  return Math.round(nilai.reduce((a, b) => a + b, 0) / nilai.length)
}

// Get nama bulan dalam Bahasa Indonesia
export function getNamaBulan(bulan: number): string {
  const bulanList = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  return bulanList[bulan - 1] || ''
}

