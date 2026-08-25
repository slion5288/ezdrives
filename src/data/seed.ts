// ============================================================================
// EZDRIVES — Deterministic Canadian seed data (code contract)
// Source of truth: docs/ARCHITECTURE.md §10. Generated relative to today so the
// demo always looks alive. Fixed ids ('s1', 'c1', 'v1', 'a1', 'n1', …); all
// datetimes are LOCAL ISO strings. Monday–Saturday bookings only, inside
// working hours, so availability always shows.
// ============================================================================

import type { AppState, Appointment, Course, DayException, Notification, Payment, Student, Vehicle, WeeklyRule } from './types'
import { TESLA_IMAGES } from './assets'
import {
  addDays,
  addMinutes,
  dateKey,
  formatDateEn,
  formatDateZh,
  formatHM,
  fromLocalISO,
  getEffectiveInterval,
  startOfDay,
  toLocalISO,
} from './timeEngine'

export function seed(): AppState {
  const today = startOfDay(new Date())
  const now = new Date()

  /** Local ISO 'YYYY-MM-DDTHH:mm:ss' for a day offset from today. */
  const at = (days: number, hour: number, minute = 0): string =>
    toLocalISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + days, hour, minute, 0))

  const ago = (hours: number): string => toLocalISO(new Date(now.getTime() - hours * 3600000))

  // --- Instructor ---
  const instructor: AppState['instructor'] = {
    name: 'Michael Reeves',
    phone: '+1 416-555-0142',
    email: 'michael@ezdrives.ca',
    bio: {
      en: 'Certified driving instructor with 9 years of experience across the GTA. Patient, calm, and focused on building real confidence behind the wheel.',
      zh: '持牌驾驶教练，在多伦多地区拥有 9 年教学经验。耐心、沉稳，专注于帮助学员建立真正的驾驶自信。',
    },
    rating: 4.9,
    yearsExperience: 9,
    avatarColor: '#2563EB',
    breakMin: 10,
  }

  // --- Students ---
  const students: Student[] = [
    { id: 's1', name: 'Aisha Khan', phone: '+1 416-555-0131', address: '88 King St W, Toronto, ON', registeredAt: at(-40, 10), avatarColor: '#3B82F6', email: 'aisha.khan@example.ca' },
    { id: 's2', name: 'Liam Chen', phone: '+1 647-555-0148', address: '4200 Yonge St, North York, ON', registeredAt: at(-25, 9), avatarColor: '#F59E0B' },
    { id: 's3', name: 'Yuki Tanaka', phone: '+1 905-555-0167', address: '505 Hwy 7, Vaughan, ON', registeredAt: at(-18, 14), avatarColor: '#8B5CF6', email: 'yuki.tanaka@example.ca' },
    { id: 's4', name: 'Omar Hassan', phone: '+1 416-555-0189', address: '3660 Midland Ave, Scarborough, ON', registeredAt: at(-12, 11), avatarColor: '#EC4899' },
    { id: 's5', name: 'Emma Wilson', phone: '+1 289-555-0125', address: '180 Borough Dr, Scarborough, ON', registeredAt: at(-6, 16), avatarColor: '#14B8A6' },
    { id: 's6', name: 'Priya Patel', phone: '+1 647-555-0173', address: '700 Burnhamthorpe Rd, Mississauga, ON', registeredAt: at(-2, 13), avatarColor: '#F97316' },
  ]

  // --- Courses (CAD) — whole-hour durations (1h / 2h) ---
  const courses: Course[] = [
    {
      id: 'c1',
      type: 'single',
      name: { en: 'G1 Learner Practice', zh: 'G1 基础练习' },
      description: {
        en: 'Fundamentals of the road: steering, braking, mirrors and safe habits for new drivers.',
        zh: '道路基础技能：转向、刹车、后视镜使用以及新手安全驾驶习惯。',
      },
      price: 60,
      durationMin: 60,
      active: true,
    },
    {
      id: 'c2',
      name: { en: 'G2 Road Test Prep (10-lesson package)', zh: 'G2 路考强化（10 课时套餐）' },
      description: {
        en: 'A complete 10-lesson package covering every G2 road-test skill — park, turns, lanes and two mock tests.',
        zh: '覆盖 G2 路考全部技能的 10 课时完整套餐——停车、转弯、变道及两次模拟考试。',
      },
      type: 'package',
      price: 500,
      durationMin: 60,
      active: true,
      lessons: [
        { name: { en: 'Vehicle controls & pre-trip', zh: '车辆操控与出行前检查' }, description: { en: 'Seat, mirrors, signals, and the pre-trip routine.', zh: '座椅、后视镜、转向灯及出行前检查流程。' }, price: 50 },
        { name: { en: 'Reversing & backing up', zh: '倒车与倒库' }, description: { en: 'Controlled reversing and backing into a spot.', zh: '控制倒车与倒入停车位。' }, price: 50 },
        { name: { en: 'Parallel parking', zh: '侧方停车' }, description: { en: 'Parallel parking step by step on real streets.', zh: '在真实街道上分步练习侧方停车。' }, price: 50 },
        { name: { en: 'Three-point turn', zh: '三点掉头' }, description: { en: 'The three-point turn examiners expect.', zh: '考官最看重的三点掉头。' }, price: 50 },
        { name: { en: 'Intersections & right-of-way', zh: '路口与让行' }, description: { en: 'Who goes first, left turns and unprotected intersections.', zh: '谁先行、左转与无保护路口。' }, price: 50 },
        { name: { en: 'Lane changes & merging', zh: '变道与并线' }, description: { en: 'Shoulder checks, signals and confident merging.', zh: '转头观察、打灯与自信并线。' }, price: 50 },
        { name: { en: 'Left & right turns', zh: '左右转弯' }, description: { en: 'Proper lanes, speed and positioning for turns.', zh: '转弯的车道、速度与位置选择。' }, price: 50 },
        { name: { en: 'Curb parking & pull-out', zh: '路边停车与起步' }, description: { en: 'Curb parking and safe pull-outs.', zh: '路边停车与安全驶出。' }, price: 50 },
        { name: { en: 'Mock road test', zh: '模拟路考' }, description: { en: 'A full mock test with examiner-style feedback.', zh: '完整模拟路考，考官风格反馈。' }, price: 50 },
        { name: { en: 'Final route rehearsal', zh: '考试路线模拟' }, description: { en: 'Practice on likely test routes before the real exam.', zh: '考前在可能出现的考试路线上练习。' }, price: 50 },
      ],
    },
    {
      id: 'c3',
      type: 'single',
      name: { en: 'Highway Driving', zh: '高速驾驶' },
      description: {
        en: 'Merging, lane changes and highway confidence at speed, including 400-series routes.',
        zh: '并线、变道与高速驾驶信心训练，包含 400 系列高速路线。',
      },
      price: 75,
      durationMin: 120,
      active: true,
    },
    {
      id: 'c4',
      type: 'single',
      name: { en: 'Parking & Maneuvering', zh: '停车与操控' },
      description: {
        en: 'Parallel, reverse and forward parking plus three-point turns — the skills exams love.',
        zh: '侧方停车、倒车入库与正向停车，以及三点掉头——考试最爱的技能。',
      },
      price: 60,
      durationMin: 60,
      active: true,
    },
    {
      id: 'c5',
      type: 'single',
      name: { en: 'Defensive Driving', zh: '防御性驾驶' },
      description: {
        en: 'Hazard awareness, safe following distance and smart decisions in real traffic.',
        zh: '危险预判、安全车距以及在真实交通中的明智决策。',
      },
      price: 85,
      durationMin: 120,
      active: true,
    },
    {
      id: 'c6',
      type: 'single',
      name: { en: 'Exam Car Rental (G2/G Road Test)', zh: '考试用车（G2/G 路考）' },
      description: {
        en: 'Use our insured dual-control exam car for your G2/G road test, with a quick pre-test warm-up included.',
        zh: '路考当天使用我们的投保双控考试用车参加 G2/G 路考，含考前热身练习。',
      },
      price: 90,
      durationMin: 60,
      active: true,
      examCar: true,
    },
  ]

  // --- Vehicles (Tesla first — the primary demo car) ---
  const vehicles: Vehicle[] = [
    {
      id: 'v3',
      make: 'Tesla',
      model: 'Model 3 2019',
      plate: 'TESLA 3',
      color: { en: 'Red', zh: '红色' },
      photoUrl: TESLA_IMAGES[0] ?? null,
      photos: TESLA_IMAGES.length > 0 ? TESLA_IMAGES : undefined,
      active: true,
    },
    { id: 'v1', make: 'Honda', model: 'Civic 2023', plate: 'ABCD 123', color: { en: 'White', zh: '白色' }, photoUrl: null, active: true },
    { id: 'v2', make: 'Toyota', model: 'Corolla 2022', plate: 'WXYZ 456', color: { en: 'Grey', zh: '灰色' }, photoUrl: null, active: true },
  ]

  // --- Weekly rules: Mon–Fri 09:00–18:00, Sat 10:00–14:00 ---
  const weeklyRules: WeeklyRule[] = [
    { weekday: 1, startMin: 540, endMin: 1080 },
    { weekday: 2, startMin: 540, endMin: 1080 },
    { weekday: 3, startMin: 540, endMin: 1080 },
    { weekday: 4, startMin: 540, endMin: 1080 },
    { weekday: 5, startMin: 540, endMin: 1080 },
    { weekday: 6, startMin: 600, endMin: 840 },
  ]

  /** Earliest Mon–Sat date at least `fromOffset` days from today. */
  const nextBookableDay = (fromOffset: number): number => {
    let offset = fromOffset
    while (addDays(today, offset).getDay() === 0) offset += 1
    return offset
  }

  // --- Exceptions within the next 14 days: one closed day + one override day ---
  const closedOffset = nextBookableDay(3)
  const overrideOffset = nextBookableDay(7)
  const exceptions: DayException[] = [
    {
      date: dateKey(addDays(today, closedOffset)),
      closed: true,
      note: { en: 'Instructor away — family day', zh: '教练休假 — 家庭日' },
    },
    {
      date: dateKey(addDays(today, overrideOffset)),
      closed: false,
      startMin: 840, // 14:00
      endMin: 1020, // 17:00
      note: { en: 'Half day — vehicle inspection', zh: '半天营业 — 车辆检测' },
    },
  ]

  // --- Appointments (~12, over the next 14 days) ---
  interface ApptSpec {
    studentId: string
    courseId: string
    days: number
    startMin: number
    status?: 'confirmed' | 'pending' | 'cancelled'
    lessonIndex?: number
    history?: { at: string; note: { en: string; zh: string } }[]
  }

  const specs: ApptSpec[] = [
    { studentId: 's1', courseId: 'c1', days: 1, startMin: 540 }, // 09:00
    { studentId: 's2', courseId: 'c2', days: 1, startMin: 840, lessonIndex: 0 }, // 14:00 套餐第1课时
    { studentId: 's3', courseId: 'c4', days: 2, startMin: 600, status: 'pending' }, // 10:00
    {
      studentId: 's4',
      courseId: 'c3',
      days: 2,
      startMin: 900, // 15:00 — rescheduled story
      history: [
        { at: ago(30), note: { en: 'Booked', zh: '已预约' } },
        { at: ago(26), note: { en: 'Rescheduled', zh: '已改期' } },
      ],
    },
    { studentId: 's5', courseId: 'c1', days: 4, startMin: 540 }, // 09:00
    { studentId: 's6', courseId: 'c5', days: 4, startMin: 840 }, // 14:00
    {
      studentId: 's2',
      courseId: 'c4',
      days: 6,
      startMin: 600, // 10:00 — student-cancelled story
      status: 'cancelled',
      history: [
        { at: ago(50), note: { en: 'Booked', zh: '已预约' } },
        { at: ago(45), note: { en: 'Cancelled', zh: '已取消' } },
      ],
    },
    { studentId: 's3', courseId: 'c1', days: 8, startMin: 660 }, // 11:00
    { studentId: 's4', courseId: 'c5', days: 8, startMin: 840 }, // 14:00
    { studentId: 's5', courseId: 'c3', days: 10, startMin: 540, status: 'pending' }, // 09:00
    { studentId: 's6', courseId: 'c2', days: 11, startMin: 900, lessonIndex: 1 }, // 15:00 套餐第2课时
  ]

  const appointments: Appointment[] = []

  const conflictsWith = (startISO: string, endISO: string): boolean => {
    const s = fromLocalISO(startISO).getTime()
    const e = fromLocalISO(endISO).getTime()
    return appointments.some((a) => {
      if (a.status !== 'confirmed' && a.status !== 'pending') return false
      const aS = fromLocalISO(a.start).getTime()
      const aE = fromLocalISO(a.end).getTime()
      return s < aE && e > aS
    })
  }

  const durationOf = (courseId: string): number => {
    const c = courses.find((x) => x.id === courseId)
    return c ? (c.type === 'package' ? 60 : c.durationMin) : 60
  }

  /** Per-lesson price: package lessons have their own price. */
  const packageLessonPrice = (courseId: string, lessonIndex: number | undefined): number => {
    const c = courses.find((x) => x.id === courseId)
    if (!c) return 0
    if (c.type === 'package' && lessonIndex !== undefined) return c.lessons?.[lessonIndex]?.price ?? c.price
    return c.price
  }

  /**
   * Places one appointment at the spec's day offset, clamping the start time
   * into the day's effective interval and nudging on conflicts. Skips
   * non-working days unless forceOnClosedDay is set (used for the seeded
   * auto-cancelled booking on the closed day).
   */
  const place = (spec: ApptSpec, forceOnClosedDay = false): Appointment | null => {
    let d = addDays(today, spec.days)
    if (d.getDay() === 0) d = addDays(d, 1) // never Sunday
    const duration = durationOf(spec.courseId)
    let startMin = spec.startMin

    const interval = getEffectiveInterval(d, weeklyRules, exceptions)
    if (interval) {
      if (startMin < interval.startMin) startMin = interval.startMin
      if (startMin + duration > interval.endMin) startMin = interval.endMin - duration
      if (startMin < interval.startMin) return null // interval too short for this course
      let guard = 0
      while (
        startMin + duration <= interval.endMin &&
        conflictsWith(
          toLocalISO(addMinutes(startOfDay(d), startMin)),
          toLocalISO(addMinutes(startOfDay(d), startMin + duration)),
        ) &&
        guard < 8
      ) {
        startMin += 60
        guard += 1
      }
      if (startMin + duration > interval.endMin) return null
    } else if (!forceOnClosedDay) {
      return null
    }

    const start = toLocalISO(addMinutes(startOfDay(d), startMin))
    const end = toLocalISO(addMinutes(fromLocalISO(start), duration))
    const createdAt = spec.history ? spec.history[0].at : ago(2 + appointments.length)
    const history: Appointment['history'] = spec.history ?? [{ at: createdAt, note: { en: 'Booked', zh: '已预约' } }]
    const appointment: Appointment = {
      id: `a${appointments.length + 1}`,
      studentId: spec.studentId,
      courseId: spec.courseId,
      start,
      end,
      status: spec.status ?? 'confirmed',
      history,
      createdAt,
      lessonIndex: spec.lessonIndex,
      price: packageLessonPrice(spec.courseId, spec.lessonIndex),
    }
    appointments.push(appointment)
    return appointment
  }

  for (const spec of specs) place(spec)

  // Backstory for SPEC §5 scenario 1: a lesson on the (now closed) day was
  // auto-cancelled when the instructor closed it.
  place(
    {
      studentId: 's5',
      courseId: 'c1',
      days: closedOffset,
      startMin: 600,
      status: 'cancelled',
      history: [
        { at: ago(28), note: { en: 'Booked', zh: '已预约' } },
        { at: ago(20), note: { en: 'Cancelled — day closed', zh: '已取消 — 当日休息' } },
      ],
    },
    true,
  )

  // Backstory for scenario 2: a confirmed lesson inside the override window.
  place({ studentId: 's6', courseId: 'c2', days: overrideOffset, startMin: 900, lessonIndex: 2 })

  // --- 2h-reminder demo slot: today, ~2 hours from now, hour-aligned ---
  const remRaw = new Date(now.getTime() + 2 * 3600000)
  const rem = new Date(remRaw.getFullYear(), remRaw.getMonth(), remRaw.getDate(), remRaw.getHours(), 0, 0)
  const remInterval = getEffectiveInterval(rem, weeklyRules, exceptions)
  const remStartMin = rem.getHours() * 60 + rem.getMinutes()
  let reminderAppt: Appointment | null = null
  if (remInterval && remStartMin >= remInterval.startMin && remStartMin + 60 <= remInterval.endMin) {
    const remStartISO = toLocalISO(rem)
    const remEndISO = toLocalISO(addMinutes(rem, 60))
    if (!conflictsWith(remStartISO, remEndISO)) {
      const appt: Appointment = {
        id: `a${appointments.length + 1}`,
        studentId: 's1',
        courseId: 'c1',
        start: remStartISO,
        end: remEndISO,
        status: 'confirmed',
        history: [{ at: ago(0.5), note: { en: 'Booked', zh: '已预约' } }],
        createdAt: ago(0.5),
      }
      appointments.push(appt)
      reminderAppt = appt
    }
  }

  // --- Notifications (~8) ---
  const notifications: Notification[] = []

  const pushNotification = (
    role: Notification['role'],
    recipientId: string,
    type: Notification['type'],
    title: { en: string; zh: string },
    body: { en: string; zh: string },
    atISO: string,
    read = false,
    paymentId?: string,
  ): void => {
    notifications.push({ id: `n${notifications.length + 1}`, role, recipientId, type, title, body, read, at: atISO, paymentId })
  }

  const courseOf = (courseId: string): Course => courses.find((c) => c.id === courseId)!
  const studentOf = (studentId: string): Student => students.find((s) => s.id === studentId)!
  const apptLine = (a: Appointment): { en: string; zh: string } => {
    const start = fromLocalISO(a.start)
    return {
      en: `${courseOf(a.courseId).name.en} · ${formatDateEn(start)} ${formatHM(start)}`,
      zh: `${courseOf(a.courseId).name.zh} · ${formatDateZh(start)} ${formatHM(start)}`,
    }
  }

  // The specs loop above always places appointments; the fallback keeps the
  // notification section total even if a slot had to be skipped.
  const firstAppt = appointments[0]!
  const a1 = appointments.find((a) => a.id === 'a1') ?? firstAppt
  const a2 = appointments.find((a) => a.id === 'a2') ?? firstAppt
  const a4 = appointments.find((a) => a.id === 'a4') ?? firstAppt
  const a6 = appointments.find((a) => a.id === 'a6') ?? firstAppt
  const a8 = appointments.find((a) => a.id === 'a8') ?? firstAppt
  const closedDayAppt =
    appointments.find(
      (a) => a.studentId === 's5' && a.status === 'cancelled' && dateKey(fromLocalISO(a.start)) === exceptions[0].date,
    ) ?? firstAppt

  pushNotification(
    'student',
    's1',
    'booking_confirmed',
    { en: 'Lesson confirmed', zh: '课程已确认' },
    { en: `Your ${apptLine(a1).en} lesson is confirmed. See you there!`, zh: `您的${apptLine(a1).zh}课程已确认，到时见！` },
    ago(1),
  )
  pushNotification(
    'instructor',
    'instructor',
    'new_booking',
    { en: 'New booking', zh: '新预约' },
    {
      en: `${studentOf(a2.studentId).name} booked ${courseOf(a2.courseId).name.en} — ${formatDateEn(fromLocalISO(a2.start))} ${formatHM(fromLocalISO(a2.start))}.`,
      zh: `${studentOf(a2.studentId).name} 预约了${courseOf(a2.courseId).name.zh} — ${formatDateZh(fromLocalISO(a2.start))} ${formatHM(fromLocalISO(a2.start))}。`,
    },
    ago(2),
  )
  pushNotification(
    'student',
    's4',
    'booking_rescheduled',
    { en: 'Lesson rescheduled', zh: '课程已改期' },
    {
      en: `Your ${courseOf(a4.courseId).name.en} lesson is now ${formatDateEn(fromLocalISO(a4.start))} at ${formatHM(fromLocalISO(a4.start))}.`,
      zh: `您的${courseOf(a4.courseId).name.zh}课程已改期至 ${formatDateZh(fromLocalISO(a4.start))} ${formatHM(fromLocalISO(a4.start))}。`,
    },
    ago(5),
  )
  pushNotification(
    'student',
    's2',
    'booking_cancelled',
    { en: 'Lesson cancelled', zh: '课程已取消' },
    {
      en: `Your ${courseOf(a8.courseId).name.en} lesson on ${formatDateEn(fromLocalISO(a8.start))} at ${formatHM(fromLocalISO(a8.start))} was cancelled.`,
      zh: `您${formatDateZh(fromLocalISO(a8.start))} ${formatHM(fromLocalISO(a8.start))}的${courseOf(a8.courseId).name.zh}课程已被取消。`,
    },
    ago(26),
  )
  pushNotification(
    'student',
    's5',
    'day_closed',
    { en: 'Day closed — lesson cancelled', zh: '当日休息 — 课程已取消' },
    {
      en: `Your ${courseOf(closedDayAppt.courseId).name.en} lesson on ${formatDateEn(fromLocalISO(closedDayAppt.start))} was cancelled because the day is closed.`,
      zh: `您${formatDateZh(fromLocalISO(closedDayAppt.start))}的${courseOf(closedDayAppt.courseId).name.zh}课程因当日休息已被取消。`,
    },
    ago(3),
  )
  pushNotification(
    'instructor',
    'instructor',
    'booking_cancelled',
    { en: 'Booking cancelled', zh: '预约已取消' },
    {
      en: `${studentOf(a8.studentId).name} cancelled their ${courseOf(a8.courseId).name.en} lesson (${formatDateEn(fromLocalISO(a8.start))} ${formatHM(fromLocalISO(a8.start))}).`,
      zh: `${studentOf(a8.studentId).name} 取消了${courseOf(a8.courseId).name.zh}课程（${formatDateZh(fromLocalISO(a8.start))} ${formatHM(fromLocalISO(a8.start))}）。`,
    },
    ago(25),
    true,
  )
  pushNotification(
    'student',
    's6',
    'booking_confirmed',
    { en: 'Lesson confirmed', zh: '课程已确认' },
    { en: `Your ${apptLine(a6).en} lesson is confirmed. See you there!`, zh: `您的${apptLine(a6).zh}课程已确认，到时见！` },
    ago(30),
    true,
  )
  const reminderTarget = reminderAppt ?? a1
  pushNotification(
    'student',
    's1',
    'reminder_2h',
    { en: 'Reminder: lesson in 2 hours', zh: '提醒：课程将于 2 小时后开始' },
    {
      en: `Your ${courseOf(reminderTarget.courseId).name.en} lesson starts in 2 hours — ${formatDateEn(fromLocalISO(reminderTarget.start))} ${formatHM(fromLocalISO(reminderTarget.start))}.`,
      zh: `您的${courseOf(reminderTarget.courseId).name.zh}课程将在 2 小时后开始 — ${formatDateZh(fromLocalISO(reminderTarget.start))} ${formatHM(fromLocalISO(reminderTarget.start))}。`,
    },
    ago(0.15),
  )

  // 2h reminders at seed time: any confirmed appointment starting within the
  // next two hours (skipping the one already covered by the authored reminder).
  const remindedIds = new Set<string>()
  if (reminderAppt) remindedIds.add(reminderAppt.id)
  for (const a of appointments) {
    if (a.status !== 'confirmed' || remindedIds.has(a.id)) continue
    const st = fromLocalISO(a.start).getTime()
    if (st > now.getTime() && st <= now.getTime() + 2 * 3600000) {
      pushNotification(
        'student',
        a.studentId,
        'reminder_2h',
        { en: 'Reminder: lesson in 2 hours', zh: '提醒：课程将于 2 小时后开始' },
        {
          en: `Your ${courseOf(a.courseId).name.en} lesson starts in 2 hours — ${formatDateEn(fromLocalISO(a.start))} ${formatHM(fromLocalISO(a.start))}.`,
          zh: `您的${courseOf(a.courseId).name.zh}课程将在 2 小时后开始 — ${formatDateZh(fromLocalISO(a.start))} ${formatHM(fromLocalISO(a.start))}。`,
        },
        toLocalISO(now),
      )
    }
  }

  // --- Payments: every seeded appointment implies a confirmed course purchase ---
  const payments: Payment[] = []
  const purchasedPairs = new Set<string>()
  for (const a of appointments) {
    const key = `${a.studentId}:${a.courseId}`
    if (purchasedPairs.has(key)) continue
    purchasedPairs.add(key)
    const course = courses.find((c) => c.id === a.courseId)
    payments.push({
      id: `p${payments.length + 1}`,
      studentId: a.studentId,
      courseId: a.courseId,
      method: a.studentId === 's1' || a.studentId === 's4' || a.studentId === 's6' ? 'emt' : 'cash',
      amount: course ? course.price : 0,
      status: 'confirmed',
      createdAt: a.createdAt,
      confirmedAt: a.createdAt,
    })
  }

  // Demo purchase: Omar asks to pay CASH for G1 Learner Practice —
  // pending until the instructor confirms it from the notification / payments page.
  payments.push({
    id: 'p-pending',
    studentId: 's4',
    courseId: 'c1',
    method: 'cash',
    amount: courses.find((c) => c.id === 'c1')?.price ?? 0,
    status: 'pending',
    createdAt: ago(1),
  })
  pushNotification(
    'instructor',
    'instructor',
    'payment_pending',
    { en: 'New payment awaiting confirmation', zh: '新支付待确认' },
    {
      en: 'Omar Hassan requested to pay CASH for G1 Learner Practice ($60). Open to confirm.',
      zh: 'Omar Hassan 要求以现金支付 G1 基础练习（60 加元）。点击查看并确认收款。',
    },
    ago(1),
    false,
    'p-pending',
  )
  pushNotification(
    'student',
    's4',
    'payment_pending',
    { en: 'Payment submitted', zh: '支付已提交' },
    { en: 'Your G1 Learner Practice payment (Cash) awaits instructor confirmation.', zh: '您对 G1 基础练习的支付（现金）等待教练确认。' },
    ago(1),
    false,
    'p-pending',
  )

  return {
    instructor,
    weeklyRules,
    exceptions,
    courses,
    vehicles,
    students,
    appointments,
    notifications,
    payments,
    videos: [],
  }
}
