// ============================================================================
// EZDRIVES — Store (code contract)
// Source of truth: docs/ARCHITECTURE.md §4. Singleton store over AppState.
// On module load it reads localStorage 'dw.state.v1'; if absent it seeds from
// seed.ts and persists. Every mutator: deep-clones → mutates the clone →
// persists → refreshes the demo sync stamp → notifies subscribers. The
// notification engine is internal to this module.
// ============================================================================

import { useSyncExternalStore } from 'react'
import type {
  AppState,
  Appointment,
  Course,
  DayException,
  InstructorBank,
  Notification,
  PayApiConfig,
  Payment,
  PaymentMethod,
  Student,
  TeachingVideo,
  Vehicle,
  WeeklyRule,
} from './types'
import { seed } from './seed'
import {
  addMinutes,
  dateKey,
  formatDateEn,
  formatDateZh,
  formatHM,
  fromLocalISO,
  getEffectiveInterval,
  getLessonStarts,
  startOfDay,
  toLocalISO,
} from './timeEngine'

export type { AppState, Appointment, Course, CourseLesson, DayException, InstructorBank, Notification, PayApiConfig, Payment, PaymentMethod, Student, TeachingVideo, Vehicle, WeeklyRule } from './types'
export type { Slot } from './timeEngine'

const STATE_KEY = 'dw.state.v5' // v5: course purchases & instructor payment confirmation
const SESSION_KEY = 'dw.session.v1'

export type Session = { role: 'student' | 'instructor' | null; studentId?: string }

const cloneState = (s: AppState): AppState => JSON.parse(JSON.stringify(s)) as AppState

/** Max numeric suffix for a row id prefix (c/v/s/a/n/p/vid) so user ids never collide. */
const nextId = (prefix: 'c' | 'v' | 's' | 'a' | 'n' | 'p' | 'vid', rows: { id: string }[]): string => {
  let max = 0
  for (const row of rows) {
    if (row.id.startsWith(prefix)) {
      const n = Number(row.id.slice(prefix.length))
      if (Number.isFinite(n) && n > max) max = n
    }
  }
  return `${prefix}${max + 1}`
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed && Array.isArray(parsed.appointments) && Array.isArray(parsed.courses) && Array.isArray(parsed.weeklyRules)) {
        // Light migration: fields added after the persisted version.
        if (!Array.isArray(parsed.videos)) parsed.videos = []
        return parsed
      }
    }
  } catch {
    // fall through to fresh seed
  }
  const fresh = seed()
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(fresh))
  } catch {
    // storage unavailable — keep in-memory only
  }
  return fresh
}

let state: AppState = loadState()
let lastSyncISO: string = toLocalISO(new Date())

const listeners = new Set<() => void>()

/** Current immutable snapshot — treat as read-only. */
export function getState(): AppState {
  return state
}

/** Subscribe to any store change (state or session); returns unsubscribe. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState)
}

const notifyListeners = (): void => {
  listeners.forEach((l) => l())
}

/** Deep-clone → mutate → persist → refresh sync stamp → notify. */
function mutate(fn: (draft: AppState) => void): void {
  const draft = cloneState(state)
  fn(draft)
  state = draft
  lastSyncISO = toLocalISO(new Date())
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {
    // storage unavailable — state stays valid in memory
  }
  notifyListeners()
}

// --- Notification engine (internal) ---
function notify(
  draft: AppState,
  role: Notification['role'],
  recipientId: string,
  type: Notification['type'],
  title: { en: string; zh: string },
  body: { en: string; zh: string },
  paymentId?: string,
): void {
  draft.notifications.unshift({
    id: nextId('n', draft.notifications),
    role,
    recipientId,
    type,
    title,
    body,
    read: false,
    at: toLocalISO(new Date()),
    paymentId,
  })
}

const nowISO = (): string => toLocalISO(new Date())

function bookingNote(en: string, zh: string): { en: string; zh: string } {
  return { en, zh }
}

// --- Booking validity (shared by book + reschedule) ---
type BookingError = 'conflict' | 'closed' | 'past' | 'not_purchased'

