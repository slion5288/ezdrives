// ============================================================================
// EZDRIVES — AdminTemplates (notification templates manager, admin tab)
// Lists every email template; edit subject/body (plain + HTML), preview with
// sample data, send a test email, enable/disable, and view the send log.
// Integrated into the existing /admin dashboard (no second admin system).
// ============================================================================

import { useEffect, useState } from 'react'
import { Copy, Eye, Mail, RefreshCw, Send, ShieldCheck } from 'lucide-react'
import { apiAdminGetTemplates, apiAdminGetLogs, apiAdminPutTemplate, apiAdminTemplateAction } from '../../data/api'
import './admin.css'

interface Template {
  id: string
  type: string
  name: string
  subject: string
  html_body: string
  text_body: string
  enabled: boolean
  is_system: boolean
  updated_at: string
}
interface EmailStatus { provider: string; domain: string; from: string; configured: boolean }
interface LogEntry { id: string; type: string; recipient_email: string; subject: string; status: string; error_message: string; sent_at: string; created_at: string }

const zh = (key: string): string => {
  const map: Record<string, string> = {
    'tpl.title': '通知模板',
    'tpl.hint': '修改邮件内容后保存即生效，无需重新部署。{{变量}} 会在发送时替换为真实数据。',
    'tpl.status': 'Email 状态',
    'tpl.notConfigured': '⚠️ Email 服务未配置（Cloudflare Email Sending binding 缺失或未完成设置）——邮件不会发送，但业务不受影响。请按 CLOUDFLARE_EMAIL_SETUP.md 配置。',
    'tpl.configured': '已连接',
    'tpl.from': '发件人',
    'tpl.name': '名称',
    'tpl.type': '类型',
    'tpl.subject': '主题',
    'tpl.enabled': '启用',
    'tpl.system': '系统',
    'tpl.updated': '更新时间',
    'tpl.edit': '编辑',
    'tpl.preview': '预览',
    'tpl.save': '保存',
    'tpl.saved': '已保存',
    'tpl.variables': '可用变量（点击复制）',
    'tpl.copy': '已复制',
    'tpl.unknownVar': '⚠️ 包含不存在的变量',
    'tpl.test': '发送测试邮件',
    'tpl.testTo': '测试邮箱',
    'tpl.testSent': '测试邮件已发送',
    'tpl.testFail': '发送失败：',
    'tpl.logs': '发送日志',
    'tpl.logsEmpty': '暂无发送记录',
    'tpl.logStatus': '状态',
    'tpl.securityLocked': '安全模板不可禁用',
    'tpl.close': '关闭',
  }
  return map[key] ?? key
}

