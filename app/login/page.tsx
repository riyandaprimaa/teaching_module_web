'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { BookOpen, Loader2, Sun, Moon } from 'lucide-react'
import { TAHUN_AJARAN } from '@/types'

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Tombol toggle tema — ikut tersedia saat loading & setelahnya
  const themeToggle = (
    <button
      onClick={toggleTheme}
      title={theme === 'light' ? 'Beralih ke Mode Gelap' : 'Beralih ke Mode Terang'}
      className="fixed top-4 right-4 z-50 p-2 rounded-xl text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 dark:hover:bg-pink-500/20 border border-pink-200/70 dark:border-pink-500/20 transition-all shadow-xs"
    >
      {theme === 'light' ? (
        <Moon className="h-4 w-4 text-pink-600" />
      ) : (
        <Sun className="h-4 w-4 text-amber-300" />
      )}
    </button>
  )

  if (loading) {
    return (
      <>
        {themeToggle}
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#18181b]">
          <Loader2 className="h-8 w-8 animate-spin text-pink-400 dark:text-pink-500" />
        </div>
      </>
    )
  }

  return (
    <>
      {themeToggle}
      <div className="min-h-screen bg-white dark:bg-[#18181b] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#27272a] rounded-2xl shadow-2xl p-8 w-full max-w-md text-center border-2 border-pink-300 dark:border-[1px] dark:border-slate-700">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-pink-100 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 rounded-2xl p-4">
            <BookOpen className="h-10 w-10 text-pink-600 dark:text-pink-300" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          Jurnal Guru Premium
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
          Tahun Ajaran {TAHUN_AJARAN}
        </p>

        {/* Divider */}
        <div className="border-t-[1.5px] border-slate-300 dark:border-t-[1px] dark:border-slate-700 mb-8" />

        <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
          Masuk menggunakan akun Google Anda untuk mengakses dashboard
        </p>

        {/* Login Button */}
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 btn-primary rounded-xl py-3 px-4 font-bold shadow-sm"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Masuk dengan Google
        </button>

        <p className="text-slate-400 dark:text-slate-500 text-xs mt-6">
          Hanya akun yang berwenang yang dapat mengakses portal ini
        </p>
        </div>
      </div>
    </>
  )
}
