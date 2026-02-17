'use client'

import React from 'react'
import LkLabel from './LkLabel'
import LkHelpText from './LkHelpText'
import LkErrorText from './LkErrorText'

export type LkFormGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  label?: React.ReactNode
  htmlFor?: string
  required?: boolean
  help?: React.ReactNode
  error?: React.ReactNode
  className?: string
}

function LkFormGroup({
  label,
  htmlFor,
  required,
  help,
  error,
  className,
  children,
  ...rest
}: LkFormGroupProps) {
  const cn = ['mb-3', className].filter(Boolean).join(' ')
  return (
    <div className={cn} {...rest}>
      {label != null && (
        <LkLabel htmlFor={htmlFor} required={required}>
          {label}
        </LkLabel>
      )}
      {children}
      {help != null && <LkHelpText>{help}</LkHelpText>}
      {error != null && <LkErrorText>{error}</LkErrorText>}
    </div>
  )
}

export default LkFormGroup
