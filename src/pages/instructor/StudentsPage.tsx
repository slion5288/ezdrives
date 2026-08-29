// ============================================================================
// EZDRIVES — Instructor StudentsPage (instructor-owned)
// A table listing every student with their full info: name, phone, pickup
// address, email, the courses they take (with package lesson numbers), total
// lessons and total spend — so the instructor can review everything in one
// place.
// ============================================================================

import type { AppState, Appointment } from '../../data/store'
import { lessonLabel, maskPhone } from '../../data/store'
import { formatDateEn, formatDateZh, fromLocalISO } from '../../data/timeEngine'
import { useLocale, useT } from '../../i18n'
import { Users } from 'lucide-react'
import { Avatar, EmptyState } from './ui'
import { formatMoney } from './helpers'

export default function StudentsPage({ state }: { state: AppState }): JSX.Element {
  const t = useT()
  const locale = useLocale()

  const courseLabelOf = (a: Appointment): string => {
    const c = state.courses.find((x) => x.id === a.courseId)
    if (!c) return a.courseId
    return `${c.name[locale]}${c.type === 'package' && a.lessonIndex !== undefined ? lessonLabel(c, a.lessonIndex, locale) : ''}`
  }

  const rows = [...state.students]
    .sort((x, y) => x.name.localeCompare(y.name))
    .map((student) => {
      const appts = state.appointments.filter((a) => a.studentId === student.id)
      const live = appts.filter((a) => a.status === 'confirmed' || a.status === 'pending')
      const confirmed = appts.filter((a) => a.status === 'confirmed')
      const courses = [...new Set(live.map(courseLabelOf))]
      // § user decision: 消费 = the student's PAID orders (the full course fee
      // is paid when booking) — not the sum of per-lesson appointment prices.
      const spend = (state.payments ?? [])
        .filter((p) => p.studentId === student.id && (p.status === 'paid' || p.status === 'confirmed'))
        .reduce((sum, p) => sum + (p.amount ?? p.final_price ?? 0), 0)
      return {
        student,
        courses,
        lessons: confirmed.length,
        spend,
        registered: fromLocalISO(student.registeredAt),
      }
    })

  if (rows.length === 0) {
    return (
      <div className="ins-panel">
        <EmptyState icon={<Users size={24} />} title={t('instructor.students.empty')} />
      </div>
    )
  }

  return (
    <div className="ins-students">
      {/* § mobile: card list (the table below is hidden on phones) */}
      <div className="ins-student-cards">
        {rows.map(({ student, courses, lessons, spend }) => (
          <div key={student.id} className="ins-student-card">
            <div className="ins-student-card__head">
              <Avatar name={student.name} color={student.avatarColor} size={34} />
              <span className="ins-student-card__name">{student.name}</span>
            </div>
            <div className="ins-student-card__row">
              <span className="ins-student-card__label">{t('student.profile.phone')}</span>
              <span className="ins-student-card__value tabular-nums">{maskPhone(student.phone)}</span>
            </div>
            <div className="ins-student-card__row">
              <span className="ins-student-card__label">{t('student.profile.address')}</span>
              <span className="ins-student-card__value">{student.address || '—'}</span>
            </div>
            <div className="ins-student-card__row">
              <span className="ins-student-card__label">{t('student.profile.email')}</span>
              <span className="ins-student-card__value">{student.email || '—'}</span>
            </div>
            <div className="ins-student-card__row">
              <span className="ins-student-card__label">{t('instructor.students.courses')}</span>
              <span className="ins-student-card__value">
                <span className="ins-student-card__courses">
                  {courses.length > 0 ? (
                    courses.map((c) => <span key={c} className="ins-student-card__course">{c}</span>)
                  ) : (
                    <span>{t('instructor.students.noCourses')}</span>
                  )}
                </span>
              </span>
            </div>
            <div className="ins-student-card__row">
              <span className="ins-student-card__label">{t('instructor.students.lessons')}</span>
              <span className="ins-student-card__value tabular-nums">{lessons}</span>
            </div>
            <div className="ins-student-card__row">
              <span className="ins-student-card__label">{t('instructor.students.spend')}</span>
              <span className="ins-student-card__value tabular-nums">{formatMoney(spend)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="ins-table-wrap">
        <table className="ins-table">
          <thead>
            <tr>
              <th>{t('student.profile.name')}</th>
              <th>{t('student.profile.phone')}</th>
              <th>{t('student.profile.address')}</th>
              <th>{t('student.profile.email')}</th>
              <th>{t('instructor.students.courses')}</th>
              <th className="tabular-nums">{t('instructor.students.lessons')}</th>
              <th className="tabular-nums">{t('instructor.students.spend')}</th>
              <th>{t('instructor.students.registered')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ student, courses, lessons, spend, registered }) => (
              <tr key={student.id}>
                <td>
                  <span className="ins-student-name">
                    <Avatar name={student.name} color={student.avatarColor} size={30} />
                    <span>{student.name}</span>
                  </span>
                </td>
                <td className="tabular-nums">{maskPhone(student.phone)}</td>
                <td>{student.address || '—'}</td>
                <td>{student.email || '—'}</td>
                <td>
                  <ul className="ins-student-courses">
                    {courses.length > 0 ? (
                      courses.map((c) => <li key={c}>{c}</li>)
                    ) : (
                      <li className="ins-student-none">{t('instructor.students.noCourses')}</li>
                    )}
                  </ul>
                </td>
                <td className="tabular-nums">{lessons}</td>
                <td className="tabular-nums">{formatMoney(spend)}</td>
                <td className="tabular-nums">{locale === 'zh' ? formatDateZh(registered) : formatDateEn(registered)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
