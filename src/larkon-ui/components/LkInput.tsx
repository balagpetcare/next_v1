'use client'

import React from 'react'

const BASE = 'form-control'
const BASE_SM = 'form-control form-control-sm'

export type LkInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  size?: 'sm' | 'md'
  error?: boolean
  className?: string
}

const LkInput = React.forwardRef<HTMLInputElement, LkInputProps>(function LkInput(
  { size = 'md', error, className, ...rest },
  ref
) {
  const cn = [size === 'sm' ? BASE_SM : BASE, error && 'is-invalid', className].filter(Boolean).join(' ')
  return <input ref={ref} className={cn} {...rest} />
})

export default LkInput
