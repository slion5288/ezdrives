// ============================================================================
// EZDRIVES — AdminPage (site content manager, /admin)
// Login (username + password) → dashboard with three tabs:
//  · 首页文案 — shows the CURRENT effective text (default or override) and lets
//    the admin edit CHINESE ONLY; English is machine-translated on save
//    (POST /api/admin/translate). Empty field = restore the default wording.
//  · 首页图片 — hero slide uploads (client-resized to data URLs)
//  · 教练管理 — homepage instructor cards (add / edit / remove); bio is
//    Chinese-only too, English auto-translated on save.
// Saved via PUT /api/admin/content; public visitors read the same payload
// through GET /api/public/home.
//
// The admin UI is intentionally fixed to Simplified Chinese (the admin only
// reads Chinese), regardless of the site's visitor locale.
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ImagePlus, KeyRound, LogOut, Mail, Plus, Save, Trash2, Type, Users } from 'lucide-react'
import type { FormEvent } from 'react'
import { apiAdminChangePassword, apiAdminGetContent, apiAdminLogin, apiAdminPutContent, apiAdminTranslate, apiPublicHome } from '../../data/api'
import { getAdminToken, setAdminToken } from '../../data/store'
import type { HomeInstructor } from '../../data/store'
import { messages as zhMessages } from '../../i18n/locales/zh'
import { messages as enMessages } from '../../i18n/locales/en'
import { ThemeToggle } from '../../components/shared/ThemeToggle'
import { Logo } from '../../components/shared/Logo'
import { useToast } from '../../components/shared'
import AdminTemplates from './AdminTemplates'
import './admin.css'

type Tab = 'text' | 'images' | 'instructors' | 'templates'

/** Fixed Chinese admin UI labels (interpolation for {var}). */
function zh(key: string, vars?: Record<string, string | number>): string {
  let s = (zhMessages as Record<string, string>)[key]
  if (s === undefined) s = key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}

/**
 * zh → en machine translation used on save.
 * 1) Backend /api/admin/translate (Google Cloud Translation when the
 *    GOOGLE_TRANSLATE_API_KEY secret is configured; free fallbacks otherwise).
 *    From the Cloudflare edge the free fallbacks are rate-limited, so if the
 *    backend cannot produce a result we fall back to the browser directly
 *    calling MyMemory (CORS *), which works from the admin's residential IP.
 */
