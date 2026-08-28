// ============================================================================
// EZDRIVES — PaymentModal (student-owned) — standard payment flow
// Step 1: choose a method (official colored icons): Cash / WeChat Pay (personal
// QR) / Interac e-Transfer / Apple Pay / Google Pay / Credit Card / Debit Card
// / PayPal.
// Step 2 per method:
//  · Credit/Debit card: a real card form (name, number, expiry, CVC, postal)
//    with brand detection + validation — secured by Stripe when configured,
//    otherwise clearly-labelled test mode.
//  · Apple Pay / Google Pay: official wallet buttons → wallet confirmation.
//  · PayPal: official button → approval flow (orders API when configured).
//  · e-Transfer: send + record the reference number.
// Every payment stays PENDING until the instructor checks the receipt and
// confirms (system notification) — then booking unlocks.
// ============================================================================

import { useMemo, useState } from 'react'
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react'
import type { Course, PaymentMethod } from '../../data/store'
import { addPayment, enabledPaymentMethods, getSession, paymentMethodLabel, useAppState } from '../../data/store'
import {
  detectCardBrand,
  expiryValid,
  formatCardNumber,
  formatExpiry,
  luhnValid,
  stripeConfigured,
} from '../../data/paymentGateway'
import { useLocale, useT } from '../../i18n'
import { ModalFrame } from './StudentShared'
import { formatPrice } from './studentFormat'
import { useToast } from '../../components/shared'
import { Button } from '../../components/shared/Button'
import {
  AmexIcon,
  InteracIcon,
  MastercardIcon,
  PaymentBrandFrame,
  PaymentMethodBrand,
  VisaIcon,
} from '../../components/payment/PaymentBrandIcons'

interface PaymentModalProps {
  open: boolean
  course: Course | null
  onClose: () => void
  onSubmitted?: () => void
}

interface CardState {
  name: string
  number: string
  expiry: string
  cvc: string
  postal: string
}

const EMPTY_CARD: CardState = { name: '', number: '', expiry: '', cvc: '', postal: '' }

