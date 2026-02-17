'use client'

import React from 'react'

export type LkLabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean
  className?: string
}

function LkLabel({ required, className, children, ...rest }: LkLabelProps) {
  const cn = ['form-label', className].filter(Boolean).join(' ')
  return (
    <label className={cn} {...rest}>
      {children}
      {required && <span className="text-danger ms-1">*</span>}
    </label>
  )
}

export default LkLabel