async function translateZhToEn(token: string, texts: string[]): Promise<string[] | null> {
  if (texts.length === 0) return []
  const res = await apiAdminTranslate(token, texts).catch(() => null)
  if (
    res?.ok &&
    Array.isArray(res.translations) &&
    res.translations.length === texts.length &&
    res.translations.every((t) => typeof t === 'string' && t.trim().length > 0)
  ) {
    return res.translations
  }
  // Browser-direct fallback (MyMemory free API, CORS *).
  const out: string[] = []
  const worker = async (i: number): Promise<void> => {
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(texts[i])}&langpair=zh-CN|en`)
      if (!r.ok) throw new Error('http ' + r.status)
      const d = await r.json()
      if (d?.responseStatus !== 200) throw new Error('resp ' + d?.responseStatus)
      out[i] = (d?.responseData?.translatedText || '').trim()
    } catch {
      out[i] = ''
    }
  }
  let cursor = 0
  const run = async (): Promise<void> => {
    while (cursor < texts.length) {
      const i = cursor++
      await worker(i)
    }
  }
  await Promise.all([run(), run(), run()])
  return out.every((t) => t) ? out : null
}

interface TextField {
  key: string
  label: string // Chinese label
  area?: boolean
  /** Default value comes from the live instructor profile (not i18n). */
  special?: 'instructorName' | 'instructorBio'
}

const TEXT_FIELDS: TextField[] = [
  { key: 'landing.hero.title', label: '首页主标题' },
  { key: 'landing.hero.subtitle', label: '首页副标题', area: true },
  { key: 'landing.steps.1.title', label: '步骤1 · 标题' },
  { key: 'landing.steps.1.body', label: '步骤1 · 内容', area: true },
  { key: 'landing.steps.2.title', label: '步骤2 · 标题' },
  { key: 'landing.steps.2.body', label: '步骤2 · 内容', area: true },
  { key: 'landing.steps.3.title', label: '步骤3 · 标题' },
  { key: 'landing.steps.3.body', label: '步骤3 · 内容', area: true },
  { key: 'landing.courses.subtitle', label: '课程栏目副标题' },
  { key: 'landing.videos.subtitle', label: '视频栏目副标题' },
  { key: 'instructor.name', label: '教练 · 姓名（英文不变）', special: 'instructorName' },
  { key: 'instructor.bio', label: '教练 · 简介', area: true, special: 'instructorBio' },
  { key: 'landing.testimonials.1.quote', label: '评价1 · 内容', area: true },
  { key: 'landing.testimonials.1.author', label: '评价1 · 署名' },
  { key: 'landing.testimonials.2.quote', label: '评价2 · 内容', area: true },
  { key: 'landing.testimonials.2.author', label: '评价2 · 署名' },
  { key: 'landing.testimonials.3.quote', label: '评价3 · 内容', area: true },
  { key: 'landing.testimonials.3.author', label: '评价3 · 署名' },
  { key: 'landing.faq.1.q', label: '常见问题1 · 问题' },
  { key: 'landing.faq.1.a', label: '常见问题1 · 回答', area: true },
  { key: 'landing.faq.2.q', label: '常见问题2 · 问题' },
  { key: 'landing.faq.2.a', label: '常见问题2 · 回答', area: true },
  { key: 'landing.faq.3.q', label: '常见问题3 · 问题' },
  { key: 'landing.faq.3.a', label: '常见问题3 · 回答', area: true },
  { key: 'landing.faq.4.q', label: '常见问题4 · 问题' },
  { key: 'landing.faq.4.a', label: '常见问题4 · 回答', area: true },
  { key: 'landing.cta.band.title', label: '底部横幅 · 标题' },
  { key: 'landing.cta.band.body', label: '底部横幅 · 内容', area: true },
  { key: 'landing.footer.tagline', label: '页脚标语' },
]

interface PubInstructorBio {
  en: string
  zh: string
}
interface PubInstructor {
  name?: string
  bio?: PubInstructorBio | string
  avatarColor?: string
}

/** Downscale an image file to a JPEG data URL (max width), for hero slides. */
function fileToDataUrl(file: File, maxWidth: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('canvas unavailable'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = () => reject(new Error('image load failed'))
      img.src = String(reader.result)
    }
    reader.onerror = () => reject(new Error('file read failed'))
    reader.readAsDataURL(file)
  })
}

export default function AdminPage(): JSX.Element {
  const [token, setToken] = useState<string>(() => getAdminToken())
  return token ? <AdminDashboard token={token} onLogout={() => { setAdminToken(''); setToken('') }} /> : <AdminLogin onLoggedIn={setToken} />
}

// ---------------------------------------------------------------------------

function AdminLogin({ onLoggedIn }: { onLoggedIn: (token: string) => void }): JSX.Element {
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError(zh('admin.loginError'))
      return
    }
    setBusy(true)
    setError(null)
    const res = await apiAdminLogin(username.trim(), password)
    setBusy(false)
    if (res.ok && res.token) {
      setAdminToken(res.token)
      onLoggedIn(res.token)
      toast.success(zh('admin.welcome'))
    } else {
      setError(zh('admin.loginError'))
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header__inner">
          <Link to="/" className="admin-header__brand" aria-label={zh('nav.home')}>
            <Logo size="sm" />
          </Link>
          <span className="admin-header__title">{zh('admin.title')}</span>
          <div className="admin-header__spacer" />
          <div className="admin-header__actions">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="admin-login">
        <form className="admin-login__card" onSubmit={(e) => void submit(e)}>
          <h1 className="admin-login__title">{zh('admin.login.title')}</h1>
          <p className="admin-login__sub">{zh('admin.login.sub')}</p>
          <div className="admin-field">
            <label className="admin-label" htmlFor="admin-user">
              {zh('admin.username')}
            </label>
            <input id="admin-user" className="admin-input" value={username} autoComplete="username" onChange={(e) => { setUsername(e.target.value); setError(null) }} />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="admin-pass">
              {zh('admin.password')}
            </label>
            <input id="admin-pass" className="admin-input" type="password" value={password} autoComplete="current-password" onChange={(e) => { setPassword(e.target.value); setError(null) }} />
          </div>
          {error ? <p className="admin-login__error">{error}</p> : null}
          <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>
            {busy ? zh('auth.login.loading') : zh('admin.login.submit')}
          </button>
          <Link to="/" className="admin-login__back">
            <ArrowLeft size={14} aria-hidden="true" /> {zh('auth.back')}
          </Link>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }): JSX.Element {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('text')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Password change card
  const [pwOpen, setPwOpen] = useState(false)
  const [pwOld, setPwOld] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  // Draft state
  const [overrides, setOverrides] = useState<Record<string, { en: string; zh: string }>>({})
  const [heroImages, setHeroImages] = useState<(string | null)[]>(Array(6).fill(null))
  const [instructors, setInstructors] = useState<HomeInstructor[]>([])
  const [pubInstructor, setPubInstructor] = useState<PubInstructor | null>(null)
  const initialInstructors = useRef<HomeInstructor[]>([])
  const fileInputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    let alive = true
    Promise.all([apiAdminGetContent(token), apiPublicHome()])
      .then(([c, ph]) => {
        if (!alive) return
        const pubState = ph?.state as { instructor?: PubInstructor } | undefined
        setPubInstructor(pubState?.instructor ?? null)
        if (c.ok && c.content) {
          setOverrides(c.content.overrides || {})
          const hero = c.content.heroImages || []
          setHeroImages(Array.from({ length: 6 }, (_, i) => (hero && typeof hero[i] === 'string' && hero[i] ? (hero[i] as string) : null)))
          const ins = (c.content.instructors || []) as HomeInstructor[]
          setInstructors(ins)
          initialInstructors.current = ins
        }
      })
      .catch(() => undefined)
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [token])

  // --- default (non-overridden) values, per field --------------------------
  const defZh = (f: TextField): string => {
    if (f.special === 'instructorName') return pubInstructor?.name ?? ''
    if (f.special === 'instructorBio') return typeof pubInstructor?.bio === 'string' ? pubInstructor.bio : (pubInstructor?.bio?.zh ?? '')
    return (zhMessages as Record<string, string>)[f.key] ?? ''
  }
  const defEn = (f: TextField): string => {
    if (f.special === 'instructorName') return pubInstructor?.name ?? ''
    if (f.special === 'instructorBio') return typeof pubInstructor?.bio === 'string' ? pubInstructor.bio : (pubInstructor?.bio?.en ?? '')
    return (enMessages as Record<string, string>)[f.key] ?? ''
  }
  const currentZh = (f: TextField): string => overrides[f.key]?.zh ?? defZh(f)
  const currentEn = (f: TextField): string => overrides[f.key]?.en ?? defEn(f)

  const setOverrideZh = (key: string, value: string): void =>
    setOverrides((prev) => ({ ...prev, [key]: { en: prev[key]?.en ?? '', zh: value } }))

  // --- build the next overrides: translate changed Chinese to English ------
  const buildTextOverrides = async (): Promise<Record<string, { en: string; zh: string }> | null> => {
    const next: Record<string, { en: string; zh: string }> = {}
    const toTranslate: string[] = []
    const translateKeys: string[] = []
    for (const f of TEXT_FIELDS) {
      const zhVal = (overrides[f.key]?.zh ?? '').trim()
      const def = defZh(f).trim()
      if (!zhVal || zhVal === def) continue // empty or unchanged → restore default (omit)
      if (f.special === 'instructorName') { next[f.key] = { en: zhVal, zh: zhVal }; continue } // proper noun, no translation
      const keep = overrides[f.key]
      if (keep?.en && keep.zh === zhVal) { next[f.key] = { en: keep.en, zh: zhVal }; continue }
      toTranslate.push(zhVal)
      translateKeys.push(f.key)
    }
    if (translateKeys.length) {
      const enList = await translateZhToEn(token, toTranslate)
      if (!enList) return null
      enList.forEach((en, i) => { next[translateKeys[i]] = { en, zh: toTranslate[i] } })
    }
    return next
  }

  // --- build the next instructor list: auto-translate changed bios ---------
  const buildInstructors = async (): Promise<HomeInstructor[] | null> => {
    const initById = new Map(initialInstructors.current.map((i) => [i.id, i]))
    const next = instructors.map((inst) => ({ ...inst, bio: { en: inst.bio?.en ?? '', zh: inst.bio?.zh ?? '' } }))
    const toTranslate: string[] = []
    const targetIdx: number[] = []
    next.forEach((inst, idx) => {
      const zhv = (inst.bio.zh ?? '').trim()
      if (!zhv) { inst.bio = { en: '', zh: '' }; return }
      const init = initById.get(inst.id)
      if (init && (init.bio?.zh ?? '') === zhv && init.bio?.en) return // unchanged, keep stored English
      toTranslate.push(zhv)
      targetIdx.push(idx)
    })
    if (targetIdx.length) {
      const enList = await translateZhToEn(token, toTranslate)
      if (!enList) return null
      enList.forEach((en, i) => { next[targetIdx[i]].bio = { en, zh: next[targetIdx[i]].bio.zh } })
    }
    return next
  }

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      let ov = overrides
      let ins = instructors
      if (tab === 'text') {
        const built = await buildTextOverrides()
        if (built === null) { toast.error(zh('admin.translateFail')); return }
        ov = built
      } else if (tab === 'instructors') {
        const built = await buildInstructors()
        if (built === null) { toast.error(zh('admin.translateFail')); return }
        ins = built
      }
      const res = await apiAdminPutContent(token, {
        overrides: ov,
        heroImages: heroImages.some(Boolean) ? heroImages : null,
        instructors: ins,
      })
      if (res.ok) {
        setOverrides(ov)
        setInstructors(ins)
        initialInstructors.current = ins
        toast.success(zh('admin.saved'))
      } else {
        toast.error(zh('common.toast.error'))
      }
    } finally {
      setSaving(false)
    }
  }

  const submitPassword = async (): Promise<void> => {
    if (pwNew.length < 8) { setPwError(zh('admin.password.min')); return }
    if (pwNew !== pwConfirm) { setPwError(zh('admin.password.mismatch')); return }
    setPwBusy(true)
    setPwError('')
    const res = await apiAdminChangePassword(token, pwOld, pwNew)
    setPwBusy(false)
    if (res.ok) {
      setPwOpen(false)
      setPwOld(''); setPwNew(''); setPwConfirm('')
      toast.success(zh('admin.password.changed'))
    } else {
      setPwError(zh('admin.password.fail') + (res.error || ''))
    }
  }

  const pickHeroFile = (index: number) => (file: File | undefined): void => {
    if (!file) return
    fileToDataUrl(file, 1920)
      .then((dataUrl) => setHeroImages((prev) => prev.map((v, i) => (i === index ? dataUrl : v))))
      .catch(() => toast.error(zh('admin.uploadFail')))
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <div className="admin-header__inner">
            <Link to="/" className="admin-header__brand"><Logo size="sm" /></Link>
            <span className="admin-header__title">{zh('admin.title')}</span>
            <div className="admin-header__spacer" />
            <div className="admin-header__actions"><ThemeToggle /></div>
          </div>
        </div>
        <div className="admin-main"><p>{zh('nav.loading')}</p></div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header__inner">
          <Link to="/" className="admin-header__brand" aria-label={zh('nav.home')}>
            <Logo size="sm" />
          </Link>
          <span className="admin-header__title">{zh('admin.title')}</span>
          <div className="admin-header__spacer" />
          <div className="admin-header__actions">
            <ThemeToggle />
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => { setPwOpen(true); setPwError('') }}>
              <KeyRound size={15} /> {zh('admin.password.change')}
            </button>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => { setAdminToken(''); onLogout() }}>
              <LogOut size={15} /> {zh('nav.logout')}
            </button>
          </div>
        </div>
        <nav className="admin-tabs">
          <button type="button" className={`admin-tab${tab === 'text' ? ' is-active' : ''}`} onClick={() => setTab('text')}>
            <Type size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />{zh('admin.tab.text')}
          </button>
          <button type="button" className={`admin-tab${tab === 'images' ? ' is-active' : ''}`} onClick={() => setTab('images')}>
            <ImagePlus size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />{zh('admin.tab.images')}
          </button>
          <button type="button" className={`admin-tab${tab === 'instructors' ? ' is-active' : ''}`} onClick={() => setTab('instructors')}>
            <Users size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />{zh('admin.tab.instructors')}
          </button>
          <button type="button" className={`admin-tab${tab === 'templates' ? ' is-active' : ''}`} onClick={() => setTab('templates')}>
            <Mail size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />{zh('admin.tab.templates')}
          </button>
        </nav>
      </header>

      <main className="admin-main">
        {pwOpen ? (
          <div className="admin-card" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="admin-card__head">
              <div>
                <div className="admin-card__title">{zh('admin.password.change')}</div>
              </div>
            </div>
            <div className="admin-field-grid">
              <div className="admin-field">
                <label className="admin-label" htmlFor="admin-pw-old">{zh('admin.password.current')}</label>
                <input id="admin-pw-old" className="admin-input" type="password" autoComplete="current-password" value={pwOld} onChange={(e) => { setPwOld(e.target.value); setPwError('') }} />
              </div>
              <div className="admin-field">
                <label className="admin-label" htmlFor="admin-pw-new">{zh('admin.password.new')}</label>
                <input id="admin-pw-new" className="admin-input" type="password" autoComplete="new-password" value={pwNew} onChange={(e) => { setPwNew(e.target.value); setPwError('') }} />
              </div>
              <div className="admin-field">
                <label className="admin-label" htmlFor="admin-pw-confirm">{zh('admin.password.confirm')}</label>
                <input id="admin-pw-confirm" className="admin-input" type="password" autoComplete="new-password" value={pwConfirm} onChange={(e) => { setPwConfirm(e.target.value); setPwError('') }} />
              </div>
            </div>
            {pwError ? <p className="admin-login__error">{pwError}</p> : null}
            <div className="admin-actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setPwOpen(false)}>
                {zh('common.cancel')}
              </button>
              <button type="button" className="admin-btn admin-btn--primary" disabled={pwBusy} onClick={() => void submitPassword()}>
                {pwBusy ? zh('auth.login.loading') : zh('common.save')}
              </button>
            </div>
          </div>
        ) : null}
        {tab === 'text' ? (
          <div className="admin-card">
            <div className="admin-card__head">
              <div>
                <div className="admin-card__title">{zh('admin.tab.text')}</div>
                <div className="admin-card__sub">{zh('admin.textHint')}</div>
              </div>
            </div>
            <div className="admin-field-grid">
              {TEXT_FIELDS.map((field) => (
                <div key={field.key} className={`admin-field${field.area ? ' admin-field--wide' : ''}`}>
                  <span className="admin-label" id={`admin-f-${field.key}`}>{field.label}</span>
                  {field.area ? (
                    <textarea
                      className="admin-textarea"
                      rows={2}
                      placeholder={zh('admin.placeholder')}
                      aria-labelledby={`admin-f-${field.key}`}
                      value={currentZh(field)}
                      onChange={(e) => setOverrideZh(field.key, e.target.value)}
                    />
                  ) : (
                    <input
                      className="admin-input"
                      placeholder={zh('admin.placeholder')}
                      aria-labelledby={`admin-f-${field.key}`}
                      value={currentZh(field)}
                      onChange={(e) => setOverrideZh(field.key, e.target.value)}
                    />
                  )}
                  <div className="admin-text-preview">{zh('admin.enAuto')}: {currentEn(field) || '—'}</div>
                </div>
              ))}
            </div>
            <div className="admin-actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setOverrides({})}>
                {zh('admin.defaults')}
              </button>
              <button type="button" className="admin-btn admin-btn--primary" disabled={saving} onClick={() => void save()}>
                <Save size={15} /> {saving ? zh('auth.login.loading') : zh('admin.save')}
              </button>
            </div>
          </div>
        ) : null}

        {tab === 'images' ? (
          <div className="admin-card">
            <div className="admin-card__head">
              <div>
                <div className="admin-card__title">{zh('admin.tab.images')}</div>
                <div className="admin-card__sub">{zh('admin.imagesHint')}</div>
              </div>
            </div>
            <div className="admin-hero-grid">
              {heroImages.map((img, i) => (
                <div key={i} className="admin-hero-slot">
                  {img ? <img src={img} alt="" /> : <img src={`/hero/hero-${i + 1}.jpg`} alt="" />}
                  <span className="admin-hero-slot__label">{zh('admin.heroSlide', { n: i + 1 })}</span>
                  <label className="admin-file-btn">
                    {zh('admin.uploadImage')}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      ref={(el) => { fileInputs.current[i] = el }}
                      onChange={(e) => pickHeroFile(i)(e.target.files?.[0])}
                    />
                  </label>
                  {img ? (
                    <button type="button" className="admin-file-btn" onClick={() => setHeroImages((prev) => prev.map((v, j) => (j === i ? null : v)))}>
                      {zh('admin.removeImage')}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="admin-actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setHeroImages(Array(6).fill(null))}>
                {zh('admin.defaults')}
              </button>
              <button type="button" className="admin-btn admin-btn--primary" disabled={saving} onClick={() => void save()}>
                <Save size={15} /> {saving ? zh('auth.login.loading') : zh('admin.save')}
              </button>
            </div>
          </div>
        ) : null}

        {tab === 'instructors' ? (
          <div className="admin-card">
            <div className="admin-card__head">
              <div>
                <div className="admin-card__title">{zh('admin.tab.instructors')}</div>
                <div className="admin-card__sub">{zh('admin.instructorsHint')}</div>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() =>
                  setInstructors((prev) => [...prev, { id: `i${Date.now()}`, name: '', bio: { en: '', zh: '' }, years: 0, photo: '' }])
                }
              >
                <Plus size={15} /> {zh('admin.instructor.add')}
              </button>
            </div>

            {instructors.length === 0 ? <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{zh('admin.instructorsEmpty')}</p> : null}
            {instructors.map((inst, idx) => (
              <div key={inst.id} className="admin-instructor">
                {inst.photo ? (
                  <img className="admin-instructor__photo" src={inst.photo} alt="" />
                ) : (
                  <div className="admin-instructor__photo" />
                )}
                <div className="admin-instructor__body">
                  <div className="admin-instructor__row">
                    <div className="admin-field" style={{ flex: 2 }}>
                      <label className="admin-label" htmlFor={`admin-ins-name-${idx}`}>{zh('admin.instructor.name')}</label>
                      <input id={`admin-ins-name-${idx}`} className="admin-input" value={inst.name} onChange={(e) => setInstructor(idx, { name: e.target.value })} />
                    </div>
                    <div className="admin-field" style={{ flex: 1 }}>
                      <label className="admin-label" htmlFor={`admin-ins-years-${idx}`}>{zh('admin.instructor.years')}</label>
                      <input id={`admin-ins-years-${idx}`} className="admin-input" type="number" min={0} value={String(inst.years)} onChange={(e) => setInstructor(idx, { years: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="admin-field" style={{ flex: 1 }}>
                      <span className="admin-label" id={`admin-ins-photo-${idx}`}>{zh('admin.photo')}</span>
                      <label className="admin-file-btn">
                        {zh('admin.uploadImage')}
                        <input type="file" accept="image/*" style={{ display: 'none' }} aria-labelledby={`admin-ins-photo-${idx}`} onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) fileToDataUrl(f, 600).then((d) => setInstructor(idx, { photo: d })).catch(() => undefined)
                        }} />
                      </label>
                    </div>
                  </div>
                  <div className="admin-bio-hint">{zh('admin.bioHint')}</div>
                  <label className="admin-label" htmlFor={`admin-ins-bio-${idx}`}>{zh('admin.bioHint')}</label>
                  <textarea id={`admin-ins-bio-${idx}`} className="admin-textarea" rows={2} placeholder={zh('admin.placeholder')} value={inst.bio?.zh ?? ''} onChange={(e) => setInstructorBio(idx, 'zh', e.target.value)} />
                  <div className="admin-text-preview">{zh('admin.enAuto')}: {inst.bio?.en || '—'}</div>
                  <div className="admin-instructor__actions">
                    <button type="button" className="admin-btn admin-btn--danger" onClick={() => setInstructors((prev) => prev.filter((_, i) => i !== idx))}>
                      <Trash2 size={15} /> {zh('admin.instructor.remove')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {instructors.length > 0 ? (
              <div className="admin-actions">
                <button type="button" className="admin-btn admin-btn--primary" disabled={saving} onClick={() => void save()}>
                  <Save size={15} /> {saving ? zh('auth.login.loading') : zh('admin.save')}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === 'templates' ? <AdminTemplates token={token} /> : null}
      </main>
    </div>
  )

  function setInstructor(index: number, patch: Partial<HomeInstructor>): void {
    setInstructors((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }
  function setInstructorBio(index: number, lang: 'en' | 'zh', value: string): void {
    setInstructors((prev) =>
      prev.map((it, i) => (i === index ? { ...it, bio: { ...it.bio, [lang]: value } } : it)),
    )
  }
}
