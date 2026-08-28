// ============================================================================
// EZDRIVES — LoginPage (shell-owned)
// REAL authentication against the Cloudflare D1 backend.
// Student: phone + password login, or register with an SMS-verified phone.
// Instructor: phone/email + password (single-instructor deployment).
// All strings through useT().
// ============================================================================

import { ArrowLeft, ArrowRight, KeyRound, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, Field, Input, LanguageSwitcher, Logo, ThemeToggle, useToast } from '../../components/shared'
import { getSession, login, register, sendVerificationCode } from '../../data/store'
import { useT } from '../../i18n'
import './LoginPage.css'

type Role = 'student' | 'instructor'

function validPhone(value: string): boolean {
  return value.replace(/\D/g, '').length >= 10
}

/** International dialing codes for the phone input (most common first). */
const PHONE_COUNTRIES: { code: string; flag: string }[] = [
  { code: '+1', flag: '🇨🇦' },
  { code: '+1', flag: '🇺🇸' },
  { code: '+86', flag: '🇨🇳' },
  { code: '+44', flag: '🇬🇧' },
  { code: '+61', flag: '🇦🇺' },
  { code: '+64', flag: '🇳🇿' },
  { code: '+65', flag: '🇸🇬' },
  { code: '+81', flag: '🇯🇵' },
  { code: '+82', flag: '🇰🇷' },
  { code: '+33', flag: '🇫🇷' },
  { code: '+49', flag: '🇩🇪' },
  { code: '+852', flag: '🇭🇰' },
]