/** Whether the student has a CONFIRMED payment for the course (purchased). */
export function isCoursePurchased(source: AppState, studentId: string, courseId: string): boolean {
  return source.payments.some(
    (p) => p.studentId === studentId && p.courseId === courseId && p.status === 'confirmed',
  )
}

/** Whether the student has a payment still awaiting instructor confirmation. */
export function hasPendingPayment(source: AppState, studentId: string, courseId: string): boolean {
  return source.payments.some(
    (p) => p.studentId === studentId && p.courseId === courseId && p.status === 'pending',
  )
}

/** Per-lesson duration: packages are one hour per lesson, singles use course.durationMin. */
function courseDuration(course: Course): number {
  return course.type === 'package' ? 60 : course.durationMin
}

/** Price of a single lesson (package lesson prices may differ per lesson). */
function lessonPriceOf(course: Course, lessonIndex?: number): number {
  if (course.type === 'package') {
    const lesson = course.lessons?.[lessonIndex ?? 0]
    return lesson ? lesson.price : course.price
  }
  return course.price
}

/** 'free' | 'booked' (upcoming) | 'done' (attended) for one package lesson of a student. */
function lessonState(source: AppState, studentId: string, courseId: string, lessonIndex: number): 'free' | 'booked' | 'done' {
  const now = new Date().getTime()
  let booked = false
  for (const a of source.appointments) {
    if (a.courseId !== courseId || a.lessonIndex !== lessonIndex || a.studentId !== studentId) continue
    if (a.status !== 'confirmed' && a.status !== 'pending') continue
    if (fromLocalISO(a.start).getTime() < now) return 'done'
    booked = true
  }
  return booked ? 'booked' : 'free'
}

function validateBooking(
  source: AppState,
  courseId: string,
  startISO: string,
  exceptAppointmentId?: string,
  studentId?: string,
  lessonIndex?: number,
  count = 1,
): { ok: true; course: Course } | { ok: false; error: BookingError } {
  const course = source.courses.find((c) => c.id === courseId)
  if (!course || !course.active) return { ok: false, error: 'closed' }
  // Only purchased courses can be booked (payment confirmed by the instructor).
  if (studentId && !isCoursePurchased(source, studentId, courseId)) return { ok: false, error: 'not_purchased' }
  const isPackage = course.type === 'package'
  if (isPackage && (lessonIndex === undefined || lessonIndex < 0 || lessonIndex >= (course.lessons?.length ?? 0))) {
    return { ok: false, error: 'closed' }
  }
  if (!isPackage && count !== 1) return { ok: false, error: 'closed' }
  const duration = courseDuration(course)
  const start = fromLocalISO(startISO)
  if (Number.isNaN(start.getTime())) return { ok: false, error: 'closed' }
  const now = new Date()
  if (start.getTime() < now.getTime() - 60000) return { ok: false, error: 'past' }
  const date = startOfDay(start)
  const interval = getEffectiveInterval(date, source.weeklyRules, source.exceptions)
  if (!interval) return { ok: false, error: 'closed' }

  // Package lessons are per-student: each lesson number can only be taken once.
  if (isPackage && studentId) {
    const baseLesson = lessonIndex ?? 0
    for (let i = 0; i < count; i++) {
      if (lessonState(source, studentId, courseId, baseLesson + i) !== 'free') return { ok: false, error: 'conflict' }
    }
  }

  // Every start in the (possibly consecutive) block must be a valid break-aware start.
  for (let i = 0; i < count; i++) {
    const startI = addMinutes(start, i * duration)
    const starts = getLessonStarts(date, source, duration, studentId, exceptAppointmentId)
    if (!starts.some((d) => d.getTime() === startI.getTime())) {
      const minute = startI.getHours() * 60 + startI.getMinutes()
      if (minute < interval.startMin || minute + duration > interval.endMin) return { ok: false, error: 'closed' }
      return { ok: false, error: 'conflict' }
    }
  }
  return { ok: true, course }
}

// --- Appointments ---

