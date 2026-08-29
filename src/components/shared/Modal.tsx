// ============================================================================
// EZDRIVES — Modal (shell-owned)
// Source of truth: docs/DESIGN.md §4.6. Scrim + dialog with Escape-to-close,
// scroll lock, and full focus trap (Tab cycling). All strings arrive
// pre-translated via useT() by the caller.
// ============================================================================

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useT } from '../../i18n'
import './shared.css'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface ModalProps {
  /** Dialog title (translated by the caller). */
  title: string
  /** Close handler — fired by overlay click, Escape, or the close button. */
  onClose: () => void
  children: ReactNode
  /** Optional footer row (e.g. action buttons). */
  footer?: ReactNode
  /** Optional max-width override for the dialog panel. */
  maxWidth?: number
  /** Render nothing when false (default true). */
  open?: boolean
  /** 'dialog' = centered modal (default); 'drawer' = bottom sheet on mobile,
   *  centered panel on desktop. */
  variant?: 'dialog' | 'drawer'
  /** Max panel height for the drawer body (defaults to 88vh on mobile). */
  maxHeight?: number | string
}

export function Modal({ title, onClose, children, footer, maxWidth, open = true, variant = 'dialog', maxHeight }: ModalProps): JSX.Element | null {
  const t = useT()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return
    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute('disabled'),
    )
    ;(focusables[0] ?? dialog).focus()

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || focusables.length === 0) return
      const current = document.activeElement
      const index = focusables.indexOf(current as HTMLElement)
      if (e.shiftKey && (index <= 0 || index === -1)) {
        e.preventDefault()
        focusables[focusables.length - 1].focus()
      } else if (!e.shiftKey && (index === focusables.length - 1 || index === -1)) {
        e.preventDefault()
        focusables[0].focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [])

  const closeLabel = t('common.close')

  if (!open) return null

  return (
    <div className={`modal-overlay${variant === 'drawer' ? ' modal-overlay--drawer' : ''}`} onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className={`modal${variant === 'drawer' ? ' modal--drawer' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          ...(maxWidth ? { maxWidth } : undefined),
          ...(variant === 'drawer' && maxHeight ? { maxHeight } : undefined),
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h3 className="modal__title">{title}</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label={closeLabel}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer != null ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </div>
  )
}
