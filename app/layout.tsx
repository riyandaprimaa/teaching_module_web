import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Portal Matematika SMP — Modul Ajar',
  description: 'Platform pedoman guru matematika SMP T.A. 2026/2027',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen transition-colors duration-200`}>
        {/* Terapkan tema gelap sebelum paint pertama (anti-FOUC) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('app_theme');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
