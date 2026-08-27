// ============================================================================
// EZDRIVES — Public "All courses" page (/courses)
// Reached from the homepage ("View all courses" / 查看更多课程) and the nav.
// Lists every active course with the same card style as the homepage section;
// each card books straight into the student flow.
// ============================================================================

import { ArrowLeft, ArrowRight, Check, Clock, GraduationCap, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLocale, useT } from '../../i18n'
import { getSession, initPublicHome, useAppState } from '../../data/store'
import { G1_BANK_EN, G1_BANK_ZH } from '../../data/g1'
import { LandingBadge, LandingButton, LanguageSwitcher, Logo, ThemeToggle } from './primitives'
import './LandingPage.css'

export default function CoursesPage(): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const state = useAppState()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  // Visitors (no session) load the real public catalogue instead of the seed.
  useEffect(() => {
    if (!getSession().token) initPublicHome().catch(() => undefined)
  }, [])

  const pick = (pair: { en: string; zh: string }): string => (locale === 'zh' ? pair.zh : pair.en)
  const courses = state.courses.filter((c) => c.active)
  const popularIndex = courses.length > 1 ? 1 : 0

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

  // Same menu as the homepage (desktop nav + mobile menu), so the site
  // navigation stays consistent across public pages.
  const navItems: { key: string; type: 'section' | 'g1'; id?: string; label: string }[] = [
    { key: 'how-it-works', type: 'section', id: 'how-it-works', label: t('landing.steps.title') },
    { key: 'courses', type: 'section', id: 'courses', label: t('landing.courses.title') },
    { key: 'g1', type: 'g1', label: t('nav.g1') },
    { key: 'videos', type: 'section', id: 'videos', label: t('landing.videos.title') },
    { key: 'instructor', type: 'section', id: 'instructor', label: t('landing.instructors.title') },
    { key: 'contact', type: 'section', id: 'contact', label: t('landing.footer.contact') },
  ]

  return (
    <div className="landing-page landing-page--sub">
      <header className="landing-header">
        <div className="landing-header__inner container">
          <Logo />
          <nav className="landing-nav">
            {navItems.map((item) =>
              item.type === 'g1' ? (
                <Link key={item.key} to="/g1">
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.key}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    goHomeSection(item.id as string)
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
            <button
              type="button"
              className="landing-menu-btn"
              aria-label={t('nav.menu')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen ? <div className="landing-menu-scrim" onClick={closeMenu} aria-hidden="true" /> : null}

        {menuOpen ? (
          <nav className="landing-mobile-menu" aria-label={t('nav.menu')}>
            {navItems.map((item) =>
              item.type === 'g1' ? (
                <Link key={item.key} to="/g1" onClick={closeMenu}>
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.key}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    goHomeSection(item.id as string)
                  }}
                >
                  {item.label}
                </a>
              ),
            )}
            <div className="landing-mobile-menu__divider" />
            <LandingButton to="/login" className="landing-mobile-menu__login" onClick={closeMenu}>
              {t('nav.studentLogin')}
            </LandingButton>
          </nav>
        ) : null}
      </header>

      <main>
        <section className="landing-section">
          <div className="container">
            <div className="landing-sub-head">
              <LandingButton variant="ghost" to="/" className="landing-sub-back">
                <ArrowLeft size={16} /> {t('nav.home')}
              </LandingButton>
              <h1 className="landing-sub-title">{t('nav.courses')}</h1>
              <p className="landing-sub-sub">{t('landing.courses.subtitle')}</p>
            </div>

            {courses.length === 0 ? (
              <p className="landing-section__empty">{t('courses.unavailable')}</p>
            ) : (
              <div className="landing-courses landing-courses--grid">
                {courses.map((course, index) => (
                  <div
                    className={
                      index === popularIndex ? 'landing-courses__card landing-courses__card--popular' : 'landing-courses__card'
                    }
                    key={course.id}
                  >
                    {course.examCar && (
                      <LandingBadge tone="info" className="landing-courses__badge">
                        {t('landing.courses.examCar')}
                      </LandingBadge>
                    )}
                    {index === popularIndex && (
                      <LandingBadge tone="warning" className="landing-courses__badge">
                        {t('landing.courses.popular')}
                      </LandingBadge>
                    )}
                    <h3 className="landing-courses__name">{pick(course.name)}</h3>
                    <p className="landing-courses__desc">{pick(course.description)}</p>
                    <div className="landing-courses__meta">
                      <span className="landing-courses__price">${course.price}</span>
                      <span className="landing-courses__per">{t('courses.perLesson')}</span>
                      <span className="landing-courses__dur">
                        <Clock size={14} />
                        {t('courses.duration', { duration: course.durationMin })}
                      </span>
                    </div>
                    <ul className="landing-courses__features">
                      <li>
                        <Check size={15} strokeWidth={2.5} />
                        {t('vehicles.automatic')}
                      </li>
                      <li>
                        <Check size={15} strokeWidth={2.5} />
                        {t('vehicles.thisVehicle')}
                      </li>
                    </ul>
                    <LandingButton
                      variant={index === popularIndex ? 'primary' : 'secondary'}
                      to={`/student/book?course=${course.id}`}
                      className="landing-courses__cta"
                    >
                      {t('courses.book')}
                      <ArrowRight size={16} className="landing-btn__icon" />
                    </LandingButton>
                  </div>
                ))}
              </div>
            )}

            <div className="landing-courses__g1">
              <LandingBadge tone="info" dot>
                <GraduationCap size={13} />
                G1 · {t('g1.zhBody', { count: G1_BANK_ZH.length })} / {t('g1.enBody', { count: G1_BANK_EN.length })}
              </LandingBadge>
              <p>{t('g1.subtitle')}</p>
              <LandingButton variant="secondary" to="/g1">
                {t('landing.g1.cta')}
                <ArrowRight size={16} className="landing-btn__icon" />
              </LandingButton>
            </div>
          </div>
        </section>

        <section className="landing-band">
          <div className="container">
            <div className="landing-band__inner">
              <div className="landing-band__copy">
                <h2>{t('landing.cta.band.title')}</h2>
                <p>{t('landing.cta.band.body')}</p>
              </div>
              <div className="landing-band__actions">
                <LandingButton size="lg" to="/student/book">
                  {t('landing.cta.book')}
                  <ArrowRight size={18} className="landing-btn__icon" />
                </LandingButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="container">
          <div className="landing-footer__bottom">
            <span>{t('landing.footer.rights')}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
