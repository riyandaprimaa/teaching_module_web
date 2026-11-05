'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { LogOut, User, Sun, Moon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function Navbar() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { toast } = useToast()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({ title: 'Berhasil keluar', description: 'Sampai jumpa!' })
    } catch {
      toast({ title: 'Gagal keluar', variant: 'destructive' })
    }
  }

  return (
    <header className="h-16 bg-white dark:bg-[#27272a] border-b-[1.5px] border-slate-300 dark:border-b-[1px] dark:border-slate-700 flex items-center justify-between px-6 shrink-0 shadow-sm transition-colors duration-200">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 dark:text-pink-300 border border-pink-200/60 dark:bg-pink-500/10 dark:border-pink-500/20">
          Modul Belajar & Administrasi Guru
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'Beralih ke Mode Gelap' : 'Beralih ke Mode Terang'}
          className="p-2 rounded-xl text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 dark:hover:bg-pink-500/20 border border-pink-200/70 dark:border-pink-500/20 transition-all shadow-xs"
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4 text-pink-600" />
          ) : (
            <Sun className="h-4 w-4 text-amber-300" />
          )}
        </button>

        {/* User profile */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-pink-50/60 dark:bg-pink-500/10 border border-pink-100 dark:border-pink-500/20">
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="h-7 w-7 rounded-full border border-pink-300 dark:border-pink-700 object-cover"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-pink-200 dark:bg-pink-800 flex items-center justify-center">
              <User className="h-4 w-4 text-pink-700 dark:text-pink-200" />
            </div>
          )}
          <span className="text-xs font-medium text-slate-900 dark:text-white hidden sm:block max-w-[150px] truncate">
            {user?.displayName || user?.email}
          </span>
        </div>

        {/* Logout button */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:block">Keluar</span>
        </button>
      </div>
    </header>
  )
}
