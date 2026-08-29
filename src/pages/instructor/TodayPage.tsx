// ============================================================================
// EZDRIVES — Instructor TodayPage (今天)
// § redesign: the instructor's first screen is "today", not charts —
// the NEXT lesson up front (student, course, time, duration), the instructor's
// phone as a tel: link, and one-tap map navigation. Today's full lesson list
// follows. All strings via useT(); all values from tokens.
// ============================================================================

import { Navigation, Phone, User } from 'lucide-react'
import type { AppState } from '../../data/store'
import { dateKey, formatDateEn, formatDateZh, formatHM, fromLocalISO } from '../../data/timeEngine'
import { useLocale, useT } from '../../i18n'
import { courseById, formatMoney, isLiveAppointment, statusLabel, studentById } from './helpers'
import { Badge, EmptyState } from './ui'

export default function TodayPage({ state, onNavigate }: { state: AppState; onNavigate: (tab: import('./helpers').InstructorTab) => void }): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const todayKey = dateKey(new Date())

  const upcoming = (state.appointments ?? [])
    .filter((a) => isLiveAppointment(a) && dateKey(fromLocalISO(a.start)) >= todayKey)
    .sort((a, b) => a.start.localeCompare(b.start))
  const next = upcoming[0] ?? null
  const todayAppts = upcoming
    .filter((a) => dateKey(fromLocalISO(a.start)) === todayKey)
    .sort((a, b) => a.start.localeCompare(b.start))

  const phoneRaw = (state.instructor.phone || '').replace(/\s/g, '')
  const mapHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(t('ics.location'))}`
  /** §: call reaches the next lesson's student when one exists, otherwise the
   *  instructor's own number — the actions stay available with no bookings. */
  const callHref = next && studentById(state, next.studentId)?.phone
    ? `tel:${studentById(state, next.studentId)?.phone?.replace(/\s/g, '')}`
    : `tel:${phoneRaw}`

  return (
    <div className="ins-today">
      {/* ---- Next lesson ---- */}
      <section className="ins-panel ins-today__next">
        <div className="ins-panel-head">
          <h2 className="ins-panel-title">{t('instructor.today.nextLesson')}</h2>
          <button type="button" className="ins-link-btn" onClick={() => onNavigate('schedule')}>
            {t('instructor.overview.viewSchedule')}
          </button>
        </div>
        {!next ? (
          <EmptyState icon={<User size={24} />} title={t('instructor.today.noNext')} body={t('instructor.today.noNextBody')} />
        ) : (
          <>
            <div className="ins-today__card">
              <div className="ins-today__when">
                <span className="ins-today__date tabular-nums">
                  {locale === 'zh' ? formatDateZh(fromLocalISO(next.start)) : formatDateEn(fromLocalISO(next.start))}
                </span>
                <span className="ins-today__time tabular-nums">
                  {formatHM(fromLocalISO(next.start))} – {formatHM(fromLocalISO(next.end))}
                </span>
              </div>
              <div className="ins-today__main">
                <span className="ins-today__student">{studentById(state, next.studentId)?.name ?? next.studentId}</span>
                <span className="ins-today__course">
                  {courseById(state, next.courseId)
                    ? locale === 'zh'
                      ? courseById(state, next.courseId)?.name.zh
                      : courseById(state, next.courseId)?.name.en
                    : next.courseId}
                  {next.lessonIndex !== undefined ? ` · ${t('student.booking.lessonNo', { n: next.lessonIndex + 1 })}` : ''}
                </span>
                <span className="ins-today__student-phone tabular-nums">
                  {studentById(state, next.studentId)?.phone ?? ''}
                </span>
              </div>
              <div className="ins-today__side">
                <Badge tone={next.status === 'confirmed' ? 'success' : 'warning'}>{statusLabel(next.status, t)}</Badge>
                <span className="ins-today__price tabular-nums">
                  {formatMoney(next.price ?? courseById(state, next.courseId)?.price ?? 0)}
                  {courseById(state, next.courseId)?.type === 'package' ? ` /${t('courses.perLesson')}` : ''}
                </span>
              </div>
            </div>
          </>
        )}
        <div className="ins-today__actions">
          <a className="btn btn--secondary btn--md" href={callHref}>
            <Phone size={16} /> {t('instructor.today.call')}
          </a>
          <a className="btn btn--primary btn--md" href={mapHref} target="_blank" rel="noopener noreferrer">
            <Navigation size={16} /> {t('instructor.today.navigate')}
          </a>
        </div>
      </section>

      {/* ---- Today's lessons ---- */}
      <section className="ins-panel">
        <div className="ins-panel-head">
          <h2 className="ins-panel-title">{t('instructor.today.scheduleTitle')}</h2>
          <span className="ins-panel-sub tabular-nums">{todayAppts.length} · {todayKey}</span>
        </div>
        {todayAppts.length === 0 ? (
          <EmptyState icon={<User size={24} />} title={t('instructor.today.noToday')} body={t('instructor.today.noTodayBody')} />
        ) : (
          <ul className="ins-upcoming">
            {todayAppts.map((a) => {
              const start = fromLocalISO(a.start)
              const student = studentById(state, a.studentId)
              const course = courseById(state, a.courseId)
              const courseName = course ? (locale === 'zh' ? course.name.zh : course.name.en) : a.courseId
              return (
                <li key={a.id} className="ins-upcoming-item">
                  <div className="ins-upcoming-when">
                    <span className="ins-upcoming-time tabular-nums">{formatHM(start)}</span>
                  </div>
                  <div className="ins-upcoming-main">
                    <span className="ins-upcoming-name">{student ? student.name : a.studentId}</span>
                    <span className="ins-upcoming-course">{courseName}</span>
                  </div>
                  <div className="ins-upcoming-side">
                    <Badge tone={a.status === 'confirmed' ? 'success' : 'warning'}>{statusLabel(a.status, t)}</Badge>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
