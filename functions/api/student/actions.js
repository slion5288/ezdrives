// POST /api/student/actions — student & instructor mutations, validated
// server-side: purchase gate, time conflicts, open-hours, ownership.
import { json, fail, readJson } from '../../lib/util.js'
import { authUser } from '../../lib/auth.js'
import { readFullState, studentView } from '../../lib/db.js'

function pad2(n) { return String(n).padStart(2, '0') }
function toLocalISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}
const nowISO = () => toLocalISO(new Date())

function pad(n) { return String(n).padStart(2, '0') }
function dateKeyOf(iso) { return iso.slice(0, 10) }
function fromLocal(iso) {
  const [date, time = '00:00:00'] = iso.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm, ss] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, ss)
}

/**
 * Whether [start,end) collides with any live appointment, honoring the
 * instructor's break: another student may not start until `breakMin` after a
 * lesson ends. The SAME student may chain lessons back-to-back (start == their
 * own previous lesson end).
 */
function conflicts(appointments, startISO, endISO, exceptId, breakMin, sameStudentId) {
  const s = fromLocal(startISO).getTime()
  const e = fromLocal(endISO).getTime()
  const br = Math.max(0, Number(breakMin) || 0) * 60000
  for (const a of appointments) {
    if (a.status !== 'confirmed' && a.status !== 'pending') continue
    if (a.id === exceptId) continue
    const aS = fromLocal(a.start).getTime()
    const aE = fromLocal(a.end).getTime()
    const isSame = sameStudentId && a.studentId === sameStudentId
    const effEnd = isSame ? aE : aE + br
    if (s < effEnd && e > aS) return true
  }
  return false
}

/**
 * "Is this start time in the past?" — the client sends its own local clock
 * (`clientNow`, local ISO) so wall-clock comparisons happen in the SAME space
 * as the stored local times (the server itself is UTC and must not compare
 * parsed-local-as-UTC against Date.now()).
 */
function isPast(startISO, clientNow) {
  const ref =
    clientNow && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(clientNow)
      ? fromLocal(clientNow).getTime()
      : Date.now()
  return fromLocal(startISO).getTime() < ref - 60000
}

function effectiveInterval(dateISO, rules, exceptions) {
  const ex = exceptions.find((x) => x.date === dateKeyOf(dateISO))
  if (ex && ex.closed) return null
  if (ex) return { startMin: ex.startMin, endMin: ex.endMin }
  const dow = fromLocal(dateISO).getDay()
  const rule = rules.find((r) => r.weekday === dow)
  if (!rule) return null
  return { startMin: rule.startMin, endMin: rule.endMin }
}

function minuteOf(iso) {
  const d = fromLocal(iso)
  return d.getHours() * 60 + d.getMinutes()
}

function isPurchased(payments, studentId, courseId) {
  return payments.some((p) => p.studentId === studentId && p.courseId === courseId && p.status === 'confirmed')
}

function hasPending(payments, studentId, courseId) {
  return payments.some((p) => p.studentId === studentId && p.courseId === courseId && p.status === 'pending')
}

/** All payment methods a student may choose (instructor's enabled list). */
function allowedMethods(instructor) {
  const list = instructor && instructor.paymentMethods
  if (!list || list.length === 0) return ['cash', 'wechat', 'emt', 'applepay', 'googlepay', 'card', 'debit', 'paypal']
  return ['cash', 'wechat', 'emt', 'applepay', 'googlepay', 'card', 'debit', 'paypal'].filter((m) => list.includes(m))
}

async function nextSeq(env, table, prefix, count = 1) {
  const row = await env.DB.prepare(`SELECT id FROM ${table} ORDER BY CAST(SUBSTR(id, ${prefix.length + 1}) AS INTEGER) DESC LIMIT 1`).first()
  const max = row ? Number(row.id.slice(prefix.length)) : 0
  return Array.from({ length: count }, (_, i) => prefix + (max + 1 + i))
}

/**
 * Atomic per-slot conflict guard. The INSERT only succeeds when no live
 * appointment overlaps [start,end) (break-aware; same student exempt from the
 * break). Used as the final backstop against concurrent double-booking — the
 * JS `conflicts()` check above gives the friendly error in the normal case.
 */
function guardedAppointmentInsert(env, appt, breakMin) {
  const br = Math.max(0, Number(breakMin) || 0)
  return env.DB.prepare(
    `INSERT INTO appointments (id, student_id, start_iso, end_iso, status, payload)
     SELECT ?1, ?2, ?3, ?4, ?5, ?6
     WHERE NOT EXISTS (
       SELECT 1 FROM appointments a
       WHERE a.status IN ('confirmed','pending')
         AND a.id <> ?7
         AND (
           (a.student_id = ?8 AND ?3 < a.end_iso AND ?4 > a.start_iso)
           OR (a.student_id <> ?8 AND ?3 < strftime('%Y-%m-%dT%H:%M:%S', a.end_iso, printf('+%d minutes', ?9)) AND ?4 > a.start_iso)
         )
     )`,
  ).bind(appt.id, appt.studentId, appt.start, appt.end, appt.status, JSON.stringify(appt), appt.id, appt.studentId, br)
}

