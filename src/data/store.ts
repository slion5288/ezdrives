// ============================================================================
// EZDRIVES — Store (code contract)
// Singleton store over AppState, backed by the Cloudflare D1 backend.
// On login the authoritative state is pulled from GET /api/state; mutations
// are optimistic in memory and persisted asynchronously (instructor → PUT
// /api/state, student/instructor actions → POST /api/student/actions).
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
  TeachingVideo,
  Vehicle,
  WeeklyRule,
} from './types'
import { seed } from './seed'
import {
  dateKey,
  formatDateEn,
  formatDateZh,
  formatHM,
  fromLocalISO,
  getEffectiveInterval,
  startOfDay,
  toLocalISO,
} from './timeEngine'
import { apiAction, apiFetchState, apiLogin, apiLogout, apiPublicHome, apiPutState, apiRegister, apiSendCode } from './api'
import type { ApiUser } from './api'

export type { AppState, Appointment, Course, CourseLesson, DayException, HomeContent, HomeInstructor, InstructorBank, Notification, PayApiConfig, Payment, PaymentMethod, Student, TeachingVideo, Vehicle, WeeklyRule } from './types'
export type { Slot } from './timeEngine'

const SESSION_KEY = 'dw.session.v2' // { token, user }
const ADMIN_KEY = 'dw.admin.v2' // site content-admin session token

// --- Admin (content manager) session helpers ---

export function getAdminToken(): string {
  try {
    return localStorage.getItem(ADMIN_KEY) || ''
  } catch {
    return ''
  }
}

export function setAdminToken(token: string): void {
  try {
    if (token) localStorage.setItem(ADMIN_KEY, token)
    else localStorage.removeItem(ADMIN_KEY)
  } catch {
    // storage unavailable — in-memory only
  }
}

export interface Session {
  token: string
  role: 'instructor' | 'student' | null
  user?: ApiUser
  studentId?: string
}

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

function readSession(): Session {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { token: string; user?: ApiUser }
      if (parsed && parsed.token && parsed.user) {
        return { token: parsed.token, role: parsed.user.role, user: parsed.user, studentId: parsed.user.studentId }
      }
    }
  } catch {
    // fall through
  }
  return { token: '', role: null }
}

// In-memory snapshot. Starts as a seed placeholder; replaced by the server
// state once the user logs in (initStateFromServer).
let state: AppState = seed()
let stateLoaded = false
let lastSyncISO: string = toLocalISO(new Date())

let session: Session = readSession()

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

/** Deep-clone → mutate → refresh sync stamp → notify → persist (instructor). */
function mutate(fn: (draft: AppState) => void): void {
  const draft = cloneState(state)
  fn(draft)
  state = draft
  lastSyncISO = toLocalISO(new Date())
  notifyListeners()
  pushState()
}

/** After an instructor mutation, persist the whole state to the backend. */
function pushState(): void {
  if (!session.token) return
  const snapshot = state
  apiPutState(session.token, snapshot)
    .then((res) => {
      if (!res.ok) console.error('[store] pushState failed:', res.error)
    })
    .catch((e) => console.error('[store] pushState error:', e))
}

/**
 * Pull the authoritative state from the backend for the current session.
 * Call after login and on page refresh. Returns false on failure.
 */
export async function initStateFromServer(): Promise<boolean> {
  if (!session.token) return false
  try {
    const res = await apiFetchState(session.token)
    if (res.ok && res.state) {
      state = res.state as AppState
      stateLoaded = true
      lastSyncISO = toLocalISO(new Date())
      notifyListeners()
      return true
    }
    if (res.error === 'Not authenticated') clearSession()
    return false
  } catch (e) {
    console.error('[store] initStateFromServer error:', e)
    return false
  }
}

/** True once the server state has been loaded for this session. */
export function isStateLoaded(): boolean {
  return stateLoaded
}

/**
 * Pull the PUBLIC homepage state (no login) — real courses/videos/instructor
 * plus the admin-edited homepage content, so visitors never see seed data.
 *
 * On success the state is replaced with the real public snapshot. On failure
 * the state is reset to a shell WITHOUT the demo courses/videos/vehicles so
 * visitors can never see seed business data (the "test content" on the
 * homepage course section). `publicReady` flips true either way once settled,
 * so public pages can avoid flashing the seed before the fetch resolves.
 */
let publicReady = false

