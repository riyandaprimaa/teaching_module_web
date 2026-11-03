'use client'

import { useToast } from '@/hooks/use-toast'
import { X } from 'lucide-react'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto p-4 rounded-xl shadow-lg border flex items-start justify-between gap-3 transition-all ${
            t.variant === 'destructive'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <div>
            {t.title && <div className="font-semibold text-sm">{t.title}</div>}
            {t.description && <div className="text-xs text-slate-500 mt-0.5">{t.description}</div>}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

