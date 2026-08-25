// ============================================================================
// EZDRIVES — Toggle (shell-owned)
// Source of truth: docs/DESIGN.md §4.4. Accessible switch (role="switch")
// with an optional text label.
// ============================================================================

import { useId } from 'react'
import './shared.css'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Optional text label shown left of the switch. */
  label?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps): JSX.Element {
  const id = useId()
  return (
    <div className="toggle">
      {label != null ? (
        <span id={`${id}-label`} className="toggle__label">
          {label}
        </span>
      ) : null}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label != null ? `${id}-label` : undefined}
        className={`toggle__track${checked ? ' toggle__track--on' : ''}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle__knob" />
      </button>
    </div>
  )
}
