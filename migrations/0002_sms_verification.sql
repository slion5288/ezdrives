-- EZDRIVES — SMS verification codes (Twilio)
CREATE TABLE IF NOT EXISTS verification_codes (
  phone      TEXT NOT NULL,
  code       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_verification_phone ON verification_codes(phone);
