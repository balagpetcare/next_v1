'use client'

import React from 'react'

export type LkHelpTextProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string
}

function LkHelpText({ className, ...rest }: LkHelpTextProps) {
  const cn = ['form-text text-muted', className].filter(Boolean).join(' ')
  return <div className={cn} {...rest} />
}

export default LkHelpText
