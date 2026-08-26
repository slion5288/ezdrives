// ============================================================================
// EZDRIVES — InstructorDashboardPage (instructor-owned)
// The instructor "control room": sidebar (logo, tabs, language/theme toggles,
// avatar) + content area. Requires an instructor session, else redirects to
// /login?role=instructor. Internal tab state drives the six sub-pages.
// ============================================================================

import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getLastSyncISO, getSession, initStateFromServer, isStateLoaded, logout, useAppState } from '../../data/store'
import { setLocale, useLocale, useT } from '../../i18n'
import { formatHM, fromLocalISO } from '../../data/timeEngine'
import {
  Bell,
  CalendarDays,
  Clock,
  Cloud,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogOut,
  Moon,
  Settings2,
  Sun,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ToastProvider } from './toast'
import { Avatar } from './ui'
import { TAB_KEYS } from './helpers'
import type { InstructorTab } from './helpers'
import OverviewPage from './OverviewPage'
import SchedulePage from './SchedulePage'
import WorkingHoursPage from './WorkingHoursPage'
import CoursesPage from './CoursesPage'
import StudentsPage from './StudentsPage'
import PaymentsPage from './PaymentsPage'
import SettingsPage from './SettingsPage'
import NotificationsPage from './NotificationsPage'
import { LOGO_DATA_URL } from '../../data/assets'
import './InstructorDashboard.css'

type Theme = 'light' | 'dark'

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem('dw.theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage unavailable — fall through to DOM state
  }
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

const NAV: { id: InstructorTab; icon: LucideIcon }[] = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'schedule', icon: CalendarDays },
  { id: 'workinghours', icon: Clock },
  { id: 'courses', icon: GraduationCap },
  { id: 'settings', icon: Settings2 },
  { id: 'students', icon: Users },
  { id: 'payments', icon: Wallet },
  { id: 'notifications', icon: Bell },
]

export default function InstructorDashboardPage(): JSX.Element {
  const state = useAppState()
  const t = useT()
  const locale = useLocale()
  const [tab, setTab] = useState<InstructorTab>('overview')
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [ready, setReady] = useState<boolean>(() => isStateLoaded())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('dw.theme', theme)
    } catch {
      // storage unavailable — in-memory only
    }
  }, [theme])

  // On a hard refresh the session is restored but server state needs fetching.
  useEffect(() => {
    if (!isStateLoaded()) {
      initStateFromServer().then((ok) => setReady(ok))
    }
  }, [])

  const session = getSession()
  if (session.role !== 'instructor') return <Navigate to="/login?role=instructor" replace />
  if (!ready) {
    return (
      <div className="ins-loading" role="status">
        <Loader2 size={26} className="ins-loading__spin" />
        <span>{t('nav.loading')}</span>
      </div>
    )
  }

  const instructor = state.instructor
  const unread = state.notifications.filter((n) => n.role === 'instructor' && n.recipientId === 'instructor' && !n.read).length
  const syncTime = formatHM(fromLocalISO(getLastSyncISO()))

  return (
    <ToastProvider>
      <div className="ins-shell">
        <aside className="ins-sidebar">
          <Link to="/" className="ins-brand" aria-label={t('nav.home')}>
            <img src={LOGO_DATA_URL} alt={t('nav.brand')} className="ins-brand-img" />
          </Link>

          <nav className="ins-nav" aria-label={t('nav.instructor')}>
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`ins-nav-item${tab === item.id ? ' is-active' : ''}`}
                onClick={() => setTab(item.id)}
              >
                <item.icon size={18} />
                <span className="ins-nav-label">{t(TAB_KEYS[item.id])}</span>
                {item.id === 'notifications' && unread > 0 ? <span className="ins-nav-badge tabular-nums">{unread}</span> : null}
              </button>
            ))}
          </nav>

          <div className="ins-sidebar-foot">
            <div className="ins-sidebar-toggles">
              <button
                type="button"
                className="ins-lang-pill"
                aria-label={t('nav.language')}
                onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
              >
                {locale === 'en' ? '中文' : 'EN'}
              </button>
              <button
                type="button"
                className="ins-icon-btn"
                aria-label={t('nav.theme')}
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>
            <div className="ins-sidebar-user">
              <Avatar name={instructor.name} color={instructor.avatarColor} size={36} />
              <div className="ins-sidebar-user-info">
                <span className="ins-sidebar-user-name">{instructor.name}</span>
                <span className="ins-sidebar-user-role">{t('nav.instructor')}</span>
              </div>
              <button type="button" className="ins-icon-btn" aria-label={t('nav.logout')} onClick={logout}>
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        <main className="ins-main">
          <header className="ins-topbar">
            <h1 className="ins-page-title">{t(TAB_KEYS[tab])}</h1>
            <div className="ins-topbar-actions">

              <span className="ins-sync-chip">
                <Cloud size={14} />
                {t('nav.synced')} · <span className="tabular-nums">{syncTime}</span>
              </span>
            </div>
          </header>
          <div className="ins-content">
            {tab === 'overview' ? <OverviewPage state={state} onNavigate={setTab} /> : null}
            {tab === 'schedule' ? <SchedulePage state={state} /> : null}
            {tab === 'workinghours' ? <WorkingHoursPage state={state} /> : null}
            {tab === 'courses' ? <CoursesPage state={state} /> : null}
            {tab === 'settings' ? <SettingsPage state={state} /> : null}
            {tab === 'students' ? <StudentsPage state={state} /> : null}
            {tab === 'payments' ? <PaymentsPage onNavigate={setTab} /> : null}
            {tab === 'notifications' ? <NotificationsPage state={state} /> : null}
          </div>
        </main>
      </div>

      {/* Always-on mobile bottom menu (same style as the student menu) */}
      <nav className="ins-bottom-nav" aria-label={t('nav.instructor')}>
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`ins-bottom-item${tab === item.id ? ' is-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={18} />
            <span className="ins-bottom-label">{t(TAB_KEYS[item.id])}</span>
            {item.id === 'notifications' && unread > 0 ? <span className="ins-bottom-badge tabular-nums">{unread}</span> : null}
          </button>
        ))}
      </nav>
    </ToastProvider>
  )
}
