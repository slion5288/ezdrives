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
import { setBank, setEmtEmail, setPayConfig, setWechatId, setWechatQr, useAppState } from '../../data/store'
import type { InstructorBank, PayApiConfig } from '../../data/store'
import { useT } from '../../i18n'
import { Landmark, Mail, Pencil, QrCode, Settings2, Upload } from 'lucide-react'
import { useToast } from '../../components/shared'
import { Button } from '../../components/shared/Button'

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
      toast.push({ tone: 'success', title: t('common.toast.saved') })
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
    toast.push({ tone: 'success', title: t('common.toast.saved') })
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
    toast.push({ tone: 'success', title: t('common.toast.saved') })
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
    toast.push({ tone: 'success', title: t('common.toast.saved') })
  }

  const currentBank = state.instructor.bank ?? {}
  const currentApi = state.instructor.payConfig ?? {}

  // § payment overhaul: WeChat ID (微信号) for mobile students.
  const [editingWechatId, setEditingWechatId] = useState(false)
  const [wechatIdDraft, setWechatIdDraft] = useState('')
  const startEditWechatId = (): void => { setWechatIdDraft(state.instructor.wechatId ?? ''); setEditingWechatId(true) }
  const saveWechatId = (): void => { setWechatId(wechatIdDraft.trim()); setEditingWechatId(false); toast.push({ tone: 'success', title: t('common.toast.saved') }) }

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
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> {t('instructor.wechatQrUpload')}
            </Button>
          </div>
        </div>
        {/* § payment overhaul: WeChat ID — mobile students copy & pay in WeChat */}
        {!editingWechatId ? (
          <div className="ins-settings-row">
            <div>
              <p className="ins-settings-value">{state.instructor.wechatId || '—'}</p>
              <p className="ins-settings-hint">{t('instructor.settings.wechatIdHint')}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={startEditWechatId}>
              <Pencil size={13} /> {t('common.edit')}
            </Button>
          </div>
        ) : (
          <div className="ins-settings-row">
            <input
              className="ins-input"
              value={wechatIdDraft}
              placeholder="my_wechat_id"
              onChange={(e) => setWechatIdDraft(e.target.value)}
            />
            <div className="ins-pay-actions">
              <Button variant="ghost" size="sm" onClick={() => setEditingWechatId(false)}>{t('common.cancel')}</Button>
              <Button variant="primary" size="sm" onClick={saveWechatId}>{t('common.save')}</Button>
            </div>
          </div>
        )}
      </section>

      {/* EMT receiving email */}
      <section className="ins-panel ins-settings">
        <div className="ins-panel-head">
          <h2 className="ins-panel-title">
            <Mail size={16} /> {t('instructor.settings.emtEmail')}
          </h2>
          {!editingEmt ? (
            <Button variant="secondary" size="sm" onClick={startEditEmt}>
              <Pencil size={14} /> {t('common.edit')}
            </Button>
          ) : null}
        </div>
        {editingEmt ? (
          <>
            <label className="ins-field-label" htmlFor="recv-emt">{t('instructor.settings.emtEmail')}</label>
            <div className="ins-settings-row">
              <input
                id="recv-emt"
                className="ins-input"
                type="email"
                placeholder="you@bank.ca"
                value={emt}
                onChange={(e) => setEmt(e.target.value)}
              />
            </div>
            <div className="ins-settings-row">
              <Button variant="secondary" onClick={cancelEmt}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" onClick={saveEmt}>
                {t('common.save')}
              </Button>
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
            <Button variant="secondary" size="sm" onClick={startEditBank}>
              <Pencil size={14} /> {t('common.edit')}
            </Button>
          ) : null}
        </div>
        {editingBank ? (
          <>
            <div className="ins-settings-grid">
              <div className="ins-field">
                <label className="ins-field-label" htmlFor="recv-bank-name">{t('instructor.settings.bankName')}</label>
                <input id="recv-bank-name" className="ins-input" value={bank.bankName ?? ''} onChange={(e) => setBankForm({ ...bank, bankName: e.target.value })} />
              </div>
              <div className="ins-field">
                <label className="ins-field-label" htmlFor="recv-holder">{t('instructor.settings.holderName')}</label>
                <input id="recv-holder" className="ins-input" value={bank.holderName ?? ''} onChange={(e) => setBankForm({ ...bank, holderName: e.target.value })} />
              </div>
              <div className="ins-field">
                <label className="ins-field-label" htmlFor="recv-transit">{t('instructor.settings.transit')}</label>
                <input id="recv-transit" className="ins-input tabular-nums" value={bank.transit ?? ''} onChange={(e) => setBankForm({ ...bank, transit: e.target.value })} />
              </div>
              <div className="ins-field">
                <label className="ins-field-label" htmlFor="recv-institution">{t('instructor.settings.institution')}</label>
                <input id="recv-institution" className="ins-input tabular-nums" value={bank.institution ?? ''} onChange={(e) => setBankForm({ ...bank, institution: e.target.value })} />
              </div>
              <div className="ins-field">
                <label className="ins-field-label" htmlFor="recv-account">{t('instructor.settings.account')}</label>
                <input id="recv-account" className="ins-input tabular-nums" value={bank.account ?? ''} onChange={(e) => setBankForm({ ...bank, account: e.target.value })} />
              </div>
            </div>
            <div className="ins-settings-row">
              <Button variant="secondary" onClick={cancelBank}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" onClick={saveBank}>
                {t('common.save')}
              </Button>
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
            <Button variant="secondary" size="sm" onClick={startEditApi}>
              <Pencil size={14} /> {t('common.edit')}
            </Button>
          ) : null}
        </div>
        {editingApi ? (
          <>
            <div className="ins-settings-grid">
              <div className="ins-field">
                <label className="ins-field-label" htmlFor="recv-stripe-key">Stripe · {t('instructor.settings.stripeKey')}</label>
                <input
                  id="recv-stripe-key"
                  className="ins-input tabular-nums"
                  placeholder="pk_test_… / pk_live_…"
                  value={api.stripeKey ?? ''}
                  onChange={(e) => setApi({ ...api, stripeKey: e.target.value })}
                />
              </div>
              <div className="ins-field">
                <label className="ins-field-label" htmlFor="recv-stripe-url">Stripe · {t('instructor.settings.stripeUrl')}</label>
                <input
                  id="recv-stripe-url"
                  className="ins-input tabular-nums"
                  placeholder="https://your-backend.com/api/stripe-intent"
                  value={api.stripeUrl ?? ''}
                  onChange={(e) => setApi({ ...api, stripeUrl: e.target.value })}
                />
              </div>
              <div className="ins-field">
                <label className="ins-field-label" htmlFor="recv-paypal-id">PayPal · {t('instructor.settings.paypalId')}</label>
                <input
                  id="recv-paypal-id"
                  className="ins-input tabular-nums"
                  placeholder="Client ID"
                  value={api.paypalClientId ?? ''}
                  onChange={(e) => setApi({ ...api, paypalClientId: e.target.value })}
                />
              </div>
              <div className="ins-field">
                <label className="ins-field-label" htmlFor="recv-paypal-url">PayPal · {t('instructor.settings.paypalUrl')}</label>
                <input
                  id="recv-paypal-url"
                  className="ins-input tabular-nums"
                  placeholder="https://your-backend.com/api/paypal-order"
                  value={api.paypalUrl ?? ''}
                  onChange={(e) => setApi({ ...api, paypalUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="ins-settings-row">
              <Button variant="secondary" onClick={cancelApi}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" onClick={saveApi}>
                {t('common.save')}
              </Button>
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
