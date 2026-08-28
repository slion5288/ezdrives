// ============================================================================
// EZDRIVES — Instructor PaymentMethodsManager (支付方式, instructor-owned)
// The instructor enables/disables which payment methods students may use.
// The enabled list is persisted to instructor.paymentMethods and the student
// payment modal renders exactly those methods — toggling here changes what
// students see immediately. At least one method must stay enabled.
// ============================================================================

import { useState } from 'react'
import { ALL_PAYMENT_METHODS, enabledPaymentMethods, getState, paymentMethodLabel, setPaymentMethods, useAppState } from '../../data/store'
import type { PaymentMethod } from '../../data/store'
import { useLocale, useT } from '../../i18n'
import { CreditCard } from 'lucide-react'
import { PaymentBrandFrame } from '../../components/payment/PaymentBrandIcons'
import { Toggle } from './ui'
import { useToast } from '../../components/shared'

export default function PaymentMethodsManager(): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const toast = useToast()
  const state = useAppState()
  const [dirty, setDirty] = useState(false)

  const enabled = new Set(enabledPaymentMethods(state))

  const toggle = (method: PaymentMethod): void => {
    // Read the live store so rapid successive toggles never use a stale list.
    const current = new Set(enabledPaymentMethods(getState()))
    if (current.has(method)) {
      if (current.size <= 1) {
        toast.push({ tone: 'error', title: t('instructor.settings.atLeastOne') })
        return
      }
      setPaymentMethods(ALL_PAYMENT_METHODS.filter((m) => current.has(m) && m !== method))
    } else {
      setPaymentMethods(ALL_PAYMENT_METHODS.filter((m) => current.has(m) || m === method))
    }
    setDirty(true)
    toast.push({ tone: 'success', title: t('instructor.settings.paymentsSaved') })
  }

  return (
    <section className="ins-panel ins-settings">
      <div className="ins-panel-head">
        <h2 className="ins-panel-title">
          <CreditCard size={16} /> {t('instructor.settings.payments')}
        </h2>
        <span className="ins-settings-status">{t('instructor.settings.paymentsCount', { count: enabled.size })}</span>
      </div>
      <p className="ins-qr-hint">{t('instructor.settings.paymentsHint')}</p>
      <div className="ins-paymethod-grid">
        {ALL_PAYMENT_METHODS.map((method) => {
          const on = enabled.has(method)
          return (
            <div key={method} className={`ins-paymethod-card${on ? ' is-on' : ''}`}>
              <PaymentBrandFrame method={method} size={26} />
              <span className="ins-paymethod-label">{paymentMethodLabel(method, locale)}</span>
              <Toggle checked={on} onChange={() => toggle(method)} label={paymentMethodLabel(method, locale)} />
            </div>
          )
        })}
      </div>
      <p className="ins-qr-hint">{t('instructor.settings.paymentsLiveHint')}</p>
      {dirty ? <p className="ins-settings-saved-hint">{t('instructor.settings.paymentsSaved')}</p> : null}
    </section>
  )
}