/** True once the public homepage data has been fetched (success or settled-empty). */
export function isPublicReady(): boolean {
  return publicReady
}

export async function initPublicHome(): Promise<boolean> {
  try {
    const res = await apiPublicHome()
    if (res.ok && res.state) {
      state = res.state as AppState
      publicReady = true
      notifyListeners()
      return true
    }
  } catch (e) {
    console.error('[store] initPublicHome error:', e)
  }
  // Failure path: never show the demo seed to visitors.
  state = { ...seed(), courses: [], videos: [], vehicles: [] }
  publicReady = true
  notifyListeners()
  return false
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

// --- Appointments (server-backed) ---

async function applyServerState(res: { ok?: boolean; state?: unknown; error?: string }): Promise<boolean> {
  if (res.ok && res.state) {
    state = res.state as AppState
    stateLoaded = true
    lastSyncISO = toLocalISO(new Date())
    notifyListeners()
    return true
  }
  return false
}

export async function bookAppointment(
  studentId: string,
  courseId: string,
  startISO: string,
  lessonIndex?: number,
): Promise<{ ok: true; appointment: Appointment } | { ok: false; error: BookingError | string }> {
  if (!session.token) return { ok: false, error: 'not_authenticated' }
  const res = await apiAction(session.token, 'bookAppointment', { studentId, courseId, startISO, lessonIndex, clientNow: toLocalISO(new Date()) })
  if (res.ok && res.state) {
    await applyServerState(res)
    const appts = (res.state as AppState).appointments.filter((a) => a.studentId === studentId && a.courseId === courseId)
    const appt = appts[appts.length - 1]
    return appt ? { ok: true, appointment: appt } : { ok: false, error: 'error' }
  }
  return { ok: false, error: res.error || 'error' }
}

/**
 * Book several CONSECUTIVE package lessons at once (e.g. 2 课时): each lesson
 * is one hour, starting at `startISO`, one right after the other. The whole
 * block must be break-aware valid for this student.
 */
export async function bookPackageLessons(
  studentId: string,
  courseId: string,
  startISO: string,
  firstLessonIndex: number,
  count: number,
): Promise<{ ok: true; appointments: Appointment[] } | { ok: false; error: BookingError | string }> {
  if (!session.token) return { ok: false, error: 'not_authenticated' }
  const res = await apiAction(session.token, 'bookPackageLessons', { studentId, courseId, startISO, firstLessonIndex, count, clientNow: toLocalISO(new Date()) })
  if (res.ok && res.state) {
    await applyServerState(res)
    const appts = (res.state as AppState).appointments.filter(
      (a) => a.studentId === studentId && a.courseId === courseId && a.start >= startISO,
    )
    return { ok: true, appointments: appts }
  }
  return { ok: false, error: res.error || 'error' }
}

/** ' · Lesson 3' / ' · 第 3 课时' suffix for package appointments (empty for singles). */
export function lessonLabel(course: Course, lessonIndex: number | undefined, locale: 'en' | 'zh'): string {
  if (course.type !== 'package' || lessonIndex === undefined) return ''
  return locale === 'zh' ? `第 ${lessonIndex + 1} 课时` : ` · Lesson ${lessonIndex + 1}`
}

export async function cancelAppointment(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!session.token) return { ok: false, error: 'not_authenticated' }
  const res = await apiAction(session.token, 'cancelAppointment', { id })
  if (res.ok && res.state) {
    await applyServerState(res)
    return { ok: true }
  }
  return { ok: false, error: res.error || 'error' }
}

export async function rescheduleAppointment(id: string, newStartISO: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!session.token) return { ok: false, error: 'not_authenticated' }
  const res = await apiAction(session.token, 'rescheduleAppointment', { id, newStartISO, clientNow: toLocalISO(new Date()) })
  if (res.ok && res.state) {
    await applyServerState(res)
    return { ok: true }
  }
  return { ok: false, error: res.error || 'error' }
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