function PhoneField({
  value,
  onChange,
  country,
  onCountry,
  id,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  country: string
  onCountry: (c: string) => void
  id: string
  placeholder?: string
}): JSX.Element {
  const t = useT()
  return (
    <div className="phone-field">
      <select className="phone-field__code" value={country} onChange={(e) => onCountry(e.target.value)} aria-label={t('auth.countryCode')}>
        {PHONE_COUNTRIES.map((c) => (
          <option key={`${c.code}-${c.flag}`} value={c.code}>
            {c.flag} {c.code}
          </option>
        ))}
      </select>
      <input
        id={id}
        className="login__phone-input"
        type="tel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Student: login (phone + password) or register (name + SMS-verified phone).
// ---------------------------------------------------------------------------

function StudentLogin({ onLoggedIn }: { onLoggedIn: () => void }): JSX.Element {
  const t = useT()
  const toast = useToast()

  // Login form
  const [loginPhone, setLoginPhone] = useState('')
  const [loginCountry, setLoginCountry] = useState('+1')
  const [loginPassword, setLoginPassword] = useState('')
  // Register form
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regCountry, setRegCountry] = useState('+1')
  const [regCode, setRegCode] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [codeCountdown, setCodeCountdown] = useState(0)
  const [errors, setErrors] = useState<{ phone?: string; password?: string; name?: string; code?: string; email?: string }>({})
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const timerRef = useRef<number | null>(null)

  // Clear the resend-countdown timer on unmount (no setState-after-unmount).
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [])

  const doLogin = async (phone: string, password: string): Promise<void> => {
    setBusy(true)
    setErrors({})
    const result = await login(phone, password)
    setBusy(false)
    if (result.ok) {
      toast.success(t('auth.loggedInAs', { name: phone }))
      onLoggedIn()
    } else {
      setErrors({ password: t('auth.error.credentials') })
    }
  }

  const submitLogin = (e: FormEvent): void => {
    e.preventDefault()
    if (!validPhone(loginPhone)) {
      setErrors({ phone: t('auth.error.phone') })
      return
    }
    if (loginPassword.length < 6) {
      setErrors({ password: t('auth.error.passwordShort') })
      return
    }
    void doLogin(loginCountry + loginPhone, loginPassword)
  }

  const sendCode = async (): Promise<void> => {
    if (!validPhone(regPhone)) {
      setErrors({ phone: t('auth.error.phone') })
      return
    }
    setErrors({})
    setBusy(true)
    const res = await sendVerificationCode((regCountry + regPhone).trim())
    setBusy(false)
    if (res.ok) {
      setCodeSent(true)
      setCodeCountdown(60)
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = window.setInterval(() => {
        setCodeCountdown((s) => {
          if (s <= 1) {
            if (timerRef.current) window.clearInterval(timerRef.current)
            timerRef.current = null
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else {
      setErrors({ phone: res.error || t('auth.error.network') })
    }
  }

  const submitRegister = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    const next: { name?: string; phone?: string; password?: string; code?: string; email?: string } = {}
    if (!regName.trim()) next.name = t('auth.error.name')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) next.email = t('auth.error.email')
    if (!validPhone(regPhone)) next.phone = t('auth.error.phone')
    if (regPassword.length < 6) next.password = t('auth.error.passwordShort')
    if (!/^\d{6}$/.test(regCode.trim())) next.code = t('auth.error.code')
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setBusy(true)
    const result = await register({ name: regName.trim(), email: regEmail.trim().toLowerCase(), phone: (regCountry + regPhone).trim(), password: regPassword, code: regCode.trim() })
    setBusy(false)
    if (result.ok) {
      toast.success(t('auth.register.success', { name: regName.trim(), email: regEmail.trim() }))
      onLoggedIn()
    } else {
      setErrors({ email: result.error })
    }
  }

  return (
    <>
      {mode === 'login' ? (
        <form className="login__form" onSubmit={submitLogin}>
          <Field label={t('auth.login.phone')} error={errors.phone} htmlFor="login-phone">
            <PhoneField
              id="login-phone"
              value={loginPhone}
              onChange={setLoginPhone}
              country={loginCountry}
              onCountry={setLoginCountry}
              placeholder="416 555 0100"
            />
          </Field>
          <Field label={t('auth.login.password')} error={errors.password} htmlFor="login-password">
            <Input
              id="login-password"
              type="password"
              value={loginPassword}
              invalid={errors.password != null}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <Button type="submit" className="login__submit" disabled={busy} icon={<ArrowRight size={16} aria-hidden="true" />}>
            {busy ? t('auth.login.loading') : t('auth.login.submit')}
          </Button>
          <button type="button" className="login__switch" onClick={() => setMode('register')}>
            {t('auth.login.switch')}
          </button>
        </form>
      ) : (
        <form className="login__form" onSubmit={submitRegister}>
          <Field label={t('auth.register.name')} error={errors.name} htmlFor="reg-name">
            <Input
              id="reg-name"
              value={regName}
              invalid={errors.name != null}
              onChange={(e) => setRegName(e.target.value)}
              placeholder={t('auth.register.name')}
            />
          </Field>
          <Field label={t('auth.register.email')} error={errors.email} htmlFor="reg-email">
            <Input
              id="reg-email"
              type="email"
              value={regEmail}
              invalid={errors.email != null}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>
          <Field label={t('auth.register.phone')} error={errors.phone} htmlFor="reg-phone">
            <PhoneField
              id="reg-phone"
              value={regPhone}
              onChange={setRegPhone}
              country={regCountry}
              onCountry={setRegCountry}
              placeholder="416 555 0100"
            />
          </Field>
          <Field label={t('auth.register.code')} error={errors.code} htmlFor="reg-code">
            <div className="login__code-row">
              <Input
                id="reg-code"
                inputMode="numeric"
                maxLength={6}
                value={regCode}
                invalid={errors.code != null}
                onChange={(e) => setRegCode(e.target.value)}
                placeholder="6-digit code"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy || codeCountdown > 0}
                onClick={() => void sendCode()}
                icon={<Send size={14} aria-hidden="true" />}
              >
                {codeCountdown > 0 ? `${codeCountdown}s` : codeSent ? t('auth.register.resend') : t('auth.register.sendCode')}
              </Button>
            </div>
          </Field>
          <Field label={t('auth.register.password')} error={errors.password} htmlFor="reg-password">
            <Input
              id="reg-password"
              type="password"
              value={regPassword}
              invalid={errors.password != null}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder={t('auth.register.passwordHint')}
            />
          </Field>
          <Button type="submit" className="login__submit" disabled={busy} icon={<Send size={16} aria-hidden="true" />}>
            {busy ? t('auth.login.loading') : t('auth.register.submit')}
          </Button>
          <button type="button" className="login__switch" onClick={() => setMode('login')}>
            {t('auth.register.switch')}
          </button>
        </form>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Instructor: phone/email + password (single-instructor deployment — no SMS
// verification, no registration flow).
// ---------------------------------------------------------------------------

function InstructorLogin({ onLoggedIn }: { onLoggedIn: () => void }): JSX.Element {
  const t = useT()
  const toast = useToast()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    const value = identifier.trim()
    const isPhone = value.replace(/\D/g, '').length >= 10
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    if (!isPhone && !isEmail) {
      setError(t('auth.error.phone'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.error.passwordShort'))
      return
    }
    setBusy(true)
    setError(null)
    const result = await login(value, password)
    setBusy(false)
    if (result.ok) {
      toast.success(t('auth.loggedInAs', { name: value }))
      onLoggedIn()
    } else {
      setError(t('auth.error.credentials'))
    }
  }

  return (
    <form className="login__form" onSubmit={(e) => void submit(e)}>
      <Field label={t('auth.instructor.identifier')} error={error ?? undefined} htmlFor="instructor-identifier">
        <Input
          id="instructor-identifier"
          value={identifier}
          invalid={error != null}
          onChange={(e) => {
            setIdentifier(e.target.value)
            setError(null)
          }}
          placeholder="416 555 0100 or name@email.com"
          autoComplete="username"
        />
      </Field>
      <Field label={t('auth.login.password')} error={error ?? undefined} htmlFor="instructor-password">
        <Input
          id="instructor-password"
          type="password"
          value={password}
          invalid={error != null}
          onChange={(e) => {
            setPassword(e.target.value)
            setError(null)
          }}
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </Field>
      <div className="login__actions">
        <Button type="submit" disabled={busy} icon={<KeyRound size={16} aria-hidden="true" />}>
          {busy ? t('auth.login.loading') : t('auth.instructor.login')}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Page: split layout + role selector.
// ---------------------------------------------------------------------------

export default function LoginPage(): JSX.Element {
  const t = useT()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const roleParam = params.get('role')
  const [role, setRole] = useState<Role>(() => (roleParam === 'instructor' ? 'instructor' : 'student'))

  useEffect(() => {
    if (roleParam === 'instructor' || roleParam === 'student') setRole(roleParam)
  }, [roleParam])

  // Already logged in as the requested role — skip the form.
  const session = getSession()
  if (session.role === 'instructor' && role === 'instructor') return <Navigate to="/instructor" replace />
  if (session.role === 'student' && role === 'student') return <Navigate to="/student/book" replace />

  const onLoggedIn = (): void => {
    if (role !== 'student') {
      navigate('/instructor')
      return
    }
    // Students land on 我的课程 by default (course chosen before login continues there).
    const course = params.get('course')
    navigate(course ? `/student/book?course=${course}` : '/student/book')
  }

  return (
    <div className="login">
      <aside className="login__brand">
        <Link to="/" aria-label={t('nav.home')} style={{ display: 'inline-flex' }}>
          <Logo size="lg" />
        </Link>
        <h1 className="login__tagline">{t('landing.hero.title')}</h1>
        <p className="login__brand-sub">{t('landing.hero.subtitle')}</p>
        <div>
          <Badge tone="success" dot>
            {t('landing.badge')}
          </Badge>
        </div>
      </aside>

      <main className="login__panel">
        <div className="login__toolbar">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <Card className="login__card">
          <h2 className="login__heading">{t('auth.login.title')}</h2>
          <p className="login__sub">{t('auth.login.subtitle')}</p>

          {role === 'student' ? (
            <>
              <p className="login__section-sub">{t('auth.student.subtitle')}</p>
              <StudentLogin onLoggedIn={onLoggedIn} />
            </>
          ) : (
            <>
              <p className="login__section-sub">{t('auth.instructor.subtitle')}</p>
              <InstructorLogin onLoggedIn={onLoggedIn} />
            </>
          )}

          <Button variant="ghost" size="sm" className="login__back" onClick={() => navigate('/')} icon={<ArrowLeft size={14} aria-hidden="true" />}>
            {t('auth.back')}
          </Button>
        </Card>
      </main>
    </div>
  )
}
