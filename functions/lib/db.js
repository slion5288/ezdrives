// EZDRIVES — state persistence layer (Pages Functions)
// Reads/writes every business entity in D1 and assembles the AppState shape
// the frontend expects. Rows carry a JSON payload; indexed columns mirror the
// fields the API queries.

const mapRows = (res) => (res.results || []).map((r) => JSON.parse(r.payload))

/** Random opaque token (64 hex chars) for calendar-subscription access. */
export function icsToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Full business state assembled from D1 (all tables). */
export async function readFullState(env) {
  const [instructor, rules, exceptions, courses, vehicles, videos, students, appointments, payments, notifications, homeContent] =
    await Promise.all([
      env.DB.prepare('SELECT payload FROM instructor WHERE id = 1').first(),
      env.DB.prepare('SELECT payload FROM weekly_rules ORDER BY id').all(),
      env.DB.prepare('SELECT payload FROM day_exceptions ORDER BY date').all(),
      env.DB.prepare('SELECT payload FROM courses ORDER BY rowid').all(),
      env.DB.prepare('SELECT payload FROM vehicles ORDER BY rowid').all(),
      env.DB.prepare('SELECT payload FROM videos ORDER BY order_no, rowid').all(),
      env.DB.prepare('SELECT payload FROM students ORDER BY rowid').all(),
      env.DB.prepare('SELECT payload FROM appointments ORDER BY rowid').all(),
      env.DB.prepare('SELECT payload FROM payments ORDER BY rowid').all(),
      env.DB.prepare('SELECT payload FROM notifications ORDER BY rowid').all(),
      env.DB.prepare('SELECT payload FROM home_content WHERE id = 1').first(),
    ])

  // Backfill calendar-subscription tokens for students created before the
  // token feature existed (runs at most once per student).
  const studentRows = students.results || []
  const toToken = studentRows
    .map((r) => JSON.parse(r.payload))
    .filter((s) => !s.icsToken)
  if (toToken.length > 0) {
    const updates = toToken.map((s) => {
      const token = icsToken()
      s.icsToken = token
      return { id: s.id, token, payload: JSON.stringify(s) }
    })
    await env.DB.batch(
      updates.map((u) =>
        env.DB.prepare('UPDATE students SET payload = ? WHERE id = ?').bind(u.payload, u.id)),
    )
  }

  const state = {
    instructor: instructor ? JSON.parse(instructor.payload) : null,
    weeklyRules: mapRows(rules),
    exceptions: mapRows(exceptions),
    courses: mapRows(courses),
    vehicles: mapRows(vehicles),
    students: studentRows.map((r) => JSON.parse(r.payload)),
    appointments: mapRows(appointments),
    notifications: mapRows(notifications),
    payments: mapRows(payments),
    videos: mapRows(videos),
    homeContent: homeContent ? JSON.parse(homeContent.payload) : null,
  }
  if (!state.instructor) throw new Error('System not initialized — run /api/setup')
  return state
}

/** Public view for unauthenticated visitors (landing + courses pages). */
export function publicView(state) {
  return {
    instructor: state.instructor,
    weeklyRules: state.weeklyRules,
    exceptions: state.exceptions,
    courses: (state.courses || []).filter((c) => c.active),
    vehicles: (state.vehicles || []).filter((v) => v.active),
    videos: state.videos || [],
    homeContent: state.homeContent || null,
  }
}

/**
 * Persist the instructor's AppState snapshot (PUT /api/state).
 *
 * Merge strategy (in one atomic batch):
 *  - Instructor-owned tables (weekly_rules, day_exceptions, courses, vehicles,
 *    videos): replace — rows absent from the snapshot are deleted, so
 *    instructor deletions propagate.
 *  - Student-influenced tables (students, appointments, payments,
 *    notifications): UPSERT ONLY — rows present in the snapshot are replaced,
 *    rows the instructor's (possibly stale) snapshot lacks are PRESERVED, so
 *    concurrent student-created bookings/payments/notifications are never
 *    discarded by a save. Students additionally keep their existing user_id
 *    (the frontend payload has no userId field) so auth links survive saves.
 */
