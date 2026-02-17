'use client'

import React from 'react'

export interface LkRadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode
  error?: boolean
  className?: string
  wrapperClassName?: string
}

const LkRadio = React.forwardRef<HTMLInputElement, LkRadioProps>(function LkRadio(
  { label, error, className, wrapperClassName, id, ...rest },
  ref
) {
  const cn = ['form-check-input', error ? 'is-invalid' : '', className].filter(Boolean).join(' ')
  const wrapperCn = ['form-check', wrapperClassName].filter(Boolean).join(' ')
  const inputId = id ?? (rest.name && rest.value != null ? `lk-radio-${String(rest.name)}-${String(rest.value)}` : undefined)
  return (
    <div className={wrapperCn}>
      <input ref={ref} type="radio" id={inputId} className={cn} {...rest} />
      {label != null && <label className="form-check-label" htmlFor={inputId}>{label}</label>}
    </div>
  )
})

export default LkRadio