export function bookAppointment(
  studentId: string,
  courseId: string,
  startISO: string,
  lessonIndex?: number,
): { ok: true; appointment: Appointment } | { ok: false; error: BookingError } {
  const check = validateBooking(state, courseId, startISO, undefined, studentId, lessonIndex, 1)
  if (!check.ok) return check
  const { course } = check
  const duration = courseDuration(course)
  const start = fromLocalISO(startISO)
  const end = addMinutes(start, duration)
  const price = lessonPriceOf(course, lessonIndex)
  const appt: Appointment = {
    id: nextId('a', state.appointments),
    studentId,
    courseId,
    start: startISO,
    end: toLocalISO(end),
    status: 'confirmed',
    history: [{ at: nowISO(), note: bookingNote('Booked', '已预约') }],
    createdAt: nowISO(),
    lessonIndex: course.type === 'package' ? lessonIndex : undefined,
    price,
  }
  const student = state.students.find((s) => s.id === studentId)
  mutate((draft) => {
    draft.appointments.push(appt)
    notify(
      draft,
      'student',
      studentId,
      'booking_confirmed',
      bookingNote('Lesson confirmed', '课程已确认'),
      bookingNote(
        `Your ${course.name.en}${lessonLabel(course, lessonIndex, 'en')} lesson is confirmed for ${formatDateEn(start)} at ${formatHM(start)}.`,
        `您的${course.name.zh}${lessonLabel(course, lessonIndex, 'zh')}课程已确认：${formatDateZh(start)} ${formatHM(start)}。`,
      ),
    )
    notify(
      draft,
      'instructor',
      'instructor',
      'new_booking',
      bookingNote('New booking', '新预约'),
      bookingNote(
        `${student ? student.name : studentId} booked ${course.name.en}${lessonLabel(course, lessonIndex, 'en')} — ${formatDateEn(start)} ${formatHM(start)}.`,
        `${student ? student.name : studentId} 预约了${course.name.zh}${lessonLabel(course, lessonIndex, 'zh')} — ${formatDateZh(start)} ${formatHM(start)}。`,
      ),
    )
  })
  return { ok: true, appointment: appt }
}

/**
 * Book several CONSECUTIVE package lessons at once (e.g. 2 课时): each lesson
 * is one hour, starting at `startISO`, one right after the other. The whole
 * block must be break-aware valid for this student.
 */
export function bookPackageLessons(
  studentId: string,
  courseId: string,
  startISO: string,
  firstLessonIndex: number,
  count: number,
): { ok: true; appointments: Appointment[] } | { ok: false; error: BookingError } {
  const check = validateBooking(state, courseId, startISO, undefined, studentId, firstLessonIndex, count)
  if (!check.ok) return check
  const { course } = check
  const duration = courseDuration(course)
  const start = fromLocalISO(startISO)
  const appts: Appointment[] = []
  const student = state.students.find((s) => s.id === studentId)
  for (let i = 0; i < count; i++) {
    const lessonIndex = firstLessonIndex + i
    const startISO_i = toLocalISO(addMinutes(start, i * duration))
    const appt: Appointment = {
      id: nextId('a', state.appointments.concat(appts)),
      studentId,
      courseId,
      start: startISO_i,
      end: toLocalISO(addMinutes(fromLocalISO(startISO_i), duration)),
      status: 'confirmed',
      history: [{ at: nowISO(), note: bookingNote('Booked', '已预约') }],
      createdAt: nowISO(),
      lessonIndex,
      price: lessonPriceOf(course, lessonIndex),
    }
    appts.push(appt)
  }
  mutate((draft) => {
    draft.appointments.push(...appts)
    const first = fromLocalISO(appts[0].start)
    const last = fromLocalISO(appts[appts.length - 1].end)
    notify(
      draft,
      'student',
      studentId,
      'booking_confirmed',
      bookingNote('Package lessons confirmed', '套餐课时已确认'),
      bookingNote(
        `${course.name.en} lessons ${firstLessonIndex + 1}–${firstLessonIndex + count} confirmed (${formatDateEn(first)} ${formatHM(first)}–${formatHM(last)}).`,
        `已确认${course.name.zh}第 ${firstLessonIndex + 1}–${firstLessonIndex + count} 课时（${formatDateZh(first)} ${formatHM(first)}–${formatHM(last)}）。`,
      ),
    )
    notify(
      draft,
      'instructor',
      'instructor',
      'new_booking',
      bookingNote('New package booking', '新套餐预约'),
      bookingNote(
        `${student ? student.name : studentId} booked ${course.name.en} lessons ${firstLessonIndex + 1}–${firstLessonIndex + count} on ${formatDateEn(first)}.`,
        `${student ? student.name : studentId} 预约了${course.name.zh}第 ${firstLessonIndex + 1}–${firstLessonIndex + count} 课时（${formatDateZh(first)}）。`,
      ),
    )
  })
  return { ok: true, appointments: appts }
}

