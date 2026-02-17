'use client'

import React from 'react'
import { Row } from 'react-bootstrap'

export type LkFormRowProps = React.ComponentProps<typeof Row> & {
  className?: string
}

function LkFormRow({ className, ...rest }: LkFormRowProps) {
  const cn = ['mb-3', className].filter(Boolean).join(' ')
  return <Row className={cn} {...rest} />
}

export default LkFormRow
