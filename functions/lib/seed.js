// EZDRIVES — seed generator (Pages Functions)
// Mirrors the frontend seed: deterministic business data relative to "today"
// + demo accounts. Used by POST /api/setup to initialize a fresh D1 database.

// --- time helpers (local, ISO 'YYYY-MM-DDTHH:mm:ss') ---
function pad(n) { return String(n).padStart(2, '0') }
function toLocalISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0) }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds(), 0) }
function addMinutes(d, n) { return new Date(d.getTime() + n * 60000) }
function fromLocalISO(iso) {
  const [date, time = '00:00:00'] = iso.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm, ss] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, ss)
}
function fmtHM(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_ZH = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
function fmtDateEn(d) { return `${MONTHS_EN[d.getMonth()]} ${d.getDate()}` }
function fmtDateZh(d) { return `${d.getMonth() + 1}月${d.getDate()}日` }

export function seedState() {
  const today = startOfDay(new Date())
  const now = new Date()
  const at = (days, hour, minute = 0) =>
    toLocalISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + days, hour, minute, 0))
  const ago = (hours) => toLocalISO(new Date(now.getTime() - hours * 3600000))

  const instructor = {
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

  const students = [
    { id: 's1', name: 'Aisha Khan', phone: '+1 416-555-0131', address: '88 King St W, Toronto, ON', registeredAt: at(-40, 10), avatarColor: '#3B82F6', email: 'aisha.khan@example.ca' },
    { id: 's2', name: 'Liam Chen', phone: '+1 647-555-0148', address: '4200 Yonge St, North York, ON', registeredAt: at(-25, 9), avatarColor: '#F59E0B' },
    { id: 's3', name: 'Yuki Tanaka', phone: '+1 905-555-0167', address: '505 Hwy 7, Vaughan, ON', registeredAt: at(-18, 14), avatarColor: '#8B5CF6', email: 'yuki.tanaka@example.ca' },
    { id: 's4', name: 'Omar Hassan', phone: '+1 416-555-0189', address: '3660 Midland Ave, Scarborough, ON', registeredAt: at(-12, 11), avatarColor: '#EC4899' },
    { id: 's5', name: 'Emma Wilson', phone: '+1 289-555-0125', address: '180 Borough Dr, Scarborough, ON', registeredAt: at(-6, 16), avatarColor: '#14B8A6' },
    { id: 's6', name: 'Priya Patel', phone: '+1 647-555-0173', address: '700 Burnhamthorpe Rd, Mississauga, ON', registeredAt: at(-2, 13), avatarColor: '#F97316' },
  ]

  const courses = [
    { id: 'c1', type: 'single', name: { en: 'G1 Learner Practice', zh: 'G1 基础练习' }, description: { en: 'Fundamentals of the road: steering, braking, mirrors and safe habits for new drivers.', zh: '道路基础技能：转向、刹车、后视镜使用以及新手安全驾驶习惯。' }, price: 60, durationMin: 60, active: true },
    { id: 'c2', type: 'package', name: { en: 'G2 Road Test Prep (10-lesson package)', zh: 'G2 路考强化（10 课时套餐）' }, description: { en: 'A complete 10-lesson package covering every G2 road-test skill — park, turns, lanes and two mock tests.', zh: '覆盖 G2 路考全部技能的 10 课时完整套餐——停车、转弯、变道及两次模拟考试。' }, price: 500, durationMin: 60, active: true,
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
      ] },
    { id: 'c3', type: 'single', name: { en: 'Highway Driving', zh: '高速驾驶' }, description: { en: 'Merging, lane changes and highway confidence at speed, including 400-series routes.', zh: '并线、变道与高速驾驶信心训练，包含 400 系列高速路线。' }, price: 75, durationMin: 120, active: true },
    { id: 'c4', type: 'single', name: { en: 'Parking & Maneuvering', zh: '停车与操控' }, description: { en: 'Parallel, reverse and forward parking plus three-point turns — the skills exams love.', zh: '侧方停车、倒车入库与正向停车，以及三点掉头——考试最爱的技能。' }, price: 60, durationMin: 60, active: true },
    { id: 'c5', type: 'single', name: { en: 'Defensive Driving', zh: '防御性驾驶' }, description: { en: 'Hazard awareness, safe following distance and smart decisions in real traffic.', zh: '危险预判、安全车距以及在真实交通中的明智决策。' }, price: 85, durationMin: 120, active: true },
    { id: 'c6', type: 'single', name: { en: 'Exam Car Rental (G2/G Road Test)', zh: '考试用车（G2/G 路考）' }, description: { en: 'Use our insured dual-control exam car for your G2/G road test, with a quick pre-test warm-up included.', zh: '路考当天使用我们的投保双控考试用车参加 G2/G 路考，含考前热身练习。' }, price: 90, durationMin: 60, active: true, examCar: true },
  ]

  const vehicles = [
    { id: 'v1', make: 'Tesla', model: 'Model 3 2019', plate: 'TESLA 3', color: { en: 'Red', zh: '红色' }, photoUrl: null, active: true },
    { id: 'v2', make: 'Honda', model: 'Civic 2023', plate: 'ABCD 123', color: { en: 'White', zh: '白色' }, photoUrl: null, active: true },
    { id: 'v3', make: 'Toyota', model: 'Corolla 2022', plate: 'WXYZ 456', color: { en: 'Grey', zh: '灰色' }, photoUrl: null, active: true },
  ]

  const weeklyRules = [
    { weekday: 1, startMin: 540, endMin: 1080 },
    { weekday: 2, startMin: 540, endMin: 1080 },
    { weekday: 3, startMin: 540, endMin: 1080 },
    { weekday: 4, startMin: 540, endMin: 1080 },
    { weekday: 5, startMin: 540, endMin: 1080 },
    { weekday: 6, startMin: 600, endMin: 840 },
  ]

  const nextBookableDay = (fromOffset) => {
    let offset = fromOffset
    while (addDays(today, offset).getDay() === 0) offset += 1
    return offset
  }
  const closedOffset = nextBookableDay(3)
  const overrideOffset = nextBookableDay(7)
  const exceptions = [
    { date: dateKey(addDays(today, closedOffset)), closed: true, note: { en: 'Instructor away — family day', zh: '教练休假 — 家庭日' } },
    { date: dateKey(addDays(today, overrideOffset)), closed: false, startMin: 840, endMin: 1020, note: { en: 'Half day — vehicle inspection', zh: '半天营业 — 车辆检测' } },
  ]

  // effective interval for a day (mirrors timeEngine.getEffectiveInterval)
  function getEffectiveInterval(d) {
    const key = dateKey(d)
    const ex = exceptions.find((e) => e.date === key)
    if (ex && ex.closed) return null
    if (ex) return { startMin: ex.startMin, endMin: ex.endMin }
    const rule = weeklyRules.find((r) => r.weekday === d.getDay())
    if (!rule) return null
    return { startMin: rule.startMin, endMin: rule.endMin }
  }

  const specs = [
    { studentId: 's1', courseId: 'c1', days: 1, startMin: 540 },
    { studentId: 's2', courseId: 'c2', days: 1, startMin: 840, lessonIndex: 0 },
    { studentId: 's3', courseId: 'c4', days: 2, startMin: 600, status: 'pending' },
    { studentId: 's4', courseId: 'c3', days: 2, startMin: 900, history: [
      { at: ago(30), note: { en: 'Booked', zh: '已预约' } },
      { at: ago(26), note: { en: 'Rescheduled', zh: '已改期' } },
    ] },
    { studentId: 's5', courseId: 'c1', days: 4, startMin: 540 },
    { studentId: 's6', courseId: 'c5', days: 4, startMin: 840 },
    { studentId: 's2', courseId: 'c4', days: 6, startMin: 600, status: 'cancelled', history: [
      { at: ago(50), note: { en: 'Booked', zh: '已预约' } },
      { at: ago(45), note: { en: 'Cancelled', zh: '已取消' } },
    ] },
    { studentId: 's3', courseId: 'c1', days: 8, startMin: 660 },
    { studentId: 's4', courseId: 'c5', days: 8, startMin: 840 },
    { studentId: 's5', courseId: 'c3', days: 10, startMin: 540, status: 'pending' },
    { studentId: 's6', courseId: 'c2', days: 11, startMin: 900, lessonIndex: 1 },
  ]

  const appointments = []
  const conflictsWith = (sISO, eISO) => {
    const s = fromLocalISO(sISO).getTime()
    const e = fromLocalISO(eISO).getTime()
    return appointments.some((a) => {
      if (a.status !== 'confirmed' && a.status !== 'pending') return false
      const aS = fromLocalISO(a.start).getTime()
      const aE = fromLocalISO(a.end).getTime()
      return s < aE && e > aS
    })
  }
  const durationOf = (courseId) => {
    const c = courses.find((x) => x.id === courseId)
    return c ? (c.type === 'package' ? 60 : c.durationMin) : 60
  }
  const packageLessonPrice = (courseId, lessonIndex) => {
    const c = courses.find((x) => x.id === courseId)
    if (!c) return 0
    if (c.type === 'package' && lessonIndex !== undefined) return c.lessons?.[lessonIndex]?.price ?? c.price
    return c.price
  }
  const place = (spec, forceOnClosedDay = false) => {
    let d = addDays(today, spec.days)
    if (d.getDay() === 0) d = addDays(d, 1)
    const duration = durationOf(spec.courseId)
    let startMin = spec.startMin
    const interval = getEffectiveInterval(d)
    if (interval) {
      if (startMin < interval.startMin) startMin = interval.startMin
      if (startMin + duration > interval.endMin) startMin = interval.endMin - duration
      if (startMin < interval.startMin) return null
      let guard = 0
      while (startMin + duration <= interval.endMin && conflictsWith(toLocalISO(addMinutes(startOfDay(d), startMin)), toLocalISO(addMinutes(startOfDay(d), startMin + duration))) && guard < 8) {
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
    const history = spec.history ?? [{ at: createdAt, note: { en: 'Booked', zh: '已预约' } }]
    const appointment = {
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
  place({ studentId: 's5', courseId: 'c1', days: closedOffset, startMin: 600, status: 'cancelled', history: [
    { at: ago(28), note: { en: 'Booked', zh: '已预约' } },
    { at: ago(20), note: { en: 'Cancelled — day closed', zh: '已取消 — 当日休息' } },
  ] }, true)
  place({ studentId: 's6', courseId: 'c2', days: overrideOffset, startMin: 900, lessonIndex: 2 })

  // notifications
  const notifications = []
  const pushNotification = (role, recipientId, type, title, body, atISO, read = false, paymentId) => {
    notifications.push({ id: `n${notifications.length + 1}`, role, recipientId, type, title, body, read, at: atISO, paymentId })
  }
  const courseOf = (courseId) => courses.find((c) => c.id === courseId)
  const studentOf = (studentId) => students.find((s) => s.id === studentId)
  const apptLine = (a) => {
    const st = fromLocalISO(a.start)
    return { en: `${courseOf(a.courseId).name.en} · ${fmtDateEn(st)} ${fmtHM(st)}`, zh: `${courseOf(a.courseId).name.zh} · ${fmtDateZh(st)} ${fmtHM(st)}` }
  }
  const firstAppt = appointments[0]
  const a1 = appointments.find((a) => a.id === 'a1') ?? firstAppt
  const a2 = appointments.find((a) => a.id === 'a2') ?? firstAppt
  const a4 = appointments.find((a) => a.id === 'a4') ?? firstAppt
  const a6 = appointments.find((a) => a.id === 'a6') ?? firstAppt
  const a8 = appointments.find((a) => a.id === 'a8') ?? firstAppt
  const closedDayAppt = appointments.find((a) => a.studentId === 's5' && a.status === 'cancelled' && dateKey(fromLocalISO(a.start)) === exceptions[0].date) ?? firstAppt

  pushNotification('student', 's1', 'booking_confirmed', { en: 'Lesson confirmed', zh: '课程已确认' }, { en: `Your ${apptLine(a1).en} lesson is confirmed. See you there!`, zh: `您的${apptLine(a1).zh}课程已确认，到时见！` }, ago(1))
  pushNotification('instructor', 'instructor', 'new_booking', { en: 'New booking', zh: '新预约' }, { en: `${studentOf(a2.studentId).name} booked ${courseOf(a2.courseId).name.en} — ${fmtDateEn(fromLocalISO(a2.start))} ${fmtHM(fromLocalISO(a2.start))}.`, zh: `${studentOf(a2.studentId).name} 预约了${courseOf(a2.courseId).name.zh} — ${fmtDateZh(fromLocalISO(a2.start))} ${fmtHM(fromLocalISO(a2.start))}。` }, ago(2))
  pushNotification('student', 's4', 'booking_rescheduled', { en: 'Lesson rescheduled', zh: '课程已改期' }, { en: `Your ${courseOf(a4.courseId).name.en} lesson is now ${fmtDateEn(fromLocalISO(a4.start))} at ${fmtHM(fromLocalISO(a4.start))}.`, zh: `您的${courseOf(a4.courseId).name.zh}课程已改期至 ${fmtDateZh(fromLocalISO(a4.start))} ${fmtHM(fromLocalISO(a4.start))}。` }, ago(5))
  pushNotification('student', 's2', 'booking_cancelled', { en: 'Lesson cancelled', zh: '课程已取消' }, { en: `Your ${courseOf(a8.courseId).name.en} lesson on ${fmtDateEn(fromLocalISO(a8.start))} at ${fmtHM(fromLocalISO(a8.start))} was cancelled.`, zh: `您${fmtDateZh(fromLocalISO(a8.start))} ${fmtHM(fromLocalISO(a8.start))}的${courseOf(a8.courseId).name.zh}课程已被取消。` }, ago(26))
  pushNotification('student', 's5', 'day_closed', { en: 'Day closed — lesson cancelled', zh: '当日休息 — 课程已取消' }, { en: `Your ${courseOf(closedDayAppt.courseId).name.en} lesson on ${fmtDateEn(fromLocalISO(closedDayAppt.start))} was cancelled because the day is closed.`, zh: `您${fmtDateZh(fromLocalISO(closedDayAppt.start))}的${courseOf(closedDayAppt.courseId).name.zh}课程因当日休息已被取消。` }, ago(3))
  pushNotification('instructor', 'instructor', 'booking_cancelled', { en: 'Booking cancelled', zh: '预约已取消' }, { en: `${studentOf(a8.studentId).name} cancelled their ${courseOf(a8.courseId).name.en} lesson (${fmtDateEn(fromLocalISO(a8.start))} ${fmtHM(fromLocalISO(a8.start))}).`, zh: `${studentOf(a8.studentId).name} 取消了${courseOf(a8.courseId).name.zh}课程（${fmtDateZh(fromLocalISO(a8.start))} ${fmtHM(fromLocalISO(a8.start))}）。` }, ago(25), true)
  pushNotification('student', 's6', 'booking_confirmed', { en: 'Lesson confirmed', zh: '课程已确认' }, { en: `Your ${apptLine(a6).en} lesson is confirmed. See you there!`, zh: `您的${apptLine(a6).zh}课程已确认，到时见！` }, ago(30), true)

  // payments (confirmed purchases from appointments)
  const payments = []
  const purchasedPairs = new Set()
  for (const a of appointments) {
    const key = `${a.studentId}:${a.courseId}`
    if (purchasedPairs.has(key)) continue
    purchasedPairs.add(key)
    const course = courseOf(a.courseId)
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
  payments.push({
    id: 'p-pending',
    studentId: 's4',
    courseId: 'c1',
    method: 'cash',
    amount: courseOf('c1')?.price ?? 0,
    status: 'pending',
    createdAt: ago(1),
  })
  pushNotification('instructor', 'instructor', 'payment_pending', { en: 'New payment awaiting confirmation', zh: '新支付待确认' }, { en: 'Omar Hassan requested to pay CASH for G1 Learner Practice ($60). Open to confirm.', zh: 'Omar Hassan 要求以现金支付 G1 基础练习（60 加元）。点击查看并确认收款。' }, ago(1), false, 'p-pending')
  pushNotification('student', 's4', 'payment_pending', { en: 'Payment submitted', zh: '支付已提交' }, { en: 'Your G1 Learner Practice payment (Cash) awaits instructor confirmation.', zh: '您对 G1 基础练习的支付（现金）等待教练确认。' }, ago(1), false, 'p-pending')

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