/** ' · Lesson 3' / ' · 第 3 课时' suffix for package appointments (empty for singles). */
export function lessonLabel(course: Course, lessonIndex: number | undefined, locale: 'en' | 'zh'): string {
  if (course.type !== 'package' || lessonIndex === undefined) return ''
  return locale === 'zh' ? `第 ${lessonIndex + 1} 课时` : ` · Lesson ${lessonIndex + 1}`
}

export function cancelAppointment(id: string, reason?: string): void {
  mutate((draft) => {
    const appt = draft.appointments.find((a) => a.id === id)
    if (!appt || appt.status === 'cancelled') return
    appt.status = 'cancelled'
    appt.history.push({
      at: nowISO(),
      note: reason ? bookingNote(`Cancelled — ${reason}`, `已取消 — ${reason}`) : bookingNote('Cancelled', '已取消'),
    })
    const course = draft.courses.find((c) => c.id === appt.courseId)
    const student = draft.students.find((s) => s.id === appt.studentId)
    const start = fromLocalISO(appt.start)
    notify(
      draft,
      'student',
      appt.studentId,
      'booking_cancelled',
      bookingNote('Lesson cancelled', '课程已取消'),
      bookingNote(
        `Your ${course ? course.name.en : 'lesson'} on ${formatDateEn(start)} at ${formatHM(start)} was cancelled.`,
        `您${formatDateZh(start)} ${formatHM(start)}的${course ? course.name.zh : '课程'}已被取消。`,
      ),
    )
    notify(
      draft,
      'instructor',
      'instructor',
      'booking_cancelled',
      bookingNote('Booking cancelled', '预约已取消'),
      bookingNote(
        `${student ? student.name : appt.studentId} cancelled their lesson (${formatDateEn(start)} ${formatHM(start)}).`,
        `${student ? student.name : appt.studentId} 取消了课程（${formatDateZh(start)} ${formatHM(start)}）。`,
      ),
    )
  })
}

export function rescheduleAppointment(id: string, newStartISO: string): { ok: true } | { ok: false; error: string } {
  const appt = state.appointments.find((a) => a.id === id)
  if (!appt || appt.status === 'cancelled') return { ok: false, error: 'not_found' }
  const check = validateBooking(state, appt.courseId, newStartISO, id, appt.studentId, appt.lessonIndex, 1)
  if (!check.ok) return { ok: false, error: check.error }
  mutate((draft) => {
    const target = draft.appointments.find((a) => a.id === id)
    if (!target) return
    const course = draft.courses.find((c) => c.id === target.courseId)
    const duration = course ? courseDuration(course) : 60
    target.start = newStartISO
    target.end = toLocalISO(addMinutes(fromLocalISO(newStartISO), duration))
    target.history.push({ at: nowISO(), note: bookingNote('Rescheduled', '已改期') })
    const start = fromLocalISO(target.start)
    notify(
      draft,
      'student',
      target.studentId,
      'booking_rescheduled',
      bookingNote('Lesson rescheduled', '课程已改期'),
      bookingNote(
        `Your ${course ? course.name.en : 'lesson'}${course && target.lessonIndex !== undefined ? lessonLabel(course, target.lessonIndex, 'en') : ''} is now ${formatDateEn(start)} at ${formatHM(start)}.`,
        `您的${course ? course.name.zh : '课程'}${course && target.lessonIndex !== undefined ? lessonLabel(course, target.lessonIndex, 'zh') : ''}已改期至 ${formatDateZh(start)} ${formatHM(start)}。`,
      ),
    )
  })
  return { ok: true }
}

