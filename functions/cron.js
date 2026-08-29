// ============================================================================
// EZDRIVES — Cloudflare Pages Cron trigger entry point.
// Declared in wrangler.toml [[triggers]] (America/Toronto business time).
// Delegates to the shared implementation in functions/api/cron.js.
// ============================================================================

export { onRequestSchedule } from './api/cron.js'
