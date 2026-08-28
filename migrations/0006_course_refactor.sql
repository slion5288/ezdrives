-- ============================================================================
-- EZDRIVES — Course system refactor (0006)
-- Structured course types, package enrollments with lesson snapshots.
-- Course/Payment/Appointment additions live in their JSON payloads
-- (no ALTER needed). New table: enrollments (package snapshot).
-- ============================================================================

-- Package enrollment: created at purchase, snapshot of lesson structure.
CREATE TABLE IF NOT EXISTS enrollments (
  id         TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  course_id  TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active',   -- active | completed | archived
  payload    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course  ON enrollments(course_id);
