// ============================================================================
// EZDRIVES — Instructor PaymentsPage (支付确认 / Payment Management)
// § payment overhaul:
//  · status filter (All / Pending / Submitted / Paid / Rejected) + method
//    filter (WeChat / Cash / e-Transfer)
//  · row actions: confirm receipt / approve cash / reject (with reason)
//  · detail modal: order no, student, course, amount, method, status,
//    submitted time, proof screenshot, student name/phone/note, reject reason
// Receive settings (QR / e-Transfer / WeChat ID) live in ReceiveSettings.
// ============================================================================

import { useMemo, useState } from 'react'
import {
  approveCashPayment,
  markPaymentReceived,
  paymentMethodLabel,
  rejectPayment,
  sendCashReminder,
  useAppState,
} from '../../data/store'
import type { Payment } from '../../data/store'
import { useLocale, useT } from '../../i18n'
import { Eye, Settings2, Wallet, X } from 'lucide-react'
import { PaymentMethodBrand } from '../../components/payment/PaymentBrandIcons'
import { Avatar, Badge, EmptyState } from './ui'
import { useToast } from '../../components/shared'
import { formatMoney } from './helpers'
import { formatDateEn, formatDateZh, fromServerISO } from '../../data/timeEngine'
import type { InstructorTab } from './helpers'
import { Button } from '../../components/shared/Button'

interface PaymentsPageProps {
  onNavigate?: (tab: InstructorTab) => void
}

type StatusFilter = 'all' | 'pending' | 'submitted' | 'paid' | 'rejected'
type MethodFilter = 'all' | 'wechat' | 'cash' | 'emt'

const PENDING_STATUSES = ['pending', 'cash_pending', 'wechat_pending', 'emt_pending', 'cash_approved']

