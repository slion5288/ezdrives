// EZDRIVES — state persistence layer (Pages Functions)
// Reads/writes every business entity in D1 and assembles the AppState shape
// the frontend expects. Rows carry a JSON payload; indexed columns mirror the
// fields the API queries.

const mapRows = (res) => (res.results || []).map((r) => JSON.parse(r.payload))

/** Full business state assembled from D1 (all tables). */
export async function readFullState(env) {
  const [instructor, rules, exceptions, courses, vehicles, videos, students, appointments, payments, notifications] =
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
    ])

  const state = {
    instructor: instructor ? JSON.parse(instructor.payload) : null,
    weeklyRules: mapRows(rules),
    exceptions: mapRows(exceptions),
    courses: mapRows(courses),
    vehicles: mapRows(vehicles),
    students: mapRows(students),
    appointments: mapRows(appointments),
    notifications: mapRows(notifications),
    payments: mapRows(payments),
    videos: mapRows(videos),
  }
  if (!state.instructor) throw new Error('System not initialized — run /api/setup')
  return state
}

/**
 * Replace ALL business rows with the given AppState (instructor write).
 * Runs in one atomic batch so a partial failure never leaves mixed state.
 */
export async function writeFullState(env, state) {
  const stmts = []
  stmts.push(
    env.DB.prepare('DELETE FROM weekly_rules'),
    env.DB.prepare('DELETE FROM day_exceptions'),
    env.DB.prepare('DELETE FROM courses'),
    env.DB.prepare('DELETE FROM vehicles'),
    env.DB.prepare('DELETE FROM videos'),
    env.DB.prepare('DELETE FROM students'),
    env.DB.prepare('DELETE FROM appointments'),
    env.DB.prepare('DELETE FROM payments'),
    env.DB.prepare('DELETE FROM notifications'),
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
  for (const s of state.students || []) {
    stmts.push(env.DB.prepare('INSERT OR REPLACE INTO students (id, user_id, payload) VALUES (?, ?, ?)').bind(s.id, s.userId || null, JSON.stringify(s)))
  }
  for (const a of state.appointments || []) {
    stmts.push(env.DB.prepare('INSERT OR REPLACE INTO appointments (id, student_id, start_iso, status, payload) VALUES (?, ?, ?, ?, ?)').bind(a.id, a.studentId, a.start, a.status, JSON.stringify(a)))
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
  return {
    instructor: state.instructor,
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
