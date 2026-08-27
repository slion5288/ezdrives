// ============================================================================
// EZDRIVES — Instructor NotificationsPage (通知)
// Click any notification to open its detail view. Payment notifications
// (payment_pending — e.g. a student requesting to pay CASH) show 同意确认收款
// / 拒绝 actions right in the detail view, so the instructor can confirm the
// payment in one tap; the linked payment is updated and the student notified.
// ============================================================================

import { useState } from 'react'
import type { AppState, Notification } from '../../data/store'
import { confirmPayment, markAllRead, markNotificationRead, paymentMethodLabel, rejectPayment } from '../../data/store'
import { formatDateEn, formatDateZh, formatHM, fromServerISO } from '../../data/timeEngine'
import { useLocale, useT } from '../../i18n'
import {
  BadgeCheck,
  BellOff,
  BellRing,
  CalendarOff,
  CalendarX2,
  CheckCircle2,
  RefreshCcw,
  Sparkles,
  Wallet,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, EmptyState, Modal } from './ui'
import { useToast } from './toast'
import { formatMoney } from './helpers'

const TYPE_ICONS: Record<Notification['type'], LucideIcon> = {
  new_booking: Sparkles,
  booking_cancelled: CalendarX2,
  booking_rescheduled: RefreshCcw,
  day_closed: CalendarOff,
  booking_confirmed: CheckCircle2,
  reminder_2h: BellRing,
  payment_pending: Wallet,
  payment_confirmed: BadgeCheck,
  payment_rejected: XCircle,
}

export default function NotificationsPage({ state }: { state: AppState }): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const toast = useToast()
  const [detail, setDetail] = useState<Notification | null>(null)

  const notifications = state.notifications
    .filter((n) => n.role === 'instructor' && n.recipientId === 'instructor')
    .sort((a, b) => b.at.localeCompare(a.at))
  const unreadCount = notifications.filter((n) => !n.read).length

  const openDetail = (n: Notification): void => {
    setDetail(n)
    if (!n.read) markNotificationRead(n.id)
  }

  const linkedPayment = detail?.paymentId ? state.payments.find((p) => p.id === detail.paymentId) : undefined
  const isPendingPayment = detail?.type === 'payment_pending' && linkedPayment?.status === 'pending'

  const handleConfirm = (): void => {
    if (!linkedPayment) return
    void (async () => {
      const result = await confirmPayment(linkedPayment.id)
      toast({ tone: result.ok ? 'success' : 'error', title: result.ok ? t('instructor.payments.confirm') : t('common.toast.error') })
      if (result.ok) setDetail(null)
    })()
  }

  const handleReject = (): void => {
    if (!linkedPayment) return
    void (async () => {
      const result = await rejectPayment(linkedPayment.id)
      toast({ tone: result.ok ? 'success' : 'error', title: result.ok ? t('instructor.payments.reject') : t('common.toast.error') })
      if (result.ok) setDetail(null)
    })()
  }

  return (
    <div className="ins-notifs">
      <div className="ins-page-actions">
        <button
          type="button"
          className="ins-btn ins-btn--secondary"
          disabled={unreadCount === 0}
          onClick={() => markAllRead('instructor', 'instructor')}
        >
          {t('instructor.notifications.markAllRead')}
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="ins-panel">
          <EmptyState icon={<BellOff size={24} />} title={t('instructor.notifications.empty')} body={t('instructor.notifications.emptyBody')} />
        </div>
      ) : (
        <ul className="ins-notif-list">
          {notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] ?? BellRing
            const at = fromServerISO(n.at)
            const timeLabel = `${locale === 'zh' ? formatDateZh(at) : formatDateEn(at)} · ${formatHM(at)}`
            const payable = n.type === 'payment_pending'
            return (
              <li
                key={n.id}
                className={`ins-notif-item${n.read ? '' : ' is-unread'}${payable ? ' is-payable' : ''}`}
              >
                <button
                  type="button"
                  className="ins-notif-card"
                  onClick={() => openDetail(n)}
                  aria-label={locale === 'zh' ? n.title.zh : n.title.en}
                >
                <span className="ins-notif-icon">
                  <Icon size={18} />
                </span>
                <div className="ins-notif-main">
                  <div className="ins-notif-title">
                    {locale === 'zh' ? n.title.zh : n.title.en}
                    {!n.read ? <span className="ins-notif-dot" aria-hidden="true" /> : null}
                  </div>
                  <div className="ins-notif-body">{locale === 'zh' ? n.body.zh : n.body.en}</div>
                  <div className="ins-notif-meta tabular-nums">{timeLabel}</div>
                </div>
                <div className="ins-notif-side">
                  {payable ? (
                    <Badge tone="warning">{t('payment.pending')}</Badge>
                  ) : n.read ? (
                    <Badge tone="neutral">{t('nav.synced')}</Badge>
                  ) : (
                    <Badge tone="success">{t('student.notifications.unread')}</Badge>
                  )}
                </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* Detail view */}
      {detail ? (
        <Modal
          title={t('instructor.notifications.details')}
          onClose={() => setDetail(null)}
          footer={
            isPendingPayment ? (
              <>
                <button type="button" className="ins-btn ins-btn--danger-ghost" onClick={handleReject}>
                  {t('instructor.payments.reject')}
                </button>
                <button type="button" className="ins-btn ins-btn--primary" onClick={handleConfirm}>
                  {t('instructor.notifications.confirm')}
                </button>
              </>
            ) : (
              <button type="button" className="ins-btn ins-btn--secondary" onClick={() => setDetail(null)}>
                {t('common.close')}
              </button>
            )
          }
        >
          <div className="ins-notif-detail">
            <div className="ins-notif-detail-head">
              <span className="ins-notif-icon">
                {(() => {
                  const Icon = TYPE_ICONS[detail.type] ?? BellRing
                  return <Icon size={20} />
                })()}
              </span>
              <div>
                <p className="ins-notif-detail-title">{locale === 'zh' ? detail.title.zh : detail.title.en}</p>
                <p className="ins-notif-detail-meta tabular-nums">
                  {locale === 'zh' ? formatDateZh(fromServerISO(detail.at)) : formatDateEn(fromServerISO(detail.at))} ·{' '}
                  {formatHM(fromServerISO(detail.at))}
                </p>
              </div>
            </div>
            <p className="ins-notif-detail-body">{locale === 'zh' ? detail.body.zh : detail.body.en}</p>

            {isPendingPayment && linkedPayment ? (
              <div className="ins-pay-card">
                <div className="ins-pay-card-row">
                  <span>{t('instructor.schedule.student')}</span>
                  <span>{state.students.find((s) => s.id === linkedPayment.studentId)?.name ?? linkedPayment.studentId}</span>
                </div>
                <div className="ins-pay-card-row">
                  <span>{t('instructor.schedule.course')}</span>
                  <span>
                    {state.courses.find((c) => c.id === linkedPayment.courseId)?.name[locale] ?? linkedPayment.courseId}
                  </span>
                </div>
                <div className="ins-pay-card-row">
                  <span>{t('instructor.payments.method')}</span>
                  <span>{paymentMethodLabel(linkedPayment.method, locale)}</span>
                </div>
                <div className="ins-pay-card-row">
                  <span>{t('instructor.payments.amount')}</span>
                  <span className="tabular-nums">{formatMoney(linkedPayment.amount)}</span>
                </div>
                <p className="ins-pay-card-hint">
                  {linkedPayment.method === 'cash'
                    ? t('instructor.notifications.cashHint')
                    : t('instructor.notifications.onlineHint')}
                </p>
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
