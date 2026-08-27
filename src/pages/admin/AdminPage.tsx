// ============================================================================
// EZDRIVES — AdminPage (site content manager, /admin)
// Login (username + password) → dashboard with three tabs:
//  · 首页文案 — bilingual text overrides for the landing page
//  · 首页图片 — hero slide uploads (client-resized to data URLs)
//  · 教练管理 — homepage instructor cards (add / edit / remove)
// Saved via PUT /api/admin/content; public visitors read the same payload
// through GET /api/public/home.
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImagePlus, LogOut, Plus, Save, Trash2, Type, Users } from 'lucide-react'
import type { FormEvent } from 'react'
import { apiAdminGetContent, apiAdminLogin, apiAdminPutContent } from '../../data/api'
import { getAdminToken, setAdminToken } from '../../data/store'
import type { HomeInstructor } from '../../data/store'
import { useLocale, useT } from '../../i18n'
import { LanguageSwitcher } from '../../components/shared/LanguageSwitcher'
import { ThemeToggle } from '../../components/shared/ThemeToggle'
import { Logo } from '../../components/shared/Logo'
import { useToast } from '../../components/shared'
import './admin.css'

type Tab = 'text' | 'images' | 'instructors'

interface TextField {
  key: string
  en: string
  zh: string
  area?: boolean
}

