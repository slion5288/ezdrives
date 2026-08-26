// ============================================================================
// EZDRIVES — student shell (student-owned local component)
// Session guard (no student session → '/login?role=student'), sticky header
// with logo + language/theme/logout, and a FIXED BOTTOM TAB BAR that stays on
// every page (Dashboard / Book / Profile / Notifications) on mobile — desktop
// uses the inline top nav. Wraps pages in the local ToastProvider.
// ============================================================================

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Bell, BookOpen, Calendar, Loader2, LogOut, Moon, Sun, User } from 'lucide-react'
import { Link, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { getSession, initStateFromServer, isStateLoaded, logout, useAppState } from '../../data/store'
import { setLocale, useLocale, useT } from '../../i18n'
import { LOGO_DATA_URL } from '../../data/assets'
import { ToastProvider } from './StudentToast'
import './student.css'

type Theme = 'light' | 'dark'

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem('dw.theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage unavailable — default to light
  }
  return 'light'
}

interface StudentShellProps {
  children: ReactNode
}

export function StudentShell({ children }: StudentShellProps): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const state = useAppState()
  const navigate = useNavigate()

  const [theme, setTheme] = useState<Theme>(() => loadTheme())
  const [ready, setReady] = useState<boolean>(() => isStateLoaded())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('dw.theme', theme)
    } catch {
      // storage unavailable — in-memory only
    }
  }, [theme])

  // On a hard refresh the session is restored from localStorage but the server
  // state still needs to be fetched before rendering app content.
  useEffect(() => {
    if (!isStateLoaded()) {
      initStateFromServer().then((ok) => setReady(ok))
    }
  }, [])

  const session = getSession()
  if (session.role !== 'student') return <Navigate to="/login?role=student" replace />
  if (!ready) {
    return (
      <div className="student-loading" role="status">
        <Loader2 size={26} className="student-loading__spin" />
        <span>{t('nav.loading')}</span>
      </div>
    )
  }

  const unread = state.notifications.filter(
    (n) => n.role === 'student' && n.recipientId === session.studentId && !n.read,
  ).length

  const toggleTheme = (): void => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  const handleLogout = (): void => {
    logout()
    navigate('/')
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
    `student-nav-link${isActive ? ' active' : ''}`
  const bottomLinkClass = ({ isActive }: { isActive: boolean }): string =>
    `student-bottom-link${isActive ? ' active' : ''}`

  const navItems = [
    { to: '/student/book', end: false, label: t('nav.book'), icon: <BookOpen size={18} /> },
    { to: '/student', end: true, label: t('nav.dashboard'), icon: <Calendar size={18} /> },
    { to: '/student/notifications', end: false, label: t('nav.notifications'), icon: <Bell size={18} /> },
    { to: '/student/profile', end: false, label: t('nav.profile'), icon: <User size={18} /> },
  ]

  return (
    <ToastProvider>
      <header className="student-header">
        <div className="student-header-inner">
          <div className="student-header-left">
            <Link to="/" className="student-logo" aria-label={t('nav.home')}>
              <img src={LOGO_DATA_URL} alt={t('nav.brand')} className="student-logo-img" />
            </Link>
          </div>

          <nav className="student-nav" aria-label={t('nav.dashboard')}>
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                {item.icon}
                <span>{item.label}</span>
                {item.to === '/student/notifications' && unread > 0 && (
                  <span className="student-nav-badge">{unread}</span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="student-header-right">
            <div className="student-lang" role="group" aria-label={t('nav.language')}>
              <button
                type="button"
                className={`student-lang-btn${locale === 'en' ? ' active' : ''}`}
                onClick={() => setLocale('en')}
              >
                EN
              </button>
              <button
                type="button"
                className={`student-lang-btn${locale === 'zh' ? ' active' : ''}`}
                onClick={() => setLocale('zh')}
              >
                中文
              </button>
            </div>
            <button
              type="button"
              className="student-icon-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('nav.theme.light') : t('nav.theme.dark')}
              title={theme === 'dark' ? t('nav.theme.light') : t('nav.theme.dark')}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              className="student-icon-btn"
              onClick={handleLogout}
              aria-label={t('nav.logout')}
              title={t('nav.logout')}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Always-on mobile bottom tab bar */}
      <main className="student-main student-main-with-nav">{children}</main>

      <nav className="student-bottom-nav" aria-label={t('nav.dashboard')}>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={bottomLinkClass}>
            {item.icon}
            <span>{item.label}</span>
            {item.to === '/student/notifications' && unread > 0 && (
              <span className="student-bottom-badge">{unread}</span>
            )}
          </NavLink>
        ))}
      </nav>
    </ToastProvider>
  )
}