export function batchReschedule(ids: string[], newStartISO: string): { moved: string[]; failed: { id: string; error: string }[] } {
  const moved: string[] = []
  const failed: { id: string; error: string }[] = []
  for (const id of ids) {
    const result = rescheduleAppointment(id, newStartISO)
    if (result.ok) moved.push(id)
    else failed.push({ id, error: result.error })
  }
  return { moved, failed }
}

// --- Working hours ---

/**
 * Auto-cancel every future confirmed/pending appointment that no longer fits
 * the (already updated) rules/exceptions, notifying each affected student.
 */
function autoCancelUnfit(draft: AppState): void {
  const now = new Date()
  for (const appt of draft.appointments) {
    if (appt.status !== 'confirmed' && appt.status !== 'pending') continue
    const start = fromLocalISO(appt.start)
    if (start.getTime() <= now.getTime()) continue // never cancel history
    const interval = getEffectiveInterval(start, draft.weeklyRules, draft.exceptions)
    const course = draft.courses.find((c) => c.id === appt.courseId)
    const duration = course ? course.durationMin : 60
    const dayStart = startOfDay(start).getTime()
    let fits = interval !== null
    if (interval) {
      const startMin = (start.getTime() - dayStart) / 60000
      fits = startMin >= interval.startMin && startMin + duration <= interval.endMin
    }
    if (!fits) {
      appt.status = 'cancelled'
      appt.history.push({ at: nowISO(), note: bookingNote('Cancelled — schedule changed', '已取消 — 时间安排变更') })
      const dayClosed = draft.exceptions.some((e) => e.date === dateKey(start) && e.closed)
      notify(
        draft,
        'student',
        appt.studentId,
        dayClosed ? 'day_closed' : 'booking_cancelled',
        bookingNote(dayClosed ? 'Day closed — lesson cancelled' : 'Lesson cancelled', dayClosed ? '当日休息 — 课程已取消' : '课程已取消'),
        bookingNote(
          `Your ${course ? course.name.en : 'lesson'} on ${formatDateEn(start)} at ${formatHM(start)} was cancelled because the schedule changed.`,
          `您的${course ? course.name.zh : '课程'}（${formatDateZh(start)} ${formatHM(start)}）因时间安排变更已被取消。`,
        ),
      )
    }
  }
}

export function setWeeklyRules(rules: WeeklyRule[]): void {
  mutate((draft) => {
    draft.weeklyRules = rules
    autoCancelUnfit(draft)
  })
}

/** Set the mandatory break (minutes) between lessons of different students. */
export function setBreakMin(breakMin: number): void {
  mutate((draft) => {
    draft.instructor.breakMin = Math.max(0, Math.min(60, Math.round(breakMin)))
  })
}

/** Instructor uploads their personal WeChat Pay receive QR (data URL). */
export function setWechatQr(dataUrl: string): void {
  mutate((draft) => {
    draft.instructor.wechatQr = dataUrl || undefined
  })
}

/** Instructor sets the Interac e-Transfer receiving email. */
export function setEmtEmail(email: string): void {
  mutate((draft) => {
    draft.instructor.emtEmail = email.trim() || undefined
  })
}

/** Instructor saves their bank account details. */
export function setBank(bank: InstructorBank): void {
  mutate((draft) => {
    draft.instructor.bank = {
      bankName: bank.bankName?.trim() || undefined,
      holderName: bank.holderName?.trim() || undefined,
      transit: bank.transit?.trim() || undefined,
      institution: bank.institution?.trim() || undefined,
      account: bank.account?.trim() || undefined,
    }
  })
}

