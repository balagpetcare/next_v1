'use client'

import React from 'react'

const BASE = 'form-control'
const BASE_SM = 'form-control form-control-sm'

export type LkTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  size?: 'sm' | 'md'
  error?: boolean
  className?: string
}

const LkTextarea = React.forwardRef<HTMLTextAreaElement, LkTextareaProps>(function LkTextarea(
  { size = 'md', error, className, ...rest },
  ref
) {
  const cn = [size === 'sm' ? BASE_SM : BASE, error && 'is-invalid', className].filter(Boolean).join(' ')
  return <textarea ref={ref} className={cn} {...rest} />
})

export default LkTextarea
