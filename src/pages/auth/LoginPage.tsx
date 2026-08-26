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
import { getSession, login, maskPhone, register, useAppState } from '../../data/store'
import { useT } from '../../i18n'
import './LoginPage.css'

type Role = 'student' | 'instructor'

function validPhone(value: string): boolean {
  return value.replace(/\D/g, '').length >= 10
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
  const [loginPassword, setLoginPassword] = useState('')
  // Register form
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [errors, setErrors] = useState<{ phone?: string; password?: string; name?: string }>({})
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
    void doLogin(loginPhone, loginPassword)
  }

  const submitRegister = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    const next: { name?: string; phone?: string; password?: string } = {}
    if (!regName.trim()) next.name = t('auth.error.name')
    if (!validPhone(regPhone)) next.phone = t('auth.error.phone')
    if (regPassword.length < 6) next.password = t('auth.error.passwordShort')
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setBusy(true)
    const result = await register({ name: regName.trim(), phone: regPhone.trim(), password: regPassword })
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
            <Input
              id="login-phone"
              type="tel"
              value={loginPhone}
              invalid={errors.phone != null}
              onChange={(e) => setLoginPhone(e.target.value)}
              placeholder="+1 416-555-0131"
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
            <Input
              id="reg-phone"
              type="tel"
              value={regPhone}
              invalid={errors.phone != null}
              onChange={(e) => setRegPhone(e.target.value)}
              placeholder="+1 416-555-0100"
            />
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
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
    void doLogin(phone, password)
  }

  const demo = (): void => {
    void doLogin('+1 416-555-0142', 'demo123')
  }

  return (
    <form className="login__form" onSubmit={submit}>
      <Field label={t('auth.login.phone')} error={error ?? undefined} htmlFor="instructor-phone">
        <Input
          id="instructor-phone"
          type="tel"
          value={phone}
          invalid={error != null}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 416-555-0142"
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
      <p className="login__hint">{t('auth.instructor.demoHint')}</p>
      <div className="login__actions">
        <Button type="submit" disabled={busy} icon={<KeyRound size={16} aria-hidden="true" />}>
          {busy ? t('auth.login.loading') : t('auth.instructor.login')}
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={demo}>
          {t('auth.instructor.demo')}
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
