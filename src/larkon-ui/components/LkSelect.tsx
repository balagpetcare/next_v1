'use client'

import React from 'react'

const BASE = 'form-select'
const BASE_SM = 'form-select form-select-sm'

export type LkSelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  size?: 'sm' | 'md'
  error?: boolean
  className?: string
}

const LkSelect = React.forwardRef<HTMLSelectElement, LkSelectProps>(function LkSelect(
  { size = 'md', error, className, ...rest },
  ref
) {
  const cn = [size === 'sm' ? BASE_SM : BASE, error && 'is-invalid', className].filter(Boolean).join(' ')
  return <select ref={ref} className={cn} {...rest} />
})

export default LkSelect