/** Instructor saves their own public profile (name / phone / email / bio). */
export function updateInstructorProfile(profile: Partial<AppState['instructor']>): void {
  mutate((draft) => {
    draft.instructor = { ...draft.instructor, ...profile }
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



/** Student submits a payment — it stays pending until the instructor confirms. */
export async function addPayment(
  studentId: string,
  courseId: string,
  method: PaymentMethod,
): Promise<{ ok: true; payment: Payment } | { ok: false; error: string }> {
  if (!session.token) return { ok: false, error: 'not_authenticated' }
  const res = await apiAction(session.token, 'addPayment', { studentId, courseId, method })
  if (res.ok && res.state) {
    await applyServerState(res)
    const payments = (res.state as AppState).payments.filter((p) => p.studentId === studentId && p.courseId === courseId)
    const payment = payments[payments.length - 1]
    return payment ? { ok: true, payment } : { ok: false, error: 'error' }
  }
  return { ok: false, error: res.error || 'error' }
}

/** Instructor confirms the payment → the course becomes purchased. */
export async function confirmPayment(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!session.token) return { ok: false, error: 'Not authenticated' }
  const res = await apiAction(session.token, 'confirmPayment', { id })
  if (res.ok && res.state) {
    await applyServerState(res)
    return { ok: true }
  }
  return { ok: false, error: res.error }
}

/** Instructor rejects the payment. */
export async function rejectPayment(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!session.token) return { ok: false, error: 'Not authenticated' }
  const res = await apiAction(session.token, 'rejectPayment', { id })
  if (res.ok && res.state) {
    await applyServerState(res)
    return { ok: true }
  }
  return { ok: false, error: res.error }
}

// --- Auth / session ---

function setSession(next: Session): void {
  session = next
  try {
    if (next.role === null) localStorage.removeItem(SESSION_KEY)
    else localStorage.setItem(SESSION_KEY, JSON.stringify({ token: next.token, user: next.user }))
  } catch {
    // storage unavailable — in-memory session only
  }
  notifyListeners()
}

function clearSession(): void {
  state = seed()
  stateLoaded = false
  setSession({ token: '', role: null })
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

/** Student fills their pickup address (接送地址) — server-backed. */
export async function updateStudentAddress(address: string): Promise<LoginResult> {
  if (!session.token) return { ok: false, error: 'Not authenticated' }
  const res = await apiAction(session.token, 'updateStudentAddress', { address })
  if (res.ok && res.state) {
    state = res.state as AppState
    stateLoaded = true
    notifyListeners()
    return { ok: true }
  }
  return { ok: false, error: res.error || 'Update failed' }
}

export type LoginResult = { ok: true } | { ok: false; error: string }

/** Real login via the backend (phone + password). */
export async function login(phone: string, password: string): Promise<LoginResult> {
  const res = await apiLogin(phone.trim(), password)
  if (!res.ok || !res.token || !res.user) return { ok: false, error: res.error || 'Login failed' }
  setSession({ token: res.token, role: res.user.role, user: res.user, studentId: res.user.studentId })
  const loaded = await initStateFromServer()
  if (!loaded) return { ok: false, error: 'Failed to load data' }
  return { ok: true }
}

/** Request an SMS verification code (Twilio). */
export async function sendVerificationCode(phone: string): Promise<{ ok: boolean; error?: string }> {
  return apiSendCode(phone)
}

/** Real registration via the backend (student, SMS-verified). */
export async function register(body: { role?: 'student' | 'instructor'; name: string; phone: string; password: string; address?: string; code?: string }): Promise<LoginResult> {
  const res = await apiRegister({ role: body.role ?? 'student', ...body })
  if (!res.ok || !res.token || !res.user) return { ok: false, error: res.error || 'Registration failed' }
  setSession({ token: res.token, role: res.user.role, user: res.user, studentId: res.user.studentId })
  const loaded = await initStateFromServer()
  if (!loaded) return { ok: false, error: 'Failed to load data' }
  return { ok: true }
}

export async function logout(): Promise<void> {
  if (session.token) {
    apiLogout(session.token).catch(() => undefined)
  }
  clearSession()
}

export function getSession(): Session {
  return { ...session }
}

// --- Notifications (server-backed) ---

export async function markNotificationRead(id: string): Promise<void> {
  if (!session.token) return
  const res = await apiAction(session.token, 'markNotificationRead', { id })
  if (res.ok && res.state) {
    state = res.state as AppState
    stateLoaded = true
    notifyListeners()
  }
}

export async function markAllRead(_role?: string, _recipientId?: string): Promise<void> {
  if (!session.token) return
  const res = await apiAction(session.token, 'markAllRead', {})
  if (res.ok && res.state) {
    state = res.state as AppState
    stateLoaded = true
    notifyListeners()
  }
}

// --- Sync stamp ---

/** "Synced" stamp (local ISO), refreshed on every mutation. */
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
