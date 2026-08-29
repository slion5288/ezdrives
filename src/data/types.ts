// ============================================================================
// EZDRIVES — Data model (code contract)
// Source of truth: docs/ARCHITECTURE.md §3. Field names are final — the whole
// app compiles against them. All datetimes are LOCAL ISO strings
// ('YYYY-MM-DDTHH:mm:ss', no timezone) — never use toISOString() for business
// timestamps. Re-exported from src/data/store.ts so pages import from one place.
// ============================================================================

/** Structured course type (business logic must key on this, never on names). */
export type CourseType =
  | 'INDIVIDUAL_LESSON'
  | 'TEN_HOUR_PACKAGE'
  | 'TRIAL_LESSON'
  | 'ROAD_TEST_CAR'
  | 'FULL_COURSE_CERTIFICATE'

/** Driving licence category. NONE for non-licence services (Trial/RoadTest/Cert). */
export type LicenseClass = 'G2' | 'G' | 'NONE'

/** Discount configuration set by the instructor per course. */
export interface DiscountConfig {
  type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number // PERCENTAGE: 1-100 (10 = 10%); FIXED_AMOUNT: CAD
}

/** One bookable lesson inside a package course (套餐的一个课时). */
export interface CourseLesson {
  sequence_number?: number // 1-based; auto-assigned by index + 1
  name: { en: string; zh: string }
  description: { en: string; zh: string }
  price: number // CAD per lesson
  /** True for the auto-generated Lesson 11 Free Mock Test (always last). */
  is_free_mock_test?: boolean
}

export interface Course {
  id: string
  name: { en: string; zh: string }
  description: { en: string; zh: string }
  /** Legacy type — kept for backward compatibility with old data. */
  type?: 'single' | 'package'
  /** Structured course type (new). Business logic keys on this. */
  course_type?: CourseType
  /** Licence class (new). */
  license_class?: LicenseClass
  /** single: per-lesson price. package: total package price (sum of lessons). */
  price: number // CAD
  /** single: 60 | 120. package: 60 (each package lesson is one hour). */
  durationMin: number
  active: boolean
  /** Exam car rental service (考试用车) — legacy flag, replaced by ROAD_TEST_CAR type. */
  examCar?: boolean
  /** Course cover image (data URL uploaded by the instructor). */
  imageUrl?: string
  /** Package only: the lessons (1-10 editable + 11 Free Mock Test). */
  lessons?: CourseLesson[]
  /** Student discount (在校学生优惠) — set by instructor. */
  studentDiscount?: DiscountConfig | null
  /** Referral discount (推荐优惠) — set by instructor. */
  referralDiscount?: DiscountConfig | null
  /** Trial: base hourly rate the 50% rule derives from (instructor-level). */
  hourlyRate?: number
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
  /** Individual purchase unit this appointment consumes (payment id). */
  paymentId?: string
  /** 1-based lesson sequence (from enrollment snapshot) for calendar display. */
  lessonSequence?: number
  /** Lesson title snapshot (instructor calendar shows it). */
  lessonTitle?: { en: string; zh: string }
  courseType?: CourseType
  licenseClass?: LicenseClass
  /** Instructor-confirmed lesson completion (§61). */
  lessonCompletion?: { confirmedByInstructor?: boolean; confirmedAt?: string }
  /** Price captured at booking (per lesson for packages). */
  price?: number
  /** §: package lessons booked together (2 consecutive) share a group id —
   *  cancelling either one cancels the whole pair. */
  consecutiveGroup?: string
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
  /** ONLINE vs CASH — derived from the chosen method at creation, never from status. */
  channel?: 'ONLINE' | 'CASH'
  amount: number // CAD (= final_price, kept for backward compat)
  /**
   * ONLINE: pending → confirmed (= paid) / rejected
   * CASH:   cash_pending → cash_approved → paid   (paid only by instructor's
   *         "Mark Payment Received"; cash_approved NEVER auto-becomes paid)
   */
  status: 'pending' | 'confirmed' | 'rejected' | 'cash_pending' | 'cash_approved' | 'paid'
  createdAt: string // ISO local datetime
  confirmedAt?: string
  // —— Price snapshot (§30/§55): immune to later course/discount changes ——
  original_price?: number
  discount_type?: 'STUDENT' | 'REFERRAL' | 'NONE'
  discount_source?: 'student' | 'referral' | ''
  discount_value?: number // configured value (10 = 10% or 20 = $20)
  discount_amount?: number // actual discount in CAD
  final_price?: number
  currency?: string // 'CAD'
  // —— Referral (§31/§33) ——
  referrer_student_id?: string
  referral_phone?: string
  // —— Enrollment link (packages) ——
  enrollmentId?: string
  // —— Full Course Certificate documents (§39) ——
  certDocs?: { front?: string; back?: string; uploadedAt?: string; status?: 'partial' | 'complete' }
}

/** One lesson inside a student's purchased package (snapshot at purchase). */
export interface LessonSnapshot {
  sequence_number: number
  name: { en: string; zh: string }
  description: { en: string; zh: string }
  is_free_mock_test?: boolean
  status: 'available' | 'booked' | 'completed'
}

/** Package enrollment created at purchase — snapshot drives booking order. */
export interface Enrollment {
  id: string
  studentId: string
  courseId: string
  courseName: { en: string; zh: string }
  courseType: CourseType
  licenseClass: LicenseClass
  originalPrice: number
  discount: {
    type: 'STUDENT' | 'REFERRAL' | 'NONE'
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
    discountValue: number
    discountAmount: number
    finalPrice: number
    currency: string
  }
  referrer: { referrerStudentId?: string; referralPhone?: string } | null
  lessons: LessonSnapshot[]
  createdAt: string
  completedLessonCount: number
  status: 'active' | 'completed' | 'archived'
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
  /** Package enrollments (lesson snapshots) — new in course refactor. */
  enrollments?: Enrollment[]
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
