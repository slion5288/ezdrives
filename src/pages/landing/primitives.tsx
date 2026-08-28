// ============================================================================
// Landing page — local UI primitives.
// The shared component library (src/components/shared) is owned by the shell
// agent and did not exist when this page was written, so the landing page
// carries its own tiny set, following the exact specs in docs/DESIGN.md §4.
// All colors/spacing come from tokens.css; every string via useT().
// ============================================================================

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {Car,Check,Clock,Star} from 'lucide-react'
import { useT } from '../../i18n'
import { COURSE_IMAGES, LOGO_DATA_URL } from '../../data/assets'
import { Button } from '../../components/shared/Button'

// --- Button (DESIGN §4.1) ---

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

// --- Badge (DESIGN §4.3) ---

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'info'

interface LandingBadgeProps {
  tone?: BadgeTone
  dot?: boolean
  className?: string
  children: ReactNode
}

export function LandingBadge({ tone = 'neutral', dot = false, className, children }: LandingBadgeProps): JSX.Element {
  const classes = ['landing-badge', `landing-badge--${tone}`]
  if (dot) classes.push('landing-badge--dot')
  if (className) classes.push(className)
  return (
    <span className={classes.join(' ')}>
      {dot && <span className="landing-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  )
}

// --- Avatar (DESIGN §4.10) ---

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface LandingAvatarProps {
  name: string
  color: string
  size?: 32 | 40 | 48 | 64
}

export function LandingAvatar({ name, color, size = 40 }: LandingAvatarProps): JSX.Element {
  return (
    <span className={`landing-avatar landing-avatar--${size}`} style={{ backgroundColor: color }} aria-hidden="true">
      {initialsOf(name)}
    </span>
  )
}

// --- Star rating ---

interface StarRatingProps {
  value: number
  size?: number
  label?: string
}

export function StarRating({ value, size = 16, label }: StarRatingProps): JSX.Element {
  const filled = Math.round(value)
  const accessible = label ? { role: 'img' as const, 'aria-label': label } : {}
  return (
    <span className="landing-stars" {...accessible}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={i < filled ? 2.5 : 1.5}
          className={i < filled ? 'landing-stars__star--on' : 'landing-stars__star--off'}
        />
      ))}
    </span>
  )
}

// --- Logo (DESIGN §4.11) ---
// The brand logo (LOGO_DATA_URL) is a complete horizontal mark — no extra wordmark.

export function Logo(): JSX.Element {
  const t = useT()
  return (
    <Link to="/" className="landing-logo" aria-label={t('nav.brand')}>
      <img src={LOGO_DATA_URL} alt={t('nav.brand')} className="landing-logo__img" />
    </Link>
  )
}

// --- CourseCard (shared by homepage rail + /courses grid) ---
// media: show the course image block (homepage rail shows images; the full
// grid page intentionally omits them for a denser layout).

export interface CourseCardCourse {
  id: string
  name: { en: string; zh: string }
  description: { en: string; zh: string }
  price: number
  durationMin: number
  examCar?: boolean
  imageUrl?: string
}

export function CourseCard({
  course,
  popular,
  to,
  t,
  pick,
  media = false,
}: {
  course: CourseCardCourse
  popular: boolean
  to: string
  t: (key: string, vars?: Record<string, string | number>) => string
  pick: (pair: { en: string; zh: string }) => string
  media?: boolean
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
      {media && (course.imageUrl || COURSE_IMAGES[course.id]) ? (
        <div className="landing-courses__media">
          <img src={course.imageUrl || COURSE_IMAGES[course.id]} alt={pick(course.name)} loading="lazy" />
        </div>
      ) : media ? (
        <div className="landing-courses__media landing-courses__media--placeholder" aria-hidden="true">
          <Car size={26} />
        </div>
      ) : null}
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
      <Button variant="primary" to={to} className="landing-courses__cta">
        {t('courses.book')}
      </Button>
    </div>
  )
}
