-- EZDRIVES — 0011: state version tracking (fine-grained instructor writes)
-- A tiny key/value table that holds a monotonically increasing version number,
-- bumped by every instructor-owned write so clients can detect staleness.
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO meta (key, value) VALUES ('state_version', '1');
