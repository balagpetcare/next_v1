'use client'

import React from 'react'

export type LkErrorTextProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string
}

function LkErrorText({ className, ...rest }: LkErrorTextProps) {
  const cn = ['invalid-feedback d-block', className].filter(Boolean).join(' ')
  return <div className={cn} {...rest} />
}

export default LkErrorText
