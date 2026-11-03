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
    label: 'Data Siswa',
    icon: Users,
  },
  {
    href: '/dashboard/kehadiran',
    label: 'Kehadiran',
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
  { href: '/dashboard/buku/7', label: 'Kelas 7', color: 'bg-blue-500' },
  { href: '/dashboard/buku/8', label: 'Kelas 8', color: 'bg-purple-500' },
  { href: '/dashboard/buku/9', label: 'Kelas 9', color: 'bg-amber-500' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [bukuOpen, setBukuOpen] = useState(
    pathname.startsWith('/dashboard/buku')
  )

  return (
    <aside className="w-64 min-h-screen bg-[#1E3A5F] text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-[#0D9488] rounded-lg p-2">
            <BookMarked className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Portal Matematika</p>
            <p className="text-white/50 text-xs">SMP • T.A. 2026/2027</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {/* Buku Materi (collapsible) */}
        <div>
          <button
            onClick={() => setBukuOpen(!bukuOpen)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/dashboard/buku')
                ? 'bg-white/15 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            )}
          >
            <BookMarked className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Buku Materi</span>
            {bukuOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>

          {bukuOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3">
              {bukuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-medium transition-colors',
                    pathname.startsWith(item.href)
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full shrink-0', item.color)} />
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
    </aside>
  )
}