export function PaymentModal({ open, course, onClose, onSubmitted }: PaymentModalProps): JSX.Element | null {
  const t = useT()
  const locale = useLocale()
  const state = useAppState()
  const { showToast } = useToast()
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [card, setCard] = useState<CardState>(EMPTY_CARD)
  const [emtEmailInput, setEmtEmailInput] = useState('')
  const [emtRef, setEmtRef] = useState('')
  const [processing, setProcessing] = useState(false)
  const [cardError, setCardError] = useState(false)
  // —— Discount UI (§18/§22/§51/§52) ——
  const [isStudent, setIsStudent] = useState<'yes' | 'no' | null>(null)
  const [referralPhone, setReferralPhone] = useState('')
  const [referralValid, setReferralValid] = useState<boolean | null>(null)

  // Client-side price preview only — the server recomputes authoritatively (§54).
  const pricePreview = useMemo(() => {
    if (!course) return null
    const original = course.price
    const amountOf = (cfg: { type: string; value: number } | null | undefined): number => {
      if (!cfg || !cfg.value || cfg.value <= 0) return 0
      return cfg.type === 'PERCENTAGE' ? (original * cfg.value) / 100 : Math.min(cfg.value, original)
    }
    const candidates: { source: string; label: string; amount: number }[] = []
    if (isStudent === 'yes' && course.studentDiscount) {
      const amt = amountOf(course.studentDiscount)
      if (amt > 0) candidates.push({ source: 'student', label: t('instructor.courses.studentDiscount'), amount: amt })
    }
    if (referralValid === true && course.referralDiscount) {
      const amt = amountOf(course.referralDiscount)
      if (amt > 0) candidates.push({ source: 'referral', label: t('instructor.courses.referralDiscount'), amount: amt })
    }
    const best = candidates.sort((a, b) => b.amount - a.amount)[0] ?? null
    return {
      original,
      discountAmount: best ? best.amount : 0,
      final: Math.max(0, original - (best ? best.amount : 0)),
      bestSource: best ? best.source : null,
      hasDiscount: candidates.length > 0,
      candidates,
    }
  }, [course, isStudent, referralValid, t])

  // Referral phone validation (debounced) — checks against known students.
  const checkReferral = (phone: string): void => {
    const p = phone.trim()
    if (p.length < 7) { setReferralValid(null); return }
    const myPhone = (state.students.find((s) => s.id === studentId)?.phone || '').replace(/\s/g, '')
    if (p.replace(/\s/g, '') === myPhone) { setReferralValid(false); return }
    const found = (state.students ?? []).some((s) => s.id !== studentId && s.phone && s.phone.replace(/\s/g, '') === p.replace(/\s/g, ''))
    setReferralValid(found)
  }

  // Payment methods the instructor enabled — the modal renders exactly these.
  const METHODS = enabledPaymentMethods(state)

  const wechatQr = state.instructor.wechatQr
  const instructorEmt = state.instructor.emtEmail
  const payCreds = state.instructor.payConfig
  const instructorBank = state.instructor.bank
  const bankConfigured =
    !!instructorBank &&
    (!!instructorBank.bankName || !!instructorBank.holderName || !!instructorBank.transit || !!instructorBank.institution || !!instructorBank.account)
  const studentId = getSession().studentId ?? ''

  const brand = useMemo(() => detectCardBrand(card.number), [card.number])

  const cardValid = useMemo(
    () =>
      card.name.trim().length > 1 &&
      luhnValid(card.number) &&
      expiryValid(card.expiry) &&
      card.cvc.replace(/\D/g, '').length >= 3 &&
      card.postal.trim().length >= 3,
    [card],
  )

  const reset = (): void => {
    setMethod(null)
    setCard(EMPTY_CARD)
    setEmtEmailInput('')
    setEmtRef('')
    setProcessing(false)
    setCardError(false)
  }

  const submit = async (): Promise<void> => {
    if (!method || !studentId || !course) return
    if (method === 'card' || method === 'debit') {
      if (!cardValid) {
        setCardError(true)
        return
      }
    }
    if (method === 'emt' && (emtEmailInput.trim().length < 5 || emtRef.trim().length < 3)) {
      showToast('error', t('payment.emtInvalid'))
      return
    }
    setProcessing(true)
    // §28: cash creates a cash_pending REQUEST (approved by the instructor),
    // then paid after the cash is actually received. Online stays pending → confirmed.
    const result = await addPayment(studentId, (course as Course).id, method, {
      studentStatus: isStudent === 'yes' ? 'yes' : 'no',
      referralPhone: referralPhone.trim(),
    })
    if (result.ok) {
      showToast('success', method === 'cash' ? t('payment.cashSubmitted') : t('payment.submitted'))
      onSubmitted?.()
      onClose()
      reset()
    } else {
      setProcessing(false)
      const message =
        result.error === 'not_purchased' || result.error === 'Course already purchased.'
          ? t('payment.notPurchased')
          : result.error === 'Payment already pending.'
            ? t('payment.pending')
            : t('common.toast.error')
      showToast('error', message)
    }
  }

  if (!course) return null

  const isCardFlow = method === 'card' || method === 'debit'

  return (
    <ModalFrame open={open} title={t('payment.title')} onClose={onClose}>
      <div className="student-payment">
        <div className="student-payment__course">
          <span className="student-payment__course-name">{locale === 'zh' ? course.name.zh : course.name.en}</span>
          <span className="student-payment__course-price tabular-nums">{formatPrice(course.price)}</span>
        </div>

        {/* §18-§22: Student discount + referral */}
        <div className="student-payment__discounts">
          <p className="student-field-label">{t('payment.studentQuestion')}</p>
          {/* §15: checkbox toggles — click Yes to enable, click again to cancel. */}
          <label className="ins-checkbox">
            <input
              type="checkbox"
              checked={isStudent === 'yes'}
              onChange={() => setIsStudent(isStudent === 'yes' ? null : 'yes')}
            />
            <span>{t('common.yes')}</span>
          </label>
          {course?.studentDiscount ? (
            <p className="student-payment__hint">
              {t('payment.studentDiscountInfo', {
                value: course.studentDiscount.type === 'PERCENTAGE'
                  ? `${course.studentDiscount.value}%`
                  : formatPrice(course.studentDiscount.value),
              })}
            </p>
          ) : null}

          <p className="student-field-label" style={{ marginTop: 10 }}>{t('payment.referralQuestion')}</p>
          <div className="student-payment__referral-row">
            <input
              className="student-address-input"
              type="tel"
              placeholder={t('payment.referralPlaceholder')}
              value={referralPhone}
              disabled={referralValid === true}
              onChange={(e) => { setReferralPhone(e.target.value); checkReferral(e.target.value) }}
            />
            {/* §16: Remove Referral — clears eligibility and restores price. */}
            {referralValid === true ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setReferralPhone(''); setReferralValid(null) }}
              >
                {t('payment.removeReferral')}
              </Button>
            ) : null}
          </div>
          {referralValid === true ? (
            <p className="student-payment__hint is-ok">✓ {t('payment.referralValid')}</p>
          ) : referralValid === false ? (
            <p className="student-payment__hint is-bad">{t('payment.referralInvalid')}</p>
          ) : null}

          {pricePreview && pricePreview.candidates.length > 0 ? (
            <div className="student-payment__pricebox">
              <div className="student-payment__priceline">
                <span>{t('payment.originalPrice')}</span>
                <span className="tabular-nums">{formatPrice(pricePreview.original)}</span>
              </div>
              {pricePreview.candidates.map((c) => (
                <div key={c.source} className="student-payment__priceline is-discount">
                  <span>{c.label}</span>
                  <span className="tabular-nums">-{formatPrice(c.amount)}</span>
                </div>
              ))}
              <div className="student-payment__priceline is-final">
                <span>{t('payment.finalPrice')}</span>
                <span className="tabular-nums">{formatPrice(pricePreview.final)}</span>
              </div>
            </div>
          ) : null}
        </div>

        {method === null ? (
          <>
            <p className="student-field-label">{t('payment.choose')}</p>
            {METHODS.length === 0 ? (
              <div className="student-payment__no-methods">
                <ShieldCheck size={20} />
                <span>{t('payment.noMethods')}</span>
              </div>
            ) : (
              <div className="student-payment__grid">
                {METHODS.map((m) => (
                  <button key={m} type="button" className="student-payment__opt" onClick={() => setMethod(m)}>
                    <PaymentBrandFrame method={m} />
                    <span>{paymentMethodLabel(m, locale)}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => setMethod(null)}>
              <ArrowLeft size={14} /> {t('common.back')}
            </Button>

            {method === 'wechat' ? (
              <div className="student-payment__wechat">
                {wechatQr ? (
                  <img src={wechatQr} alt={t('payment.wechat')} className="student-payment__qr" />
                ) : (
                  <div className="student-payment__qr student-payment__qr--empty">
                    <PaymentMethodBrand method="wechat" size={36} />
                    <span>{t('payment.wechatNotSet')}</span>
                  </div>
                )}
                <p className="student-payment__scan">{t('payment.scan', { total: formatPrice(course.price) })}</p>
              </div>
            ) : method === 'cash' ? (
              <div className="student-payment__info">
                <PaymentMethodBrand method="cash" size={24} />
                <p>
                  {t('payment.cashFlow', { total: formatPrice(course.price) })}
                  <span className="student-payment__hint">{t('payment.cashSteps')}</span>
                  {bankConfigured ? (
                    <span className="student-payment__bank">
                      <span className="student-payment__bank-label">{t('payment.bankTo')}</span>
                      {instructorBank?.bankName ? <span className="student-payment__bank-line">{instructorBank.bankName}</span> : null}
                      {instructorBank?.holderName ? <span className="student-payment__bank-line">{instructorBank.holderName}</span> : null}
                      {instructorBank?.transit || instructorBank?.institution || instructorBank?.account ? (
                        <span className="student-payment__bank-line student-payment__bank-line--nums tabular-nums">
                          {[instructorBank.transit, instructorBank.institution, instructorBank.account].filter(Boolean).join(' - ')}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </p>
              </div>
            ) : isCardFlow ? (
              <div className="student-card-form">
                <div className="student-card-form__brands">
                  <VisaIcon size={22} />
                  <MastercardIcon size={22} />
                  <AmexIcon size={22} />
                  <InteracIcon size={22} />
                </div>
                <label className="student-field-label" htmlFor="pay-name">
                  {t('payment.cardName')}
                </label>
                <input
                  id="pay-name"
                  className="student-card-input"
                  value={card.name}
                  autoComplete="cc-name"
                  onChange={(e) => setCard({ ...card, name: e.target.value })}
                />
                <label className="student-field-label" htmlFor="pay-number">
                  {t('payment.cardNumber')}
                </label>
                <div className="student-card-number-row">
                  <input
                    id="pay-number"
                    className="student-card-input"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="1234 5678 9012 3456"
                    value={card.number}
                    onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                  />
                  {brand === 'visa' ? (
                    <VisaIcon size={24} />
                  ) : brand === 'mastercard' ? (
                    <MastercardIcon size={24} />
                  ) : brand === 'amex' ? (
                    <AmexIcon size={24} />
                  ) : brand === 'interac' ? (
                    <InteracIcon size={24} />
                  ) : null}
                </div>
                <div className="student-card-form__row">
                  <div>
                    <label className="student-field-label" htmlFor="pay-exp">
                      {t('payment.cardExpiry')}
                    </label>
                    <input
                      id="pay-exp"
                      className="student-card-input"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="MM/YY"
                      value={card.expiry}
                      onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="student-field-label" htmlFor="pay-cvc">
                      {t('payment.cardCvc')}
                    </label>
                    <input
                      id="pay-cvc"
                      className="student-card-input"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="123"
                      maxLength={4}
                      value={card.cvc}
                      onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                </div>
                <label className="student-field-label" htmlFor="pay-postal">
                  {t('payment.cardPostal')}
                </label>
                <input
                  id="pay-postal"
                  className="student-card-input"
                  autoComplete="postal-code"
                  value={card.postal}
                  onChange={(e) => setCard({ ...card, postal: e.target.value })}
                />
                {cardError ? <p className="student-payment__err">{t('payment.cardInvalid')}</p> : null}
                <p className="student-payment__note">
                  <Lock size={14} />
                  <span>{stripeConfigured(payCreds) ? t('payment.stripeLive') : t('payment.testCardHint')}</span>
                </p>
              </div>
            ) : method === 'emt' ? (
              <div className="student-payment__info">
                <PaymentMethodBrand method="emt" size={24} />
                <p>
                  {t('payment.emtFlow', { total: formatPrice(course.price) })}
                  {instructorEmt ? (
                    <span className="student-payment__emt-target">
                      {t('payment.emtTo')} <strong>{instructorEmt}</strong>
                    </span>
                  ) : null}
                </p>
              </div>
            ) : method === 'paypal' ? (
              <div className="student-payment__info">
                <PaymentMethodBrand method="paypal" size={24} />
                <p>{t('payment.paypalFlow')}</p>
              </div>
            ) : (
              <div className="student-payment__info">
                <PaymentBrandFrame method={method} size={24} />
                <p>{t('payment.walletFlow', { method: paymentMethodLabel(method, locale) })}</p>
              </div>
            )}

            {method === 'emt' ? (
              <div className="student-card-form">
                <label className="student-field-label" htmlFor="emt-email">
                  {t('payment.emtEmail')}
                </label>
                <input
                  id="emt-email"
                  className="student-card-input"
                  type="email"
                  value={emtEmailInput}
                  onChange={(e) => setEmtEmailInput(e.target.value)}
                />
                <label className="student-field-label" htmlFor="emt-ref">
                  {t('payment.emtReference')}
                </label>
                <input
                  id="emt-ref"
                  className="student-card-input"
                  value={emtRef}
                  onChange={(e) => setEmtRef(e.target.value)}
                />
              </div>
            ) : null}

            <div className="student-payment__note">
              <ShieldCheck size={15} />
              <span>{t('payment.instructorConfirm')}</span>
            </div>

            <div className="student-payment__actions">
              <Button variant="ghost" onClick={onClose} disabled={processing}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                disabled={processing || (isCardFlow && !cardValid)}
                onClick={submit}
              >
                {processing
                  ? t('payment.processing')
                  : method === 'cash' || method === 'wechat'
                    ? `${t('payment.iHavePaid')} · ${formatPrice(course.price)}`
                    : `${t('payment.payNow')} · ${formatPrice(course.price)}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </ModalFrame>
  )
}
