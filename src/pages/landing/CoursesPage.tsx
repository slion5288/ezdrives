// ============================================================================
// EZDRIVES — Public "All courses" page (/courses)
// Reached from the homepage ("View all courses" / 查看更多课程) and the nav.
// Lists every active course with the same card style as the homepage section;
// each card books straight into the student flow.
// ============================================================================

import {ArrowLeft,BookOpen,GraduationCap} from 'lucide-react'
import { useEffect } from 'react'
import { useLocale, useT } from '../../i18n'
import { getSession, initPublicHome, isPublicReady, useAppState } from '../../data/store'
import { G1_COUNTS } from '../../data/g1'
import {CourseCard,LandingBadge} from './primitives'
import LandingSubHeader from './LandingSubHeader'
import './LandingPage.css'
import { Button } from '../../components/shared/Button'

export default function CoursesPage(): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const state = useAppState()

  // Visitors (no session) load the real public catalogue instead of the seed.
  useEffect(() => {
    if (!getSession().token) initPublicHome().catch(() => undefined)
  }, [])

  const pick = (pair: { en: string; zh: string }): string => (locale === 'zh' || !pair.en || !pair.en.trim() ? pair.zh : pair.en)
  // Never show the seed placeholder catalogue to visitors — real public data
  // only (empty until fetched, or forever when the fetch failed).
  const visitor = !getSession().token
  const courses = visitor && !isPublicReady() ? [] : state.courses.filter((c) => c.active)
  // §C: primary button = first course of each (courseType+license) group.
  const firstOfGroup = (c: { id: string; course_type?: string; type?: string; license_class?: string; examCar?: boolean }): boolean => {
    const key = `${c.course_type ?? (c.examCar ? 'ROAD_TEST_CAR' : c.type === 'package' ? 'TEN_HOUR_PACKAGE' : 'INDIVIDUAL_LESSON')}|${c.license_class ?? (c.examCar ? 'NONE' : c.type === 'package' ? 'G2' : 'G2')}`
    const idx = courses.findIndex((x) => {
      const kx = `${x.course_type ?? (x.examCar ? 'ROAD_TEST_CAR' : x.type === 'package' ? 'TEN_HOUR_PACKAGE' : 'INDIVIDUAL_LESSON')}|${x.license_class ?? (x.examCar ? 'NONE' : x.type === 'package' ? 'G2' : 'G2')}`
      return kx === key
    })
    return idx === courses.findIndex((x) => x.id === c.id)
  }

  return (
    <div className="landing-page landing-page--sub">
      <LandingSubHeader />

      <main>
        <section className="landing-section">
          <div className="container">
            <div className="landing-sub-head">
              <Button variant="ghost" to="/" className="landing-sub-back">
                <ArrowLeft size={16} /> {t('nav.home')}
              </Button>
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
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    popular={firstOfGroup(course)}
                    to={`/student/book?course=${course.id}`}
                    t={t}
                    pick={pick}
                  />
                ))}
              </div>
            )}

            <div className="landing-courses__g1">
              <LandingBadge tone="info" dot>
                <GraduationCap size={13} />
                G1 · {t('g1.zhBody', { count: G1_COUNTS.zh })} / {t('g1.enBody', { count: G1_COUNTS.en })}
              </LandingBadge>
              <p>{t('g1.subtitle')}</p>
              <Button variant="secondary" to="/g1">
                {t('landing.g1.cta')}
              </Button>
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
                <Button size="lg" to="/student/book">
                  {t('landing.cta.book')}
                </Button>
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
