// ============================================================================
// EZDRIVES — StudentBookingPage (我的课程 — course catalog + booking)
// Purchase flow:
//  · Unregistered: choose a course → phone-verify registration → payment
//    method (cash/online) → instructor confirms → become a registered student
//    → book a time.
//  · Registered: choose a course → phone-verify login → payment method →
//    instructor confirms → book a time. (From 我的课程 → 其他课程 → 购买并预约.)
// The catalog is public (course selection happens BEFORE login); purchased
// courses show their booking panel, everything else shows 购买并预约.
// ============================================================================

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getSession, hasPendingPayment, isCoursePurchased, useAppState } from '../../data/store'
import type { Course } from '../../data/store'
import { useLocale, useT } from '../../i18n'
import { COURSE_IMAGES } from '../../data/assets'
import { BookOpen, CheckCircle2, Clock, GraduationCap, Package } from 'lucide-react'
import { LanguageSwitcher } from '../../components/shared/LanguageSwitcher'
import { ThemeToggle } from '../../components/shared/ThemeToggle'
import { Logo } from '../../components/shared/Logo'
import { StudentShell } from './StudentShell'
import { PaymentModal } from './PaymentModal'
import { formatPrice } from './studentFormat'
import './student.css'

export default function StudentBookingPage(): JSX.Element {
  const t = useT()
  const state = useAppState()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const courseParam = params.get('course')

  const session = getSession()
  const studentId = session.studentId ?? ''
  const activeCourses = state.courses.filter((c) => c.active)

  const [payCourse, setPayCourse] = useState<Course | null>(null)

  // Auto-continue the flow when a course was chosen before login:
  // already purchased → go straight to 预约时间 (time booking page);
  // otherwise → open the purchase (payment) dialog.
  useEffect(() => {
    if (!studentId || !courseParam) return
    const course = activeCourses.find((c) => c.id === courseParam)
    if (!course) return
    if (isCoursePurchased(state, studentId, course.id)) {
      navigate('/student')
    } else if (!hasPendingPayment(state, studentId, course.id)) {
      setPayCourse(course)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, courseParam])

  // Public (not logged in): course selection FIRST, then register/login.
  if (!studentId) {
    return (
      <div className="student-page">
        <header className="student-page-head">
          <div className="student-public-nav">
            <Link to="/">
              <Logo size="sm" />
            </Link>
            <div className="student-public-actions">
              <LanguageSwitcher />
              <ThemeToggle />
              <Link to="/login" className="student-btn student-btn-primary student-btn-sm">
                {t('nav.login')}
              </Link>
            </div>
          </div>
        </header>
        <h1>{t('student.booking.publicTitle')}</h1>
        <p className="student-page-sub">{t('student.booking.subtitle')}</p>
        <CourseCatalog
          studentId={null}
          onPick={() => undefined}
          onBuy={(id) => navigate(`/login?role=student&course=${id}`)}
        />
      </div>
    )
  }

  return (
    <StudentShell>
      <div className="student-page">
        <header className="student-page-head">
          <h1>{t('student.booking.title')}</h1>
          <p className="student-page-sub">{t('student.booking.subtitle')}</p>
        </header>

        {/* 我的课程 = course catalog; 继续预约 jumps to 预约时间 for time booking */}
        <CourseCatalog
          studentId={studentId}
          onPick={() => navigate('/student')}
          onBuy={(id) => {
            const course = activeCourses.find((c) => c.id === id)
            if (course) setPayCourse(course)
          }}
        />

        <PaymentModal
          open={payCourse !== null}
          course={payCourse}
          onClose={() => setPayCourse(null)}
          onSubmitted={() => setPayCourse(null)}
        />
      </div>
    </StudentShell>
  )
}

function CourseCatalog({
  studentId,
  onPick,
  onBuy,
}: {
  studentId: string | null
  onPick: (courseId: string) => void
  onBuy: (courseId: string) => void
}): JSX.Element {
  const t = useT()
  const state = useAppState()
  const activeCourses = state.courses.filter((c) => c.active)

  if (activeCourses.length === 0) {
    return <p className="student-muted-note">{t('student.book.empty')}</p>
  }

  return (
    <div className="student-catalog">
      {studentId ? (
        <CatalogSection
          title={t('student.book.purchased')}
          hint={t('student.book.purchasedHint')}
          studentId={studentId}
          purchasedOnly
          onPick={onPick}
          onBuy={onBuy}
        />
      ) : null}
      <CatalogSection
        title={t('student.book.others')}
        hint={t('student.book.othersHint')}
        studentId={studentId}
        purchasedOnly={false}
        onPick={onPick}
        onBuy={onBuy}
      />
    </div>
  )
}

function CatalogSection({
  title,
  hint,
  studentId,
  purchasedOnly,
  onPick,
  onBuy,
}: {
  title: string
  hint: string
  studentId: string | null
  purchasedOnly: boolean
  onPick: (courseId: string) => void
  onBuy: (courseId: string) => void
}): JSX.Element | null {
  const t = useT()
  const locale = useLocale()
  const state = useAppState()

  const activeCourses = state.courses.filter((c) => c.active)
  const list = activeCourses.filter((c) => {
    const owned = studentId !== null && isCoursePurchased(state, studentId, c.id)
    return purchasedOnly ? owned : !owned
  })
  if (list.length === 0) return null

  return (
    <section className="student-catalog__section">
      <div className="student-card-header">
        <h2 className="student-card-title">{title}</h2>
        <span className="student-card-subtitle">{hint}</span>
      </div>
      <div className="student-catalog__grid">
        {list.map((course) => {
          const owned = studentId !== null && isCoursePurchased(state, studentId, course.id)
          const pending = studentId !== null && hasPendingPayment(state, studentId, course.id)
          return (
            <button
              key={course.id}
              type="button"
              className="student-course-card"
              onClick={() => (owned ? onPick(course.id) : onBuy(course.id))}
            >
              <div className="student-course-card__thumb">
                {(course.imageUrl || COURSE_IMAGES[course.id]) ? (
                  <img src={course.imageUrl || COURSE_IMAGES[course.id]} alt="" loading="lazy" />
                ) : (
                  <span className="student-course-card__thumb-ph" aria-hidden="true">
                    {course.examCar ? <CheckCircle2 size={20} /> : course.type === 'package' ? <Package size={20} /> : <GraduationCap size={20} />}
                  </span>
                )}
              </div>
              <div className="student-course-card__body">
                <span className="student-course-card__name">{locale === 'zh' ? course.name.zh : course.name.en}</span>
                <span className="student-course-card__meta">
                  {course.type === 'package'
                    ? `${t('courses.lessons', { count: course.lessons?.length ?? 10 })} · ${formatPrice(course.price)}`
                    : `${t('courses.duration', { duration: course.durationMin })} · ${formatPrice(course.price)}`}
                </span>
                <span className="student-course-card__action">
                  {owned ? (
                    <>
                      <BookOpen size={13} />
                      {t('student.book.manage')}
                    </>
                  ) : pending ? (
                    <>
                      <Clock size={13} />
                      {t('payment.pending')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} />
                      {t('student.book.buy')}
                    </>
                  )}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