export async function writeFullState(env, state) {
  // Existing student auth links, keyed by student id.
  const existing = await env.DB.prepare('SELECT id, user_id FROM students').all()
  const userIdByStudentId = new Map((existing.results || []).map((r) => [r.id, r.user_id]))

  const stmts = []
  stmts.push(
    env.DB.prepare('DELETE FROM weekly_rules'),
    env.DB.prepare('DELETE FROM day_exceptions'),
    env.DB.prepare('DELETE FROM courses'),
    env.DB.prepare('DELETE FROM vehicles'),
    env.DB.prepare('DELETE FROM videos'),
  )

  if (state.instructor) {
    stmts.push(env.DB.prepare('INSERT OR REPLACE INTO instructor (id, payload) VALUES (1, ?)').bind(JSON.stringify(state.instructor)))
  }
  for (const r of state.weeklyRules || []) {
    stmts.push(env.DB.prepare('INSERT INTO weekly_rules (payload) VALUES (?)').bind(JSON.stringify(r)))
  }
  for (const e of state.exceptions || []) {
    stmts.push(env.DB.prepare('INSERT OR REPLACE INTO day_exceptions (date, payload) VALUES (?, ?)').bind(e.date, JSON.stringify(e)))
  }
  for (const c of state.courses || []) {
    stmts.push(env.DB.prepare('INSERT OR REPLACE INTO courses (id, active, payload) VALUES (?, ?, ?)').bind(c.id, c.active ? 1 : 0, JSON.stringify(c)))
  }
  for (const v of state.vehicles || []) {
    stmts.push(env.DB.prepare('INSERT OR REPLACE INTO vehicles (id, active, payload) VALUES (?, ?, ?)').bind(v.id, v.active ? 1 : 0, JSON.stringify(v)))
  }
  for (const v of state.videos || []) {
    stmts.push(env.DB.prepare('INSERT OR REPLACE INTO videos (id, order_no, active, payload) VALUES (?, ?, ?, ?)').bind(v.id, v.order || 0, v.active ? 1 : 0, JSON.stringify(v)))
  }
  // Upsert-only (never delete) so concurrent student data survives a save.
  for (const s of state.students || []) {
    const uid = s.userId || userIdByStudentId.get(s.id) || null
    stmts.push(env.DB.prepare('INSERT OR REPLACE INTO students (id, user_id, payload) VALUES (?, ?, ?)').bind(s.id, uid, JSON.stringify(s)))
  }
  for (const a of state.appointments || []) {
    stmts.push(env.DB.prepare('INSERT OR REPLACE INTO appointments (id, student_id, start_iso, end_iso, status, payload) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(a.id, a.studentId, a.start, a.end || '', a.status, JSON.stringify(a)))
  }
  for (const p of state.payments || []) {
    stmts.push(env.DB.prepare('INSERT OR REPLACE INTO payments (id, student_id, status, payload) VALUES (?, ?, ?, ?)').bind(p.id, p.studentId, p.status, JSON.stringify(p)))
  }
  for (const n of state.notifications || []) {
    stmts.push(env.DB.prepare('INSERT OR REPLACE INTO notifications (id, role, recipient_id, payload) VALUES (?, ?, ?, ?)').bind(n.id, n.role, n.recipientId, JSON.stringify(n)))
  }

  await env.DB.batch(stmts)
  return true
}

/** Public/student view: everything the student needs, filtered by role. */
export function studentView(state, studentId) {
  const students = state.students.filter((s) => s.id === studentId)
  // Students receive the payment info they need to pay (QR / e-Transfer /
  // bank), but never the online-payment API credentials.
  const instructor = state.instructor
    ? { ...state.instructor, payConfig: undefined }
    : null
  return {
    instructor,
    weeklyRules: state.weeklyRules,
    exceptions: state.exceptions,
    courses: (state.courses || []).filter((c) => c.active),
    vehicles: (state.vehicles || []).filter((v) => v.active),
    videos: state.videos || [],
    students,
    // All appointments (needed for conflict detection) but anonymized
    // for everyone except the student themselves.
    appointments: (state.appointments || []).map((a) =>
      a.studentId === studentId ? a : { ...a, studentId: '', name: undefined },
    ),
    notifications: (state.notifications || []).filter((n) => n.role === 'student' && n.recipientId === studentId),
    payments: (state.payments || []).filter((p) => p.studentId === studentId),
  }
}
