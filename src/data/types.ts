// ============================================================================
// EZDRIVES — Data model (code contract)
// Source of truth: docs/ARCHITECTURE.md §3. Field names are final — the whole
// app compiles against them. All datetimes are LOCAL ISO strings
// ('YYYY-MM-DDTHH:mm:ss', no timezone) — never use toISOString() for business
// timestamps. Re-exported from src/data/store.ts so pages import from one place.
// ============================================================================

/** One bookable lesson inside a package course (套餐的一个课时). */
export interface CourseLesson {
  name: { en: string; zh: string }
  description: { en: string; zh: string }
  price: number // CAD per lesson
}

export interface Course {
  id: string
  name: { en: string; zh: string }
  description: { en: string; zh: string }
  /** 'single' = per-hour lesson; 'package' = 10 fixed lessons (套餐). */
  type: 'single' | 'package'
  /** single: per-lesson price. package: total package price (sum of lessons). */
  price: number // CAD
  /** single: 60 | 120. package: 60 (each package lesson is one hour). */
  durationMin: 60 | 120
  active: boolean
  /** Exam car rental service (考试用车) — shown with a special badge. */
  examCar?: boolean
  /** Course cover image (data URL uploaded by the instructor). */
  imageUrl?: string
  /** Package only: the 10 lessons with editable content. */
  lessons?: CourseLesson[]
}

export interface Vehicle {
  id: string
  make: string
  model: string
  plate: string
  color: { en: string; zh: string }
  photoUrl: string | null
  /** Extra gallery photos (e.g. a 2019 red Tesla Model 3 from multiple angles). */
  photos?: string[]
  active: boolean
}

export interface WeeklyRule {
  weekday: number // 0 = Sunday .. 6 = Saturday
  startMin: number // minutes from midnight, e.g. 540 = 09:00
  endMin: number // minutes from midnight, exclusive bound, e.g. 1080 = 18:00
}

export interface DayException {
  date: string // 'YYYY-MM-DD' (local)
  closed: boolean // true = whole day closed
  startMin?: number // override open time (minutes from midnight), when closed === false
  endMin?: number // override close time (minutes from midnight), when closed === false
  note?: { en: string; zh: string }
}

export interface Appointment {
  id: string
  studentId: string
  courseId: string
  start: string // ISO local datetime, e.g. '2024-03-12T14:00:00'
  end: string // ISO local datetime = start + course duration
  status: 'confirmed' | 'cancelled' | 'pending'
  history: { at: string; note: { en: string; zh: string } }[] // change log, newest last
  createdAt: string // ISO local datetime
  reminded?: boolean // optional — 2h-reminder flag (demo)
  /** Package courses: which lesson number of the package (0-based). */
  lessonIndex?: number
  /** Price captured at booking (per lesson for packages). */
  price?: number
}

export interface Student {
  id: string
  name: string
  phone: string // stored full; display always via maskPhone()
  /** Pickup address (接送地址) — filled by the student after login. */
  address?: string
  registeredAt: string // ISO local datetime
  avatarColor: string // CSS color token name or hex for avatar badge
  email?: string // optional — used as ICS "to" contact
  /** Opaque token authorizing the private ICS subscription feed. */
  icsToken?: string
}

export interface Notification {
  id: string
  role: 'student' | 'instructor'
  recipientId: string // studentId for role 'student', instructor id ('instructor') for 'instructor'
  type:
    | 'booking_confirmed'
    | 'booking_cancelled'
    | 'booking_rescheduled'
    | 'reminder_2h'
    | 'day_closed'
    | 'new_booking'
    | 'payment_pending'
    | 'payment_confirmed'
    | 'payment_rejected'
  title: { en: string; zh: string }
  body: { en: string; zh: string }
  read: boolean
  at: string // ISO local datetime
  /** payment_pending/confirmed/rejected: links to the related Payment. */
  paymentId?: string
}

/** Course purchase — confirmed by the instructor after checking receipt. */
export type PaymentMethod =
  | 'cash'
  | 'wechat'
  | 'emt'
  | 'applepay'
  | 'googlepay'
  | 'card'
  | 'debit'
  | 'paypal'

export interface Payment {
  id: string
  studentId: string
  courseId: string
  method: PaymentMethod
  amount: number // CAD
  status: 'pending' | 'confirmed' | 'rejected'
  createdAt: string // ISO local datetime
  confirmedAt?: string
}

/** Instructor bank account details (Canadian format). */
export interface InstructorBank {
  bankName?: string
  holderName?: string
  transit?: string // 5 digits
  institution?: string // 3 digits
  account?: string
}

/** Online payment API credentials configured by the instructor. */
export interface PayApiConfig {
  stripeKey?: string // publishable key
  stripeUrl?: string // backend create-intent endpoint
  paypalClientId?: string
  paypalUrl?: string // backend create/capture-order endpoint
}

/**
 * A teaching video shown on the homepage.
 * Source is either a YouTube URL (youtubeId extracted for embedding) or a
 * local file uploaded by the instructor (stored as a data URL — keep short).
 */
export interface TeachingVideo {
  id: string
  title: { en: string; zh: string }
  /** 'youtube' | 'local' */
  kind: 'youtube' | 'local'
  /** YouTube video id (kind === 'youtube') or a local data URL (kind === 'local'). */
  src: string
  /** Short caption / description. */
  description?: { en: string; zh: string }
  /** Display order on the homepage (ascending). */
  order: number
  active: boolean
  addedAt: string // ISO local datetime
}

export interface AppState {
  instructor: {
    name: string
    phone: string
    email: string
    bio: { en: string; zh: string }
    rating: number // e.g. 4.9
    yearsExperience: number // e.g. 9
    avatarColor: string
    /** Break in minutes between lessons booked by different students. */
    breakMin: number
    /**
     * Payment methods the instructor has enabled for students. When unset or
     * empty, EVERY method is available (backward compatible). The student
     * payment modal renders exactly this list.
     */
    paymentMethods?: PaymentMethod[]
    /** Instructor's personal WeChat Pay receive QR (data URL), shown to students. */
    wechatQr?: string
    /** Interac e-Transfer receiving email. */
    emtEmail?: string
    /** Bank account for other transfers. */
    bank?: InstructorBank
    /** Online payment API credentials (Stripe / PayPal). */
    payConfig?: PayApiConfig
  }
  weeklyRules: WeeklyRule[]
  exceptions: DayException[]
  courses: Course[]
  vehicles: Vehicle[]
  students: Student[]
  appointments: Appointment[]
  notifications: Notification[]
  payments: Payment[]
  videos: TeachingVideo[]
  /** Admin-edited homepage content (served to public visitors + instructor). */
  homeContent?: HomeContent | null
}

/** Admin-edited homepage content (text overrides / hero images / instructors). */
export interface HomeInstructor {
  id: string
  name: string
  bio: { en: string; zh: string }
  years: number
  photo?: string // data URL
}

export interface HomeContent {
  /** i18n key → { en, zh } replacement shown on the homepage. */
  overrides?: Record<string, { en: string; zh: string }>
  /** Up to 6 hero slide data URLs; null/empty keeps the bundled /hero images. */
  heroImages?: string[] | null
  /** Instructor cards shown in 认识你的教练; empty keeps the single profile. */
  instructors?: HomeInstructor[]
}
