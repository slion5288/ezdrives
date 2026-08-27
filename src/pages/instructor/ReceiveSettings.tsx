// ============================================================================
// EZDRIVES — Instructor ReceiveSettings (收款设置, instructor-owned)
// How the instructor receives money: WeChat receive QR, Interac e-Transfer
// email, bank account and Stripe/PayPal API credentials. Everything saved here
// is shown to students in the payment modal exactly as configured.
//
// Edit/save pattern (mainstream): each section is read-only by default with an
// 编辑 button; clicking it opens the form PRE-FILLED with the current values
// plus 保存 / 取消 buttons — 取消 discards the edits and returns to the
// read-only summary untouched, so accidental clicks never lose information.
// ============================================================================

import { useRef, useState } from 'react'
import { setBank, setEmtEmail, setPayConfig, setWechatQr, useAppState } from '../../data/store'
import type { InstructorBank, PayApiConfig } from '../../data/store'
import { useT } from '../../i18n'
import { Landmark, Mail, Pencil, QrCode, Settings2, Upload } from 'lucide-react'
import { useToast } from './toast'

export default function ReceiveSettings(): JSX.Element {
  const t = useT()
  const state = useAppState()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [qr, setQr] = useState<string | null>(state.instructor.wechatQr ?? null)

  // EMT email
  const [editingEmt, setEditingEmt] = useState(false)
  const [emt, setEmt] = useState('')
  // Bank account
  const [editingBank, setEditingBank] = useState(false)
  const [bank, setBankForm] = useState<InstructorBank>({})
  // API credentials
  const [editingApi, setEditingApi] = useState(false)
  const [api, setApi] = useState<PayApiConfig>({})

  const onUpload = (file: File | undefined): void => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '')
      setWechatQr(dataUrl)
      setQr(dataUrl)
      toast({ tone: 'success', title: t('common.toast.saved') })
    }
    reader.readAsDataURL(file)
  }

  const startEditEmt = (): void => {
    setEmt(state.instructor.emtEmail ?? '')
    setEditingEmt(true)
  }

  const cancelEmt = (): void => setEditingEmt(false)

  const saveEmt = (): void => {
    setEmtEmail(emt.trim())
    setEditingEmt(false)
    toast({ tone: 'success', title: t('common.toast.saved') })
  }

  const startEditBank = (): void => {
    setBankForm(state.instructor.bank ?? {})
    setEditingBank(true)
  }

  const cancelBank = (): void => setEditingBank(false)

  const saveBank = (): void => {
    setBank({
      bankName: bank.bankName?.trim() ?? '',
      holderName: bank.holderName?.trim() ?? '',
      transit: bank.transit?.trim() ?? '',
      institution: bank.institution?.trim() ?? '',
      account: bank.account?.trim() ?? '',
    })
    setEditingBank(false)
    toast({ tone: 'success', title: t('common.toast.saved') })
  }

  const startEditApi = (): void => {
    setApi(state.instructor.payConfig ?? {})
    setEditingApi(true)
  }

  const cancelApi = (): void => setEditingApi(false)

  const saveApi = (): void => {
    setPayConfig({
      stripeKey: api.stripeKey?.trim() ?? '',
      stripeUrl: api.stripeUrl?.trim() ?? '',
      paypalClientId: api.paypalClientId?.trim() ?? '',
      paypalUrl: api.paypalUrl?.trim() ?? '',
    })
    setEditingApi(false)
    toast({ tone: 'success', title: t('common.toast.saved') })
  }

  const currentBank = state.instructor.bank ?? {}
  const currentApi = state.instructor.payConfig ?? {}

  return (
    <>
      {/* WeChat receive QR settings */}
      <section className="ins-panel ins-panel--qr">
        <div className="ins-panel-head">
          <h2 className="ins-panel-title">
            <QrCode size={16} /> {t('instructor.wechatQr')}
          </h2>
        </div>
        <div className="ins-qr-row">
          <div className="ins-qr-preview">
            {qr ? <img src={qr} alt={t('instructor.wechatQr')} /> : <QrCode size={40} />}
          </div>
          <div className="ins-qr-info">
            <p className="ins-qr-hint">{t('instructor.wechatQrHint')}</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="visually-hidden"
              onChange={(e) => onUpload(e.target.files?.[0])}
            />
            <button type="button" className="ins-btn ins-btn--secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> {t('instructor.wechatQrUpload')}
            </button>
          </div>
        </div>
      </section>

      {/* EMT receiving email */}
      <section className="ins-panel ins-settings">
        <div className="ins-panel-head">
          <h2 className="ins-panel-title">
            <Mail size={16} /> {t('instructor.settings.emtEmail')}
          </h2>
          {!editingEmt ? (
            <button type="button" className="ins-btn ins-btn--secondary ins-btn--sm" onClick={startEditEmt}>
              <Pencil size={14} /> {t('common.edit')}
            </button>
          ) : null}
        </div>
        {editingEmt ? (
          <>
            <div className="ins-settings-row">
              <input
                className="ins-input"
                type="email"
                placeholder="you@bank.ca"
                value={emt}
                onChange={(e) => setEmt(e.target.value)}
              />
            </div>
            <div className="ins-settings-row">
              <button type="button" className="ins-btn ins-btn--secondary" onClick={cancelEmt}>
                {t('common.cancel')}
              </button>
              <button type="button" className="ins-btn ins-btn--primary" onClick={saveEmt}>
                {t('common.save')}
              </button>
            </div>
          </>
        ) : (
          <p className="ins-settings-value">{state.instructor.emtEmail || '—'}</p>
        )}
        <p className="ins-qr-hint">{t('instructor.settings.emtHint')}</p>
      </section>

      {/* Bank account */}
      <section className="ins-panel ins-settings">
        <div className="ins-panel-head">
          <h2 className="ins-panel-title">
            <Landmark size={16} /> {t('instructor.settings.bank')}
          </h2>
          {!editingBank ? (
            <button type="button" className="ins-btn ins-btn--secondary ins-btn--sm" onClick={startEditBank}>
              <Pencil size={14} /> {t('common.edit')}
            </button>
          ) : null}
        </div>
        {editingBank ? (
          <>
            <div className="ins-settings-grid">
              <div className="ins-field">
                <span className="ins-field-label">{t('instructor.settings.bankName')}</span>
                <input className="ins-input" value={bank.bankName ?? ''} onChange={(e) => setBankForm({ ...bank, bankName: e.target.value })} />
              </div>
              <div className="ins-field">
                <span className="ins-field-label">{t('instructor.settings.holderName')}</span>
                <input className="ins-input" value={bank.holderName ?? ''} onChange={(e) => setBankForm({ ...bank, holderName: e.target.value })} />
              </div>
              <div className="ins-field">
                <span className="ins-field-label">{t('instructor.settings.transit')}</span>
                <input className="ins-input tabular-nums" value={bank.transit ?? ''} onChange={(e) => setBankForm({ ...bank, transit: e.target.value })} />
              </div>
              <div className="ins-field">
                <span className="ins-field-label">{t('instructor.settings.institution')}</span>
                <input className="ins-input tabular-nums" value={bank.institution ?? ''} onChange={(e) => setBankForm({ ...bank, institution: e.target.value })} />
              </div>
              <div className="ins-field">
                <span className="ins-field-label">{t('instructor.settings.account')}</span>
                <input className="ins-input tabular-nums" value={bank.account ?? ''} onChange={(e) => setBankForm({ ...bank, account: e.target.value })} />
              </div>
            </div>
            <div className="ins-settings-row">
              <button type="button" className="ins-btn ins-btn--secondary" onClick={cancelBank}>
                {t('common.cancel')}
              </button>
              <button type="button" className="ins-btn ins-btn--primary" onClick={saveBank}>
                {t('common.save')}
              </button>
            </div>
          </>
        ) : (
          <div className="ins-settings-view">
            <p className="ins-settings-value">
              {[currentBank.bankName, currentBank.holderName].filter(Boolean).join(' · ') || '—'}
            </p>
            <p className="ins-settings-value tabular-nums">
              {currentBank.transit || '—'} / {currentBank.institution || '—'} / {currentBank.account || '—'}
            </p>
          </div>
        )}
      </section>

      {/* Online payment API credentials */}
      <section className="ins-panel ins-settings">
        <div className="ins-panel-head">
          <h2 className="ins-panel-title">
            <Settings2 size={16} /> {t('instructor.settings.api')}
          </h2>
          {!editingApi ? (
            <button type="button" className="ins-btn ins-btn--secondary ins-btn--sm" onClick={startEditApi}>
              <Pencil size={14} /> {t('common.edit')}
            </button>
          ) : null}
        </div>
        {editingApi ? (
          <>
            <div className="ins-settings-grid">
              <div className="ins-field">
                <span className="ins-field-label">Stripe · {t('instructor.settings.stripeKey')}</span>
                <input
                  className="ins-input tabular-nums"
                  placeholder="pk_test_… / pk_live_…"
                  value={api.stripeKey ?? ''}
                  onChange={(e) => setApi({ ...api, stripeKey: e.target.value })}
                />
              </div>
              <div className="ins-field">
                <span className="ins-field-label">Stripe · {t('instructor.settings.stripeUrl')}</span>
                <input
                  className="ins-input tabular-nums"
                  placeholder="https://your-backend.com/api/stripe-intent"
                  value={api.stripeUrl ?? ''}
                  onChange={(e) => setApi({ ...api, stripeUrl: e.target.value })}
                />
              </div>
              <div className="ins-field">
                <span className="ins-field-label">PayPal · {t('instructor.settings.paypalId')}</span>
                <input
                  className="ins-input tabular-nums"
                  placeholder="Client ID"
                  value={api.paypalClientId ?? ''}
                  onChange={(e) => setApi({ ...api, paypalClientId: e.target.value })}
                />
              </div>
              <div className="ins-field">
                <span className="ins-field-label">PayPal · {t('instructor.settings.paypalUrl')}</span>
                <input
                  className="ins-input tabular-nums"
                  placeholder="https://your-backend.com/api/paypal-order"
                  value={api.paypalUrl ?? ''}
                  onChange={(e) => setApi({ ...api, paypalUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="ins-settings-row">
              <button type="button" className="ins-btn ins-btn--secondary" onClick={cancelApi}>
                {t('common.cancel')}
              </button>
              <button type="button" className="ins-btn ins-btn--primary" onClick={saveApi}>
                {t('common.save')}
              </button>
            </div>
          </>
        ) : (
          <p className="ins-settings-value">
            {[
              currentApi.stripeKey ? `Stripe ${t('instructor.settings.stripeKey')}: ${maskCredential(currentApi.stripeKey)}` : '',
              currentApi.paypalClientId ? `PayPal: ${maskCredential(currentApi.paypalClientId)}` : '',
            ]
              .filter(Boolean)
              .join(' · ') || '—'}
          </p>
        )}
        <p className="ins-qr-hint">{t('instructor.settings.apiHint')}</p>
      </section>
    </>
  )
}

/** Show only the tail of a credential for a read-only summary. */
function maskCredential(value: string): string {
  if (value.length <= 6) return '••••'
  return `••••${value.slice(-4)}`
}