export default function PaymentsPage({ onNavigate }: PaymentsPageProps): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const state = useAppState()
  const toast = useToast()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const payments = useMemo(() => {
    let list = [...state.payments]
    if (statusFilter === 'pending') list = list.filter((p) => PENDING_STATUSES.includes(p.status))
    else if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter)
    if (methodFilter !== 'all') list = list.filter((p) => p.method === methodFilter)
    return list.sort((a, b) => {
      const rank = { pending: 0, cash_pending: 0, wechat_pending: 0, emt_pending: 0, submitted: 1, cash_approved: 1, confirmed: 2, paid: 2, rejected: 3 } as const
      return (rank[a.status as keyof typeof rank] ?? 4) - (rank[b.status as keyof typeof rank] ?? 4) || b.createdAt.localeCompare(a.createdAt)
    })
  }, [state.payments, statusFilter, methodFilter])

  const open = openId ? state.payments.find((p) => p.id === openId) ?? null : null

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, okTitle: string): Promise<void> => {
    const result = await fn()
    toast.push({ tone: result.ok ? 'success' : 'error', title: result.ok ? okTitle : (result.error || t('common.toast.error')) })
    if (result.ok) setOpenId(null)
  }

  const rejectWithReason = async (id: string): Promise<void> => {
    const r = await rejectPayment(id, rejectReason.trim() || undefined)
    toast.push({ tone: r.ok ? 'success' : 'error', title: r.ok ? t('instructor.payments.reject') : (r.error || t('common.toast.error')) })
    if (r.ok) { setOpenId(null); setRejectReason('') }
  }

  const statusMeta = (p: Payment): { tone: 'success' | 'info' | 'warning' | 'neutral'; label: string } => {
    switch (p.status) {
      case 'paid':
        return { tone: 'success', label: t('payment.paid') }
      case 'confirmed':
        return { tone: 'success', label: t('payment.confirmed') }
      case 'cash_approved':
        return { tone: 'info', label: t('payment.cashApproved') }
      case 'submitted':
        return { tone: 'warning', label: t('payment.statusSubmitted') }
      case 'wechat_pending':
        return { tone: 'warning', label: t('payment.wechatPending') }
      case 'emt_pending':
        return { tone: 'warning', label: t('payment.emtPending') }
      case 'cash_pending':
        return { tone: 'warning', label: t('payment.cashPending') }
      case 'pending':
        return { tone: 'warning', label: t('payment.pending') }
      case 'rejected':
        return { tone: 'neutral', label: t('payment.rejected') }
      default:
        return { tone: 'neutral', label: p.status }
    }
  }

  const courseName = (p: Payment): string => {
    const c = state.courses.find((x) => x.id === p.courseId)
    return c ? (locale === 'zh' ? c.name.zh : c.name.en) : p.courseId
  }

  if (payments.length === 0) {
    return (
      <div className="ins-panel">
        <EmptyState icon={<Wallet size={24} />} title={t('instructor.payments.empty')} />
      </div>
    )
  }

  return (
    <div className="ins-payments">
      {onNavigate ? (
        <button type="button" className="ins-settings-hint" onClick={() => onNavigate('settings')}>
          <Settings2 size={14} />
          {t('instructor.payments.settingsHint')}
        </button>
      ) : null}

      {/* § payment overhaul: status + method filters */}
      <div className="ins-pay-filters">
        <div className="ins-pay-filters__group">
          {(['all', 'pending', 'submitted', 'paid', 'rejected'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`ins-pay-filter${statusFilter === s ? ' is-active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? t('instructor.payments.filterAll') : t(`instructor.payments.filter.${s}`)}
            </button>
          ))}
        </div>
        <div className="ins-pay-filters__group">
          {(['all', 'wechat', 'cash', 'emt'] as MethodFilter[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`ins-pay-filter${methodFilter === m ? ' is-active' : ''}`}
              onClick={() => setMethodFilter(m)}
            >
              {m === 'all' ? t('instructor.payments.methodAll') : paymentMethodLabel(m, locale)}
            </button>
          ))}
        </div>
      </div>

      <div className="ins-table-wrap">
        <table className="ins-table">
          <thead>
            <tr>
              <th>{t('student.profile.name')}</th>
              <th>{t('instructor.students.courses')}</th>
              <th>{t('instructor.payments.method')}</th>
              <th className="tabular-nums">{t('instructor.payments.amount')}</th>
              <th>{t('instructor.payments.status')}</th>
              <th>{t('instructor.payments.date')}</th>
              <th>{t('instructor.schedule.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const student = state.students.find((s) => s.id === p.studentId)
              const date = fromServerISO(p.createdAt)
              const meta = statusMeta(p)
              const confirmable =
                p.status === 'cash_approved' || p.status === 'submitted' || p.status === 'wechat_pending' || p.status === 'emt_pending'
              return (
                <tr key={p.id}>
                  <td>
                    <span className="ins-student-name">
                      {student ? <Avatar name={student.name} color={student.avatarColor} size={30} /> : null}
                      <span>{student ? student.name : p.studentId}</span>
                    </span>
                  </td>
                  <td>{courseName(p)}</td>
                  <td>
                    <span className="ins-pay-method">
                      <PaymentMethodBrand method={p.method} size={18} />
                      {paymentMethodLabel(p.method, locale)}
                    </span>
                  </td>
                  <td className="tabular-nums">{formatMoney(p.amount)}</td>
                  <td>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </td>
                  <td className="tabular-nums">{locale === 'zh' ? formatDateZh(date) : formatDateEn(date)}</td>
                  <td>
                    <div className="ins-pay-actions">
                      {confirmable ? (
                        <Button variant="primary" size="sm" onClick={() => void run(() => markPaymentReceived(p.id), t('instructor.payments.markReceived'))}>
                          {t('instructor.payments.markReceived')}
                        </Button>
                      ) : p.status === 'cash_pending' ? (
                        <Button variant="primary" size="sm" onClick={() => void run(() => approveCashPayment(p.id), t('instructor.payments.approveCash'))}>
                          {t('instructor.payments.approveCash')}
                        </Button>
                      ) : null}
                      {p.status === 'cash_approved' ? (
                        <Button variant="secondary" size="sm" onClick={() => void run(() => sendCashReminder(p.id), t('instructor.payments.reminderSent'))}>
                          {t('instructor.payments.sendReminder')}
                        </Button>
                      ) : null}
                      {(PENDING_STATUSES.includes(p.status) || p.status === 'submitted') ? (
                        <Button variant="dangerGhost" size="sm" onClick={() => { setOpenId(p.id); setRejectReason('') }}>
                          {t('instructor.payments.reject')}
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" onClick={() => { setOpenId(p.id); setRejectReason('') }}>
                        <Eye size={14} /> {t('instructor.payments.view')}
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* § payment overhaul: order detail modal (proof, student info, actions) */}
      {open ? (
        <div className="ins-detail-scrim" onMouseDown={() => setOpenId(null)}>
          <div className="ins-detail-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ins-detail-modal__head">
              <span className="ins-detail-modal__title">
                {open.order_no || open.id} · {courseName(open)}
              </span>
              <button type="button" className="ins-icon-btn" onClick={() => setOpenId(null)} aria-label={t('common.close')}>
                <X size={18} />
              </button>
            </div>
            <div className="ins-detail-modal__body">
              <div className="ins-detail-row">
                <span className="ins-detail-label">{t('instructor.payments.status')}</span>
                <span className="ins-detail-value">
                  <Badge tone={statusMeta(open).tone}>{statusMeta(open).label}</Badge>
                </span>
              </div>
              <div className="ins-detail-row">
                <span className="ins-detail-label">{t('student.profile.name')}</span>
                <span className="ins-detail-value">
                  {open.proof?.name || (state.students.find((s) => s.id === open.studentId)?.name ?? open.studentId)}
                  {open.proof?.phone ? <span className="ins-detail-sub tabular-nums">{open.proof.phone}</span> : null}
                </span>
              </div>
              <div className="ins-detail-row">
                <span className="ins-detail-label">{t('instructor.payments.method')}</span>
                <span className="ins-detail-value">
                  <span className="ins-pay-method">
                    <PaymentMethodBrand method={open.method} size={16} />
                    {paymentMethodLabel(open.method, locale)}
                  </span>
                  {open.method === 'wechat' && open.wechat_cny_amount ? (
                    <span className="ins-detail-sub tabular-nums">≈ ¥{open.wechat_cny_amount} (rate {open.wechat_rate?.toFixed(2)})</span>
                  ) : null}
                </span>
              </div>
              <div className="ins-detail-row">
                <span className="ins-detail-label">{t('instructor.payments.amount')}</span>
                <span className="ins-detail-value tabular-nums">{formatMoney(open.amount)}</span>
              </div>
              <div className="ins-detail-row">
                <span className="ins-detail-label">{t('instructor.payments.date')}</span>
                <span className="ins-detail-value tabular-nums">
                  {locale === 'zh' ? formatDateZh(fromServerISO(open.createdAt)) : formatDateEn(fromServerISO(open.createdAt))}
                  {open.submittedAt ? ` · ${t('instructor.payments.submittedAt')} ${open.submittedAt.slice(11, 16)}` : ''}
                </span>
              </div>
              {open.proof?.note ? (
                <div className="ins-detail-row">
                  <span className="ins-detail-label">{t('payment.proofNote')}</span>
                  <span className="ins-detail-value">{open.proof.note}</span>
                </div>
              ) : null}
              {open.rejectReason ? (
                <div className="ins-detail-row">
                  <span className="ins-detail-label">{t('payment.rejectReason')}</span>
                  <span className="ins-detail-value ins-detail-value--bad">{open.rejectReason}</span>
                </div>
              ) : null}
              {open.proof?.dataUrl ? (
                <div className="ins-detail-row ins-detail-row--block">
                  <span className="ins-detail-label">{t('payment.proofUpload')}</span>
                  <span className="ins-detail-value">
                    <img src={open.proof.dataUrl} alt="proof" className="ins-pay-proof" />
                  </span>
                </div>
              ) : null}
            </div>
            <div className="ins-detail-modal__foot">
              {rejectReason ? (
                <div className="ins-pay-reject">
                  <input
                    className="ins-input"
                    placeholder={t('instructor.payments.rejectReasonPlaceholder')}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              ) : null}
              <div className="ins-pay-actions">
                <Button variant="ghost" size="sm" onClick={() => setOpenId(null)}>
                  {t('common.close')}
                </Button>
                {open.status === 'cash_pending' ? (
                  <Button variant="primary" size="sm" onClick={() => void run(() => approveCashPayment(open.id), t('instructor.payments.approveCash'))}>
                    {t('instructor.payments.approveCash')}
                  </Button>
                ) : null}
                {open.status === 'cash_approved' || open.status === 'submitted' || open.status === 'wechat_pending' || open.status === 'emt_pending' ? (
                  <Button variant="primary" size="sm" onClick={() => void run(() => markPaymentReceived(open.id), t('instructor.payments.markReceived'))}>
                    {t('instructor.payments.markReceived')}
                  </Button>
                ) : null}
                {PENDING_STATUSES.includes(open.status) || open.status === 'submitted' ? (
                  <>
                    {!rejectReason ? (
                      <Button variant="dangerGhost" size="sm" onClick={() => setRejectReason(' ')}>
                        {t('instructor.payments.reject')}
                      </Button>
                    ) : (
                      <Button variant="danger" size="sm" onClick={() => void rejectWithReason(open.id)}>
                        {t('instructor.payments.rejectConfirm')}
                      </Button>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
