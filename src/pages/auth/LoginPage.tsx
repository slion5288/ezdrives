// ============================================================================
// EZDRIVES — LoginPage (shell-owned)
// Source of truth: docs/ARCHITECTURE.md §9 (demo auth) + DESIGN §5 (split
// layout). Role selector, one-tap demo-student login, phone+code registration
// (mock SMS code shown in a toast), instructor password (demo123) or one-click
// demo login. All strings through useT().
// ============================================================================

import { ArrowLeft, ArrowRight, GraduationCap, KeyRound, Send, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar, Badge, Button, Card, Field, Input, LanguageSwitcher, Logo, ThemeToggle, useToast } from '../../components/shared'
import { addStudent, getSession, loginAsStudent, loginInstructor, maskPhone, useAppState } from '../../data/store'
import { useT } from '../../i18n'
import './LoginPage.css'

type Role = 'student' | 'instructor'

function validPhone(value: string): boolean {
  return value.replace(/\D/g, '').length >= 10
}

// ---------------------------------------------------------------------------
// Student: one-tap demo login + register with mock SMS code.
// ---------------------------------------------------------------------------

function StudentLogin({ onLoggedIn }: { onLoggedIn: () => void }): JSX.Element {
  const t = useT()
  const toast = useToast()
  const state = useAppState()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [demoCode, setDemoCode] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ name?: string; phone?: string; code?: string }>({})

  const pickStudent = (id: string): void => {
    loginAsStudent(id)
    onLoggedIn()
  }

  const sendCode = (): void => {
    const next: { name?: string; phone?: string } = {}
    if (!name.trim()) next.name = t('auth.error.name')
    if (!validPhone(phone)) next.phone = t('auth.error.phone')
    setErrors(next)
    if (Object.keys(next).length > 0) return
    const generated = String(Math.floor(100000 + Math.random() * 900000))
    setDemoCode(generated)
    toast.info(t('auth.register.demoCodeToast', { code: generated }))
  }

  const verify = (): void => {
    const next: { name?: string; phone?: string; code?: string } = {}
    if (!name.trim()) next.name = t('auth.error.name')
    if (!validPhone(phone)) next.phone = t('auth.error.phone')
    if (demoCode === null || !/^\d{6}$/.test(code.trim())) next.code = t('auth.error.code')
    else if (code.trim() !== demoCode) next.code = t('auth.error.codeMismatch')
    setErrors(next)
    if (Object.keys(next).length > 0) return
    const student = addStudent(name.trim(), phone.trim())
    toast.success(t('auth.loggedInAs', { name: student.name }))
    onLoggedIn()
  }

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault()
    if (demoCode === null) sendCode()
    else verify()
  }

  return (
    <>
      <p className="login__section-heading">{t('auth.student.pick')}</p>
      <div className="login__students">
        {state.students.map((student) => (
          <button key={student.id} type="button" className="login__student" onClick={() => pickStudent(student.id)}>
            <Avatar name={student.name} color={student.avatarColor} size="sm" />
            <span className="login__student-name">{student.name}</span>
            <span className="login__student-phone">{maskPhone(student.phone)}</span>
          </button>
        ))}
      </div>

      <div className="login__divider">
        <span>{t('auth.student.or')}</span>
      </div>

      <form className="login__form" onSubmit={onSubmit}>
        <Field label={t('auth.register.name')} error={errors.name} htmlFor="reg-name">
          <Input
            id="reg-name"
            value={name}
            invalid={errors.name != null}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('auth.register.name')}
          />
        </Field>
        <Field label={t('auth.register.phone')} error={errors.phone} htmlFor="reg-phone">
          <Input
            id="reg-phone"
            type="tel"
            value={phone}
            invalid={errors.phone != null}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('auth.register.phone')}
          />
        </Field>
        <Field label={t('auth.register.code')} error={errors.code} htmlFor="reg-code">
          <div className="login__code-row">
            <Input
              id="reg-code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              invalid={errors.code != null}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('auth.register.code')}
            />
            <Button type="button" variant="secondary" size="sm" onClick={sendCode} icon={<Send size={14} aria-hidden="true" />}>
              {t('auth.register.sendCode')}
            </Button>
          </div>
        </Field>
        <Button type="submit" className="login__submit" icon={<ArrowRight size={16} aria-hidden="true" />}>
          {t('auth.register.verify')}
        </Button>
      </form>
    </>
  )
}

// ---------------------------------------------------------------------------
// Instructor: password (demo123) or one-click demo login.
// ---------------------------------------------------------------------------

function InstructorLogin({ onLoggedIn }: { onLoggedIn: () => void }): JSX.Element {
  const t = useT()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent): void => {
    e.preventDefault()
    if (loginInstructor(password)) onLoggedIn()
    else setError(t('auth.error.password'))
  }

  const demo = (): void => {
    loginInstructor('demo123')
    onLoggedIn()
  }

  return (
    <form className="login__form" onSubmit={submit}>
      <Field label={t('auth.instructor.password')} error={error ?? undefined} htmlFor="instructor-password">
        <Input
          id="instructor-password"
          type="password"
          value={password}
          invalid={error != null}
          onChange={(e) => {
            setPassword(e.target.value)
            setError(null)
          }}
          placeholder={t('auth.instructor.password')}
        />
      </Field>
      <p className="login__hint">{t('auth.instructor.demoHint')}</p>
      <div className="login__actions">
        <Button type="submit" icon={<KeyRound size={16} aria-hidden="true" />}>
          {t('auth.instructor.login')}
        </Button>
        <Button type="button" variant="secondary" onClick={demo}>
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

  const switchRole = (next: Role): void => {
    setRole(next)
    navigate(`/login?role=${next}`, { replace: true })
  }
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

          <div className="login__roles" role="tablist" aria-label={t('auth.login.title')}>
            <button
              type="button"
              role="tab"
              aria-selected={role === 'student'}
              className={`login__role${role === 'student' ? ' login__role--active' : ''}`}
              onClick={() => switchRole('student')}
            >
              <GraduationCap size={20} className="login__role-icon" aria-hidden="true" />
              <span className="login__role-label">{t('auth.role.student')}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={role === 'instructor'}
              className={`login__role${role === 'instructor' ? ' login__role--active' : ''}`}
              onClick={() => switchRole('instructor')}
            >
              <ShieldCheck size={20} className="login__role-icon" aria-hidden="true" />
              <span className="login__role-label">{t('auth.role.instructor')}</span>
            </button>
          </div>

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