/** Instructor saves online payment API credentials (Stripe / PayPal). */
export function setPayConfig(cfg: PayApiConfig): void {
  mutate((draft) => {
    draft.instructor.payConfig = {
      stripeKey: cfg.stripeKey?.trim() || undefined,
      stripeUrl: cfg.stripeUrl?.trim() || undefined,
      paypalClientId: cfg.paypalClientId?.trim() || undefined,
      paypalUrl: cfg.paypalUrl?.trim() || undefined,
    }
  })
}

/** Upsert an exception by date; existing bookings that no longer fit auto-cancel. */
export function addException(exp: DayException): void {
  mutate((draft) => {
    const idx = draft.exceptions.findIndex((e) => e.date === exp.date)
    if (idx >= 0) draft.exceptions[idx] = exp
    else draft.exceptions.push(exp)
    autoCancelUnfit(draft)
  })
}

export function removeException(date: string): void {
  mutate((draft) => {
    draft.exceptions = draft.exceptions.filter((e) => e.date !== date)
  })
}

// --- Courses ---

export function saveCourse(input: Course): Course {
  const course: Course = input.id === '' ? { ...input, id: nextId('c', state.courses) } : { ...input }
  mutate((draft) => {
    const idx = draft.courses.findIndex((c) => c.id === course.id)
    if (idx >= 0) draft.courses[idx] = course
    else draft.courses.push(course)
  })
  return course
}

export function deleteCourse(id: string): void {
  mutate((draft) => {
    const idx = draft.courses.findIndex((c) => c.id === id)
    if (idx < 0) return
    const referenced = draft.appointments.some((a) => a.courseId === id)
    if (referenced) draft.courses[idx] = { ...draft.courses[idx], active: false }
    else draft.courses.splice(idx, 1)
  })
}

export function toggleCourse(id: string): void {
  mutate((draft) => {
    const course = draft.courses.find((c) => c.id === id)
    if (course) course.active = !course.active
  })
}

// --- Vehicles ---

export function saveVehicle(input: Vehicle): Vehicle {
  const vehicle: Vehicle = input.id === '' ? { ...input, id: nextId('v', state.vehicles) } : { ...input }
  mutate((draft) => {
    const idx = draft.vehicles.findIndex((v) => v.id === vehicle.id)
    if (idx >= 0) draft.vehicles[idx] = vehicle
    else draft.vehicles.push(vehicle)
  })
  return vehicle
}

export function deleteVehicle(id: string): void {
  mutate((draft) => {
    const idx = draft.vehicles.findIndex((v) => v.id === id)
    if (idx >= 0) draft.vehicles.splice(idx, 1)
  })
}

// --- Teaching videos (homepage 视频) ---

/**
 * Upsert a teaching video. When `input.id === ''` a new id is allocated
 * ('vid' prefix); otherwise the existing row is replaced in place.
 */
export function saveVideo(input: TeachingVideo): TeachingVideo {
  const video: TeachingVideo =
    input.id === '' ? { ...input, id: nextId('vid', state.videos) } : { ...input }
  mutate((draft) => {
    const idx = draft.videos.findIndex((v) => v.id === video.id)
    if (idx >= 0) draft.videos[idx] = video
    else draft.videos.push(video)
  })
  return video
}

export function deleteVideo(id: string): void {
  mutate((draft) => {
    const idx = draft.videos.findIndex((v) => v.id === id)
    if (idx >= 0) draft.videos.splice(idx, 1)
  })
}

// --- Payments (现金 / 微信支付 / 在线支付, confirmed by the instructor) ---

/** Canonical order of every supported payment method. */
export const ALL_PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'wechat',
  'emt',
  'applepay',
  'googlepay',
  'card',
  'debit',
  'paypal',
]

/**
 * The payment methods the instructor has enabled. When the instructor has not
 * configured a list yet (undefined), every method is available (backward
 * compatible with existing demo data). An explicitly empty list means the
 * instructor disabled everything and nothing is shown to students.
 */
export function enabledPaymentMethods(source: AppState): PaymentMethod[] {
  const list = source.instructor.paymentMethods
  if (list === undefined) return [...ALL_PAYMENT_METHODS]
  return ALL_PAYMENT_METHODS.filter((m) => list.includes(m))
}

