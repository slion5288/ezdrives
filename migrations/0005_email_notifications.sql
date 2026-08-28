-- EZDRIVES — Email notification system (step 1 of the Email feature)
-- 1) users.email uniqueness (NULLs allowed — existing students without email
--    are untouched; duplicate NULL rows don't collide in SQLite).
-- 2) notification_templates — admin-editable email templates (DB-stored, so
--    editing content never requires a redeploy).
-- 3) notification_logs — send audit trail + idempotency (one event → one email).

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- --- Notification templates -------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_templates (
  id         TEXT PRIMARY KEY,             -- 'tpl_welcome' etc.
  type       TEXT NOT NULL UNIQUE,         -- BOOKING_CONFIRMED, STUDENT_REGISTERED, …
  name       TEXT NOT NULL,                -- display name (en/zh in payload? keep single, UI localizes by type)
  subject    TEXT NOT NULL DEFAULT '',
  html_body  TEXT NOT NULL DEFAULT '',
  text_body  TEXT NOT NULL DEFAULT '',
  enabled    INTEGER NOT NULL DEFAULT 1,
  is_system  INTEGER NOT NULL DEFAULT 1,   -- system templates cannot be deleted
  updated_at TEXT NOT NULL DEFAULT ''
);

-- --- Notification logs ------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_logs (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL,           -- BOOKING_CONFIRMED, …
  recipient_email TEXT NOT NULL,
  template_id     TEXT,
  subject         TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | sent | failed
  error_message   TEXT,
  student_id      TEXT,
  instructor_id   TEXT,
  booking_id      TEXT,
  sent_at         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Idempotency: one (type, booking, recipient) → at most one email.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_logs_dedup
  ON notification_logs(type, booking_id, recipient_email)
  WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at);

-- --- Default templates (installed on first run, INSERT OR IGNORE) -----------

INSERT OR IGNORE INTO notification_templates (id, type, name, subject, html_body, text_body, enabled, is_system, updated_at) VALUES
('tpl_welcome', 'STUDENT_REGISTERED', 'Student Welcome', 'Welcome to EZDRIVES, {{student_name}}!',
 '<p>Hi {{student_name}},</p><p>Your account has been created successfully. Your phone number has been verified.</p><p>Important account, booking, schedule and reminder notifications will be sent to this email address.</p><p>— EZDRIVES · {{website_url}}</p>',
 'Hi {{student_name}},\n\nYour account has been created successfully. Your phone number has been verified.\n\nImportant account, booking, schedule and reminder notifications will be sent to this email address.\n\n— EZDRIVES · {{website_url}}',
 1, 1, ''),

('tpl_phone_verified', 'PHONE_VERIFIED', 'Phone Verified', 'Your phone number has been verified',
 '<p>Hi {{student_name}},</p><p>Your phone number has been successfully verified.</p><p>— EZDRIVES</p>',
 'Hi {{student_name}},\n\nYour phone number has been successfully verified.\n\n— EZDRIVES',
 1, 1, ''),

('tpl_booking_confirmed', 'BOOKING_CONFIRMED', 'Booking Confirmed', 'Your {{course_name}} lesson is confirmed',
 '<p>Hi {{student_name}},</p><p>Your lesson is confirmed:</p><p><strong>{{course_name}}</strong> on {{booking_date}} at {{booking_time}} (ID: {{booking_id}}).</p><p>— EZDRIVES · {{website_url}}</p>',
 'Hi {{student_name}},\n\nYour lesson is confirmed:\n{{course_name}} on {{booking_date}} at {{booking_time}} (ID: {{booking_id}}).\n\n— EZDRIVES · {{website_url}}',
 1, 1, ''),

('tpl_booking_cancelled', 'BOOKING_CANCELLED', 'Booking Cancelled', 'Your {{course_name}} lesson was cancelled',
 '<p>Hi {{student_name}},</p><p>Your {{course_name}} lesson on {{booking_date}} at {{booking_time}} has been cancelled.</p><p>— EZDRIVES</p>',
 'Hi {{student_name}},\n\nYour {{course_name}} lesson on {{booking_date}} at {{booking_time}} has been cancelled.\n\n— EZDRIVES',
 1, 1, ''),

('tpl_booking_rescheduled', 'BOOKING_RESCHEDULED', 'Booking Rescheduled', 'Your {{course_name}} lesson was rescheduled',
 '<p>Hi {{student_name}},</p><p>Your {{course_name}} lesson has been rescheduled to {{booking_date}} at {{booking_time}}.</p><p>— EZDRIVES</p>',
 'Hi {{student_name}},\n\nYour {{course_name}} lesson has been rescheduled to {{booking_date}} at {{booking_time}}.\n\n— EZDRIVES',
 1, 1, ''),

