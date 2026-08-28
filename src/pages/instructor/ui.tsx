// ============================================================================
// EZDRIVES — Instructor-local UI primitives (instructor-owned)
// Modal, ConfirmDialog, Toggle, Badge, StatCard, EmptyState, Avatar.
// Built from tokens only; every label comes from useT().
// ============================================================================

import type { ReactNode } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { useT } from '../../i18n'
import { Badge as SharedBadge } from '../../components/shared/Badge'
import { Modal as SharedModal } from '../../components/shared/Modal'

// --- Modal ----------------------------------------------------------------

export function Modal({
  title,
  onClose,
  children,
  footer,
  maxWidth,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  maxWidth?: number
}): JSX.Element {
  return (
    <SharedModal title={title} onClose={onClose} footer={footer} maxWidth={maxWidth}>
      {children}
    </SharedModal>
  )
}

// --- ConfirmDialog --------------------------------------------------------

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger = false,
  onConfirm,
  onClose,
}: {
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}): JSX.Element {
  const t = useT()
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ins-btn ins-btn--secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className={`ins-btn ${danger ? 'ins-btn--danger' : 'ins-btn--primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="ins-confirm-body">{body}</p>
      {danger ? <p className="ins-confirm-note">{t('common.confirm.cancelAction')}</p> : null}
    </Modal>
  )
}

// --- Toggle ---------------------------------------------------------------

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean
  onChange: () => void
  label?: string
  disabled?: boolean
}): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`ins-toggle${checked ? ' is-on' : ''}`}
      onClick={onChange}
    >
      <span className="ins-toggle-knob" />
    </button>
  )
}

// --- Badge (delegates to the shared Badge) ---

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'info'

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }): JSX.Element {
  return <SharedBadge tone={tone}>{children}</SharedBadge>
}

// --- StatCard -------------------------------------------------------------

export function StatCard({
  label,
  value,
  delta,
  hint,
}: {
  label: string
  value: string
  delta?: { text: string; up: boolean }
  hint?: string
}): JSX.Element {
  return (
    <div className="ins-stat-card">
      <div className="ins-stat-label">{label}</div>
      <div className="ins-stat-value">{value}</div>
      {delta || hint ? (
        <div className="ins-stat-delta">
          {delta ? (
            <span className={`ins-stat-delta-ic ${delta.up ? 'is-up' : 'is-down'}`}>
              {delta.up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            </span>
          ) : null}
          {delta ? <span className={`ins-stat-delta-txt ${delta.up ? 'is-up' : 'is-down'}`}>{delta.text}</span> : null}
          {hint ? <span className="ins-stat-delta-hint">{hint}</span> : null}
        </div>
      ) : null}
    </div>
  )
}

// --- EmptyState -----------------------------------------------------------

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode
  title: string
  body?: string
  action?: ReactNode
}): JSX.Element {
  return (
    <div className="ins-empty">
      <div className="ins-empty-icon">{icon}</div>
      <div className="ins-empty-title">{title}</div>
      {body ? <div className="ins-empty-body">{body}</div> : null}
      {action ? <div className="ins-empty-action">{action}</div> : null}
    </div>
  )
}

// --- Avatar ---------------------------------------------------------------

export function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }): JSX.Element {
  const initials = name
    .split(/\s+/)
    .map((part) => (part[0] ?? '').toUpperCase())
    .slice(0, 2)
    .join('')
  return (
    <span
      className="ins-avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36), backgroundColor: color }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}
