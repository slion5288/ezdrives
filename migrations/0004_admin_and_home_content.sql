-- EZDRIVES — D1 schema (004)
-- Site admin (content manager): admin credentials + sessions, and the editable
-- homepage content (text overrides / hero images / instructor list).

CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,          -- PBKDF2 (same format as users)
  created_at    TEXT NOT NULL
);
INSERT OR IGNORE INTO admin_users (id, username, password_hash, created_at)
  VALUES (1, 'slion', 'k1rPej4l36TbGbySD3qbzg==.JNiyQQnjkb3dKE33UTuyj3lf3X6Tmy2LPs07e9x/qEg=', datetime('now'));

CREATE TABLE IF NOT EXISTS admin_sessions (
  token      TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS home_content (
  id      INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL
);
INSERT OR IGNORE INTO home_content (id, payload)
  VALUES (1, '{"overrides":{},"heroImages":null,"instructors":[]}');