/** Best-effort booking email (student or instructor). Never throws. */
async function bestEffortEmail(env, state, type, student, instructor, appt, course, status) {
  try {
    const { sendNotification } = await import('../../lib/notification.js')
    const d = fromLocal(appt.start)
    const booking = {
      id: appt.id,
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      status,
      location: (student && student.address) || '',
    }
    const courseInfo = { name: course ? course.name.en : '' }
    const stInfo = student
      ? { id: student.id, name: student.name, phone: student.phone, email: student.email || '' }
      : null
    if (type.endsWith('RESCHEDULED') || type === 'BOOKING_CANCELLED') {
      // to the student
      if (stInfo && stInfo.email) {
        await sendNotification(env, { type, recipientEmail: stInfo.email, student: stInfo, instructor, booking, course: courseInfo })
      }
    } else {
      // to the instructor (NEW_BOOKING / INSTRUCTOR_*)
      if (instructor && instructor.email) {
        await sendNotification(env, { type, recipientEmail: instructor.email, student: stInfo, instructor, booking, course: courseInfo })
      }
    }
  } catch (e) {
    // email is best-effort
  }
}

export async function onRequestPost({ env, request }) {
  const user = await authUser(env, request)
  if (!user) return fail('Not authenticated', 401)
  const isInstructor = user.role === 'instructor'

  const studentRow = isInstructor ? null : await env.DB.prepare('SELECT id FROM students WHERE user_id = ?').bind(user.id).first()
  if (!isInstructor && !studentRow) return fail('Student profile not found.', 404)
  const studentId = isInstructor ? '' : studentRow.id

  const body = await readJson(request)
  const action = String(body.action || '')
  const args = body.args || {}
  const state = await readFullState(env)

  // Role-aware reply: instructors get the full state, students get their view.
  const reply = async (extraState) =>
    json({ ok: true, state: isInstructor ? extraState || state : studentView(extraState || state, studentId) })

  // ---- addPayment: student submits a purchase (pending until instructor confirms) ----
  if (action === 'addPayment') {
    if (isInstructor) return fail('Students only.', 403)
    const courseId = String(args.courseId || '')
    const method = String(args.method || 'cash')
    const studentStatus = String(args.studentStatus || 'no') // 'yes' | 'no'
    const referralPhone = String(args.referralPhone || '').trim()
    const course = state.courses.find((c) => c.id === courseId)
    if (!course) return fail('Course not found.')
    if (isPurchased(state.payments, studentId, courseId)) return fail('Course already purchased.')
    if (hasPending(state.payments, studentId, courseId)) return fail('Payment already pending.')
    if (!allowedMethods(state.instructor).includes(method)) return fail('Payment method not available.')

    // ---- Server-side discount & price (§54) ----
    const { computeDiscount } = await import('../../lib/pricing.js')
    const isStudent = studentStatus === 'yes'
    let referral = null
    if (referralPhone && referralPhone !== user.phone) {
      const ref = await env.DB
        .prepare("SELECT id FROM users WHERE phone = ? AND role = 'student'")
        .bind(referralPhone)
        .first()
      referral = ref ? { valid: true, studentId: ref.id, phone: referralPhone } : { valid: false, studentId: null, phone: referralPhone }
    }
    const pricing = computeDiscount(course, { isStudent, referral })

    const [paymentId] = await nextSeq(env, 'payments', 'p')
    const now = nowISO()
    const payment = {
      id: paymentId, studentId, courseId, method,
      amount: pricing.finalPrice, status: 'pending', createdAt: now,
      // price snapshot (§30/§55)
      original_price: pricing.originalPrice,
      discount_type: pricing.discountType,
      discount_source: pricing.discountSource,
      discount_value: pricing.discountValue,
      discount_amount: pricing.discountAmount,
      final_price: pricing.finalPrice,
      currency: 'CAD',
      // referral (§31/§33)
      referrer_student_id: referral && referral.valid ? referral.studentId : undefined,
      referral_phone: referralPhone || undefined,
    }
    const [notifId, notifId2] = await nextSeq(env, 'notifications', 'n', 2)

    // ---- Package: create Enrollment + Lesson Snapshot (§11/§12) ----
    const courseType = course.course_type || (course.examCar ? 'ROAD_TEST_CAR' : course.type === 'package' ? 'TEN_HOUR_PACKAGE' : 'INDIVIDUAL_LESSON')
    const licenseClass = course.license_class || 'NONE'
    let enrollmentId
    let enrollment
    const inserts = [
      env.DB.prepare('INSERT INTO payments (id, student_id, status, payload) VALUES (?, ?, ?, ?)')
        .bind(paymentId, studentId, 'pending', JSON.stringify(payment)),
      env.DB.prepare('INSERT INTO notifications (id, role, recipient_id, payload) VALUES (?, ?, ?, ?)')
        .bind(notifId, 'student', studentId, JSON.stringify({
          id: notifId, role: 'student', recipientId: studentId, type: 'payment_pending',
          title: { en: 'Payment submitted', zh: '支付已提交' },
          body: { en: `Your ${course.name.en} payment ($${pricing.finalPrice}) awaits instructor confirmation.`, zh: `您对${course.name.zh}的支付（${pricing.finalPrice} 加元）等待教练确认。` },
          read: false, at: now, paymentId,
        })),
      env.DB.prepare('INSERT INTO notifications (id, role, recipient_id, payload) VALUES (?, ?, ?, ?)')
        .bind(notifId2, 'instructor', 'instructor', JSON.stringify({
          id: notifId2, role: 'instructor', recipientId: 'instructor', type: 'payment_pending',
          title: { en: 'New payment awaiting confirmation', zh: '新支付待确认' },
          body: { en: `${user.name} requested to pay for ${course.name.en} ($${pricing.finalPrice}). Open to confirm.`, zh: `${user.name} 请求支付${course.name.zh}（${pricing.finalPrice} 加元）。点击查看并确认收款。` },
          read: false, at: now, paymentId,
        })),
    ]

    if (courseType === 'TEN_HOUR_PACKAGE' && Array.isArray(course.lessons)) {
      const [enrollSeq] = await nextSeq(env, 'enrollments', 'e')
      enrollmentId = 'e' + enrollSeq
      enrollment = {
        id: enrollmentId,
        studentId,
        courseId,
        courseName: { en: course.name.en, zh: course.name.zh },
        courseType,
        licenseClass,
        originalPrice: pricing.originalPrice,
        discount: {
          type: pricing.discountType,
          discountType: pricing.discountType === 'NONE' ? 'PERCENTAGE' : pricing.discountSource === 'student' ? course.studentDiscount?.type || 'PERCENTAGE' : course.referralDiscount?.type || 'PERCENTAGE',
          discountValue: pricing.discountValue,
          discountAmount: pricing.discountAmount,
          finalPrice: pricing.finalPrice,
          currency: 'CAD',
        },
        referrer: referral && referral.valid ? { referrerStudentId: referral.studentId, referralPhone } : null,
        lessons: course.lessons.map((l, i) => ({
          sequence_number: (l.sequence_number ?? i + 1),
          name: { en: l.name.en, zh: l.name.zh },
          description: { en: l.description.en, zh: l.description.zh },
          is_free_mock_test: l.is_free_mock_test || i === course.lessons.length, // last lesson (11) is the free mock
          status: 'available',
        })),
        createdAt: now,
        completedLessonCount: 0,
        status: 'active',
      }
      inserts.push(
        env.DB.prepare('INSERT INTO enrollments (id, student_id, course_id, status, payload) VALUES (?, ?, ?, ?, ?)')
          .bind(enrollmentId, studentId, courseId, 'active', JSON.stringify(enrollment)),
      )
      payment.enrollmentId = enrollmentId
    }

    await env.DB.batch(inserts)
    state.payments.push(payment)
    state.notifications.unshift(
      { id: notifId, role: 'student', recipientId: studentId, type: 'payment_pending', title: { en: 'Payment submitted', zh: '支付已提交' }, body: { en: `Your ${course.name.en} payment ($${pricing.finalPrice}) awaits instructor confirmation.`, zh: `您对${course.name.zh}的支付（${pricing.finalPrice} 加元）等待教练确认。` }, read: false, at: now, paymentId },
      { id: notifId2, role: 'instructor', recipientId: 'instructor', type: 'payment_pending', title: { en: 'New payment awaiting confirmation', zh: '新支付待确认' }, body: { en: `${user.name} requested to pay for ${course.name.en} ($${pricing.finalPrice}). Open to confirm.`, zh: `${user.name} 请求支付${course.name.zh}（${pricing.finalPrice} 加元）。点击查看并确认收款。` }, read: false, at: now, paymentId },
    )
    if (enrollment) {
      state.enrollments = state.enrollments || []
      state.enrollments.unshift(enrollment)
    }
    return reply(state)
  }

  // ---- bookAppointment / bookPackageLessons ----
  if (action === 'bookAppointment' || action === 'bookPackageLessons') {
    if (isInstructor) return fail('Students only.', 403)
    const courseId = String(args.courseId || '')
    const startISO = String(args.startISO || '')
    const clientNow = String(args.clientNow || '')
    const course = state.courses.find((c) => c.id === courseId)
    if (!course) return fail('Course not found.')
    if (!isPurchased(state.payments, studentId, courseId)) return fail('not_purchased')

    const isPackage = course.type === 'package'
    const lessonCount = course.lessons ? course.lessons.length : 0
    const count = action === 'bookPackageLessons' ? Math.max(1, Number(args.count) || 1) : 1
    const firstLessonIndex = action === 'bookPackageLessons' ? Number(args.lessonIndex ?? args.firstLessonIndex ?? 0) : undefined
    if (isPackage) {
      if (!Number.isInteger(firstLessonIndex) || firstLessonIndex < 0 || firstLessonIndex >= lessonCount) {
        return fail('Invalid lesson selection.')
      }
      if (firstLessonIndex + count > lessonCount) return fail('Not enough lessons in this package.')
    }

    const durationMin = isPackage ? 60 : course.durationMin
    const lessonPrice = (idx) =>
      isPackage && idx !== undefined ? course.lessons?.[idx]?.price ?? course.price : course.price

    const start = fromLocal(startISO)
    if (isNaN(start.getTime())) return fail('Invalid start time.')
    if (isPast(startISO, clientNow)) return fail('past')

    const interval = effectiveInterval(startISO, state.weeklyRules, state.exceptions)
    if (!interval) return fail('closed')
    const sMin = minuteOf(startISO)
    if (sMin < interval.startMin || sMin + durationMin > interval.endMin) return fail('closed')

    const slots = []
    let cursor = startISO
    for (let i = 0; i < count; i++) {
      const idx = firstLessonIndex !== undefined ? firstLessonIndex + i : undefined
      const dur = durationMin
      const endISO = toLocalISO(new Date(fromLocal(cursor).getTime() + dur * 60000))
      if (conflicts(state.appointments, cursor, endISO, undefined, state.instructor.breakMin, studentId)) return fail('conflict')
      slots.push({ start: cursor, end: endISO, lessonIndex: idx, price: lessonPrice(idx) })
      cursor = endISO
    }

    const created = []
    const inserts = []
    const now = nowISO()
    // §8: mark booked lessons in the enrollment snapshot (booked status).
    const enrollment = (state.enrollments || []).find((e) => e.studentId === studentId && e.courseId === courseId)
    const snapshotUpdates = []
    const apptIds = await nextSeq(env, 'appointments', 'a', slots.length)
    for (let si = 0; si < slots.length; si++) {
      const slot = slots[si]
      const apptId = apptIds[si]
      const lessonSeq = slot.lessonIndex !== undefined ? slot.lessonIndex + 1 : undefined
      const snapTitle = lessonSeq !== undefined && enrollment
        ? enrollment.lessons.find((l) => l.sequence_number === lessonSeq)
        : undefined
      const appt = {
        id: apptId, studentId, courseId, start: slot.start, end: slot.end, status: 'confirmed',
        history: [{ at: now, note: { en: 'Booked', zh: '已预约' } }], createdAt: now,
        lessonIndex: slot.lessonIndex, price: slot.price,
        lessonSequence: lessonSeq,
        lessonTitle: snapTitle ? { en: snapTitle.name.en, zh: snapTitle.name.zh } : undefined,
        courseType: course.course_type || (course.type === 'package' ? 'TEN_HOUR_PACKAGE' : 'INDIVIDUAL_LESSON'),
        licenseClass: course.license_class || 'NONE',
      }
      created.push(appt)
      inserts.push(guardedAppointmentInsert(env, appt, state.instructor.breakMin))
      if (enrollment && lessonSeq) {
        const snap = enrollment.lessons.find((l) => l.sequence_number === lessonSeq)
        if (snap && snap.status === 'available') {
          snap.status = 'booked'
          snapshotUpdates.push(env.DB.prepare('UPDATE enrollments SET payload = ? WHERE id = ?').bind(JSON.stringify(enrollment), enrollment.id))
        }
      }
    }
    if (snapshotUpdates.length > 0) {
      inserts.push(...snapshotUpdates)
    }
    // notifications
    const [nIdS, nIdI] = await nextSeq(env, 'notifications', 'n', 2)
    const courseName = course.name
    const line = (a) => {
      const d = fromLocal(a.start)
      return `${courseName.en} · ${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    const lineZh = (a) => {
      const d = fromLocal(a.start)
      return `${courseName.zh} · ${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    const sTitle = count > 1 ? { en: `${count} lessons booked`, zh: `已预约 ${count} 个课时` } : { en: 'Lesson confirmed', zh: '课程已确认' }
    const first = created[0]
    const sBody = count > 1
      ? { en: `Your ${courseName.en} lessons start ${line(first)}.`, zh: `您的${courseName.zh}课时自 ${lineZh(first)} 开始。` }
      : { en: `Your ${line(first)} lesson is confirmed. See you there!`, zh: `您的${lineZh(first)}课程已确认，到时见！` }
    const iBody = { en: `${user.name} booked ${courseName.en} — ${line(first)}.`, zh: `${user.name} 预约了${courseName.zh} — ${lineZh(first)}。` }
    const nS = { id: nIdS, role: 'student', recipientId: studentId, type: 'booking_confirmed', title: sTitle, body: sBody, read: false, at: now }
    const nI = { id: nIdI, role: 'instructor', recipientId: 'instructor', type: 'new_booking', title: { en: 'New booking', zh: '新预约' }, body: iBody, read: false, at: now }
    inserts.push(
      env.DB.prepare('INSERT INTO notifications (id, role, recipient_id, payload) VALUES (?, ?, ?, ?)').bind(nS.id, nS.role, nS.recipientId, JSON.stringify(nS)),
      env.DB.prepare('INSERT INTO notifications (id, role, recipient_id, payload) VALUES (?, ?, ?, ?)').bind(nI.id, nI.role, nI.recipientId, JSON.stringify(nI)),
    )
    const results = await env.DB.batch(inserts)

    // Atomic guard verification: if any slot lost a race, undo the whole
    // request (appointments + notifications) and report a conflict.
    let insertedAll = true
    for (let i = 0; i < slots.length; i++) {
      if (!results[i] || (results[i].meta && results[i].meta.changes === 0)) insertedAll = false
    }
    if (!insertedAll) {
      await env.DB.batch([
        ...apptIds.map((id) => env.DB.prepare('DELETE FROM appointments WHERE id = ?').bind(id)),
        env.DB.prepare('DELETE FROM notifications WHERE id IN (?, ?)').bind(nIdS, nIdI),
      ])
      return fail('conflict')
    }

    state.appointments.push(...created)
    state.notifications.unshift(nS, nI)

    // Best-effort email notifications (never fail the booking on email errors).
    try {
      const { sendNotification } = await import('../../lib/notification.js')
      const studentRow = state.students.find((s) => s.id === studentId)
      const stEmail = (studentRow && studentRow.email) || user.email
      const d0 = fromLocal(first.start)
      const booking = {
        id: first.id,
        date: `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate())}`,
        time: `${pad(d0.getHours())}:${pad(d0.getMinutes())}`,
        status: 'confirmed',
        location: (studentRow && studentRow.address) || user.address || '',
      }
      const studentInfo = { id: studentId, name: user.name, phone: user.phone, email: stEmail || '' }
      const courseInfo = { name: courseName.en, price: first.price }
      if (stEmail) {
        await sendNotification(env, { type: 'BOOKING_CONFIRMED', recipientEmail: stEmail, student: studentInfo, instructor: state.instructor, booking, course: courseInfo })
      }
      if (state.instructor && state.instructor.email) {
        await sendNotification(env, { type: 'NEW_BOOKING', recipientEmail: state.instructor.email, student: studentInfo, instructor: state.instructor, booking, course: courseInfo })
      }
    } catch (e) {
      // email is best-effort
    }

    return reply(state)
  }

  // ---- cancelAppointment (student: own; instructor: any) ----
  if (action === 'cancelAppointment') {
    const apptId = String(args.id || '')
    const appt = state.appointments.find((a) => (isInstructor ? a.id === apptId : a.id === apptId && a.studentId === studentId))
    if (!appt) return fail('Appointment not found.')
    const now = nowISO()
    const updated = {
      ...appt, status: 'cancelled',
      history: [...(appt.history || []), { at: now, note: { en: 'Cancelled', zh: '已取消' } }],
    }
    const [nId] = await nextSeq(env, 'notifications', 'n')
    const course = state.courses.find((c) => c.id === appt.courseId)
    const d = fromLocal(appt.start)
    const when = `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    // §62: cancelled booking → lesson returns to 'available' (never completed).
    const restoreStmts = []
    const enrollment = (state.enrollments || []).find((e) => e.studentId === appt.studentId && e.courseId === appt.courseId)
    if (enrollment && appt.lessonSequence) {
      const snap = enrollment.lessons.find((l) => l.sequence_number === appt.lessonSequence)
      if (snap && snap.status === 'booked') {
        snap.status = 'available'
        restoreStmts.push(
          env.DB.prepare('UPDATE enrollments SET payload = ? WHERE id = ?').bind(JSON.stringify(enrollment), enrollment.id),
        )
      }
    }
    const notifs = []
    if (isInstructor) {
      const student = state.students.find((s) => s.id === appt.studentId)
      notifs.push(env.DB.prepare('INSERT INTO notifications (id, role, recipient_id, payload) VALUES (?, ?, ?, ?)')
        .bind(nId, 'student', appt.studentId, JSON.stringify({
          id: nId, role: 'student', recipientId: appt.studentId, type: 'booking_cancelled',
          title: { en: 'Lesson cancelled', zh: '课程已取消' },
          body: { en: `Your ${course ? course.name.en : ''} lesson on ${when} was cancelled.`, zh: `您${when}的${course ? course.name.zh : ''}课程已被取消。` },
          read: false, at: now,
        })))
      await env.DB.batch([
        env.DB.prepare('UPDATE appointments SET status = ?, payload = ? WHERE id = ?').bind('cancelled', JSON.stringify(updated), apptId),
        ...notifs,
        ...restoreStmts,
      ])
      state.appointments = state.appointments.map((a) => (a.id === apptId ? updated : a))
      state.notifications.unshift({ id: nId, role: 'student', recipientId: appt.studentId, type: 'booking_cancelled', title: { en: 'Lesson cancelled', zh: '课程已取消' }, body: { en: `Your ${course ? course.name.en : ''} lesson on ${when} was cancelled.`, zh: `您${when}的${course ? course.name.zh : ''}课程已被取消。` }, read: false, at: now })
      await bestEffortEmail(env, state, 'BOOKING_CANCELLED', student, state.instructor, appt, course, 'cancelled')
      return reply(state)
    }
    notifs.push(env.DB.prepare('INSERT INTO notifications (id, role, recipient_id, payload) VALUES (?, ?, ?, ?)')
      .bind(nId, 'instructor', 'instructor', JSON.stringify({
        id: nId, role: 'instructor', recipientId: 'instructor', type: 'booking_cancelled',
        title: { en: 'Booking cancelled', zh: '预约已取消' },
        body: { en: `${user.name} cancelled their ${course ? course.name.en : ''} lesson (${when}).`, zh: `${user.name} 取消了${course ? course.name.zh : ''}课程（${when}）。` },
        read: false, at: now,
      })))
    await env.DB.batch([
      env.DB.prepare('UPDATE appointments SET status = ?, payload = ? WHERE id = ?').bind('cancelled', JSON.stringify(updated), apptId),
      ...notifs,
      ...restoreStmts,
    ])
    state.appointments = state.appointments.map((a) => (a.id === apptId ? updated : a))
    state.notifications.unshift({ id: nId, role: 'instructor', recipientId: 'instructor', type: 'booking_cancelled', title: { en: 'Booking cancelled', zh: '预约已取消' }, body: { en: `${user.name} cancelled their ${course ? course.name.en : ''} lesson (${when}).`, zh: `${user.name} 取消了${course ? course.name.zh : ''}课程（${when}）。` }, read: false, at: now })
    const cancStudent = state.students.find((s) => s.id === appt.studentId)
    await bestEffortEmail(env, state, 'INSTRUCTOR_BOOKING_CANCELLED', cancStudent, state.instructor, appt, course, 'cancelled')
    return reply(state)
  }

  // ---- completeLesson (instructor only, §61: lesson completes only here) ----
  if (action === 'completeLesson') {
    if (!isInstructor) return fail('Instructor only.', 403)
    const apptId = String(args.id || '')
    const appt = state.appointments.find((a) => a.id === apptId)
    if (!appt) return fail('Appointment not found.')
    const enrollment = (state.enrollments || []).find((e) => e.studentId === appt.studentId && e.courseId === appt.courseId)
    if (!enrollment || !appt.lessonSequence) return fail('Not a package lesson.')
    const now = nowISO()
    const snap = enrollment.lessons.find((l) => l.sequence_number === appt.lessonSequence)
    if (!snap) return fail('Lesson snapshot not found.')
    if (snap.status === 'completed') return reply(state) // idempotent
    snap.status = 'completed'
    enrollment.completedLessonCount = (enrollment.completedLessonCount || 0) + 1
    const updated = {
      ...appt,
      lessonCompletion: { confirmedByInstructor: true, confirmedAt: now },
      history: [...(appt.history || []), { at: now, note: { en: 'Lesson completed', zh: '课时已完成' } }],
    }
    const [nId] = await nextSeq(env, 'notifications', 'n')
    await env.DB.batch([
      env.DB.prepare('UPDATE enrollments SET payload = ? WHERE id = ?').bind(JSON.stringify(enrollment), enrollment.id),
      env.DB.prepare('UPDATE appointments SET payload = ? WHERE id = ?').bind(JSON.stringify(updated), apptId),
      env.DB.prepare('INSERT INTO notifications (id, role, recipient_id, payload) VALUES (?, ?, ?, ?)')
        .bind(nId, 'student', appt.studentId, JSON.stringify({
          id: nId, role: 'student', recipientId: appt.studentId, type: 'booking_confirmed',
          title: { en: 'Lesson completed', zh: '课时已完成' },
          body: { en: `Lesson ${appt.lessonSequence} (${snap.name.en}) is complete.`, zh: `第 ${appt.lessonSequence} 课（${snap.name.zh}）已完成。` },
          read: false, at: now,
        })),
    ])
    state.enrollments = state.enrollments.map((e) => (e.id === enrollment.id ? enrollment : e))
    state.appointments = state.appointments.map((a) => (a.id === apptId ? updated : a))
    state.notifications.unshift({ id: nId, role: 'student', recipientId: appt.studentId, type: 'booking_confirmed', title: { en: 'Lesson completed', zh: '课时已完成' }, body: { en: `Lesson ${appt.lessonSequence} (${snap.name.en}) is complete.`, zh: `第 ${appt.lessonSequence} 课（${snap.name.zh}）已完成。` }, read: false, at: now })
    return reply(state)
  }

  // ---- rescheduleAppointment (student: own; instructor: any) ----
  if (action === 'rescheduleAppointment') {
    const apptId = String(args.id || '')
    const newStartISO = String(args.newStartISO || '')
    const clientNow = String(args.clientNow || '')
    const appt = state.appointments.find((a) => (isInstructor ? a.id === apptId : a.id === apptId && a.studentId === studentId))
    if (!appt) return fail('Appointment not found.')
    if (appt.status !== 'confirmed' && appt.status !== 'pending') return fail('Only live appointments can be rescheduled.')
    const course = state.courses.find((c) => c.id === appt.courseId)
    const durMin = course ? (course.type === 'package' ? 60 : course.durationMin) : 60
    const start = fromLocal(newStartISO)
    if (isNaN(start.getTime())) return fail('Invalid start time.')
    if (isPast(newStartISO, clientNow)) return fail('past')
    const interval = effectiveInterval(newStartISO, state.weeklyRules, state.exceptions)
    if (!interval) return fail('closed')
    if (minuteOf(newStartISO) < interval.startMin || minuteOf(newStartISO) + durMin > interval.endMin) return fail('closed')
    const endISO = toLocalISO(new Date(start.getTime() + durMin * 60000))
    if (conflicts(state.appointments, newStartISO, endISO, apptId, state.instructor.breakMin, appt.studentId)) return fail('conflict')

    const now = nowISO()
    const updated = {
      ...appt, start: newStartISO, end: endISO, status: appt.status,
      history: [...(appt.history || []), { at: now, note: { en: 'Rescheduled', zh: '已改期' } }],
    }
    const [nIdS, nIdI] = await nextSeq(env, 'notifications', 'n', 2)
    const d = fromLocal(newStartISO)
    const when = `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    const courseNameEn = course ? course.name.en : ''
    const courseNameZh = course ? course.name.zh : ''
    const nS = {
      id: nIdS, role: 'student', recipientId: appt.studentId, type: 'booking_rescheduled',
      title: { en: 'Lesson rescheduled', zh: '课程已改期' },
      body: { en: `Your ${courseNameEn} lesson is now ${when}.`, zh: `您的${courseNameZh}课程已改期至 ${when}。` },
      read: false, at: now,
    }
    const stmts = [
      env.DB.prepare('UPDATE appointments SET start_iso = ?, end_iso = ?, status = ?, payload = ? WHERE id = ?')
        .bind(newStartISO, endISO, appt.status, JSON.stringify(updated), apptId),
      env.DB.prepare('INSERT INTO notifications (id, role, recipient_id, payload) VALUES (?, ?, ?, ?)')
        .bind(nS.id, nS.role, nS.recipientId, JSON.stringify(nS)),
    ]
    state.notifications.unshift(nS)
    if (isInstructor) {
      // The student is notified above; the instructor initiated it.
      const nISelf = {
        id: nIdI, role: 'instructor', recipientId: 'instructor', type: 'booking_rescheduled',
        title: { en: 'Lesson rescheduled', zh: '课程已改期' },
        body: { en: `${appt.studentId || 'Student'}'s lesson is now ${when}.`, zh: `${appt.studentId || '学员'}的课程已改期至 ${when}。` },
        read: false, at: now,
      }
      stmts.push(env.DB.prepare('INSERT INTO notifications (id, role, recipient_id, payload) VALUES (?, ?, ?, ?)')
        .bind(nISelf.id, nISelf.role, nISelf.recipientId, JSON.stringify(nISelf)))
      state.notifications.unshift(nISelf)
    } else {
      // Student-initiated reschedule → inform the instructor too.
      const nI = {
        id: nIdI, role: 'instructor', recipientId: 'instructor', type: 'booking_rescheduled',
        title: { en: 'Lesson rescheduled', zh: '课程已改期' },
        body: { en: `${user.name} rescheduled their ${courseNameEn} lesson to ${when}.`, zh: `${user.name} 将${courseNameZh}课程改期至 ${when}。` },
        read: false, at: now,
      }
      stmts.push(env.DB.prepare('INSERT INTO notifications (id, role, recipient_id, payload) VALUES (?, ?, ?, ?)')
        .bind(nI.id, nI.role, nI.recipientId, JSON.stringify(nI)))
      state.notifications.unshift(nI)
    }
    await env.DB.batch(stmts)
    state.appointments = state.appointments.map((a) => (a.id === apptId ? updated : a))
    const reschStudent = state.students.find((s) => s.id === appt.studentId)
    await bestEffortEmail(env, state, 'BOOKING_RESCHEDULED', reschStudent, state.instructor, updated, course, 'rescheduled')
    await bestEffortEmail(env, state, 'INSTRUCTOR_BOOKING_RESCHEDULED', reschStudent, state.instructor, updated, course, 'rescheduled')
    return reply(state)
  }

  // ---- confirmPayment / rejectPayment (instructor only, idempotent) ----
  if (action === 'confirmPayment' || action === 'rejectPayment') {
    if (!isInstructor) return fail('Instructor only.', 403)
    const paymentId = String(args.id || '')
    const payment = state.payments.find((p) => p.id === paymentId)
    if (!payment) return fail('Payment not found.')
    const status = action === 'confirmPayment' ? 'confirmed' : 'rejected'
    if (payment.status === status) return reply(state) // idempotent no-op
    const now = nowISO()
    const updated = { ...payment, status, confirmedAt: now }
    const [nId] = await nextSeq(env, 'notifications', 'n')
    const course = state.courses.find((c) => c.id === payment.courseId)
    const student = state.students.find((s) => s.id === payment.studentId)
    const nType = status === 'confirmed' ? 'payment_confirmed' : 'payment_rejected'
    const nTitle = status === 'confirmed' ? { en: 'Payment confirmed', zh: '支付已确认' } : { en: 'Payment rejected', zh: '支付已拒绝' }
    const nBody = status === 'confirmed'
      ? { en: `Your purchase of ${course ? course.name.en : ''} is confirmed. You can now book a time.`, zh: `您购买的${course ? course.name.zh : ''}已确认，现在可以预约时间了。` }
      : { en: `Your payment for ${course ? course.name.en : ''} was rejected. Please contact the instructor.`, zh: `您对${course ? course.name.zh : ''}的支付被拒绝，请联系教练。` }
    await env.DB.batch([
      env.DB.prepare('UPDATE payments SET status = ?, payload = ? WHERE id = ?').bind(status, JSON.stringify(updated), paymentId),
      env.DB.prepare('INSERT INTO notifications (id, role, recipient_id, payload) VALUES (?, ?, ?, ?)')
        .bind(nId, 'student', payment.studentId, JSON.stringify({
          id: nId, role: 'student', recipientId: payment.studentId, type: nType, title: nTitle, body: nBody, read: false, at: now, paymentId,
        })),
    ])
    state.payments = state.payments.map((p) => (p.id === paymentId ? updated : p))
    state.notifications.unshift({ id: nId, role: 'student', recipientId: payment.studentId, type: nType, title: nTitle, body: nBody, read: false, at: now, paymentId })
    return reply(state)
  }

  // ---- updateStudentAddress ----
  if (action === 'updateStudentAddress') {
    if (isInstructor) return fail('Students only.', 403)
    const address = String(args.address || '').trim()
    const now = nowISO()
    const student = state.students.find((s) => s.id === studentId)
    if (!student) return fail('Student not found.')
    const updatedStudent = { ...student, address }
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET address = ? WHERE id = ?').bind(address || null, user.id),
      env.DB.prepare('UPDATE students SET payload = ? WHERE id = ?').bind(JSON.stringify(updatedStudent), studentId),
    ])
    state.students = state.students.map((s) => (s.id === studentId ? updatedStudent : s))
    return reply(state)
  }

  // ---- updateStudentEmail: fill in / change the student's notification email ----
  if (action === 'updateStudentEmail') {
    if (isInstructor) return fail('Students only.', 403)
    const email = String(args.email || '').trim().toLowerCase()
    if (!email) return fail('Email is required.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Invalid email address.')
    const dup = await env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(email, user.id).first()
    if (dup) return fail('This email address is already registered.')
    const now = nowISO()
    const student = state.students.find((s) => s.id === studentId)
    if (!student) return fail('Student not found.')
    const updatedStudent = { ...student, email }
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET email = ? WHERE id = ?').bind(email, user.id),
      env.DB.prepare('UPDATE students SET payload = ? WHERE id = ?').bind(JSON.stringify(updatedStudent), studentId),
    ])
    state.students = state.students.map((s) => (s.id === studentId ? updatedStudent : s))
    // Best-effort notification email (never blocks the update).
    try {
      const { sendNotification } = await import('../../lib/notification.js')
      const instructor = state.instructor || {}
      const courseInfo = { name: '' }
      await sendNotification(env, {
        type: 'ACCOUNT_UPDATED',
        recipientEmail: email,
        student: updatedStudent,
        instructor: instructor.email ? instructor : null,
        booking: null,
        course: courseInfo,
      })
    } catch (e) {
      // email is best-effort
    }
    return reply(state)
  }

  // ---- markNotificationRead / markAllRead (student or instructor scope) ----
  const notifMatches = (n) =>
    isInstructor
      ? n.role === 'instructor' && n.recipientId === 'instructor'
      : n.role === 'student' && n.recipientId === studentId
  if (action === 'markNotificationRead') {
    const nId = String(args.id || '')
    const notif = state.notifications.find((n) => n.id === nId && notifMatches(n))
    if (!notif) return fail('Notification not found.')
    const updated = { ...notif, read: true }
    await env.DB.prepare('UPDATE notifications SET payload = ? WHERE id = ?').bind(JSON.stringify(updated), nId).run()
    state.notifications = state.notifications.map((n) => (n.id === nId ? updated : n))
    return reply(state)
  }
  if (action === 'markAllRead') {
    const updatedList = state.notifications.filter((n) => notifMatches(n) && !n.read).map((n) => ({ ...n, read: true }))
    if (updatedList.length > 0) {
      await env.DB.batch(
        updatedList.map((n) =>
          env.DB.prepare('UPDATE notifications SET payload = ? WHERE id = ?').bind(JSON.stringify(n), n.id)),
      )
    }
    const ids = new Set(updatedList.map((n) => n.id))
    state.notifications = state.notifications.map((n) => (ids.has(n.id) ? { ...n, read: true } : n))
    return reply(state)
  }

  return fail(`Unknown action: ${action}`, 400)
}
