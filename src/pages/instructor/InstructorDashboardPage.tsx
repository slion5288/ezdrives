// ============================================================================
// EZDRIVES — InstructorDashboardPage (instructor-owned)
// The instructor "control room": top header (logo → home, tab menu,
// language/theme toggles, avatar) + content area. Requires an instructor
// session, else redirects to /login?role=instructor.
// § redesign: the bottom bar (and the desktop header) show at most 5 items —
// 今天 / 日程 / 收款 / 学员 / 更多. 更多 opens a sheet with 总览 / 课程 / 通知 / 设置,
// so every capability stays one tap away.
// ============================================================================

import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getLastSyncISO, getSession, initStateFromServer, isStateLoaded, logout, useAppState } from '../../data/store'
import { setLocale, useLocale, useT } from '../../i18n'
import { formatHM, fromLocalISO } from '../../data/timeEngine'
import {
  Bell,
  CalendarDays,
  Cloud,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogOut,
  Moon,
  MoreHorizontal,
  Settings2,
  Sun,
  SunMedium,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Avatar } from './ui'
import { MAIN_TABS, MORE_TABS, TAB_KEYS } from './helpers'
import type { InstructorTab } from './helpers'
import TodayPage from './TodayPage'
import OverviewPage from './OverviewPage'
import SchedulePage from './SchedulePage'
import CoursesPage from './CoursesPage'
import StudentsPage from './StudentsPage'
import PaymentsPage from './PaymentsPage'
import SettingsPage from './SettingsPage'
import NotificationsPage from './NotificationsPage'
import { LOGO_DATA_URL } from '../../data/assets'
import './InstructorDashboard.css'
import { Button } from '../../components/shared/Button'

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

/** § P0: 更多 menu — desktop uses the header dropdown ONLY, mobile uses the
 *  bottom sheet ONLY. They must never render together. */
function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState<boolean>(() => {
    try { return window.matchMedia('(min-width: 901px)').matches } catch { return true }
  })
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 901px)')
    const onChange = (): void => setDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return desktop
}

const ICONS: Record<InstructorTab, LucideIcon> = {
  today: SunMedium,
  overview: LayoutDashboard,
  schedule: CalendarDays,
  courses: GraduationCap,
  students: Users,
  payments: Wallet,
  notifications: Bell,
  settings: Settings2,
}

