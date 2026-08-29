// ============================================================================
// EZDRIVES — PaymentModal (student-owned) — payment overhaul flow
// Step 1: choose a method (WeChat / Cash / e-Transfer only).
// Step 2 per method (order summary + instructions):
//  · WeChat: desktop → QR + "扫一扫"; mobile → copy WeChat ID + guide (+QR backup)
//  · Cash: pay the instructor in person; confirm to create the order
//  · e-Transfer: copy the receiving email + memo; then submit proof
// Step 3 (WeChat / EMT): 【我已完成付款】→ name / phone / (optional) screenshot
//  → order becomes SUBMITTED (awaiting admin confirmation) — never PAID by the
//    student. Rejected orders can be re-submitted in place (no duplicates).
// All prices come from the server-captured snapshot; the client only displays.
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, Copy, ShieldCheck, Smartphone } from 'lucide-react'
import type { Course, Payment, PaymentMethod } from '../../data/store'
import { addPayment, enabledPaymentMethods, getSession, paymentMethodLabel, submitPaymentProof, useAppState } from '../../data/store'
import { useLocale, useT } from '../../i18n'
import { ModalFrame } from './StudentShared'
import { formatPrice } from './studentFormat'
import { useToast } from '../../components/shared'
import { Button } from '../../components/shared/Button'
import { PaymentBrandFrame, PaymentMethodBrand } from '../../components/payment/PaymentBrandIcons'

interface PaymentModalProps {
  open: boolean
  course: Course | null
  onClose: () => void
  onSubmitted?: () => void
}

// § WeChat CAD→CNY rate (real-time + 0.5), cached 6h client-side.
const RATE_CACHE_KEY = 'dw.wechatRate'
const RATE_CACHE_TTL = 6 * 60 * 60 * 1000
const MAX_PROOF_BYTES = 10 * 1024 * 1024

async function fetchWechatRate(): Promise<number | null> {
  try {
    const res = await fetch('/api/rates')
    const data = await res.json().catch(() => null)
    if (data && data.ok && typeof data.rate === 'number' && data.rate > 0) {
      try {
        localStorage.setItem(RATE_CACHE_KEY, JSON.stringify({ rate: data.rate, at: Date.now() }))
      } catch {
        // ignore
      }
      return data.rate
    }
  } catch {
    // fall through
  }
  return null
}

