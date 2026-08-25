// ============================================================================
// EZDRIVES — student toast system (student-owned local component)
// Small context-based toast stack: success / error / info tones, auto-dismiss
// (4s / 6s), manual close, bottom-right (bottom-center on mobile). All visuals
// come from student.css tokens. Text is passed in by callers via useT().
// ============================================================================

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useT } from '../../i18n'

export type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

interface ToastContextValue {
  showToast: (tone: ToastTone, message: string) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => undefined })

export function useToast(): ToastContextValue {
  return useContext(ToastContext)
}

let nextToastId = 1

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const t = useT()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<number, number>>(new Map())

  const dismiss = useCallback((id: number): void => {
    const timer = timers.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (tone: ToastTone, message: string): void => {
      const id = nextToastId++
      setToasts((prev) => [...prev.slice(-2), { id, tone, message }])
      const timer = window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4000)
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  const toneIcon = (tone: ToastTone): JSX.Element => {
    if (tone === 'success') return <CheckCircle2 size={16} />
    if (tone === 'error') return <XCircle size={16} />
    return <Info size={16} />
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="student-toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`student-toast student-toast-${toast.tone}`}>
            <span className="student-toast-icon">{toneIcon(toast.tone)}</span>
            <p className="student-toast-msg">{toast.message}</p>
            <button
              type="button"
              className="student-toast-close"
              onClick={() => dismiss(toast.id)}
              aria-label={t('common.close')}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
