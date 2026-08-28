// ============================================================================
// EZDRIVES — Instructor PaymentsPage (支付确认)
// All course purchases (cash / online) with their status. Pending payments
// are confirmed or rejected here — confirming unlocks time booking for the
// student (payment_confirmed notification is sent automatically).
// Receive settings (QR / e-Transfer / bank / API) moved to SettingsPage.
// ============================================================================

import { useMemo } from 'react'
import {
  confirmPayment,
  paymentMethodLabel,
  rejectPayment,
  useAppState,
} from '../../data/store'
import { useLocale, useT } from '../../i18n'
import { Settings2, Wallet } from 'lucide-react'
import { PaymentMethodBrand } from '../../components/payment/PaymentBrandIcons'
import { Avatar, Badge, EmptyState } from './ui'
import { useToast } from '../../components/shared'
import { formatMoney } from './helpers'
import { formatDateEn, formatDateZh, fromServerISO } from '../../data/timeEngine'
import type { InstructorTab } from './helpers'

interface PaymentsPageProps {
  onNavigate?: (tab: InstructorTab) => void
}

export default function PaymentsPage({ onNavigate }: PaymentsPageProps): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const state = useAppState()
  const toast = useToast()

  const payments = useMemo(
    () =>
      [...state.payments].sort((a, b) => {
        const rank = { pending: 0, confirmed: 1, rejected: 2 } as const
        return rank[a.status] - rank[b.status] || b.createdAt.localeCompare(a.createdAt)
      }),
    [state.payments],
  )

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
        <button
          type="button"
          className="ins-settings-hint"
          onClick={() => onNavigate('settings')}
        >
          <Settings2 size={14} />
          {t('instructor.payments.settingsHint')}
        </button>
      ) : null}
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
              const course = state.courses.find((c) => c.id === p.courseId)
              const courseName = course ? (locale === 'zh' ? course.name.zh : course.name.en) : p.courseId
              const date = fromServerISO(p.createdAt)
              const methodLabel = paymentMethodLabel(p.method, locale)
              return (
                <tr key={p.id}>
                  <td>
                    <span className="ins-student-name">
                      {student ? <Avatar name={student.name} color={student.avatarColor} size={30} /> : null}
                      <span>{student ? student.name : p.studentId}</span>
                    </span>
                  </td>
                  <td>{courseName}</td>
                  <td>
                    <span className="ins-pay-method">
                      <PaymentMethodBrand method={p.method} size={18} />
                      {methodLabel}
                    </span>
                  </td>
                  <td className="tabular-nums">{formatMoney(p.amount)}</td>
                  <td>
                    <Badge tone={p.status === 'confirmed' ? 'success' : p.status === 'pending' ? 'warning' : 'neutral'}>
                      {p.status === 'confirmed'
                        ? t('payment.confirmed')
                        : p.status === 'pending'
                          ? t('payment.pending')
                          : t('payment.rejected')}
                    </Badge>
                  </td>
                  <td className="tabular-nums">{locale === 'zh' ? formatDateZh(date) : formatDateEn(date)}</td>
                  <td>
                    {p.status === 'pending' ? (
                      <div className="ins-pay-actions">
                        <button
                          type="button"
                          className="ins-btn ins-btn--primary ins-btn--sm"
                          onClick={() => {
                            void (async () => {
                              const result = await confirmPayment(p.id)
                              toast({ tone: result.ok ? 'success' : 'error', title: result.ok ? t('instructor.payments.confirm') : t('common.toast.error') })
                            })()
                          }}
                        >
                          {t('instructor.payments.confirm')}
                        </button>
                        <button
                          type="button"
                          className="ins-btn ins-btn--danger-ghost ins-btn--sm"
                          onClick={() => {
                            void (async () => {
                              const result = await rejectPayment(p.id)
                              toast({ tone: result.ok ? 'success' : 'error', title: result.ok ? t('instructor.payments.reject') : t('common.toast.error') })
                            })()
                          }}
                        >
                          {t('instructor.payments.reject')}
                        </button>
                      </div>
                    ) : (
                      <span className="ins-pay-done">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
