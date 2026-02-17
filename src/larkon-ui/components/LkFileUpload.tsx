'use client'

import React from 'react'

const BASE = 'form-control'

export type LkFileUploadProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  size?: 'sm' | 'md'
  error?: boolean
  className?: string
}

const LkFileUpload = React.forwardRef<HTMLInputElement, LkFileUploadProps>(function LkFileUpload(
  { size = 'md', error, className, ...rest },
  ref
) {
  const sizeClass = size === 'sm' ? ' form-control-sm' : ''
  const cn = [BASE, sizeClass, error && 'is-invalid', className].filter(Boolean).join(' ')
  return <input ref={ref} type="file" className={cn} {...rest} />
})

export default LkFileUpload
