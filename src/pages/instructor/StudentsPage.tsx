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
      const spend = confirmed.reduce((sum, a) => {
        const c = state.courses.find((x) => x.id === a.courseId)
        return sum + (a.price ?? (c ? c.price : 0))
      }, 0)
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
