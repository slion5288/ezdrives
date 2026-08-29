// ============================================================================
// EZDRIVES — Landing page — the product's front door (Apple-style).
// Sections: sticky header · full-bleed HD hero carousel · how it works ·
// courses (from store) · G1 mock test · instructor · testimonials · FAQ ·
// CTA band · footer. Every string via useT(); all visual values from tokens.
// ============================================================================

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {Calendar, CalendarCheck, Car, CheckCircle2, ChevronDown, GraduationCap, Mail, Navigation, Pause, Phone, Play, Quote, ShieldCheck, Users, Zap, } from 'lucide-react'
import { useLocale, useT } from '../../i18n'
import { getSession, initPublicHome, isPublicReady, sortCoursesForDisplay, useAppState } from '../../data/store'
import type { TeachingVideo } from '../../data/store'
import { G1_COUNTS } from '../../data/g1'
import { G1_IMAGE, HERO_IMAGES } from '../../data/assets'
import { VideoPlayerModal } from '../../components/video/VideoPlayerModal'
import {CourseCard,LandingAvatar,LandingBadge,Logo,StarRating,} from './primitives'
import LandingSubHeader from './LandingSubHeader'
import './LandingPage.css'
import { Button } from '../../components/shared/Button'

// --- Hero: full-bleed carousel (admin hero images first, bundled fallback) ---
const HERO_FILES = ['/hero/hero-1.jpg', '/hero/hero-2.jpg', '/hero/hero-3.jpg', '/hero/hero-4.jpg', '/hero/hero-5.jpg', '/hero/hero-6.jpg']

