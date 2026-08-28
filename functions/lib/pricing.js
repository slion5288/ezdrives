// ============================================================================
// EZDRIVES — Pricing & discount calculation (server-side, authoritative).
// §54: final price is ALWAYS recomputed here — never trusted from the client.
// §27: Student & Referral discounts do NOT stack — best (highest) wins.
// §35: Trial is already 50% — no additional discounts.
// §37: Full Course Certificate — no discounts by default.
// ============================================================================

/**
 * Compute the discount for a course purchase.
 * Returns { originalPrice, discountType, discountSource, discountValue,
 *           discountAmount, finalPrice }.
 *
 * @param course       Course payload (with studentDiscount/referralDiscount)
 * @param opts.isStudent  student selected "currently a student" (yes)
 * @param opts.referral   { valid: boolean, studentId?: string, phone?: string }
 */
export function computeDiscount(course, { isStudent = false, referral = null } = {}) {
  const originalPrice = Number(course.price) || 0
  const courseType = course.course_type || (course.examCar ? 'ROAD_TEST_CAR' : course.type === 'package' ? 'TEN_HOUR_PACKAGE' : 'INDIVIDUAL_LESSON')

  // Trial: already 50% off → no stacking. Certificate: no discounts (user decision).
  if (courseType === 'TRIAL_LESSON' || courseType === 'FULL_COURSE_CERTIFICATE') {
    return { originalPrice, discountType: 'NONE', discountSource: '', discountValue: 0, discountAmount: 0, finalPrice: originalPrice }
  }

  const amountOf = (cfg) => {
    if (!cfg || !cfg.value || cfg.value <= 0) return 0
    return cfg.type === 'PERCENTAGE' ? (originalPrice * cfg.value) / 100 : Math.min(cfg.value, originalPrice)
  }

  const candidates = []
  if (isStudent && course.studentDiscount) {
    const amt = amountOf(course.studentDiscount)
    if (amt > 0) candidates.push({ source: 'student', type: 'STUDENT', discountType: course.studentDiscount.type, discountValue: course.studentDiscount.value, discountAmount: amt })
  }
  if (referral && referral.valid && course.referralDiscount) {
    const amt = amountOf(course.referralDiscount)
    if (amt > 0) candidates.push({ source: 'referral', type: 'REFERRAL', discountType: course.referralDiscount.type, discountValue: course.referralDiscount.value, discountAmount: amt })
  }

  // Best (highest) discount wins — no stacking (§27).
  let best = null
  for (const c of candidates) {
    if (!best || c.discountAmount > best.discountAmount) best = c
  }
  if (!best) {
    return { originalPrice, discountType: 'NONE', discountSource: '', discountValue: 0, discountAmount: 0, finalPrice: originalPrice }
  }
  return {
    originalPrice,
    discountType: best.type,
    discountSource: best.source,
    discountValue: best.discountValue,
    discountAmount: Math.round(best.discountAmount * 100) / 100,
    finalPrice: Math.max(0, Math.round((originalPrice - best.discountAmount) * 100) / 100),
  }
}