export default function AdminTemplates({ token }: { token: string }): JSX.Element {
  const [templates, setTemplates] = useState<Template[]>([])
  const [variables, setVariables] = useState<string[]>([])
  const [status, setStatus] = useState<EmailStatus | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Template | null>(null)
  const [preview, setPreview] = useState<{ subject: string; html: string; text: string; unknown: string[] } | null>(null)
  const [testTo, setTestTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const load = (): void => {
    apiAdminGetTemplates(token).then((res) => {
      if (!res.ok) return
      setTemplates((res.templates || []) as Template[])
      setVariables(res.variables || [])
      setStatus(res.emailStatus || null)
    }).catch(() => undefined)
  }

  useEffect(() => {
    load()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const select = (t: Template): void => {
    setSelectedId(t.id)
    setDraft({ ...t })
    setPreview(null)
  }

  const save = async (): Promise<void> => {
    if (!draft) return
    setBusy(true)
    const res = await apiAdminPutTemplate(token, { id: draft.id, subject: draft.subject, html_body: draft.html_body, text_body: draft.text_body, enabled: draft.enabled })
    setBusy(false)
    if (res.ok) {
      setNotice(zh('tpl.saved'))
      setSelectedId(null)
      setDraft(null)
      load()
    } else {
      setNotice(res.error || zh('tpl.saved'))
    }
  }

  const runPreview = async (): Promise<void> => {
    if (!draft) return
    const res = await apiAdminTemplateAction(token, 'preview', { subject: draft.subject, html_body: draft.html_body, text_body: draft.text_body })
    if (res.ok && res.preview) setPreview(res.preview)
  }

  const sendTest = async (): Promise<void> => {
    if (!draft) return
    setBusy(true)
    const res = await apiAdminTemplateAction(token, 'test', { type: draft.type, to: testTo })
    setBusy(false)
    setNotice(res.ok ? zh('tpl.testSent') : zh('tpl.testFail') + (res.error || ''))
  }

  const copyVar = (v: string): void => {
    void navigator.clipboard?.writeText(`{{${v}}}`).then(() => setNotice(zh('tpl.copy'))).catch(() => undefined)
  }

  const selected = templates.find((t) => t.id === selectedId) || null

  return (
    <div className="admin-card">
      <div className="admin-card__head">
        <div>
          <div className="admin-card__title">
            <Mail size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />{zh('tpl.title')}
          </div>
          <div className="admin-card__sub">{zh('tpl.hint')}</div>
          {status ? (
            <p className="admin-card__sub" style={{ marginTop: 6 }}>
              {zh('tpl.status')}: {status.configured ? `🟢 ${zh('tpl.configured')}` : `🔴 ${zh('tpl.notConfigured')}`}
              {status.configured ? ` · ${zh('tpl.from')}: ${status.from}` : ''}
            </p>
          ) : null}
        </div>
        <div className="admin-actions" style={{ marginTop: 0 }}>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => { setShowLogs((v) => !v); if (!showLogs) { apiAdminGetLogs(token).then((r) => { if (r.ok) setLogs((r.logs || []) as LogEntry[]) }).catch(() => undefined) } }}>
            {zh('tpl.logs')}
          </button>
        </div>
      </div>
      {notice ? <p className="admin-login__error" style={{ color: 'var(--color-success)' }}>{notice}</p> : null}

      {showLogs ? (
        <div className="admin-card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="admin-card__title" style={{ fontSize: 'var(--font-size-sm)' }}>{zh('tpl.logs')}</div>
          {logs.length === 0 ? (
            <p className="admin-card__sub">{zh('tpl.logsEmpty')}</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr>
                  <th style={thStyle}>{zh('tpl.type')}</th>
                  <th style={thStyle}>{zh('tpl.from')}</th>
                  <th style={thStyle}>{zh('tpl.subject')}</th>
                  <th style={thStyle}>{zh('tpl.logStatus')}</th>
                  <th style={thStyle}>{zh('tpl.updated')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td style={tdStyle}>{l.type}</td>
                    <td style={tdStyle}>{l.recipient_email}</td>
                    <td style={tdStyle}>{l.subject}</td>
                    <td style={tdStyle}>
                      <span style={{ color: l.status === 'sent' ? 'var(--color-success)' : l.status === 'pending' ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                        {l.status}
                      </span>
                      {l.error_message ? <span style={{ color: 'var(--color-danger)', marginLeft: 6 }}>{l.error_message}</span> : null}
                    </td>
                    <td style={tdStyle}>{l.sent_at || l.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {!selected || !draft ? (
        <div className="admin-tpl-list">
          {templates.map((t) => (
            <div key={t.id} className="admin-tpl-row">
              <div className="admin-tpl-main">
                <div className="admin-tpl-name">
                  {t.name}
                  {t.is_system ? <ShieldCheck size={13} style={{ verticalAlign: '-2px', marginLeft: 6, color: 'var(--color-text-muted)' }} /> : null}
                </div>
                <div className="admin-tpl-type">{t.type}</div>
              </div>
              <div className="admin-tpl-subject">{t.subject}</div>
              <span className={`admin-tpl-state${t.enabled ? ' is-on' : ''}`}>{t.enabled ? zh('tpl.enabled') : '—'}</span>
              <span className="admin-tpl-date">{t.updated_at ? t.updated_at.slice(0, 16) : ''}</span>
              <div className="admin-tpl-actions">
                <button type="button" className="admin-btn admin-btn--secondary" onClick={() => select(t)}>
                  <Eye size={14} /> {zh('tpl.edit')}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div className="admin-field-grid">
            <div className="admin-field">
              <span className="admin-label">{zh('tpl.type')}</span>
              <div className="admin-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{draft.type}</span>
                {draft.type === 'PASSWORD_RESET' || draft.type === 'IMPORTANT_ACCOUNT' ? (
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{zh('tpl.securityLocked')}</span>
                ) : null}
              </div>
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor="tpl-subject">{zh('tpl.subject')}</label>
              <input id="tpl-subject" className="admin-input" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
            </div>
            <div className="admin-field admin-field--wide">
              <label className="admin-label" htmlFor="tpl-html">{zh('tpl.subject')} · HTML</label>
              <textarea id="tpl-html" className="admin-textarea" rows={8} value={draft.html_body} onChange={(e) => setDraft({ ...draft, html_body: e.target.value })} />
            </div>
            <div className="admin-field admin-field--wide">
              <label className="admin-label" htmlFor="tpl-text">{zh('tpl.subject')} · Text</label>
              <textarea id="tpl-text" className="admin-textarea" rows={4} value={draft.text_body} onChange={(e) => setDraft({ ...draft, text_body: e.target.value })} />
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor="tpl-enabled">{zh('tpl.enabled')}</label>
              <select
                id="tpl-enabled"
                className="admin-input"
                value={draft.enabled ? '1' : '0'}
                disabled={(draft.type === 'PASSWORD_RESET' || draft.type === 'IMPORTANT_ACCOUNT') && draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.value === '1' })}
              >
                <option value="1">{zh('tpl.enabled')}</option>
                <option value="0">—</option>
              </select>
            </div>
          </div>

          {variables.length > 0 ? (
            <div className="admin-tpl-vars">
              <div className="admin-label">{zh('tpl.variables')}</div>
              <div className="admin-tpl-var-list">
                {variables.map((v) => (
                  <button key={v} type="button" className="admin-tpl-var" onClick={() => copyVar(v)}>
                    <Copy size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />
                    {'{{'}{v}{'}}'}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {preview ? (
            <div className="admin-tpl-preview">
              <div className="admin-label">
                {zh('tpl.preview')}
                {preview.unknown.length > 0 ? <span style={{ color: 'var(--color-danger)', marginLeft: 8 }}>{zh('tpl.unknownVar')}: {preview.unknown.join(', ')}</span> : null}
              </div>
              <div className="admin-tpl-preview-subject">{preview.subject}</div>
              {preview.html ? (
                <div className="admin-tpl-preview-body" dangerouslySetInnerHTML={{ __html: preview.html }} />
              ) : (
                <pre className="admin-tpl-preview-body" style={{ whiteSpace: 'pre-wrap' }}>{preview.text}</pre>
              )}
            </div>
          ) : null}

          <div className="admin-actions" style={{ marginTop: 'var(--space-4)' }}>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setSelectedId(null)}>
              {zh('tpl.close')}
            </button>
            <button type="button" className="admin-btn admin-btn--secondary" disabled={busy} onClick={() => void runPreview()}>
              <Eye size={14} /> {zh('tpl.preview')}
            </button>
            <input
              className="admin-input"
              style={{ maxWidth: 220, display: 'inline-block' }}
              type="email"
              placeholder={zh('tpl.testTo')}
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
            <button type="button" className="admin-btn admin-btn--secondary" disabled={busy || !testTo.trim()} onClick={() => void sendTest()}>
              <Send size={14} /> {zh('tpl.test')}
            </button>
            <button type="button" className="admin-btn admin-btn--primary" disabled={busy} onClick={() => void save()}>
              <RefreshCw size={14} /> {zh('tpl.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }
const tdStyle: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--color-border)' }
