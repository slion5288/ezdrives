// ============================================================================
// EZDRIVES — Modal (shell-owned)
// Source of truth: docs/DESIGN.md §4.6. Portal to document.body, overlay
// scrim, Escape/overlay close, body scroll lock, focus trap, focus restore.
// ============================================================================

import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../../i18n'
import './shared.css'

export interface ModalProps {
  open: boolean
  onClose: () => void
  /** Dialog heading (already translated by the caller). */
  title?: string
  children: ReactNode
  /** Right-aligned action row (e.g. Cancel + Confirm buttons). */
  footer?: ReactNode
  /** Dialog width in px (default 480). */
  width?: number
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ open, onClose, title, children, footer, width = 480 }: ModalProps): JSX.Element | null {
  const t = useT()
  const dialogRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusables.length === 0) {
        e.preventDefault()
        dialogRef.current.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    dialogRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
      restoreRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  const closeLabel = t('common.close')

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current()
      }}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title ?? closeLabel}
        tabIndex={-1}
        style={{ width }}
      >
        {title != null ? (
          <div className="modal__header">
            <h3 className="modal__title">{title}</h3>
            <button type="button" className="modal__close" onClick={() => onCloseRef.current()} aria-label={closeLabel}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="modal__close modal__close--bare"
            onClick={() => onCloseRef.current()}
            aria-label={closeLabel}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
        <div className="modal__body">{children}</div>
        {footer != null ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
