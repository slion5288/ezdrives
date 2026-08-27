// ============================================================================
// EZDRIVES — G1 mock-test metadata (LIGHTWEIGHT — no embedded images)
// The full question banks + base64 images live in ./g1-bank.ts (≈3.7 MB),
// which is lazy-loaded only when the user opens /g1. Public pages only need
// the question counts shown in the G1 teaser.
// KEEP G1_COUNTS IN SYNC WITH g1-bank.ts (G1_BANK_ZH / G1_BANK_EN lengths).
// ============================================================================

export const G1_COUNTS = { zh: 205, en: 188 } as const

export type { G1Question } from './g1-bank'
