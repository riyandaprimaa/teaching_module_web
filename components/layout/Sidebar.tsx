'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarCheck,
  BarChart2,
  BookOpenCheck,
  BookMarked,
  Users,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const navItems = [
  {
    href: '/dashboard',
    label: 'Beranda',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: '/dashboard/siswa',
    label: 'Data Siswa & Kelas',
    icon: Users,
  },
  {
    href: '/dashboard/kehadiran',
    label: 'Kehadiran Siswa',
    icon: CalendarCheck,
  },
  {
    href: '/dashboard/nilai',
    label: 'Nilai Siswa',
    icon: BarChart2,
  },
  {
    href: '/dashboard/jurnal',
    label: 'Jurnal Guru',
    icon: BookOpenCheck,
  },
]

const bukuItems = [
  { href: '/dashboard/buku/7', label: 'Kelas 7', color: 'bg-pink-300 dark:bg-pink-300' },
  { href: '/dashboard/buku/8', label: 'Kelas 8', color: 'bg-pink-400 dark:bg-pink-400' },
  { href: '/dashboard/buku/9', label: 'Kelas 9', color: 'bg-fuchsia-400 dark:bg-fuchsia-400' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [bukuOpen, setBukuOpen] = useState(
    pathname.startsWith('/dashboard/buku')
  )

  return (
    <aside className="w-64 min-h-screen bg-white dark:bg-[#18181b] border-r border-slate-300 dark:border-slate-700 flex flex-col">
      {/* Logo Brand */}
      <div className="p-5 border-b-[1.5px] border-slate-300 dark:border-b-[1px] dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-pink-100 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 rounded-xl p-2.5 shadow-inner">
            <Sparkles className="h-5 w-5 text-pink-500 dark:text-pink-300" />
          </div>
          <div>
            <p className="font-extrabold text-sm tracking-wide text-slate-900 dark:text-white">Jurnal Guru Premium</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">SMP • T.A. 2026/2027</p>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                isActive
                  ? 'bg-pink-300 text-pink-950 dark:bg-pink-500 dark:text-white'
                  : 'text-slate-600 hover:bg-pink-100 hover:text-pink-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  isActive ? 'text-pink-500 dark:text-white' : 'text-pink-400 dark:text-pink-300'
                )}
              />
              {item.label}
            </Link>
          )
        })}

        {/* Collapsible Buku Materi */}
        <div className="pt-2">
          <button
            onClick={() => setBukuOpen(!bukuOpen)}
            className={cn(
              'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
              pathname.startsWith('/dashboard/buku')
                ? 'bg-pink-300 text-pink-950 dark:bg-pink-500 dark:text-white'
                : 'text-slate-600 hover:bg-pink-100 hover:text-pink-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            )}
          >
            <BookMarked className="h-4 w-4 shrink-0 text-pink-500 dark:text-pink-300" />
            <span className="flex-1 text-left">Buku Modul Belajar</span>
            {bukuOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>

          {bukuOpen && (
            <div className="ml-5 mt-1.5 space-y-1 border-l-2 border-pink-300 dark:border-pink-400/30 pl-3">
              {bukuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                    pathname.startsWith(item.href)
                      ? 'bg-pink-100 text-pink-900 font-bold dark:bg-pink-400/30 dark:text-pink-100'
                      : 'text-slate-600 hover:bg-pink-100 hover:text-pink-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full shrink-0 shadow-xs', item.color)} />
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t-[1.5px] border-slate-300 dark:border-t-[1px] dark:border-slate-700 text-center">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          Tema Modul Belajar Pink Edition ✨
        </p>
      </div>
    </aside>
  )
}
