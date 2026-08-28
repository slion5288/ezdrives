// ============================================================================
// EZDRIVES — ToastProvider / useToast (shell-owned)
// Source of truth: docs/DESIGN.md §4.7. Stacked toast notifications with
// success/error/info tones; auto-dismiss (~3.5s, errors 6s). Mounted once in
// App.tsx so every page can call useToast().
// ============================================================================

import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useT } from '../../i18n'
import './shared.css'

export type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  tone: ToastTone
  title: string
  body?: string
}

export interface ToastInput {
  tone: ToastTone
  title: string
  body?: string
}

export interface ToastApi {
  /** Show a toast with an explicit tone. */
  show: (tone: ToastTone, title: string, body?: string) => void
  success: (title: string, body?: string) => void
  error: (title: string, body?: string) => void
  info: (title: string, body?: string) => void
  /** Legacy-compatible push({tone,title,body}) — used by instructor pages. */
  push: (toast: ToastInput) => void
  /** Legacy-compatible showToast(tone, message) — used by student pages. */
  showToast: (tone: ToastTone, message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const DURATIONS: Record<ToastTone, number> = { success: 3500, info: 3500, error: 6000 }
const MAX_VISIBLE = 5

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const t = useT()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (tone: ToastTone, title: string, body?: string) => {
      const id = nextId.current++
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, tone, title, body }])
      window.setTimeout(() => dismiss(id), DURATIONS[tone])
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, body) => show('success', title, body),
      error: (title, body) => show('error', title, body),
      info: (title, body) => show('info', title, body),
      push: ({ tone, title, body }) => show(tone, title, body),
      showToast: (tone, message) => show(tone, message),
    }),
    [show],
  )

  const closeLabel = t('common.close')

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="region" aria-label={t('nav.notifications')} aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            <span className="toast__icon" aria-hidden="true">
              {toast.tone === 'success' ? (
                <CheckCircle2 size={16} />
              ) : toast.tone === 'error' ? (
                <XCircle size={16} />
              ) : (
                <Info size={16} />
              )}
            </span>
            <div className="toast__content">
              <p className="toast__title">{toast.title}</p>
              {toast.body != null ? <p className="toast__body">{toast.body}</p> : null}
            </div>
            <button type="button" className="toast__close" onClick={() => dismiss(toast.id)} aria-label={closeLabel}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/** Access the toast API — must be used inside <ToastProvider>. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
