// ============================================================================
// EZDRIVES — Official payment brand marks (colored, inline SVG / wordmarks)
// All marks render at the SAME height (uniform size) and follow the brands'
// latest official look: Interac e-Transfer yellow box, WeChat Pay green bubble,
// Apple Pay black glyph, Google Pay multicolor G + Pay, PayPal two-tone blue,
// Visa / Mastercard / Amex standard marks. No external assets — everything is
// drawn inline so the single-file Preview.html stays offline-capable.
// ============================================================================

import { CreditCard } from 'lucide-react'
import type { PaymentMethod } from '../../data/store'

interface IconProps {
  /** Uniform height in px for every brand mark. */
  size?: number
}

/** Interac e-Transfer — official yellow box with black wordmark. */
export function EmtIcon({ size = 26 }: IconProps): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: size,
        padding: '0 9px',
        background: '#FDB913',
        color: '#000',
        fontWeight: 800,
        fontSize: size * 0.5,
        letterSpacing: '-0.2px',
        borderRadius: Math.max(4, size * 0.22),
        whiteSpace: 'nowrap',
      }}
    >
      e-Transfer
    </span>
  )
}

/** Interac (debit) — official teal wordmark. */
export function InteracIcon({ size = 26 }: IconProps): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: size,
        color: '#009DDC',
        fontWeight: 800,
        fontSize: size * 0.48,
        letterSpacing: '-0.2px',
        whiteSpace: 'nowrap',
      }}
    >
      Interac
    </span>
  )
}

/** WeChat Pay — official green chat bubble. */
export function WeChatPayIcon({ size = 26 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.6 2.6C4.9 2.6 1.5 5.7 1.5 9.5c0 2.1 1.1 3.9 2.8 5.2l-.8 2.4 2.7-1.4c.8.2 1.6.4 2.5.4h.4c-.2-.6-.3-1.2-.3-1.8 0-3.5 3.3-6.3 7.3-6.3h.5C16.6 5.4 13.4 2.6 9.6 2.6z"
        fill="#07C160"
      />
      <path
        d="M16.9 9.7c-3.4 0-6.1 2.5-6.1 5.6s2.7 5.6 6.1 5.6c.7 0 1.4-.1 2-.4l2.2 1.1-.6-1.9c1.5-1 2.5-2.7 2.5-4.4 0-3.1-2.7-5.6-6.1-5.6z"
        fill="#07C160"
      />
      <circle cx="13.4" cy="15.3" r="1" fill="#fff" />
      <circle cx="17.6" cy="15.3" r="1" fill="#fff" />
      <circle cx="6" cy="8.3" r="0.9" fill="#fff" />
      <circle cx="10.5" cy="8.3" r="0.9" fill="#fff" />
    </svg>
  )
}

/** Apple Pay — official black apple glyph + Pay wordmark. */
export function ApplePayIcon({ size = 26 }: IconProps): JSX.Element {
  return (
    <svg width={size * 2.35} height={size} viewBox="0 0 72 30" aria-hidden="true">
      <path
        d="M14.3 4.9c-.5.7-.9 1.5-.7 2.4.7.1 1.5-.4 1.9-1 .5-.6.8-1.4.7-2.2-.7-.1-1.5.4-1.9.8z"
        fill="#000"
      />
      <path
        d="M15.1 6.6c-1.2-.1-2.1.7-2.7.7-.6 0-1.5-.7-2.4-.7-1.2 0-2.4.7-3 1.8-1.3 2.2-.3 5.5.9 7.3.6.9 1.3 1.8 2.2 1.8.9 0 1.2-.5 2.3-.5 1.1 0 1.5.5 2.4.5.9 0 1.6-.9 2.1-1.8.7-1 .9-1.9.9-2 0 0-1.8-.7-1.8-2.8 0-1.7 1.4-2.5 1.5-2.6-.8-1.2-2.1-1.4-2.4-1.4z"
        fill="#000"
      />
      <text x="24" y="21.5" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="17" fill="#000">
        Pay
      </text>
    </svg>
  )
}