function readCachedRate(): number | null {
  try {
    const raw = localStorage.getItem(RATE_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { rate: number; at: number }
    if (parsed && typeof parsed.rate === 'number' && parsed.rate > 0 && Date.now() - parsed.at < RATE_CACHE_TTL) return parsed.rate
  } catch {
    // ignore
  }
  return null
}

/** § device detection: mobile / WeChat built-in browser → copy-WeChat-ID flow. */
function detectMobile(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mobi|Android|iPhone|iPad|iPod|MicroMessenger|WeChat/i.test(navigator.userAgent)
}

const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function PaymentModal({ open, course, onClose, onSubmitted }: PaymentModalProps): JSX.Element | null {
  const t = useT()
  const locale = useLocale()
  const state = useAppState()
  const { showToast } = useToast()

  const session = getSession()
  const studentId = session.studentId ?? ''
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [processing, setProcessing] = useState(false)
  const [wechatRate, setWechatRate] = useState<number | null>(() => readCachedRate())
  const [rateLoading, setRateLoading] = useState(false)
  const [showProof, setShowProof] = useState(false)
  const [proofName, setProofName] = useState('')
  const [proofPhone, setProofPhone] = useState('')
  const [proofNote, setProofNote] = useState('')
  const [proofDataUrl, setProofDataUrl] = useState<string | null>(null)
  const [proofErr, setProofErr] = useState<string | null>(null)
  const [createdOrder, setCreatedOrder] = useState<Payment | null>(null)

  // § WeChat rate: cached value first; refresh in background when the modal opens.
  useEffect(() => {
    if (!open) return
    if (readCachedRate() !== null) return
    setRateLoading(true)
    void fetchWechatRate().then((rate) => {
      setRateLoading(false)
      if (rate !== null) setWechatRate(rate)
    })
  }, [open])

  // Prefill the proof name/phone from the student profile.
  useEffect(() => {
    if (!open) return
    const student = (state.students ?? []).find((s) => s.id === studentId)
    if (student) {
      if (!proofName) setProofName(student.name || '')
      if (!proofPhone) setProofPhone(student.phone || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const METHODS = enabledPaymentMethods(state)
  const wechatQr = state.instructor.wechatQr
  const wechatId = state.instructor.wechatId
  const instructorEmt = state.instructor.emtEmail
  const isMobile = useMemo(detectMobile, [])

  const [isStudent, setIsStudent] = useState<'yes' | 'no' | null>('no')
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

  const checkReferral = (p: string): void => {
    if (!p || p.trim().length < 7) { setReferralValid(null); return }
    const myPhone = (state.students.find((s) => s.id === studentId)?.phone || '').replace(/\s/g, '')
    if (p.replace(/\s/g, '') === myPhone) { setReferralValid(false); return }
    const found = (state.students ?? []).some((s) => s.id !== studentId && s.phone && s.phone.replace(/\s/g, '') === p.replace(/\s/g, ''))
    setReferralValid(found)
  }

  // § A previously REJECTED order for this course is re-submitted IN PLACE
  // (never a new duplicate order).
  const rejectedOrder = useMemo(
    () => (state.payments ?? []).find((p) => p.studentId === studentId && p.courseId === course?.id && p.status === 'rejected') ?? null,
    [state.payments, studentId, course],
  )
  const finalPrice = pricePreview ? pricePreview.final : course ? course.price : 0

  const reset = (): void => {
    setMethod(null)
    setShowProof(false)
    setProofName('')
    setProofPhone('')
    setProofNote('')
    setProofDataUrl(null)
    setProofErr(null)
    setCreatedOrder(null)
    setProcessing(false)
  }

  const copyText = async (text: string): Promise<void> => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      showToast('success', t('payment.copied'))
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
      showToast('success', t('payment.copied'))
    }
  }

  const onProofFile = (file: File | undefined): void => {
    setProofErr(null)
    if (!file) { setProofDataUrl(null); return }
    if (!PROOF_TYPES.includes(file.type)) {
      setProofErr(t('payment.proofTypeErr'))
      setProofDataUrl(null)
      return
    }
    if (file.size > MAX_PROOF_BYTES) {
      setProofErr(t('payment.proofSizeErr'))
      setProofDataUrl(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => setProofDataUrl(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  }

  /** § submit: wechat/emt with proof → SUBMITTED; cash → CASH_PENDING.
   *  Never paid. Duplicate protection: existing pending/submitted blocks a new
   *  order; a rejected order is re-submitted in place. */
  const submit = async (): Promise<void> => {
    if (!method || !studentId || !course) return
    if (method === 'wechat' && wechatRate === null) {
      showToast('error', t('payment.rateError'))
      return
    }
    const needsProof = method === 'wechat' || method === 'emt'
    if (needsProof && (!proofName.trim() || !proofPhone.trim())) {
      setProofErr(t('payment.proofRequired'))
      return
    }
    if (proofErr) return
    setProcessing(true)
    const base: { studentStatus: 'yes' | 'no'; referralPhone: string } = {
      studentStatus: isStudent === 'yes' ? 'yes' : 'no',
      referralPhone: referralPhone.trim(),
    }
    const result = rejectedOrder && needsProof
      ? await submitPaymentProof(rejectedOrder.id, {
          name: proofName.trim(),
          phone: proofPhone.trim(),
          note: proofNote.trim() || undefined,
          proof: proofDataUrl,
        })
      : await addPayment(studentId, course.id, method, {
          ...base,
          ...(needsProof
            ? { proof: proofDataUrl ?? undefined, name: proofName.trim(), phone: proofPhone.trim(), note: proofNote.trim() || undefined }
            : {}),
        })
    if (result.ok) {
      if ('payment' in result && result.payment) {
        setCreatedOrder(result.payment)
      } else {
        const mine = (state.payments ?? []).filter((p) => p.studentId === studentId && p.courseId === course.id)
        setCreatedOrder(mine[mine.length - 1] ?? null)
      }
      setProcessing(false)
    } else {
      setProcessing(false)
      const message =
        result.error === 'not_purchased' || result.error === 'Course already purchased.'
          ? t('payment.notPurchased')
          : result.error === 'Payment already pending.'
            ? t('payment.pending')
            : result.error || t('common.toast.error')
      showToast('error', message)
    }
  }

  const handleClose = (): void => {
    onSubmitted?.()
    onClose()
    reset()
  }

  if (!course) return null

  const memo = `${proofName.trim() || (locale === 'zh' ? '学员' : 'Student')} - ${locale === 'zh' ? course.name.zh : course.name.en}`

  return (
    <ModalFrame open={open} title={t('payment.title')} onClose={handleClose} variant="drawer" maxHeight="92vh">
      <div className="student-payment">
        {/* ===== result view after order creation ===== */}
        {createdOrder ? (
          <div className="student-payment__result">
            <span className="student-payment__result-icon">
              <Check size={22} />
            </span>
            <h3 className="student-payment__result-title">
              {createdOrder.status === 'submitted'
                ? t('payment.proofSubmitted')
                : createdOrder.status === 'cash_pending'
                  ? t('payment.cashOrderCreated')
                  : t('payment.orderCreated')}
            </h3>
            <div className="student-payment__summary">
              <div className="student-payment__priceline">
                <span>{t('payment.orderNo')}</span>
                <span className="tabular-nums">{createdOrder.order_no || createdOrder.id}</span>
              </div>
              <div className="student-payment__priceline">
                <span>{t('instructor.schedule.course')}</span>
                <span>{locale === 'zh' ? course.name.zh : course.name.en}</span>
              </div>
              <div className="student-payment__priceline">
                <span>{t('instructor.payments.amount')}</span>
                <span className="tabular-nums">{formatPrice(createdOrder.amount ?? finalPrice)} CAD</span>
              </div>
              <div className="student-payment__priceline">
                <span>{t('instructor.payments.method')}</span>
                <span>{paymentMethodLabel(createdOrder.method, locale)}</span>
              </div>
              <div className="student-payment__priceline">
                <span>{t('instructor.payments.status')}</span>
                <span className="student-payment__status-text">
                  {createdOrder.status === 'submitted'
                    ? t('payment.statusSubmitted')
                    : createdOrder.status === 'cash_pending'
                      ? t('payment.statusCashPending')
                      : createdOrder.status === 'paid'
                        ? t('payment.statusPaid')
                        : createdOrder.status === 'rejected'
                          ? t('payment.statusRejected')
                          : t('payment.statusPending')}
                </span>
              </div>
            </div>
            <div className="student-payment__actions">
              <Button variant="primary" onClick={handleClose}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        ) : (
          <>
        {/* ===== order summary ===== */}
        <div className="student-payment__course">
          <span className="student-payment__course-name">{locale === 'zh' ? course.name.zh : course.name.en}</span>
          <span className="student-payment__course-price tabular-nums">{formatPrice(course.price)}</span>
        </div>
        <div className="student-payment__discounts">
          <p className="student-field-label">{t('payment.studentQuestion')}</p>
          <label className="ins-checkbox">
            <input
              type="checkbox"
              checked={isStudent === 'yes'}
              onChange={() => setIsStudent(isStudent === 'yes' ? null : 'yes')}
            />
            <span>{t('payment.studentYes')}</span>
          </label>
          {course.studentDiscount ? (
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
            {referralValid === true ? (
              <Button variant="ghost" size="sm" onClick={() => { setReferralPhone(''); setReferralValid(null) }}>
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

        {rejectedOrder ? (
          <p className="student-payment__hint is-bad">
            {t('payment.rejectedResubmit')}
            {rejectedOrder.rejectReason ? ` — ${rejectedOrder.rejectReason}` : ''}
          </p>
        ) : null}

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
                  <button key={m} type="button" className="student-payment__opt" onClick={() => { setMethod(m); setShowProof(false); setProofErr(null) }}>
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
                <p className="student-payment__amount">
                  {t('payment.payAmount')} <b className="tabular-nums">{formatPrice(finalPrice)} CAD</b>
                </p>
                {wechatRate !== null ? (
                  <div className="student-payment__rate">
                    <div className="student-payment__rate-row">
                      <span>{t('payment.rateCoursePrice')}</span>
                      <b className="tabular-nums">CAD {formatPrice(finalPrice)}</b>
                    </div>
                    <div className="student-payment__rate-row">
                      <span>{t('payment.rateValue')}</span>
                      <b className="tabular-nums">1 CAD = {wechatRate.toFixed(2)} CNY</b>
                    </div>
                    <div className="student-payment__rate-row student-payment__rate-total">
                      <span>{t('payment.rateWechatAmount')}</span>
                      <b className="tabular-nums">¥{(finalPrice * wechatRate).toFixed(2)}</b>
                    </div>
                  </div>
                ) : (
                  <p className="student-payment__rate-err">{rateLoading ? t('payment.rateLoading') : t('payment.rateError')}</p>
                )}

                {isMobile ? (
                  /* ---- mobile: copy WeChat ID, then pay inside WeChat ---- */
                  <div className="student-payment__mobile-wechat">
                    <p className="student-payment__mobile-guide">
                      <Smartphone size={15} />
                      <span>{t('payment.wechatMobileGuide')}</span>
                    </p>
                    <div className="student-payment__wechat-id">
                      <span>{t('payment.wechatId')}</span>
                      <b>{wechatId || '—'}</b>
                    </div>
                    {wechatId ? (
                      <Button variant="primary" onClick={() => void copyText(wechatId)} disabled={processing}>
                        <Copy size={16} /> {t('payment.copyWechatId')}
                      </Button>
                    ) : (
                      <p className="student-payment__hint is-bad">{t('payment.wechatIdNotSet')}</p>
                    )}
                    <a className="student-payment__open-wechat" href="weixin://" onClick={(e) => { e.preventDefault(); window.location.href = 'weixin://' }}>
                      {t('payment.openWechat')}
                    </a>
                    {wechatQr ? (
                      <div className="student-payment__qr-backup">
                        <img src={wechatQr} alt={t('payment.wechat')} className="student-payment__qr student-payment__qr--small" />
                        <span className="student-payment__qr-caption">{t('payment.wechatQrBackup')}</span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  /* ---- desktop: QR + scan ---- */
                  <div className="student-payment__desktop-wechat">
                    {wechatQr ? (
                      <img src={wechatQr} alt={t('payment.wechat')} className="student-payment__qr" />
                    ) : (
                      <div className="student-payment__qr student-payment__qr--empty">
                        <PaymentMethodBrand method="wechat" size={36} />
                        <span>{t('payment.wechatNotSet')}</span>
                      </div>
                    )}
                    <p className="student-payment__scan">{t('payment.wechatDesktopScan')}</p>
                    {wechatId ? (
                      <p className="student-payment__wechat-id">
                        {t('payment.wechatId')} <b>{wechatId}</b>
                      </p>
                    ) : null}
                  </div>
                )}

                {!showProof ? (
                  <div className="student-payment__actions">
                    <Button variant="ghost" onClick={handleClose} disabled={processing}>{t('common.cancel')}</Button>
                    <Button variant="primary" disabled={processing} onClick={() => { setShowProof(true); setProofErr(null) }}>
                      {t('payment.iHavePaid')}
                    </Button>
                  </div>
                ) : (
                  <ProofForm
                    name={proofName} onName={setProofName}
                    phone={proofPhone} onPhone={setProofPhone}
                    note={proofNote} onNote={setProofNote}
                    dataUrl={proofDataUrl} onFile={onProofFile}
                    err={proofErr}
                    submitLabel={t('payment.proofSubmit')}
                    processing={processing}
                    onSubmit={() => void submit()}
                  />
                )}
              </div>
            ) : method === 'cash' ? (
              <div className="student-payment__info">
                <PaymentMethodBrand method="cash" size={24} />
                <p>
                  <b className="student-payment__amount">
                    {t('payment.payAmount')} {formatPrice(finalPrice)} CAD
                  </b>
                  <span className="student-payment__hint">{t('payment.cashNote')}</span>
                  <span className="student-payment__hint">{t('payment.cashSteps')}</span>
                </p>
                <div className="student-payment__actions">
                  <Button variant="ghost" onClick={handleClose} disabled={processing}>{t('common.cancel')}</Button>
                  <Button variant="primary" disabled={processing} onClick={() => void submit()}>
                    {t('payment.cashConfirm')}
                  </Button>
                </div>
              </div>
            ) : method === 'emt' ? (
              <div className="student-payment__info">
                <PaymentMethodBrand method="emt" size={24} />
                <p className="student-payment__amount">
                  {t('payment.payAmount')} <b className="tabular-nums">{formatPrice(finalPrice)} CAD</b>
                </p>
                <p className="student-payment__hint">{t('payment.emtFlowHint')}</p>
                {instructorEmt ? (
                  <div className="student-payment__emt-box">
                    <span className="student-payment__emt-label">{t('payment.emtTo')}</span>
                    <strong className="student-payment__emt-value">{instructorEmt}</strong>
                    <div className="student-payment__actions--row">
                      <Button variant="secondary" size="sm" onClick={() => void copyText(instructorEmt)}>
                        <Copy size={14} /> {t('payment.emtCopyEmail')}
                      </Button>
                    </div>
                    <span className="student-payment__emt-label">{t('payment.emtMemo')}</span>
                    <strong className="student-payment__emt-value">{memo}</strong>
                    <div className="student-payment__actions--row">
                      <Button variant="secondary" size="sm" onClick={() => void copyText(memo)}>
                        <Copy size={14} /> {t('payment.emtCopyMemo')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="student-payment__hint is-bad">{t('payment.emtNotSet')}</p>
                )}
                <p className="student-payment__hint">{t('payment.emtAfterHint')}</p>

                {!showProof ? (
                  <div className="student-payment__actions">
                    <Button variant="ghost" onClick={handleClose} disabled={processing}>{t('common.cancel')}</Button>
                    <Button variant="primary" disabled={processing} onClick={() => { setShowProof(true); setProofErr(null) }}>
                      {t('payment.iHaveEmt')}
                    </Button>
                  </div>
                ) : (
                  <ProofForm
                    name={proofName} onName={setProofName}
                    phone={proofPhone} onPhone={setProofPhone}
                    note={proofNote} onNote={setProofNote}
                    dataUrl={proofDataUrl} onFile={onProofFile}
                    err={proofErr}
                    submitLabel={t('payment.proofSubmit')}
                    processing={processing}
                    onSubmit={() => void submit()}
                  />
                )}
              </div>
            ) : (
              <div className="student-payment__info">
                <PaymentBrandFrame method={method} size={24} />
                <p>{t('payment.walletFlow', { method: paymentMethodLabel(method, locale) })}</p>
              </div>
            )}

            <div className="student-payment__note">
              <ShieldCheck size={15} />
              <span>{t('payment.instructorConfirm')}</span>
            </div>
          </>
        )}
          </>
        )}
      </div>
    </ModalFrame>
  )
}

/** § payment overhaul: proof form — name / phone / note / optional screenshot. */
function ProofForm({
  name, onName, phone, onPhone, note, onNote, dataUrl, onFile, err, submitLabel, processing, onSubmit,
}: {
  name: string
  onName: (v: string) => void
  phone: string
  onPhone: (v: string) => void
  note: string
  onNote: (v: string) => void
  dataUrl: string | null
  onFile: (f: File | undefined) => void
  err: string | null
  submitLabel: string
  processing: boolean
  onSubmit: () => void
}): JSX.Element {
  const t = useT()
  return (
    <div className="student-card-form student-proof">
      <p className="student-field-label">
        {t('payment.proofName')} *
      </p>
      <input id="proof-name" className="student-card-input" value={name} onChange={(e) => onName(e.target.value)} />
      <p className="student-field-label">
        {t('payment.proofPhone')} *
      </p>
      <input id="proof-phone" className="student-card-input" type="tel" value={phone} onChange={(e) => onPhone(e.target.value)} />
      <p className="student-field-label">
        {t('payment.proofNote')}
      </p>
      <input id="proof-note" className="student-card-input" value={note} onChange={(e) => onNote(e.target.value)} placeholder={t('payment.proofNotePlaceholder')} />
      <p className="student-field-label">{t('payment.proofUpload')}</p>
      <label className="student-payment__proof-upload">
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onFile(e.target.files?.[0])} />
        <span>{dataUrl ? '✓ ' : ''}{t('payment.proofChooseFile')}</span>
      </label>
      {dataUrl ? <img src={dataUrl} alt="" className="student-payment__proof-preview" /> : null}
      {err ? <p className="student-payment__err">{err}</p> : null}
      <div className="student-payment__actions">
        <Button variant="primary" disabled={processing} onClick={onSubmit}>
          {processing ? t('payment.processing') : submitLabel}
        </Button>
      </div>
    </div>
  )
}