('tpl_booking_reminder', 'BOOKING_REMINDER', 'Booking Reminder', 'Reminder: {{course_name}} lesson tomorrow',
 '<p>Hi {{student_name}},</p><p>Just a reminder: your {{course_name}} lesson is on {{booking_date}} at {{booking_time}}.</p><p>— EZDRIVES · {{website_url}}</p>',
 'Hi {{student_name}},\n\nJust a reminder: your {{course_name}} lesson is on {{booking_date}} at {{booking_time}}.\n\n— EZDRIVES · {{website_url}}',
 1, 1, ''),

('tpl_account_update', 'ACCOUNT_UPDATED', 'Account Update', 'Your EZDRIVES account was updated',
 '<p>Hi {{student_name}},</p><p>Your account details were recently updated. If this was not you, please contact us.</p><p>— EZDRIVES</p>',
 'Hi {{student_name}},\n\nYour account details were recently updated. If this was not you, please contact us.\n\n— EZDRIVES',
 1, 1, ''),

('tpl_password_reset', 'PASSWORD_RESET', 'Password Reset', 'Reset your EZDRIVES password',
 '<p>Hi {{student_name}},</p><p>Use the link below to reset your password. This link expires shortly.</p><p>— EZDRIVES</p>',
 'Hi {{student_name}},\n\nUse the link below to reset your password. This link expires shortly.\n\n— EZDRIVES',
 1, 1, ''),

('tpl_instructor_new_booking', 'NEW_BOOKING', 'Instructor: New Booking', 'New booking: {{course_name}} ({{student_name}})',
 '<p>Hi {{instructor_name}},</p><p>New booking: <strong>{{course_name}}</strong> on {{booking_date}} at {{booking_time}} — student {{student_name}} ({{student_phone}}).</p><p>— EZDRIVES</p>',
 'Hi {{instructor_name}},\n\nNew booking: {{course_name}} on {{booking_date}} at {{booking_time}} — student {{student_name}} ({{student_phone}}).\n\n— EZDRIVES',
 1, 1, ''),

('tpl_instructor_booking_cancelled', 'INSTRUCTOR_BOOKING_CANCELLED', 'Instructor: Booking Cancelled', 'Booking cancelled: {{course_name}}',
 '<p>Hi {{instructor_name}},</p><p>The {{course_name}} lesson on {{booking_date}} at {{booking_time}} (student {{student_name}}) has been cancelled.</p><p>— EZDRIVES</p>',
 'Hi {{instructor_name}},\n\nThe {{course_name}} lesson on {{booking_date}} at {{booking_time}} (student {{student_name}}) has been cancelled.\n\n— EZDRIVES',
 1, 1, ''),

('tpl_instructor_booking_rescheduled', 'INSTRUCTOR_BOOKING_RESCHEDULED', 'Instructor: Booking Rescheduled', 'Booking rescheduled: {{course_name}}',
 '<p>Hi {{instructor_name}},</p><p>The {{course_name}} lesson with {{student_name}} has been rescheduled to {{booking_date}} at {{booking_time}}.</p><p>— EZDRIVES</p>',
 'Hi {{instructor_name}},\n\nThe {{course_name}} lesson with {{student_name}} has been rescheduled to {{booking_date}} at {{booking_time}}.\n\n— EZDRIVES',
 1, 1, ''),

('tpl_instructor_schedule_update', 'SCHEDULE_UPDATE', 'Instructor: Schedule Update', 'Your schedule has been updated',
 '<p>Hi {{instructor_name}},</p><p>Your working schedule was updated. Affected bookings have been handled automatically.</p><p>— EZDRIVES</p>',
 'Hi {{instructor_name}},\n\nYour working schedule was updated. Affected bookings have been handled automatically.\n\n— EZDRIVES',
 1, 1, ''),

('tpl_system', 'SYSTEM_NOTIFICATION', 'System Notification', 'EZDRIVES system notice',
 '<p>This is a system notice from EZDRIVES.</p>',
 'This is a system notice from EZDRIVES.',
 1, 1, ''),

('tpl_important_account', 'IMPORTANT_ACCOUNT', 'Important Account Notice', 'Important: action needed on your EZDRIVES account',
 '<p>Hi {{student_name}},</p><p>Please take action on your EZDRIVES account.</p><p>— EZDRIVES</p>',
 'Hi {{student_name}},\n\nPlease take action on your EZDRIVES account.\n\n— EZDRIVES',
 1, 1, '');
