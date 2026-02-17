'use client'

import React, { type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import LkFormGroup from './LkFormGroup'

const ChoicesFormInput = dynamic(
  () => import('@larkon/components/form/ChoicesFormInput'),
  { ssr: false }
)

const DEFAULT_CLASS = 'form-control radius-12'

export type LkChoicesSelectProps = {
  label?: ReactNode
  help?: ReactNode
  error?: ReactNode
  htmlFor?: string
  required?: boolean
  className?: string
  /** Class for the inner ChoicesFormInput (default: form-control radius-12). Use "form-select radius-12" for select styling. */
  inputClassName?: string
  /** Props passed to ChoicesFormInput (id, data-choices, children, etc.) */
  [key: string]: unknown
}

function LkChoicesSelect({
  label,
  help,
  error,
  htmlFor,
  required,
  className,
  inputClassName,
  children,
  ...rest
}: LkChoicesSelectProps) {
  const controlClassName = inputClassName ?? [DEFAULT_CLASS, (rest as { className?: string }).className].filter(Boolean).join(' ')
  const { className: _cn, inputClassName: _inputCn, ...choicesProps } = rest as { className?: string; inputClassName?: string; [k: string]: unknown }
  return (
    <LkFormGroup label={label} help={help} error={error} htmlFor={htmlFor} required={required} className={className}>
      <ChoicesFormInput className={controlClassName} {...choicesProps}>
        {children as React.ReactElement[]}
      </ChoicesFormInput>
    </LkFormGroup>
  )
}

export default LkChoicesSelect
