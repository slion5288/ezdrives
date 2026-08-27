// ============================================================================
// EZDRIVES — LandingSubHeader (shared sub-page header for /courses /g1 /videos)
// Unified secondary-page header: logo (→ home), desktop inline nav (6 items),
// and — always in the top-right corner — a MENU BUTTON that opens a dropdown
// with every site destination (home sections + pages + student login), so the
// user can jump to any page from any secondary page. Clicking outside closes.
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useT } from '../../i18n'
import { LanguageSwitcher } from '../../components/shared/LanguageSwitcher'
import { ThemeToggle } from '../../components/shared/ThemeToggle'
import { Logo } from '../../components/shared/Logo'
import { LandingButton } from './primitives'
import './LandingPage.css'

interface NavItem {
  key: string
  kind: 'section' | 'page'
  /** section: scroll target on the homepage */
  sectionId?: string
  /** page: target route */
  to?: string
  label: string
}

/** The one shared navigation model for every secondary page. */
function useNavItems(): NavItem[] {
  const t = useT()
  return [
    { key: 'how-it-works', kind: 'section', sectionId: 'how-it-works', label: t('landing.steps.title') },
    { key: 'courses', kind: 'page', to: '/courses', label: t('landing.courses.title') },
    { key: 'g1', kind: 'page', to: '/g1', label: t('nav.g1') },
    { key: 'videos', kind: 'page', to: '/videos', label: t('landing.videos.title') },
    { key: 'instructor', kind: 'section', sectionId: 'instructor', label: t('landing.instructors.title') },
    { key: 'contact', kind: 'section', sectionId: 'contact', label: t('landing.footer.contact') },
  ]
}

export default function LandingSubHeader(): JSX.Element {
  const t = useT()
  const navigate = useNavigate()
  const navItems = useNavItems()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const closeMenu = (): void => setMenuOpen(false)

  /** Go to the homepage and scroll to one of its sections (cross-page). */
  const goHomeSection = (id: string): void => {
    closeMenu()
    navigate('/')
    let tries = 0
    const timer = window.setInterval(() => {
      tries += 1
      const el = document.getElementById(id)
      if (el) {
        window.clearInterval(timer)
        el.scrollIntoView({ behavior: 'smooth' })
      } else if (tries > 25) {
        window.clearInterval(timer)
      }
    }, 100)
  }

  const activate = (item: NavItem): void => {
    closeMenu()
    if (item.kind === 'page' && item.to) navigate(item.to)
    else if (item.sectionId) goHomeSection(item.sectionId)
  }

  // Close the dropdown on outside clicks.
  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <header className="landing-header">
      <div className="landing-header__inner container">
        <Logo />
        <nav className="landing-nav" aria-label={t('nav.menu')}>
          {navItems.map((item) =>
            item.kind === 'page' ? (
              <Link key={item.key} to={item.to ?? '/'} onClick={closeMenu}>
                {item.label}
              </Link>
            ) : (
              <a
                key={item.key}
                href={`#${item.sectionId}`}
                onClick={(e) => {
                  e.preventDefault()
                  goHomeSection(item.sectionId as string)
                }}
              >
                {item.label}
              </a>
            ),
          )}
        </nav>
        <div className="landing-header__actions">
          <LanguageSwitcher />
          <ThemeToggle />
          <LandingButton to="/login" variant="secondary" size="sm" className="landing-header__login">
            {t('nav.studentLogin')}
          </LandingButton>
          <div className="landing-sub-menu" ref={menuRef}>
            <button
              type="button"
              className="landing-menu-btn landing-sub-menu__btn"
              aria-label={t('nav.menu')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            {menuOpen ? (
              <div className="landing-sub-menu__panel" role="menu">
                {navItems.map((item) => (
                  <button key={item.key} type="button" role="menuitem" className="landing-sub-menu__item" onClick={() => activate(item)}>
                    {item.label}
                  </button>
                ))}
                <div className="landing-mobile-menu__divider" />
                <Link to="/login" className="landing-sub-menu__item landing-sub-menu__item--login" onClick={closeMenu}>
                  {t('nav.studentLogin')}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
