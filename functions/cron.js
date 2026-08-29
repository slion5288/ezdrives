// ============================================================================
// EZDRIVES — scheduled entry point (kept for reference).
// Cloudflare Pages does NOT support cron triggers — the reminders are driven
// by .github/workflows/reminders.yml calling POST /api/cron (CRON_SECRET).
// Delegates to the shared implementation in functions/api/cron.js.
// ============================================================================

export { onRequestSchedule } from './api/cron.js'