/** Instructor replaces the enabled payment-method list (学员端随之变化). */
export function setPaymentMethods(methods: PaymentMethod[]): void {
  const next = ALL_PAYMENT_METHODS.filter((m) => methods.includes(m))
  mutate((draft) => {
    draft.instructor.paymentMethods = next
  })
}

const METHOD_LABELS_EN: Record<PaymentMethod, string> = {
  cash: 'Cash',
  wechat: 'WeChat Pay',
  emt: 'Interac e-Transfer',
  applepay: 'Apple Pay',
  googlepay: 'Google Pay',
  card: 'Credit Card',
  debit: 'Debit Card',
  paypal: 'PayPal',
}

const METHOD_LABELS_ZH: Record<PaymentMethod, string> = {
  cash: '现金',
  wechat: '微信支付',
  emt: 'Interac 电子转账',
  applepay: 'Apple Pay',
  googlepay: 'Google Pay',
  card: '信用卡',
  debit: '储蓄卡',
  paypal: 'PayPal',
}

/** Localized payment method label (also used by the payments UI). */
export function paymentMethodLabel(method: PaymentMethod, locale: 'en' | 'zh'): string {
  return locale === 'zh' ? METHOD_LABELS_ZH[method] : METHOD_LABELS_EN[method]
}

function methodLabelEn(method: PaymentMethod): string {
  return METHOD_LABELS_EN[method]
}

function methodLabelZhOf(method: PaymentMethod): string {
  return METHOD_LABELS_ZH[method]
}

/** Student submits a payment — it stays pending until the instructor confirms. */
export function addPayment(studentId: string, courseId: string, method: PaymentMethod): Payment {
  const course = state.courses.find((c) => c.id === courseId)
  const amount = course ? course.price : 0
  const payment: Payment = {
    id: nextId('p', state.payments),
    studentId,
    courseId,
    method,
    amount,
    status: 'pending',
    createdAt: nowISO(),
  }
  const student = state.students.find((s) => s.id === studentId)
  const methodLabel = methodLabelEn(method)
  const methodLabelZh = methodLabelZhOf(method)
  mutate((draft) => {
    draft.payments.push(payment)
    notify(
      draft,
      'student',
      studentId,
      'payment_pending',
      bookingNote('Payment submitted', '支付已提交'),
      bookingNote(
        `Your ${course ? course.name.en : 'course'} payment (${methodLabel}) awaits instructor confirmation.`,
        `您对${course ? course.name.zh : '课程'}的支付（${methodLabelZh}）等待教练确认。`,
      ),
      payment.id,
    )
    notify(
      draft,
      'instructor',
      'instructor',
      'payment_pending',
      bookingNote('New payment awaiting confirmation', '新支付待确认'),
      bookingNote(
        `${student ? student.name : studentId} submitted a payment for ${course ? course.name.en : courseId} ($${amount}, ${methodLabel}).`,
        `${student ? student.name : studentId} 提交了${course ? course.name.zh : courseId}的支付（${amount} 加元，${methodLabelZh}）。`,
      ),
      payment.id,
    )
  })
  return payment
}

/** Instructor confirms the payment → the course becomes purchased. */
export function confirmPayment(id: string): void {
  mutate((draft) => {
    const p = draft.payments.find((x) => x.id === id)
    if (!p || p.status !== 'pending') return
    p.status = 'confirmed'
    p.confirmedAt = nowISO()
    const course = draft.courses.find((c) => c.id === p.courseId)
    notify(
      draft,
      'student',
      p.studentId,
      'payment_confirmed',
      bookingNote('Payment confirmed', '支付已确认'),
      bookingNote(
        `Your ${course ? course.name.en : 'course'} is paid — you can now book a time.`,
        `${course ? course.name.zh : '课程'}已支付成功，现在可以预约时间了。`,
      ),
    )
  })
}

