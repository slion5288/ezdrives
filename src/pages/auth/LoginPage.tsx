// ============================================================================
// EZDRIVES — LoginPage (shell-owned)
// REAL authentication against the Cloudflare D1 backend: phone + password.
// Role selector (student / instructor), student registration (name + phone +
// password), demo accounts for quick testing. All strings through useT().
// ============================================================================

import { ArrowLeft, ArrowRight, KeyRound, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar, Badge, Button, Card, Field, Input, LanguageSwitcher, Logo, ThemeToggle, useToast } from '../../components/shared'
import { getSession, login, maskPhone, register, sendVerificationCode, useAppState } from '../../data/store'
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
  return (
    <div className="phone-field">
      <select className="phone-field__code" value={country} onChange={(e) => onCountry(e.target.value)} aria-label="Country code">
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
// Student: login (phone + password), register, or one-tap demo account.
// ---------------------------------------------------------------------------

function StudentLogin({ onLoggedIn }: { onLoggedIn: () => void }): JSX.Element {
  const t = useT()
  const toast = useToast()
  const state = useAppState()

  // Login form
  const [loginPhone, setLoginPhone] = useState('')
  const [loginCountry, setLoginCountry] = useState('+1')
  const [loginPassword, setLoginPassword] = useState('')
  // Register form
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regCountry, setRegCountry] = useState('+1')
  const [regCode, setRegCode] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [codeCountdown, setCodeCountdown] = useState(0)
  const [errors, setErrors] = useState<{ phone?: string; password?: string; name?: string; code?: string }>({})
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')

  const demoStudents = state.students

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
      const timer = window.setInterval(() => {
        setCodeCountdown((s) => {
          if (s <= 1) {
            window.clearInterval(timer)
            return 0
          }
          return s - 1
        })
      }, 1000)
      if (res.demoCode) toast.info(t('auth.register.demoCodeToast', { code: res.demoCode }))
    } else {
      setErrors({ phone: res.error || t('auth.error.network') })
    }
  }

  const submitRegister = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    const next: { name?: string; phone?: string; password?: string; code?: string } = {}
    if (!regName.trim()) next.name = t('auth.error.name')
    if (!validPhone(regPhone)) next.phone = t('auth.error.phone')
    if (regPassword.length < 6) next.password = t('auth.error.passwordShort')
    if (!/^\d{6}$/.test(regCode.trim())) next.code = t('auth.error.code')
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setBusy(true)
    const result = await register({ name: regName.trim(), phone: (regCountry + regPhone).trim(), password: regPassword, code: regCode.trim() })
    setBusy(false)
    if (result.ok) {
      toast.success(t('auth.register.welcome', { name: regName.trim() }))
      onLoggedIn()
    } else {
      setErrors({ phone: result.error })
    }
  }

  return (
    <>
      {/* One-tap demo accounts */}
      <p className="login__section-heading">{t('auth.demo.student')}</p>
      <div className="login__students">
        {demoStudents.slice(0, 6).map((student) => (
          <button
            key={student.id}
            type="button"
            className="login__student"
            disabled={busy}
            onClick={() => void doLogin(student.phone, 'demo1234')}
          >
            <Avatar name={student.name} color={student.avatarColor} size="sm" />
            <span className="login__student-name">{student.name}</span>
            <span className="login__student-phone">{maskPhone(student.phone)}</span>
          </button>
        ))}
      </div>

      <div className="login__divider">
        <span>{t('auth.student.or')}</span>
      </div>

      {mode === 'login' ? (
        <form className="login__form" onSubmit={submitLogin}>
          <Field label={t('auth.login.phone')} error={errors.phone} htmlFor="login-phone">
            <PhoneField
              id="login-phone"
              value={loginPhone}
              onChange={setLoginPhone}
              country={loginCountry}
              onCountry={setLoginCountry}
              placeholder="416-555-0131"
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
          <Field label={t('auth.register.phone')} error={errors.phone} htmlFor="reg-phone">
            <PhoneField
              id="reg-phone"
              value={regPhone}
              onChange={setRegPhone}
              country={regCountry}
              onCountry={setRegCountry}
              placeholder="416-555-0100"
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
// Instructor: phone + password, or one-click demo account.
// ---------------------------------------------------------------------------

function InstructorLogin({ onLoggedIn }: { onLoggedIn: () => void }): JSX.Element {
  const t = useT()
  const toast = useToast()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('+1')
  const [password, setPassword] = useState('')
  const [regName, setRegName] = useState('')
  const [regCode, setRegCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [codeCountdown, setCodeCountdown] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const sendCode = async (): Promise<void> => {
    if (phone.replace(/\D/g, '').length < 10) {
      setError(t('auth.error.phone'))
      return
    }
    setError(null)
    setBusy(true)
    const res = await sendVerificationCode((country + phone).trim())
    setBusy(false)
    if (res.ok) {
      setCodeSent(true)
      setCodeCountdown(60)
      const timer = window.setInterval(() => {
        setCodeCountdown((s) => {
          if (s <= 1) {
            window.clearInterval(timer)
            return 0
          }
          return s - 1
        })
      }, 1000)
      if (res.demoCode) toast.info(t('auth.register.demoCodeToast', { code: res.demoCode }))
    } else {
      setError(res.error || t('auth.error.network'))
    }
  }

  const submitRegister = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (!regName.trim()) {
      setError(t('auth.error.name'))
      return
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setError(t('auth.error.phone'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.error.passwordShort'))
      return
    }
    if (!/^\d{6}$/.test(regCode.trim())) {
      setError(t('auth.error.code'))
      return
    }
    setBusy(true)
    const result = await register({ role: 'instructor', name: regName.trim(), phone: (country + phone).trim(), password, code: regCode.trim() })
    setBusy(false)
    if (result.ok) {
      toast.success(t('auth.register.welcome', { name: regName.trim() }))
      onLoggedIn()
    } else {
      setError(result.error || t('auth.error.network'))
    }
  }

  const doLogin = async (p: string, pw: string): Promise<void> => {
    setBusy(true)
    setError(null)
    const result = await login(p, pw)
    setBusy(false)
    if (result.ok) {
      toast.success(t('auth.loggedInAs', { name: p }))
      onLoggedIn()
    } else {
      setError(t('auth.error.credentials'))
    }
  }

  const submit = (e: FormEvent): void => {
    e.preventDefault()
    if (mode === 'register') {
      void submitRegister(e)
      return
    }
    void doLogin(country + phone, password)
  }

  const demo = (): void => {
    void doLogin('+1 416-555-0142', 'demo123')
  }

  return (
    <form className="login__form" onSubmit={submit}>
      <Field label={t('auth.login.phone')} error={error ?? undefined} htmlFor="instructor-phone">
        <PhoneField
          id="instructor-phone"
          value={phone}
          onChange={setPhone}
          country={country}
          onCountry={setCountry}
          placeholder="416-555-0142"
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
        />
      </Field>
      {mode === 'login' ? (
        <>
          <div className="login__actions">
            <Button type="submit" disabled={busy} icon={<KeyRound size={16} aria-hidden="true" />}>
              {busy ? t('auth.login.loading') : t('auth.instructor.login')}
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={demo}>
              {t('auth.instructor.demo')}
            </Button>
          </div>
          <button type="button" className="login__switch" onClick={() => setMode('register')}>
            {t('auth.instructor.register')}
          </button>
        </>
      ) : (
        <>
          <Field label={t('auth.register.name')} error={error ?? undefined} htmlFor="instructor-reg-name">
            <Input
              id="instructor-reg-name"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder={t('auth.register.name')}
            />
          </Field>
          <Field label={t('auth.login.phone')} error={error ?? undefined} htmlFor="instructor-reg-phone">
            <PhoneField
              id="instructor-reg-phone"
              value={phone}
              onChange={setPhone}
              country={country}
              onCountry={setCountry}
              placeholder="416-555-0142"
            />
          </Field>
          <Field label={t('auth.register.code')} error={error ?? undefined} htmlFor="instructor-reg-code">
            <div className="login__code-row">
              <Input
                id="instructor-reg-code"
                inputMode="numeric"
                maxLength={6}
                value={regCode}
                onChange={(e) => setRegCode(e.target.value)}
                placeholder="6-digit code"
              />
              <Button type="button" variant="secondary" size="sm" disabled={busy || codeCountdown > 0} onClick={() => void sendCode()} icon={<Send size={14} aria-hidden="true" />}>
                {codeCountdown > 0 ? `${codeCountdown}s` : codeSent ? t('auth.register.resend') : t('auth.register.sendCode')}
              </Button>
            </div>
          </Field>
          <Field label={t('auth.login.password')} error={error ?? undefined} htmlFor="instructor-reg-password">
            <Input
              id="instructor-reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.register.passwordHint')}
            />
          </Field>
          <Button type="submit" disabled={busy} icon={<Send size={16} aria-hidden="true" />}>
            {busy ? t('auth.login.loading') : t('auth.instructor.registerSubmit')}
          </Button>
          <button type="button" className="login__switch" onClick={() => setMode('login')}>
            {t('auth.register.switch')}
          </button>
        </>
      )}
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
        <Logo size="lg" />
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

          <button type="button" className="login__back" onClick={() => navigate('/')}>
            <ArrowLeft size={14} aria-hidden="true" />
            {t('auth.back')}
          </button>
        </Card>
      </main>
    </div>
  )
}
