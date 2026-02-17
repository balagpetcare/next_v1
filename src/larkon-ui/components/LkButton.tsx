'use client'

import React from 'react'

export type LkButtonVariant =
  | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
  | 'outline-primary' | 'outline-secondary' | 'outline-danger' | 'link'

export type LkButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: LkButtonVariant
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const LkButton = React.forwardRef<HTMLButtonElement, LkButtonProps>(function LkButton(
  { variant = 'primary', size, type = 'button', className, ...rest },
  ref
) {
  const cn = ['btn', `btn-${variant}`, size ? `btn-${size}` : '', className].filter(Boolean).join(' ')
  return <button ref={ref} type={type} className={cn} {...rest} />
})

export default LkButton
