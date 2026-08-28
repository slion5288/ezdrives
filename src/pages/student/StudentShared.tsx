// ============================================================================
// EZDRIVES — student shared UI primitives (student-owned local components)
// Avatar (initials on student avatarColor data), StatusBadge (tone chips),
// ModalFrame (scrim/dialog with focus trap + Escape + scroll lock), ConfirmModal
// built on ModalFrame, and EmptyState. All strings passed in come from useT()
// at the call site (only aria labels use keys directly).
// ============================================================================

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useT } from '../../i18n'
import { Badge } from '../../components/shared/Badge'
import { Button } from '../../components/shared/Button'
import { Modal as SharedModal } from '../../components/shared/Modal'

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

/* --- StatusBadge (delegates to the shared Badge) --- */
export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral'

interface StatusBadgeProps {
  tone: BadgeTone
  label: string
}

export function StatusBadge({ tone, label }: StatusBadgeProps): JSX.Element {
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  )
}

/* --- ModalFrame (delegates to the shared Modal) --- */

interface ModalFrameProps {
  open: boolean
  title: string
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

export function ModalFrame({ open, title, onClose, footer, children }: ModalFrameProps): JSX.Element | null {
  return (
    <SharedModal open={open} title={title} onClose={onClose} footer={footer}>
      {children}
    </SharedModal>
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
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
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
