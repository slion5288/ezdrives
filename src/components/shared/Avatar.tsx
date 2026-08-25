// ============================================================================
// EZDRIVES — Avatar (shell-owned)
// Source of truth: docs/DESIGN.md §4.10. Circle badge with initials. Uses the
// entity's avatarColor when provided (students/instructor carry one), otherwise
// derives a deterministic muted hue from the name. NOTE: the fallback palette
// is a small set of hexes — no token exists for "6 muted hues"; this mirrors
// store.ts AVATAR_PALETTE (core-owned) and DESIGN.md §4.10's rotating palette.
// ============================================================================

import './shared.css'

export type AvatarSize = 'sm' | 'md' | 'lg'

export interface AvatarProps {
  name: string
  size?: AvatarSize
  /** Hex (as stored on Student.avatarColor / instructor.avatarColor). */
  color?: string
  /** Green presence dot (instructor online in booking UI). */
  presence?: boolean
}

const AVATAR_PALETTE = ['#7EA8D4', '#D4A06E', '#9B8FD6', '#D68FB0', '#6FC2B4', '#C0B36F']

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
}

export function Avatar({ name, size = 'md', color, presence = false }: AvatarProps): JSX.Element {
  let hue = 0
  for (let i = 0; i < name.length; i++) hue = (hue + name.charCodeAt(i)) % AVATAR_PALETTE.length
  const background = color ?? AVATAR_PALETTE[hue]
  const initials = initialsOf(name) || '?'
  return (
    <span className={`avatar avatar--${size}`} style={{ backgroundColor: background }} aria-label={name}>
      <span className="avatar__initials" aria-hidden="true">
        {initials}
      </span>
      {presence ? <span className="avatar__presence" aria-hidden="true" /> : null}
    </span>
  )
}