function HeroCarousel({ slides }: { slides?: string[] }): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const slideCount = slides?.length ?? HERO_FILES.length
  useEffect(() => {
    try {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    } catch { /* ignore */ }
    if (paused) return
    const id = window.setInterval(() => setIdx((i) => (i + 1) % slideCount), 5000)
    return () => window.clearInterval(id)
  }, [slideCount, paused])
  const files = slides ?? HERO_FILES
  return (
    <div className="landing-hero__media" aria-hidden="true">
      {files.map((file, i) => {
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
            aria-label={t('landing.hero.slide', { n: i + 1 })}
          />
        ))}
        <button
          type="button"
          className="landing-hero__pause"
          onClick={() => setPaused((v) => !v)}
          aria-label={paused ? t('landing.hero.resume') : t('landing.hero.pause')}
        >
          {paused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}
        </button>
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

export default function LandingPage(): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const state = useAppState()
  const { instructor } = state
  const [playingVideo, setPlayingVideo] = useState<TeachingVideo | null>(null)

  // Visitors (no session) fetch the real public homepage data instead of the
  // placeholder — this also carries the admin-edited content.
  useEffect(() => {
    if (!getSession().token) {
      initPublicHome().catch(() => undefined)
    }
  }, [])

  // Close the mobile menu on Esc.
  const pick = (pair: { en: string; zh: string }): string => (locale === 'zh' || !pair.en || !pair.en.trim() ? pair.zh : pair.en)

  // Visitors: never show the seed placeholder — render empty until the real
  // public data has been fetched (isPublicReady), or forever if it failed.
  const visitor = !getSession().token
  const publicReady = isPublicReady()

  /** Admin-edited text override: key → localized replacement, else default. */
  const overrides = state.homeContent?.overrides || {}
  const c = (key: string): string => {
    const o = overrides[key]
    return o ? (locale === 'zh' ? o.zh : o.en) : t(key)
  }

  /** Admin-edited hero slides (data URLs) — shown first in the carousel. */
  const heroSlides = state.homeContent?.heroImages?.filter((v): v is string => typeof v === 'string' && v.length > 0)
  const instructorsList = state.homeContent?.instructors?.length ? state.homeContent.instructors : null
  // While the public data is still loading, hide the seed instructor placeholder.
  const placeholderInstructor = visitor && !publicReady
  const instructorName = placeholderInstructor
    ? ''
    : overrides['instructor.name'] ? pick(overrides['instructor.name']) : instructor.name
  const instructorBio = placeholderInstructor
    ? ''
    : overrides['instructor.bio'] ? pick(overrides['instructor.bio']) : pick(instructor.bio)
  // § never flash the demo instructor's years / rating / contact while the real
  // public data loads (or on failure) — neutral values instead.
  const instructorYears = placeholderInstructor ? 0 : instructor.yearsExperience
  const instructorRating = placeholderInstructor ? 0 : instructor.rating
  const instructorEmail = placeholderInstructor ? '' : instructor.email
  const instructorPhone = placeholderInstructor ? '' : instructor.phone

  /** Smooth-scroll to an in-page section (works under HashRouter). */
  const goToSection = (id: string): void => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  /** Every active course, sorted for display (trial first, then drag-order).
   *  § user decision: the homepage shows ONLY the 3 most popular courses
   *  (the instructor picks the order by dragging in 课程管理). */
  const allCourses = visitor && !publicReady ? [] : sortCoursesForDisplay(state.courses.filter((c) => c.active))
  const shownCourses = allCourses.slice(0, 3)
  /** Videos with the homepage toggle on, ordered by the instructor. */
  const homeVideos = (visitor && !publicReady ? [] : state.videos)
    .filter((v) => v.active)
    .sort((a, b) => a.order - b.order || a.addedAt.localeCompare(b.addedAt))

  return (
    <div className="landing-page">
      {/* ---- Unified header: logo + nav + top-right menu (same as sub-pages) ---- */}
      <LandingSubHeader />

      <main>
        {/* ---- Hero: carousel + headline + ONE CTA (no price line, no trust bar) ---- */}
        <section className="landing-hero">
          <HeroCarousel slides={heroSlides} />
          <div className="landing-hero__content container">
            <LandingBadge tone="success" dot className="landing-hero__badge">
              {t('landing.badge')} · {t('landing.instructors.years', { years: instructorYears })}
            </LandingBadge>
            <h1 className="landing-hero__title">{c('landing.hero.title')}</h1>
            <p className="landing-hero__subtitle">{c('landing.hero.subtitle')}</p>
            <div className="landing-hero__ctas">
              <Button size="lg" to="/student/book">
                {t('landing.cta.book')}
              </Button>
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
                {shownCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    to={`/student/book?course=${course.id}`}
                    t={t}
                    pick={pick}
                    media
                  />
                ))}
              </div>
            )}
            {/* View-all button pinned to the bottom-right of the section */}
            <div className="landing-courses__viewall-row">
              <Button variant="primary" to="/courses">
                {t('landing.courses.viewAll')}
              </Button>
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
            <div className="landing-courses__viewall-row">
              <Button variant="secondary" to="/videos">
                {t('landing.videos.viewAll')}
              </Button>
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
                    {t('g1.zhBody', { count: G1_COUNTS.zh })}
                  </span>
                  <span className="landing-g1__chip">
                    {t('g1.enBody', { count: G1_COUNTS.en })}
                  </span>
                </div>
                <p className="landing-g1__desc">{t('g1.subtitle')}</p>
                <div className="landing-g1__cta">
                  <Button to="/g1" size="lg">
                    {t('landing.g1.cta')}
                  </Button>
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
                  <StarRating value={instructorRating} label={t('landing.trust.rating')} size={15} />
                  <span className="landing-instructor__rating tabular-nums">{instructorRating.toFixed(1)}</span>
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
                    {t('landing.instructors.years', { years: instructorYears })}
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
                <Button to="/student/book" className="landing-instructor__cta">
                  {t('landing.instructors.book')}
                </Button>
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
                  <Quote size={22} className="landing-testimonials__quote-icon" aria-hidden="true" />
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
                <Button size="lg" to="/student/book">
                  {t('landing.cta.book')}
                </Button>
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
              <Link to="/courses">{t('landing.courses.title')}</Link>
              <Link to="/g1">{t('nav.g1')}</Link>
              <Link to="/videos">{t('landing.videos.title')}</Link>
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
              {/* § P0: the public API never returns the instructor's personal
                  email/phone — visitors get the map + booking CTA instead. */}
              {instructorEmail ? (
                <a href={`mailto:${instructorEmail}`}>
                  <Mail size={15} />
                  {instructorEmail}
                </a>
              ) : null}
              {instructorPhone ? (
                <a href={`tel:${instructorPhone.replace(/\s/g, '')}`}>
                  <Phone size={15} />
                  {instructorPhone}
                </a>
              ) : null}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(t('ics.location'))}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation size={15} />
                {t('ics.location')}
              </a>
            </div>
          </div>
          <div className="landing-footer__bottom">
            <span>{String(new Date().getFullYear())} © EZDRIVES</span>
            <span className="landing-footer__legal">
              <Link to="/legal/privacy">{t('legal.privacy')}</Link>
              <span aria-hidden="true">·</span>
              <Link to="/legal/terms">{t('legal.terms')}</Link>
              <span aria-hidden="true">·</span>
              <Link to="/legal/cancellation">{t('legal.cancellation')}</Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
