-- EZDRIVES — D1 schema (initial)
-- Real relational storage: auth tables + per-entity business tables.
-- Business rows keep their full JSON payload (mirrors the frontend AppState),
-- plus indexed columns for the queries the API actually runs.

-- --- Authentication ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,             -- 'u' + uuid-ish suffix
  role         TEXT NOT NULL CHECK (role IN ('instructor', 'student')),
  name         TEXT NOT NULL DEFAULT '',
  phone        TEXT UNIQUE,                  -- login identifier
  email        TEXT,
  password_hash TEXT NOT NULL,               -- PBKDF2 (Web Crypto)
  avatar_color TEXT,
  address      TEXT,
  registered_at TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- --- Business data (one row per entity, JSON payload) ------------------------

-- Instructor profile + settings (single row, id = 1)
CREATE TABLE IF NOT EXISTS instructor (
  id      INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_rules (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS day_exceptions (
  date    TEXT PRIMARY KEY,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id      TEXT PRIMARY KEY,
  active  INTEGER NOT NULL DEFAULT 1,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
  id      TEXT PRIMARY KEY,
  active  INTEGER NOT NULL DEFAULT 1,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS videos (
  id      TEXT PRIMARY KEY,
  order_no INTEGER NOT NULL DEFAULT 0,
  active  INTEGER NOT NULL DEFAULT 1,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id      TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id         TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  start_iso  TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'confirmed',
  payload    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(start_iso);
CREATE INDEX IF NOT EXISTS idx_appointments_student ON appointments(student_id);

CREATE TABLE IF NOT EXISTS payments (
  id         TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending',
  payload    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);

CREATE TABLE IF NOT EXISTS notifications (
  id           TEXT PRIMARY KEY,
  role         TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  payload      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(role, recipient_id);
