// ============================================================================
// EZDRIVES — Public "All courses" page (/courses)
// Reached from the homepage ("View all courses" / 查看更多课程) and the nav.
// Lists every active course with the same card style as the homepage section;
// each card books straight into the student flow.
// ============================================================================

import { ArrowLeft, ArrowRight, BookOpen, Check, Clock, GraduationCap } from 'lucide-react'
import { useEffect } from 'react'
import { useLocale, useT } from '../../i18n'
import { getSession, initPublicHome, isPublicReady, useAppState } from '../../data/store'
import { G1_COUNTS } from '../../data/g1'
import { LandingBadge, LandingButton } from './primitives'
import LandingSubHeader from './LandingSubHeader'
import './LandingPage.css'

export default function CoursesPage(): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const state = useAppState()

  // Visitors (no session) load the real public catalogue instead of the seed.
  useEffect(() => {
    if (!getSession().token) initPublicHome().catch(() => undefined)
  }, [])

  const pick = (pair: { en: string; zh: string }): string => (locale === 'zh' ? pair.zh : pair.en)
  // Never show the seed placeholder catalogue to visitors — real public data
  // only (empty until fetched, or forever when the fetch failed).
  const visitor = !getSession().token
  const courses = visitor && !isPublicReady() ? [] : state.courses.filter((c) => c.active)
  const popularIndex = courses.length > 1 ? 1 : 0

  return (
    <div className="landing-page landing-page--sub">
      <LandingSubHeader />

      <main>
        <section className="landing-section">
          <div className="container">
            <div className="landing-sub-head">
              <LandingButton variant="ghost" to="/" className="landing-sub-back">
                <ArrowLeft size={16} /> {t('nav.home')}
              </LandingButton>
              <span className="landing-sub-head__icon" aria-hidden="true">
                <BookOpen size={30} />
              </span>
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
                G1 · {t('g1.zhBody', { count: G1_COUNTS.zh })} / {t('g1.enBody', { count: G1_COUNTS.en })}
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