const TEXT_FIELDS: TextField[] = [
  { key: 'landing.hero.title', en: 'Hero title', zh: '首页主标题' },
  { key: 'landing.hero.subtitle', en: 'Hero subtitle', zh: '首页副标题' },
  { key: 'landing.steps.1.title', en: 'Step 1 · title', zh: '步骤1 · 标题' },
  { key: 'landing.steps.1.body', en: 'Step 1 · body', zh: '步骤1 · 内容', area: true },
  { key: 'landing.steps.2.title', en: 'Step 2 · title', zh: '步骤2 · 标题' },
  { key: 'landing.steps.2.body', en: 'Step 2 · body', zh: '步骤2 · 内容', area: true },
  { key: 'landing.steps.3.title', en: 'Step 3 · title', zh: '步骤3 · 标题' },
  { key: 'landing.steps.3.body', en: 'Step 3 · body', zh: '步骤3 · 内容', area: true },
  { key: 'landing.courses.subtitle', en: 'Courses subtitle', zh: '课程栏目副标题' },
  { key: 'landing.videos.subtitle', en: 'Videos subtitle', zh: '视频栏目副标题' },
  { key: 'instructor.name', en: 'Instructor · name', zh: '教练 · 姓名' },
  { key: 'instructor.bio', en: 'Instructor · bio', zh: '教练 · 简介', area: true },
  { key: 'landing.testimonials.1.quote', en: 'Testimonial 1 · quote', zh: '评价1 · 内容', area: true },
  { key: 'landing.testimonials.1.author', en: 'Testimonial 1 · author', zh: '评价1 · 署名' },
  { key: 'landing.testimonials.2.quote', en: 'Testimonial 2 · quote', zh: '评价2 · 内容', area: true },
  { key: 'landing.testimonials.2.author', en: 'Testimonial 2 · author', zh: '评价2 · 署名' },
  { key: 'landing.testimonials.3.quote', en: 'Testimonial 3 · quote', zh: '评价3 · 内容', area: true },
  { key: 'landing.testimonials.3.author', en: 'Testimonial 3 · author', zh: '评价3 · 署名' },
  { key: 'landing.faq.1.q', en: 'FAQ 1 · question', zh: '常见问题1 · 问题' },
  { key: 'landing.faq.1.a', en: 'FAQ 1 · answer', zh: '常见问题1 · 回答', area: true },
  { key: 'landing.faq.2.q', en: 'FAQ 2 · question', zh: '常见问题2 · 问题' },
  { key: 'landing.faq.2.a', en: 'FAQ 2 · answer', zh: '常见问题2 · 回答', area: true },
  { key: 'landing.faq.3.q', en: 'FAQ 3 · question', zh: '常见问题3 · 问题' },
  { key: 'landing.faq.3.a', en: 'FAQ 3 · answer', zh: '常见问题3 · 回答', area: true },
  { key: 'landing.faq.4.q', en: 'FAQ 4 · question', zh: '常见问题4 · 问题' },
  { key: 'landing.faq.4.a', en: 'FAQ 4 · answer', zh: '常见问题4 · 回答', area: true },
  { key: 'landing.cta.band.title', en: 'CTA banner · title', zh: '底部横幅 · 标题' },
  { key: 'landing.cta.band.body', en: 'CTA banner · body', zh: '底部横幅 · 内容', area: true },
  { key: 'landing.footer.tagline', en: 'Footer tagline', zh: '页脚标语' },
]

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
  const t = useT()
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError(t('admin.loginError'))
      return
    }
    setBusy(true)
    setError(null)
    const res = await apiAdminLogin(username.trim(), password)
    setBusy(false)
    if (res.ok && res.token) {
      setAdminToken(res.token)
      onLoggedIn(res.token)
      toast.success(t('admin.welcome'))
    } else {
      setError(t('admin.loginError'))
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header__inner">
          <Link to="/" className="admin-header__brand" aria-label={t('nav.home')}>
            <Logo size="sm" />
          </Link>
          <span className="admin-header__title">{t('admin.title')}</span>
          <div className="admin-header__spacer" />
          <div className="admin-header__actions">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="admin-login">
        <form className="admin-login__card" onSubmit={(e) => void submit(e)}>
          <h1 className="admin-login__title">{t('admin.login.title')}</h1>
          <p className="admin-login__sub">{t('admin.login.sub')}</p>
          <div className="admin-field">
            <label className="admin-label" htmlFor="admin-user">
              {t('admin.username')}
            </label>
            <input id="admin-user" className="admin-input" value={username} autoComplete="username" onChange={(e) => { setUsername(e.target.value); setError(null) }} />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="admin-pass">
              {t('admin.password')}
            </label>
            <input id="admin-pass" className="admin-input" type="password" value={password} autoComplete="current-password" onChange={(e) => { setPassword(e.target.value); setError(null) }} />
          </div>
          {error ? <p className="admin-login__error">{error}</p> : null}
          <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>
            {busy ? t('auth.login.loading') : t('admin.login.submit')}
          </button>
          <Link to="/" className="admin-login__back" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            ← {t('auth.back')}
          </Link>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('text')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Draft state
  const [overrides, setOverrides] = useState<Record<string, { en: string; zh: string }>>({})
  const [heroImages, setHeroImages] = useState<(string | null)[]>(Array(6).fill(null))
  const [instructors, setInstructors] = useState<HomeInstructor[]>([])
  const fileInputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    apiAdminGetContent(token)
      .then((res) => {
        if (res.ok && res.content) {
          setOverrides(res.content.overrides || {})
          const hero = res.content.heroImages || []
          setHeroImages(Array.from({ length: 6 }, (_, i) => (hero && typeof hero[i] === 'string' && hero[i] ? (hero[i] as string) : null)))
          setInstructors((res.content.instructors || []) as HomeInstructor[])
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [token])

  const save = async (): Promise<void> => {
    setSaving(true)
    const res = await apiAdminPutContent(token, {
      overrides,
      heroImages: heroImages.some(Boolean) ? heroImages : null,
      instructors,
    })
    setSaving(false)
    res.ok ? toast.success(t('admin.saved')) : toast.error(t('common.toast.error'))
  }

  const pickHeroFile = (index: number) => (file: File | undefined): void => {
    if (!file) return
    fileToDataUrl(file, 1920)
      .then((dataUrl) => setHeroImages((prev) => prev.map((v, i) => (i === index ? dataUrl : v))))
      .catch(() => toast.error(t('admin.uploadFail')))
  }

  const label = (field: TextField): string => (locale === 'zh' ? field.zh : field.en)
  const setOverride = (key: string, lang: 'en' | 'zh', value: string): void =>
    setOverrides((prev) => ({ ...prev, [key]: { en: lang === 'en' ? value : (prev[key]?.en ?? ''), zh: lang === 'zh' ? value : (prev[key]?.zh ?? '') } }))

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <div className="admin-header__inner">
            <Link to="/" className="admin-header__brand"><Logo size="sm" /></Link>
            <span className="admin-header__title">{t('admin.title')}</span>
            <div className="admin-header__spacer" />
            <div className="admin-header__actions"><LanguageSwitcher /><ThemeToggle /></div>
          </div>
        </div>
        <div className="admin-main"><p>{t('nav.loading')}</p></div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header__inner">
          <Link to="/" className="admin-header__brand" aria-label={t('nav.home')}>
            <Logo size="sm" />
          </Link>
          <span className="admin-header__title">{t('admin.title')}</span>
          <div className="admin-header__spacer" />
          <div className="admin-header__actions">
            <LanguageSwitcher />
            <ThemeToggle />
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => { setAdminToken(''); onLogout() }}>
              <LogOut size={15} /> {t('nav.logout')}
            </button>
          </div>
        </div>
        <nav className="admin-tabs">
          <button type="button" className={`admin-tab${tab === 'text' ? ' is-active' : ''}`} onClick={() => setTab('text')}>
            <Type size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />{t('admin.tab.text')}
          </button>
          <button type="button" className={`admin-tab${tab === 'images' ? ' is-active' : ''}`} onClick={() => setTab('images')}>
            <ImagePlus size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />{t('admin.tab.images')}
          </button>
          <button type="button" className={`admin-tab${tab === 'instructors' ? ' is-active' : ''}`} onClick={() => setTab('instructors')}>
            <Users size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />{t('admin.tab.instructors')}
          </button>
        </nav>
      </header>

      <main className="admin-main">
        {tab === 'text' ? (
          <div className="admin-card">
            <div className="admin-card__head">
              <div>
                <div className="admin-card__title">{t('admin.tab.text')}</div>
                <div className="admin-card__sub">{t('admin.textHint')}</div>
              </div>
            </div>
            <div className="admin-field-grid">
              {TEXT_FIELDS.map((field) => (
                <div key={field.key} className={`admin-field${field.area ? ' admin-field--wide' : ''}`}>
                  <span className="admin-label">{label(field)}</span>
                  <input
                    className="admin-input"
                    placeholder={`English · ${field.en}`}
                    value={overrides[field.key]?.en ?? ''}
                    onChange={(e) => setOverride(field.key, 'en', e.target.value)}
                  />
                  <input
                    className="admin-input"
                    placeholder={`中文 · ${field.zh}`}
                    value={overrides[field.key]?.zh ?? ''}
                    onChange={(e) => setOverride(field.key, 'zh', e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="admin-actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setOverrides({})}>
                {t('admin.defaults')}
              </button>
              <button type="button" className="admin-btn admin-btn--primary" disabled={saving} onClick={() => void save()}>
                <Save size={15} /> {saving ? t('auth.login.loading') : t('admin.save')}
              </button>
            </div>
          </div>
        ) : null}

        {tab === 'images' ? (
          <div className="admin-card">
            <div className="admin-card__head">
              <div>
                <div className="admin-card__title">{t('admin.tab.images')}</div>
                <div className="admin-card__sub">{t('admin.imagesHint')}</div>
              </div>
            </div>
            <div className="admin-hero-grid">
              {heroImages.map((img, i) => (
                <div key={i} className="admin-hero-slot">
                  {img ? <img src={img} alt="" /> : <img src={`/hero/hero-${i + 1}.jpg`} alt="" />}
                  <span className="admin-hero-slot__label">{t('admin.heroSlide', { n: i + 1 })}</span>
                  <label className="admin-file-btn">
                    {t('admin.uploadImage')}
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
                      {t('admin.removeImage')}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="admin-actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setHeroImages(Array(6).fill(null))}>
                {t('admin.defaults')}
              </button>
              <button type="button" className="admin-btn admin-btn--primary" disabled={saving} onClick={() => void save()}>
                <Save size={15} /> {saving ? t('auth.login.loading') : t('admin.save')}
              </button>
            </div>
          </div>
        ) : null}

        {tab === 'instructors' ? (
          <div className="admin-card">
            <div className="admin-card__head">
              <div>
                <div className="admin-card__title">{t('admin.tab.instructors')}</div>
                <div className="admin-card__sub">{t('admin.instructorsHint')}</div>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() =>
                  setInstructors((prev) => [...prev, { id: `i${Date.now()}`, name: '', bio: { en: '', zh: '' }, years: 0, photo: '' }])
                }
              >
                <Plus size={15} /> {t('admin.instructor.add')}
              </button>
            </div>

            {instructors.length === 0 ? <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{t('admin.instructorsEmpty')}</p> : null}
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
                      <span className="admin-label">{t('admin.instructor.name')}</span>
                      <input className="admin-input" value={inst.name} onChange={(e) => setInstructor(idx, { name: e.target.value })} />
                    </div>
                    <div className="admin-field" style={{ flex: 1 }}>
                      <span className="admin-label">{t('admin.instructor.years')}</span>
                      <input className="admin-input" type="number" min={0} value={String(inst.years)} onChange={(e) => setInstructor(idx, { years: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="admin-field" style={{ flex: 1 }}>
                      <span className="admin-label">{t('admin.photo')}</span>
                      <label className="admin-file-btn">
                        {t('admin.uploadImage')}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) fileToDataUrl(f, 600).then((d) => setInstructor(idx, { photo: d })).catch(() => undefined)
                        }} />
                      </label>
                    </div>
                  </div>
                  <input className="admin-input" placeholder={`Bio EN · ${inst.bio.en}`} value={inst.bio.en} onChange={(e) => setInstructorBio(idx, 'en', e.target.value)} />
                  <input className="admin-input" placeholder={`简介中文 · ${inst.bio.zh}`} value={inst.bio.zh} onChange={(e) => setInstructorBio(idx, 'zh', e.target.value)} />
                  <div className="admin-instructor__actions">
                    <button type="button" className="admin-btn admin-btn--danger" onClick={() => setInstructors((prev) => prev.filter((_, i) => i !== idx))}>
                      <Trash2 size={15} /> {t('admin.instructor.remove')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {instructors.length > 0 ? (
              <div className="admin-actions">
                <button type="button" className="admin-btn admin-btn--primary" disabled={saving} onClick={() => void save()}>
                  <Save size={15} /> {saving ? t('auth.login.loading') : t('admin.save')}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
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
