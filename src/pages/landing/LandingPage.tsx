// ============================================================================
// EZDRIVES — Landing page — the product's front door (Apple-style).
// Sections: sticky header · full-bleed HD hero carousel · how it works ·
// courses (from store) · G1 mock test · instructor · testimonials · FAQ ·
// CTA band · footer. Every string via useT(); all visual values from tokens.
// ============================================================================

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Calendar,
  CalendarCheck,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  GraduationCap,
  Mail,
  MapPin,
  Menu,
  Phone,
  Play,
  Quote,
  ShieldCheck,
  Star,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useLocale, useT } from '../../i18n'
import { getSession, initPublicHome, maskPhone, useAppState } from '../../data/store'
import type { TeachingVideo } from '../../data/store'
import { G1_BANK_EN, G1_BANK_ZH } from '../../data/g1'
import { COURSE_IMAGES, G1_IMAGE, HERO_IMAGES } from '../../data/assets'
import { VideoPlayerModal } from '../../components/video/VideoPlayerModal'
import {
  LandingAvatar,
  LandingBadge,
  LandingButton,
  LanguageSwitcher,
  Logo,
  StarRating,
  ThemeToggle,
} from './primitives'
import './LandingPage.css'

// --- Hero carousel: full-bleed HD slides (Apple-style headline) ---

// Uses the real photos placed in /hero/ (hero-1.jpg … hero-6.jpg — see
// public/hero/README.txt); falls back to the bundled base64 images on error.
const HERO_FILES = ['/hero/hero-1.jpg', '/hero/hero-2.jpg', '/hero/hero-3.jpg', '/hero/hero-4.jpg', '/hero/hero-5.jpg', '/hero/hero-6.jpg']