/** Google Pay — official multicolor G + Pay wordmark. */
export function GooglePayIcon({ size = 26 }: IconProps): JSX.Element {
  const fs = size * 0.68
  const w = fs * 0.72
  const colors = ['#4285F4', '#EA4335', '#FBBC05', '#4285F4', '#34A853', '#EA4335']
  const letters = ['G', 'o', 'o', 'g', 'l', 'e']
  let x = 0
  return (
    <svg width={size * 2.7} height={size} viewBox="0 0 72 30" aria-hidden="true">
      {letters.map((ch, i) => {
        const el = (
          <text key={i} x={x} y={22} fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize={fs} fill={colors[i]}>
            {ch}
          </text>
        )
        x += w
        return el
      })}
      <text x={x + 3} y={22} fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize={fs * 0.92} fill="#5F6368">
        Pay
      </text>
    </svg>
  )
}

/** PayPal — official two-tone blue wordmark. */
export function PayPalIcon({ size = 26 }: IconProps): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: size,
        fontWeight: 800,
        fontStyle: 'italic',
        fontSize: size * 0.52,
        letterSpacing: '-0.3px',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: '#003087' }}>Pay</span>
      <span style={{ color: '#009CDE' }}>Pal</span>
    </span>
  )
}

/** Visa — official navy italic wordmark. */
export function VisaIcon({ size = 26 }: IconProps): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: size,
        fontWeight: 800,
        fontStyle: 'italic',
        fontSize: size * 0.56,
        color: '#1A1F71',
        letterSpacing: '0.6px',
        whiteSpace: 'nowrap',
      }}
    >
      VISA
    </span>
  )
}

/** Mastercard — official overlapping red/orange circles. */
export function MastercardIcon({ size = 26 }: IconProps): JSX.Element {
  return (
    <svg width={size * 1.16} height={size} viewBox="0 0 24 21" aria-hidden="true">
      <circle cx="8.6" cy="10.5" r="7.4" fill="#EB001B" />
      <circle cx="15.4" cy="10.5" r="7.4" fill="#F79E1B" />
      <path d="M12 4.8a7.4 7.4 0 0 1 0 11.4 7.4 7.4 0 0 1 0-11.4z" fill="#FF5F00" />
    </svg>
  )
}

/** American Express — official blue box wordmark. */
export function AmexIcon({ size = 26 }: IconProps): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: size * 0.66,
        padding: '0 7px',
        background: '#2E77BC',
        color: '#fff',
        fontWeight: 800,
        fontSize: size * 0.44,
        letterSpacing: '0.5px',
        borderRadius: 3,
        whiteSpace: 'nowrap',
      }}
    >
      AMEX
    </span>
  )
}

/** Cash — neutral banknote glyph. */
export function CashIcon({ size = 26 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 24 20" fill="none" stroke="#2F9E44" strokeWidth="1.9" aria-hidden="true">
      <rect x="1.5" y="3" width="21" height="14" rx="2.2" />
      <circle cx="12" cy="10" r="3" />
      <path d="M5 6.5h1.2M17.8 13.5H19" strokeLinecap="round" />
    </svg>
  )
}

/** Brand mark for a payment method — uniform height for all. */
export function PaymentMethodBrand({ method, size = 26 }: { method: PaymentMethod; size?: number }): JSX.Element {
  switch (method) {
    case 'cash':
      return <CashIcon size={size} />
    case 'wechat':
      return <WeChatPayIcon size={size} />
    case 'emt':
      return <EmtIcon size={size} />
    case 'applepay':
      return <ApplePayIcon size={size} />
    case 'googlepay':
      return <GooglePayIcon size={size} />
    case 'paypal':
      return <PayPalIcon size={size} />
    case 'card':
      return <CreditCard size={size} color="#1A1F71" />
    case 'debit':
      return <InteracIcon size={size} />
  }
}

/** Uniform frame so every brand mark occupies the same visual box. */
export function PaymentBrandFrame({ method, size = 26 }: { method: PaymentMethod; size?: number }): JSX.Element {
  return (
    <span className="pay-brand-icon">
      <PaymentMethodBrand method={method} size={size} />
    </span>
  )
}
