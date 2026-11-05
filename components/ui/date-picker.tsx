'use client'

import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
  /** Nilai tanggal dalam format 'YYYY-MM-DD' */
  value: string
  onChange: (value: string) => void
  /** Class tambahan untuk trigger (mis. w-full) */
  className?: string
  placeholder?: string
}

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
const HARI_LABEL = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISO(s: string): Date | null {
  const parts = s.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null
  const [y, m, d] = parts
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateID(s: string): string {
  const d = parseISO(s)
  if (!d) return 'Pilih tanggal'
  return d.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function DatePicker({ value, onChange, className = '', placeholder = 'Pilih tanggal' }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const base = parseISO(value) ?? new Date()
  const [view, setView] = useState({ year: base.getFullYear(), month: base.getMonth() })
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Buka → sinkronkan tampilan bulan ke nilai saat ini
  useEffect(() => {
    if (open) {
      const d = parseISO(value)
      setView({ year: d ? d.getFullYear() : new Date().getFullYear(), month: d ? d.getMonth() : new Date().getMonth() })
    }
  }, [open, value])

  // Tutup saat klik di luar / tekan Esc
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const todayISO = toISO(new Date())
  const firstDay = new Date(view.year, view.month, 1)
  const offset = (firstDay.getDay() + 6) % 7 // Senin = kolom pertama
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISO(new Date(view.year, view.month, i + 1))),
  ]

  const stepMonth = (delta: number) => {
    setView((v) => {
      const next = new Date(v.year, v.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  const pick = (iso: string) => {
    onChange(iso)
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center justify-between gap-2 border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 rounded-xl text-xs px-3 py-2 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-bold shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500 hover:border-pink-300 dark:hover:border-pink-700 transition-colors ${className}`}
      >
        <span className={value ? '' : 'text-slate-400 dark:text-slate-500 font-medium'}>
          {value ? formatDateID(value) : placeholder}
        </span>
        <Calendar className="w-4 h-4 text-pink-500 dark:text-pink-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 left-0 mt-1.5 w-64 bg-white dark:bg-[#27272a] border-[1.5px] border-slate-300 dark:border-[1px] dark:border-slate-700 rounded-xl shadow-xl p-3">
          {/* Navigasi bulan */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => stepMonth(-1)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-slate-900 dark:text-white">
              {NAMA_BULAN[view.month]} {view.year}
            </span>
            <button
              type="button"
              onClick={() => stepMonth(1)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Grid hari */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {HARI_LABEL.map((h) => (
              <div key={h} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 text-center py-0.5">
                {h}
              </div>
            ))}
            {cells.map((iso, i) =>
              iso === null ? (
                <div key={`empty-${i}`} />
              ) : (
                <button
                  key={iso}
                  type="button"
                  onClick={() => pick(iso)}
                  className={`h-8 rounded-lg text-xs font-semibold transition-colors ${
                    iso === value
                      ? 'bg-pink-500 text-white shadow-xs'
                      : iso === todayISO
                      ? 'border border-pink-400 text-pink-600 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-slate-700'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {Number(iso.slice(8))}
                </button>
              )
            )}
          </div>

          {/* Aksi cepat */}
          <div className="flex items-center justify-between pt-2 border-t-[1.5px] border-slate-300 dark:border-t-[1px] dark:border-slate-700">
            <button
              type="button"
              onClick={() => pick(todayISO)}
              className="text-[11px] font-bold text-pink-600 dark:text-pink-300 hover:opacity-70 transition-opacity"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
