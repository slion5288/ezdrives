// ============================================================================
// EZDRIVES — Select (shell-owned)
// Source of truth: docs/DESIGN.md §4.5. Native select styled with tokens and
// a custom chevron. Pass `options` for convenience or `children` for custom
// <option> trees.
// ============================================================================

import { ChevronDown } from 'lucide-react'
import type { ReactNode, SelectHTMLAttributes } from 'react'
import './shared.css'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
  options?: SelectOption[]
  children?: ReactNode
}

export function Select({ invalid = false, options, children, className, ...rest }: SelectProps): JSX.Element {
  const classes = ['select', invalid ? 'select--invalid' : '', className].filter(Boolean).join(' ')
  return (
    <div className="select-wrap">
      <select className={classes} {...rest}>
        {options != null
          ? options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          : children}
      </select>
      <ChevronDown className="select-wrap__chevron" size={16} aria-hidden="true" />
    </div>
  )
}