export default function InstructorDashboardPage(): JSX.Element {
  const state = useAppState()
  const t = useT()
  const locale = useLocale()
  const [tab, setTab] = useState<InstructorTab>('today')
  const [moreOpen, setMoreOpen] = useState(false)
  const isDesktop = useIsDesktop()
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [ready, setReady] = useState<boolean>(() => isStateLoaded())
  const [loadError, setLoadError] = useState(false)

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
      initStateFromServer().then((ok) => {
        setReady(ok)
        setLoadError(!ok)
      })
    }
  }, [])

  const retryLoad = (): void => {
    setLoadError(false)
    setReady(false)
    initStateFromServer().then((ok) => {
      setReady(ok)
      setLoadError(!ok)
    })
  }

  // Live sync: poll the server every 30s so student purchases/bookings appear.
  useEffect(() => {
    const id = window.setInterval(() => {
      initStateFromServer().catch(() => undefined)
    }, 30000)
    return () => window.clearInterval(id)
  }, [])

  // Close the 更多 sheet when a tab is picked from it (or Escape).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const session = getSession()
  if (session.role !== 'instructor') return <Navigate to="/login?role=instructor" replace />
  if (!ready) {
    return (
      <div className="ins-loading" role="status">
        <Loader2 size={26} className="ins-loading__spin" />
        <span>{t('nav.loading')}</span>
        {loadError ? (
          <div className="ins-loading__error">
            <p>{t('common.toast.error')}</p>
            <Button variant="primary" size="sm" onClick={retryLoad}>
              {t('common.retry')}
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  const instructor = state.instructor
  const unread = state.notifications.filter((n) => n.role === 'instructor' && n.recipientId === 'instructor' && !n.read).length
  const syncTime = formatHM(fromLocalISO(getLastSyncISO()))
  const inMore = MORE_TABS.includes(tab)

  /** §: the bottom bar uses short nav labels (今天/日程/收款/学员/更多). */
  const navLabel = (id: InstructorTab): string => (id === 'payments' ? t('instructor.nav.payments') : t(TAB_KEYS[id]))

  const pick = (id: InstructorTab): void => {
    setTab(id)
    setMoreOpen(false)
  }

  const tabContent = (): JSX.Element | null => {
    switch (tab) {
      case 'today': return <TodayPage state={state} onNavigate={pick} />
      case 'overview': return <OverviewPage state={state} onNavigate={pick} />
      case 'schedule': return <SchedulePage state={state} />
      case 'courses': return <CoursesPage state={state} />
      case 'settings': return <SettingsPage state={state} />
      case 'students': return <StudentsPage state={state} />
      case 'payments': return <PaymentsPage onNavigate={pick} />
      case 'notifications': return <NotificationsPage state={state} />
    }
  }

  return (
    <>
      <div className="ins-shell">
        <header className="ins-header">
          <Link to="/" className="ins-header-brand" aria-label={t('nav.home')}>
            <img src={LOGO_DATA_URL} alt={t('nav.brand')} className="ins-brand-img" />
          </Link>

          <nav className="ins-header-nav" aria-label={t('nav.instructor')}>
            {MAIN_TABS.map((id) => {
              const Icon = ICONS[id]
              return (
                <button
                  key={id}
                  type="button"
                  className={`ins-header-item${tab === id ? ' is-active' : ''}`}
                  onClick={() => pick(id)}
                >
                  <Icon size={18} />
                  <span className="ins-header-label">{navLabel(id)}</span>
                </button>
              )
            })}
            {/* 更多: overflow menu with the remaining capabilities */}
            <div className="ins-more-wrap">
              <button
                type="button"
                className={`ins-header-item${inMore ? ' is-active' : ''}`}
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((v) => !v)}
              >
                <MoreHorizontal size={18} />
                <span className="ins-header-label">{t('instructor.more')}</span>
              </button>
              {moreOpen && isDesktop ? (
                <div className="ins-more-panel" role="menu">
                  {MORE_TABS.map((id) => {
                    const Icon = ICONS[id]
                    return (
                      <button
                        key={id}
                        type="button"
                        role="menuitem"
                        className={`ins-more-item${tab === id ? ' is-active' : ''}`}
                        onClick={() => pick(id)}
                      >
                        <Icon size={16} />
                        <span>{t(TAB_KEYS[id])}</span>
                        {id === 'notifications' && unread > 0 ? <span className="ins-nav-badge tabular-nums">{unread}</span> : null}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </nav>

          <div className="ins-header-actions">
            <div className="ins-header-toggles">
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
            <div className="ins-header-user">
              <Avatar name={instructor.name} color={instructor.avatarColor} size={34} />
              <div className="ins-header-user-info">
                <span className="ins-header-user-name">{instructor.name}</span>
                <span className="ins-header-user-role">{t('nav.instructor')}</span>
              </div>
              <button type="button" className="ins-icon-btn" aria-label={t('nav.logout')} onClick={logout}>
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="ins-main">
          <div className="ins-main-head">
            <h1 className="ins-page-title">{t(TAB_KEYS[tab])}</h1>
            <div className="ins-main-head-actions">
              <span className="ins-sync-chip">
                <Cloud size={14} />
                {t('nav.synced')} · <span className="tabular-nums">{syncTime}</span>
              </span>
            </div>
          </div>
          <div className="ins-content">{tabContent()}</div>
        </main>
      </div>

      {/* Always-on mobile bottom bar — at most 5 items */}
      <nav className="ins-bottom-nav" aria-label={t('nav.instructor')}>
        {MAIN_TABS.map((id) => {
          const Icon = ICONS[id]
          return (
            <button
              key={id}
              type="button"
              className={`ins-bottom-item${tab === id ? ' is-active' : ''}`}
              onClick={() => pick(id)}
            >
              <Icon size={18} />
              <span className="ins-bottom-label">{navLabel(id)}</span>
            </button>
          )
        })}
        <button
          type="button"
          className={`ins-bottom-item${inMore ? ' is-active' : ''}`}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((v) => !v)}
        >
          <MoreHorizontal size={18} />
          <span className="ins-bottom-label">{t('instructor.more')}</span>
        </button>
      </nav>

      {/* 更多 bottom sheet (mobile) */}
      {moreOpen && !isDesktop ? (
        <div className="ins-more-scrim" onMouseDown={() => setMoreOpen(false)}>
          <div className="ins-more-sheet" onMouseDown={(e) => e.stopPropagation()} role="menu">
            <div className="ins-more-sheet__head">
              <span>{t('instructor.more')}</span>
              <button type="button" className="ins-icon-btn" onClick={() => setMoreOpen(false)} aria-label={t('common.close')}>
                ✕
              </button>
            </div>
            {MORE_TABS.map((id) => {
              const Icon = ICONS[id]
              return (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  className={`ins-more-item${tab === id ? ' is-active' : ''}`}
                  onClick={() => pick(id)}
                >
                  <Icon size={18} />
                  <span>{t(TAB_KEYS[id])}</span>
                  {id === 'notifications' && unread > 0 ? <span className="ins-nav-badge tabular-nums">{unread}</span> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </>
  )
}
