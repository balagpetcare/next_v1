'use client'

import React from 'react'

export type LkCheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: React.ReactNode
  error?: boolean
  className?: string
  wrapperClassName?: string
}

const LkCheckbox = React.forwardRef<HTMLInputElement, LkCheckboxProps>(function LkCheckbox(
  { label, error, className, wrapperClassName, id, ...rest },
  ref
) {
  const cn = ['form-check-input', error && 'is-invalid', className].filter(Boolean).join(' ')
  const wrapperCn = ['form-check', wrapperClassName].filter(Boolean).join(' ')
  const inputId = id ?? (rest.name ? `lk-checkbox-${rest.name}` : undefined)
  return (
    <div className={wrapperCn}>
      <input ref={ref} type="checkbox" id={inputId} className={cn} {...rest} />
      {label != null && <label className="form-check-label" htmlFor={inputId}>{label}</label>}
    </div>
  )
})

export default LkCheckbox
