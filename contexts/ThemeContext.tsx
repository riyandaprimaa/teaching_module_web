'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { KelasId, DEFAULT_ACTIVE_KELAS } from '@/types'

type ThemeMode = 'light' | 'dark'

interface ThemeContextType {
  theme: ThemeMode
  toggleTheme: () => void
  spreadsheetId: string
  setSpreadsheetId: (id: string) => void
  activeKelasList: KelasId[]
  setActiveKelasList: (list: KelasId[]) => void
  toggleActiveKelas: (kelas: KelasId) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [spreadsheetId, setSpreadsheetIdState] = useState<string>('')
  const [activeKelasList, setActiveKelasListState] = useState<KelasId[]>(DEFAULT_ACTIVE_KELAS)

  // Inisialisasi dari localStorage saat mount
  useEffect(() => {
    const savedTheme = (localStorage.getItem('app_theme') as ThemeMode) || 'light'
    setTheme(savedTheme)
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    const savedSheetId = localStorage.getItem('app_spreadsheet_id') || ''
    setSpreadsheetIdState(savedSheetId)

    const savedKelas = localStorage.getItem('app_active_kelas')
    if (savedKelas) {
      try {
        const parsed = JSON.parse(savedKelas)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActiveKelasListState(parsed)
        }
      } catch (e) {
        console.error('Failed to parse saved active kelas', e)
      }
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    localStorage.setItem('app_theme', nextTheme)
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const setSpreadsheetId = (id: string) => {
    const cleanId = id.trim()
    setSpreadsheetIdState(cleanId)
    if (cleanId) {
      localStorage.setItem('app_spreadsheet_id', cleanId)
    } else {
      localStorage.removeItem('app_spreadsheet_id')
    }
  }

  const setActiveKelasList = (list: KelasId[]) => {
    setActiveKelasListState(list)
    localStorage.setItem('app_active_kelas', JSON.stringify(list))
  }

  const toggleActiveKelas = (kelas: KelasId) => {
    let nextList: KelasId[]
    if (activeKelasList.includes(kelas)) {
      if (activeKelasList.length === 1) return // minimal 1 kelas aktif
      nextList = activeKelasList.filter((k) => k !== kelas)
    } else {
      nextList = [...activeKelasList, kelas].sort()
    }
    setActiveKelasList(nextList)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        spreadsheetId,
        setSpreadsheetId,
        activeKelasList,
        setActiveKelasList,
        toggleActiveKelas,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme harus digunakan di dalam ThemeProvider')
  }
  return context
}

