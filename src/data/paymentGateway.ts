// ============================================================================
// EZDRIVES — Payment gateway layer (real-API scaffolding + demo fallback)
//
// REAL integrations (production-ready code paths, dormant without config):
//  · Stripe  — Credit/Debit cards, Apple Pay, Google Pay via Stripe Payment
//    Element. Needs a publishable key + a backend endpoint that creates a
//    PaymentIntent (secret key must NEVER live in the frontend).
//  · PayPal — Orders API (create → approve → capture) via the PayPal JS SDK.
//    Needs a client-id + a backend endpoint (or a client-side client-id) and
//    your own app context / client-id registered at developer.paypal.com.
//  · Interac e-Transfer / WeChat personal QR — no public merchant API for
//    individual accounts; the app records the transfer/reference and the
//    instructor confirms the receipt (this IS the real flow for those).
//
// When a provider is NOT configured, the UI runs the same standard steps in
// DEMO mode (labelled "演示/Test") and still creates the pending payment for
// instructor confirmation — so the whole purchase flow works offline.
// ============================================================================

/** Paste real credentials here (or via the instructor payment-settings UI) to go live. */
export const PAYMENT_GATEWAY_CONFIG = {
  /** Stripe publishable key, e.g. 'pk_live_…' or 'pk_test_…'. Empty = demo. */
  stripePublishableKey: '',
  /** Backend endpoint that creates a Stripe PaymentIntent and returns { clientSecret }. */
  stripeCreateIntentUrl: '',
  /** PayPal client id. Empty = demo. */
  paypalClientId: '',
  /** Backend endpoint that creates a PayPal order and returns { id }. */
  paypalCreateOrderUrl: '',
} as const

/** Runtime credentials saved by the instructor in 支付确认 → 收款设置. */
export interface PayApiCredentials {
  stripeKey?: string
  stripeUrl?: string
  paypalClientId?: string
  paypalUrl?: string
}

const FALLBACK_CREDENTIALS: Record<keyof PayApiCredentials, string> = {
  stripeKey: PAYMENT_GATEWAY_CONFIG.stripePublishableKey,
  stripeUrl: PAYMENT_GATEWAY_CONFIG.stripeCreateIntentUrl,
  paypalClientId: PAYMENT_GATEWAY_CONFIG.paypalClientId,
  paypalUrl: PAYMENT_GATEWAY_CONFIG.paypalCreateOrderUrl,
}

const resolve = (cfg: PayApiCredentials | undefined, field: keyof PayApiCredentials): string =>
  (cfg && cfg[field] ? cfg[field] : undefined) || FALLBACK_CREDENTIALS[field]

export function stripeConfigured(cfg?: PayApiCredentials): boolean {
  return resolve(cfg, 'stripeKey') !== '' && resolve(cfg, 'stripeUrl') !== ''
}

export function paypalConfigured(cfg?: PayApiCredentials): boolean {
  return resolve(cfg, 'paypalClientId') !== '' && resolve(cfg, 'paypalUrl') !== ''
}

// --- Stripe: create a PaymentIntent through YOUR backend (secret key stays server-side) ---

export async function createStripePaymentIntent(
  amountCents: number,
  currency = 'cad',
  cfg?: PayApiCredentials,
): Promise<{ clientSecret: string }> {
  const res = await fetch(resolve(cfg, 'stripeUrl'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountCents, currency }),
  })
  if (!res.ok) throw new Error(`Stripe intent failed: ${res.status}`)
  return (await res.json()) as { clientSecret: string }
}

// --- PayPal: create an order through YOUR backend, then capture it ---

export interface PayPalOrderResult {
  id: string
  status: string
}

export async function createPayPalOrder(amount: number, currency = 'CAD', cfg?: PayApiCredentials): Promise<PayPalOrderResult> {
  const res = await fetch(resolve(cfg, 'paypalUrl'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency }),
  })
  if (!res.ok) throw new Error(`PayPal order failed: ${res.status}`)
  return (await res.json()) as PayPalOrderResult
}

export async function capturePayPalOrder(orderId: string, cfg?: PayApiCredentials): Promise<void> {
  const res = await fetch(resolve(cfg, 'paypalUrl'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, capture: true }),
  })
  if (!res.ok) throw new Error(`PayPal capture failed: ${res.status}`)
}

// --- Card helpers (used by the card form; real 3-DS/auth comes from Stripe) ---

export function luhnValid(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '')
  if (digits.length < 12) return false
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

/** Detect card brand from the number prefix (Visa / Mastercard / Amex / Interac). */
export function detectCardBrand(number: string): 'visa' | 'mastercard' | 'amex' | 'interac' | 'unknown' {
  const digits = number.replace(/\D/g, '')
  if (/^4/.test(digits)) return 'visa'
  if (/^5[1-5]/.test(digits) || /^(222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(digits)) return 'mastercard'
  if (/^3[47]/.test(digits)) return 'amex'
  if (/^8/.test(digits)) return 'interac'
  return 'unknown'
}

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 19)
  const brand = detectCardBrand(digits)
  const group = brand === 'amex' ? [4, 6, 5] : [4, 4, 4, 4]
  const out: string[] = []
  let i = 0
  for (const g of group) {
    if (i >= digits.length) break
    out.push(digits.slice(i, i + g))
    i += g
  }
  if (i < digits.length) out.push(digits.slice(i))
  return out.join(' ')
}

export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function expiryValid(expiry: string): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(expiry)
  if (!m) return false
  const month = Number(m[1])
  const year = 2000 + Number(m[2])
  if (month < 1 || month > 12) return false
  const now = new Date()
  const exp = new Date(year, month, 1)
  return exp.getTime() > now.getTime()
}
