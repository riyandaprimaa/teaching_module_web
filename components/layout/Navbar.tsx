'use client'

import { useAuth } from '@/contexts/AuthContext'
import { LogOut, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function Navbar() {
  const { user, signOut } = useAuth()
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
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-3">
        {/* User info */}
        <div className="flex items-center gap-2">
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="h-7 w-7 rounded-full border border-slate-200"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center">
              <User className="h-4 w-4 text-slate-500" />
            </div>
          )}
          <span className="text-sm text-slate-700 font-medium hidden sm:block">
            {user?.displayName || user?.email}
          </span>
        </div>

        {/* Logout button */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:block">Keluar</span>
        </button>
      </div>
    </header>
  )
}