/** Instructor rejects the payment. */
export function rejectPayment(id: string): void {
  mutate((draft) => {
    const p = draft.payments.find((x) => x.id === id)
    if (!p || p.status !== 'pending') return
    p.status = 'rejected'
    const course = draft.courses.find((c) => c.id === p.courseId)
    notify(
      draft,
      'student',
      p.studentId,
      'payment_rejected',
      bookingNote('Payment rejected', '支付未通过'),
      bookingNote(
        `Your payment for ${course ? course.name.en : 'the course'} was not confirmed. Please contact the instructor.`,
        `您对${course ? course.name.zh : '该课程'}的支付未通过确认，请联系教练。`,
      ),
    )
  })
}

// --- Auth / session ---

const AVATAR_PALETTE = ['#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#10B981']

export function addStudent(name: string, phone: string): Student {
  const student: Student = {
    id: nextId('s', state.students),
    name,
    phone,
    registeredAt: nowISO(),
    avatarColor: AVATAR_PALETTE[state.students.length % AVATAR_PALETTE.length],
  }
  mutate((draft) => {
    draft.students.push(student)
  })
  setSession({ role: 'student', studentId: student.id })
  return student
}

/** Student fills their pickup address (接送地址) after logging in. */
export function updateStudentAddress(studentId: string, address: string): void {
  mutate((draft) => {
    const s = draft.students.find((x) => x.id === studentId)
    if (s) s.address = address.trim()
  })
}

// --- Package lesson helpers (shared by student UI) ---

/** 'free' | 'booked' | 'done' for one package lesson of a student. */
export function lessonStatus(state: AppState, studentId: string, courseId: string, lessonIndex: number): 'free' | 'booked' | 'done' {
  return lessonState(state, studentId, courseId, lessonIndex)
}

/** Progress of a student inside a package course. */
export function packageProgress(
  state: AppState,
  studentId: string,
  courseId: string,
): { done: number; booked: number; total: number } {
  const course = state.courses.find((c) => c.id === courseId)
  const total = course?.lessons?.length ?? 0
  let done = 0
  let booked = 0
  for (let i = 0; i < total; i++) {
    const st = lessonState(state, studentId, courseId, i)
    if (st === 'done') done += 1
    else if (st === 'booked') booked += 1
  }
  return { done, booked, total }
}

function readSession(): Session {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Session
      if (parsed && (parsed.role === 'student' || parsed.role === 'instructor')) return parsed
    }
  } catch {
    // fall through
  }
  return { role: null }
}

let session: Session = readSession()

function setSession(next: Session): void {
  session = next
  try {
    if (next.role === null) localStorage.removeItem(SESSION_KEY)
    else localStorage.setItem(SESSION_KEY, JSON.stringify(next))
  } catch {
    // storage unavailable — in-memory session only
  }
  notifyListeners()
}

export function loginInstructor(password: string): boolean {
  if (password !== 'demo123') return false
  setSession({ role: 'instructor' })
  return true
}

export function loginAsStudent(id: string): void {
  setSession({ role: 'student', studentId: id })
}

export function logout(): void {
  setSession({ role: null })
}

export function getSession(): Session {
  return { ...session }
}

// --- Notifications ---

export function markNotificationRead(id: string): void {
  mutate((draft) => {
    const n = draft.notifications.find((x) => x.id === id)
    if (n) n.read = true
  })
}

export function markAllRead(role: 'student' | 'instructor', recipientId: string): void {
  mutate((draft) => {
    for (const n of draft.notifications) {
      if (n.role === role && n.recipientId === recipientId) n.read = true
    }
  })
}

// --- Demo utilities ---

export function resetDemo(): void {
  state = seed()
  setSession({ role: null })
  lastSyncISO = toLocalISO(new Date())
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {
    // storage unavailable
  }
  notifyListeners()
}

/** Demo "synced" stamp (local ISO), refreshed on every mutation. */
export function getLastSyncISO(): string {
  return lastSyncISO
}

/** Display mask, e.g. '(416) ***-1234'. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const trimmed = digits.length > 10 && digits.startsWith('1') ? digits.slice(1) : digits
  if (trimmed.length >= 10) return `(${trimmed.slice(0, 3)}) ***-${trimmed.slice(-4)}`
  if (trimmed.length >= 4) return `***-${trimmed.slice(-4)}`
  return '***'
}
