-- EZDRIVES — D1 schema (003)
-- 1) appointments.end_iso: indexed end time so the booking conflict guard can
--    run atomically inside SQL (INSERT ... WHERE NOT EXISTS). Backfilled from
--    the existing JSON payloads.
-- 2) rate_limits: simple sliding-window counters for login / SMS abuse guards.

ALTER TABLE appointments ADD COLUMN end_iso TEXT;
CREATE INDEX IF NOT EXISTS idx_appointments_end ON appointments(end_iso);
UPDATE appointments SET end_iso = json_extract(payload, '$.end') WHERE end_iso IS NULL OR end_iso = '';

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket       TEXT PRIMARY KEY,   -- e.g. 'sms:+1...', 'login:...', 'register:...'
  count        INTEGER NOT NULL DEFAULT 1,
  window_start TEXT NOT NULL       -- ISO instant (UTC) of the current window
);
