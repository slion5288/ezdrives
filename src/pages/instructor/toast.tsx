// ============================================================================
// EZDRIVES — Instructor-local toast system (instructor-owned)
// Lightweight toast provider + hook, rendered bottom-right, auto-dismiss.
// All labels come from useT().
// ============================================================================

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useT } from '../../i18n'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastInput {
  tone: ToastTone
  title: string
  body?: string
}

interface ToastItem extends ToastInput {
  id: number
}

interface ToastContextValue {
  push: (toast: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue>({ push: () => undefined })

const MAX_VISIBLE = 4

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const t = useT()
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const push = useCallback((toast: ToastInput): void => {
    const id = nextId.current++
    setItems((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, ...toast }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id))
    }, toast.tone === 'error' ? 6000 : 4000)
  }, [])

  const dismiss = useCallback((id: number): void => {
    setItems((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const value = useMemo<ToastContextValue>(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ins-toast-viewport" role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`ins-toast ins-toast--${item.tone}`}>
            <span className="ins-toast-icon">
              {item.tone === 'success' ? <CheckCircle2 size={16} /> : item.tone === 'error' ? <XCircle size={16} /> : <Info size={16} />}
            </span>
            <div className="ins-toast-body">
              <div className="ins-toast-title">{item.title}</div>
              {item.body ? <div className="ins-toast-sub">{item.body}</div> : null}
            </div>
            <button type="button" className="ins-toast-close" onClick={() => dismiss(item.id)} aria-label={t('common.close')}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): (toast: ToastInput) => void {
  return useContext(ToastContext).push
}