function HeroCarousel({ slides }: { slides?: string[] }): JSX.Element {
  const locale = useLocale()
  const [idx, setIdx] = useState(0)
  const slideCount = slides?.length ?? HERO_FILES.length
  useEffect(() => {
    const id = window.setInterval(() => setIdx((i) => (i + 1) % slideCount), 5000)
    return () => window.clearInterval(id)
  }, [slideCount])
  return (
    <div className="landing-hero__media" aria-hidden="true">
      {(slides ?? HERO_FILES).map((file, i) => {
        const slide = HERO_IMAGES[i % HERO_IMAGES.length]
        return (
        <div key={i} className={`landing-hero__slide${i === idx ? ' is-active' : ''}`}>
          <img
            src={file}
            onError={(e) => {
              const target = e.currentTarget
              if (target.src !== slide.src) target.src = slide.src
            }}
            alt={locale === 'zh' ? slide.alt.zh : slide.alt.en}
          />
        </div>
        )
      })}
      <div className="landing-hero__dots">
        {Array.from({ length: slideCount }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`landing-hero__dot${i === idx ? ' is-active' : ''}`}
            onClick={() => setIdx(i)}
            aria-label={`slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }): JSX.Element {
  return (
    <div className="landing-section__head">
      <h2>{title}</h2>
      {subtitle && <p className="landing-section__sub">{subtitle}</p>}
    </div>
  )
}

/** True under the 768px breakpoint (used to switch the courses rail to the view-all card). */
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState<boolean>(() => window.matchMedia('(max-width: 768px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const onChange = (): void => setMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return mobile
}

/** Render one course card (shared by the homepage rail and the /courses page). */
function CourseCard({
  course,
  popular,
  to,
  t,
  pick,
}: {
  course: { id: string; name: { en: string; zh: string }; description: { en: string; zh: string }; price: number; durationMin: number; examCar?: boolean; imageUrl?: string }
  popular: boolean
  to: string
  t: (key: string, vars?: Record<string, string | number>) => string
  pick: (pair: { en: string; zh: string }) => string
}): JSX.Element {
  return (
    <div className={popular ? 'landing-courses__card landing-courses__card--popular' : 'landing-courses__card'}>
      {course.examCar && (
        <LandingBadge tone="info" className="landing-courses__badge">
          {t('landing.courses.examCar')}
        </LandingBadge>
      )}
      {popular && (
        <LandingBadge tone="warning" className="landing-courses__badge">
          {t('landing.courses.popular')}
        </LandingBadge>
      )}
      {(course.imageUrl || COURSE_IMAGES[course.id]) ? (
        <div className="landing-courses__media">
          <img src={course.imageUrl || COURSE_IMAGES[course.id]} alt={pick(course.name)} loading="lazy" />
        </div>
      ) : (
        <div className="landing-courses__media landing-courses__media--placeholder" aria-hidden="true">
          <Car size={26} />
        </div>
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
        variant={popular ? 'primary' : 'secondary'}
        to={to}
        className="landing-courses__cta"
      >
        {t('courses.book')}
        <ArrowRight size={16} className="landing-btn__icon" />
      </LandingButton>
    </div>
  )
}

// --- Page ---

export default function LandingPage(): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const state = useAppState()
  const { instructor } = state
  const [menuOpen, setMenuOpen] = useState(false)
  const isMobile = useIsMobile()
  const [playingVideo, setPlayingVideo] = useState<TeachingVideo | null>(null)

  // Visitors (no session) fetch the real public homepage data instead of the
  // placeholder — this also carries the admin-edited content.
  useEffect(() => {
    if (!getSession().token) {
      initPublicHome().catch(() => undefined)
    }
  }, [])

  const pick = (pair: { en: string; zh: string }): string => (locale === 'zh' ? pair.zh : pair.en)

  /** Admin-edited text override: key → localized replacement, else default. */
  const overrides = state.homeContent?.overrides || {}
  const c = (key: string): string => {
    const o = overrides[key]
    return o ? (locale === 'zh' ? o.zh : o.en) : t(key)
  }

  /** Admin-edited hero slides (data URLs) or null to keep the bundled photos. */
  const heroSlides = state.homeContent?.heroImages?.filter((v): v is string => typeof v === 'string' && v.length > 0)
  const instructorsList = state.homeContent?.instructors?.length ? state.homeContent.instructors : null
  const instructorName = overrides['instructor.name'] ? pick(overrides['instructor.name']) : instructor.name
  const instructorBio = overrides['instructor.bio'] ? pick(overrides['instructor.bio']) : pick(instructor.bio)

  const closeMenu = (): void => setMenuOpen(false)

  /** Smooth-scroll to an in-page section (works under HashRouter). */
  const goToSection = (id: string): void => {
    closeMenu()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  /** Every active course — desktop shows them all in a horizontal rail. */
  const allCourses = state.courses.filter((c) => c.active)
  /** Mobile shows a few cards + a "view all" entry to the /courses page. */
  const shownCourses = isMobile ? allCourses.slice(0, 3) : allCourses
  const popularIndex = shownCourses.length > 1 ? 1 : 0
  /** Videos with the homepage toggle on, ordered by the instructor. */
  const homeVideos = state.videos
    .filter((v) => v.active)
    .sort((a, b) => a.order - b.order || a.addedAt.localeCompare(b.addedAt))

  return (
    <div className="landing-page">
      {/* ---- Sticky translucent header ---- */}
      <header className="landing-header">
        <div className="landing-header__inner container">
          <Logo />
          <nav className="landing-nav">
            <a
              href="#how-it-works"
              onClick={(e) => {
                e.preventDefault()
                goToSection('how-it-works')
              }}
            >
              {t('landing.steps.title')}
            </a>
            <a
              href="#courses"
              onClick={(e) => {
                e.preventDefault()
                goToSection('courses')
              }}
            >
              {t('landing.courses.title')}
            </a>
            <Link to="/g1">{t('nav.g1')}</Link>
            <a
              href="#videos"
              onClick={(e) => {
                e.preventDefault()
                goToSection('videos')
              }}
            >
              {t('landing.videos.title')}
            </a>
            <a
              href="#instructor"
              onClick={(e) => {
                e.preventDefault()
                goToSection('instructor')
              }}
            >
              {t('landing.instructors.title')}
            </a>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault()
                goToSection('contact')
              }}
            >
              {t('landing.footer.contact')}
            </a>
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

        {/* Click-away scrim: closes the menu when tapping anywhere outside */}
        {menuOpen ? (
          <div className="landing-menu-scrim" onClick={closeMenu} aria-hidden="true" />
        ) : null}

        {/* Mobile menu — right-aligned dropdown under the menu button */}
        {menuOpen ? (
          <nav className="landing-mobile-menu" aria-label={t('nav.menu')}>
            <a
              href="#how-it-works"
              onClick={(e) => {
                e.preventDefault()
                goToSection('how-it-works')
              }}
            >
              {t('landing.steps.title')}
            </a>
            <a
              href="#courses"
              onClick={(e) => {
                e.preventDefault()
                goToSection('courses')
              }}
            >
              {t('landing.courses.title')}
            </a>
            <Link to="/g1" onClick={closeMenu}>
              {t('nav.g1')}
            </Link>
            <a
              href="#videos"
              onClick={(e) => {
                e.preventDefault()
                goToSection('videos')
              }}
            >
              {t('landing.videos.title')}
            </a>
            <a
              href="#instructor"
              onClick={(e) => {
                e.preventDefault()
                goToSection('instructor')
              }}
            >
              {t('landing.instructors.title')}
            </a>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault()
                goToSection('contact')
              }}
            >
              {t('landing.footer.contact')}
            </a>
            <div className="landing-mobile-menu__divider" />
            <LandingButton to="/login" className="landing-mobile-menu__login" onClick={closeMenu}>
              {t('nav.studentLogin')}
            </LandingButton>
          </nav>
        ) : null}
      </header>

      <main>
        {/* ---- Hero: full-bleed HD carousel + headline (Apple-style) ---- */}
        <section className="landing-hero">
          <HeroCarousel slides={heroSlides} />
          <div className="landing-hero__content container">
            <LandingBadge tone="success" dot className="landing-hero__badge">
              {t('landing.badge')} · {t('landing.instructors.years', { years: instructor.yearsExperience })}
            </LandingBadge>
            <h1 className="landing-hero__title">{c('landing.hero.title')}</h1>
            <p className="landing-hero__subtitle">{c('landing.hero.subtitle')}</p>
            <div className="landing-hero__ctas">
              <LandingButton size="lg" to="/student/book">
                {t('landing.cta.book')}
                <ArrowRight size={18} className="landing-btn__icon" />
              </LandingButton>
            </div>
            <div className="landing-hero__trust">
              <span className="landing-hero__trust-item">
                <Users size={18} strokeWidth={2} className="landing-hero__trust-icon" />
                {t('landing.trust.students')}
              </span>
              <span className="landing-hero__trust-sep" aria-hidden="true" />
              <span className="landing-hero__trust-item">
                <CalendarCheck size={18} strokeWidth={2} className="landing-hero__trust-icon" />
                {t('landing.trust.lessons')}
              </span>
              <span className="landing-hero__trust-sep" aria-hidden="true" />
              <span className="landing-hero__trust-item">
                <Star size={18} strokeWidth={2} className="landing-hero__trust-icon" />
                {t('landing.trust.rating')}
              </span>
            </div>
          </div>
        </section>

        {/* ---- How it works ---- */}
        <section id="how-it-works" className="landing-section">
          <div className="container">
            <SectionHeading title={t('landing.steps.title')} subtitle={t('landing.steps.subtitle')} />
            <div className="landing-steps">
              {(
                [
                  { icon: Calendar, titleKey: 'landing.steps.1.title', bodyKey: 'landing.steps.1.body' },
                  { icon: GraduationCap, titleKey: 'landing.steps.2.title', bodyKey: 'landing.steps.2.body' },
                  { icon: Zap, titleKey: 'landing.steps.3.title', bodyKey: 'landing.steps.3.body' },
                ] as const
              ).map((step, index) => {
                const Icon = step.icon
                return (
                  <div className="landing-steps__card" key={step.titleKey}>
                    <span className="landing-steps__num" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="landing-steps__icon">
                      <Icon size={22} strokeWidth={2} />
                    </span>
                    <h3>{c(step.titleKey)}</h3>
                    <p>{c(step.bodyKey)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ---- Courses (from store state) ---- */}
        <section id="courses" className="landing-section landing-section--alt">
          <div className="container">
            <SectionHeading title={t('landing.courses.title')} subtitle={c('landing.courses.subtitle')} />
            {shownCourses.length === 0 ? (
              <p className="landing-section__empty">{t('courses.unavailable')}</p>
            ) : (
              <div className="landing-courses landing-courses--rail">
                {shownCourses.map((course, index) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    popular={index === popularIndex}
                    to={`/student/book?course=${course.id}`}
                    t={t}
                    pick={pick}
                  />
                ))}
              </div>
            )}
            {/* View-all button pinned to the bottom-right of the section */}
            <div className="landing-courses__viewall-row">
              <LandingButton variant="primary" to="/courses">
                {t('landing.courses.viewAll')}
                <ArrowRight size={16} className="landing-btn__icon" />
              </LandingButton>
            </div>
          </div>
        </section>

        {/* ---- Teaching videos (from instructor 视频管理) ---- */}
        <section id="videos" className="landing-section landing-section--alt">
          <div className="container">
            <SectionHeading title={t('landing.videos.title')} subtitle={c('landing.videos.subtitle')} />
            <div className="landing-panel">
            {homeVideos.length === 0 ? (
              <p className="landing-section__empty">{t('landing.videos.empty')}</p>
            ) : (
              <div className="landing-videos">
                {homeVideos.map((video) => (
                  <figure className="landing-videos__card" key={video.id}>
                    <button
                      type="button"
                      className="landing-videos__media"
                      onClick={() => setPlayingVideo(video)}
                      aria-label={t('landing.videos.play', {
                        title: locale === 'zh' ? video.title.zh : video.title.en,
                      })}
                    >
                      {video.kind === 'youtube' ? (
                        <img
                          className="landing-videos__thumb"
                          src={`https://i.ytimg.com/vi/${video.src}/hqdefault.jpg`}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <video className="landing-videos__thumb" src={video.src} muted preload="metadata" />
                      )}
                      <span className="landing-videos__overlay" aria-hidden="true">
                        <Play size={22} fill="currentColor" />
                      </span>
                    </button>
                    <figcaption className="landing-videos__caption">
                      <span className="landing-videos__text">
                        <span className="landing-videos__title">{locale === 'zh' ? video.title.zh : video.title.en}</span>
                        {video.description && (video.description.en || video.description.zh) ? (
                          <span className="landing-videos__desc">
                            {locale === 'zh' && video.description.zh
                              ? video.description.zh
                              : locale === 'en' && video.description.en
                                ? video.description.en
                                : video.description.en || video.description.zh}
                          </span>
                        ) : null}
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
            </div>
          </div>
        </section>

        <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />

        {/* ---- G1 mock test (public) ---- */}
        <section id="g1" className="landing-section landing-section--alt">
          <div className="container">
            <SectionHeading title={t('landing.g1.title')} subtitle={t('landing.g1.body')} />
            <div className="landing-panel landing-panel--g1">
            <div className="landing-g1">
              <div className="landing-g1__copy">
                <div className="landing-g1__chips">
                  <span className="landing-g1__chip">
                    {t('g1.zhBody', { count: G1_BANK_ZH.length })}
                  </span>
                  <span className="landing-g1__chip">
                    {t('g1.enBody', { count: G1_BANK_EN.length })}
                  </span>
                </div>
                <p className="landing-g1__desc">{t('g1.subtitle')}</p>
                <div className="landing-g1__cta">
                  <LandingButton to="/g1" size="lg">
                    {t('landing.g1.cta')}
                    <ArrowRight size={18} className="landing-btn__icon" />
                  </LandingButton>
                </div>
              </div>
              <div className="landing-g1__visual" aria-hidden="true">
                <img className="landing-g1__img" src={G1_IMAGE} alt="" loading="lazy" />
                <span className="landing-g1__badge">
                  <GraduationCap size={18} />
                  G1
                </span>
                <span className="landing-g1__ok">
                  <CheckCircle2 size={22} />
                </span>
              </div>
            </div>
            </div>
          </div>
        </section>

        {/* ---- Instructor ---- */}
        <section id="instructor" className="landing-section">
          <div className="container">
            <SectionHeading title={t('landing.instructors.title')} subtitle={t('landing.instructors.subtitle')} />
            {instructorsList ? (
              <div className="landing-instructors">
                {instructorsList.map((coach) => (
                  <div className="landing-instructor landing-instructor--card" key={coach.id}>
                    <div className="landing-instructor__left">
                      {coach.photo ? (
                        <img className="landing-instructor__photo" src={coach.photo} alt={coach.name} />
                      ) : (
                        <span className="landing-instructor__avatar-wrap">
                          <LandingAvatar name={coach.name} color={instructor.avatarColor} size={64} />
                        </span>
                      )}
                      <h3 className="landing-instructor__name">{coach.name}</h3>
                      <LandingBadge tone="success" className="landing-instructor__badge">
                        <ShieldCheck size={12} />
                        {t('landing.badge')}
                      </LandingBadge>
                    </div>
                    <div className="landing-instructor__right">
                      <p className="landing-instructor__bio">{pick(coach.bio)}</p>
                      <div className="landing-instructor__stats">
                        <LandingBadge tone="neutral">
                          <ShieldCheck size={12} />
                          {t('landing.instructors.years', { years: coach.years })}
                        </LandingBadge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <div className="landing-instructor">
              <div className="landing-instructor__left">
                <span className="landing-instructor__avatar-wrap">
                  <LandingAvatar name={instructorName} color={instructor.avatarColor} size={64} />
                  <span className="landing-instructor__online" aria-hidden="true" />
                </span>
                <h3 className="landing-instructor__name">{instructorName}</h3>
                <span className="landing-instructor__rating-row">
                  <StarRating value={instructor.rating} label={t('landing.trust.rating')} size={15} />
                  <span className="landing-instructor__rating tabular-nums">{instructor.rating.toFixed(1)}</span>
                </span>
                <LandingBadge tone="success" className="landing-instructor__badge">
                  <ShieldCheck size={12} />
                  {t('landing.badge')}
                </LandingBadge>
              </div>
              <div className="landing-instructor__right">
                <p className="landing-instructor__bio">{instructorBio}</p>
                <div className="landing-instructor__stats">
                  <LandingBadge tone="neutral">
                    <Users size={12} />
                    {t('landing.trust.students')}
                  </LandingBadge>
                  <LandingBadge tone="neutral">
                    <CalendarCheck size={12} />
                    {t('landing.trust.lessons')}
                  </LandingBadge>
                  <LandingBadge tone="neutral">
                    <ShieldCheck size={12} />
                    {t('landing.instructors.years', { years: instructor.yearsExperience })}
                  </LandingBadge>
                </div>
                <div className="landing-instructor__vehicles">
                  <span className="landing-instructor__vehicles-label">{t('vehicles.thisVehicle')}</span>
                  {state.vehicles
                    .filter((v) => v.active)
                    .map((vehicle) => (
                      <span className="landing-instructor__vehicle" key={vehicle.id}>
                        <Car size={14} />
                        {vehicle.make} {vehicle.model} · {pick(vehicle.color)}
                      </span>
                    ))}
                </div>
                <LandingButton to="/student/book" className="landing-instructor__cta">
                  {t('landing.instructors.book')}
                </LandingButton>
              </div>
            </div>
            )}
          </div>
        </section>

        {/* ---- Testimonials ---- */}
        <section className="landing-section landing-section--alt">
          <div className="container">
            <SectionHeading title={t('landing.testimonials.title')} />
            <div className="landing-testimonials">
              {[1, 2, 3].map((n) => (
                <figure className="landing-testimonials__card" key={n}>
                  <Quote size={22} className="landing-testimonials__quote-icon" />
                  <StarRating value={5} size={14} />
                  <blockquote>{c(`landing.testimonials.${n}.quote`)}</blockquote>
                  <figcaption>{c(`landing.testimonials.${n}.author`)}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ---- FAQ ---- */}
        <section id="faq" className="landing-section">
          <div className="container">
            <SectionHeading title={t('landing.faq.title')} />
            <div className="landing-faq">
              {[1, 2, 3, 4].map((n) => (
                <details className="landing-faq__item" key={n}>
                  <summary>
                    <span>{c(`landing.faq.${n}.q`)}</span>
                    <ChevronDown size={18} className="landing-faq__chevron" />
                  </summary>
                  <p>{c(`landing.faq.${n}.a`)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Final CTA band ---- */}
        <section className="landing-band">
          <div className="container">
            <div className="landing-band__inner">
              <div className="landing-band__copy">
                <h2>{c('landing.cta.band.title')}</h2>
                <p>{c('landing.cta.band.body')}</p>
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

      {/* ---- Footer ---- */}
      <footer id="contact" className="landing-footer">
        <div className="container">
          <div className="landing-footer__grid">
            <div className="landing-footer__brand">
              <Logo />
              <p className="landing-footer__tagline">{c('landing.footer.tagline')}</p>
              <p className="landing-footer__lang">{t('landing.footer.language')}</p>
            </div>
            <div className="landing-footer__col">
              <h4>{t('landing.footer.links')}</h4>
              <a
                href="#how-it-works"
                onClick={(e) => {
                  e.preventDefault()
                  goToSection('how-it-works')
                }}
              >
                {t('landing.steps.title')}
              </a>
              <a
                href="#courses"
                onClick={(e) => {
                  e.preventDefault()
                  goToSection('courses')
                }}
              >
                {t('landing.courses.title')}
              </a>
              <Link to="/g1">{t('nav.g1')}</Link>
              <a
                href="#videos"
                onClick={(e) => {
                  e.preventDefault()
                  goToSection('videos')
                }}
              >
                {t('landing.videos.title')}
              </a>
              <Link to="/courses">{t('nav.courses')}</Link>
              <a
                href="#faq"
                onClick={(e) => {
                  e.preventDefault()
                  goToSection('faq')
                }}
              >
                {t('landing.faq.title')}
              </a>
              <Link to="/login?role=instructor">{t('nav.instructor')}</Link>
            </div>
            <div className="landing-footer__col">
              <h4>{t('landing.footer.contact')}</h4>
              <a href={`mailto:${instructor.email}`}>
                <Mail size={15} />
                {instructor.email}
              </a>
              <a href={`tel:${instructor.phone.replace(/\s/g, '')}`}>
                <Phone size={15} />
                {maskPhone(instructor.phone)}
              </a>
              <span className="landing-footer__contact-line">
                <MapPin size={15} />
                {t('ics.location')}
              </span>
            </div>
          </div>
          <div className="landing-footer__bottom">
            <span>{t('landing.footer.rights')}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
