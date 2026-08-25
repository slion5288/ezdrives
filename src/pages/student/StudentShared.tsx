// ============================================================================
// EZDRIVES — student shared UI primitives (student-owned local components)
// Avatar (initials on student avatarColor data), StatusBadge (tone chips),
// ModalFrame (scrim/dialog with focus trap + Escape + scroll lock), ConfirmModal
// built on ModalFrame, and EmptyState. All strings passed in come from useT()
// at the call site (only aria labels use keys directly).
// ============================================================================

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { X } from 'lucide-react'
import { useT } from '../../i18n'

/* --- Avatar --- */
interface AvatarProps {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg'
}

export function Avatar({ name, color, size = 'md' }: AvatarProps): JSX.Element {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span className={`student-avatar student-avatar-${size}`} style={{ backgroundColor: color }} aria-hidden="true">
      {initials}
    </span>
  )
}

/* --- StatusBadge --- */
export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral'

interface StatusBadgeProps {
  tone: BadgeTone
  label: string
}

export function StatusBadge({ tone, label }: StatusBadgeProps): JSX.Element {
  return (
    <span className={`student-badge student-badge-${tone}`}>
      <span className="student-badge-dot" />
      {label}
    </span>
  )
}

/* --- ModalFrame --- */
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface ModalFrameProps {
  open: boolean
  title: string
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

export function ModalFrame({ open, title, onClose, footer, children }: ModalFrameProps): JSX.Element | null {
  const t = useT()
  const dialogRef = useRef<HTMLDivElement>(null)

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
        onClose()
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
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return (
    <div className="student-modal-scrim" onClick={onClose}>
      <div
        ref={dialogRef}
        className="student-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="student-modal-header">
          <h3 className="student-modal-title">{title}</h3>
          <button type="button" className="student-icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>
        <div className="student-modal-body">{children}</div>
        {footer && <div className="student-modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

/* --- ConfirmModal --- */
interface ConfirmModalProps {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  tone?: 'danger' | 'primary'
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  onClose,
}: ConfirmModalProps): JSX.Element | null {
  const t = useT()
  return (
    <ModalFrame
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="student-btn student-btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={`student-btn ${tone === 'danger' ? 'student-btn-danger' : 'student-btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="student-muted-note">{body}</p>
    </ModalFrame>
  )
}

/* --- EmptyState --- */
interface EmptyStateProps {
  icon: LucideIcon
  title: string
  body?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, body, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="student-empty">
      <span className="student-empty-icon">
        <Icon size={24} />
      </span>
      <p className="student-empty-title">{title}</p>
      {body && <p className="student-empty-body">{body}</p>}
      {action}
    </div>
  )
}
