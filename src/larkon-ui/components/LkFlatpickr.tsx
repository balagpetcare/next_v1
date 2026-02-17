'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import LkFormGroup from './LkFormGroup'

const CustomFlatpickr = dynamic(
  () => import('@larkon/components/CustomFlatpickr'),
  { ssr: false }
)

const DEFAULT_CLASS = 'form-control radius-12'

export type LkFlatpickrProps = {
  label?: React.ReactNode
  help?: React.ReactNode
  error?: React.ReactNode
  htmlFor?: string
  required?: boolean
  className?: string
  inputClassName?: string
  value?: Date | [Date, Date]
  options?: Record<string, unknown>
  placeholder?: string
}

function LkFlatpickr(props: LkFlatpickrProps) {
  const {
    label,
    help,
    error,
    htmlFor,
    required,
    className,
    inputClassName,
    value,
    options,
    placeholder,
  } = props
  const controlClassName = [DEFAULT_CLASS, inputClassName].filter(Boolean).join(' ')
  return (
    <LkFormGroup label={label} help={help} error={error} htmlFor={htmlFor} required={required} className={className}>
      <CustomFlatpickr
        className={controlClassName}
        value={value}
        options={options}
        placeholder={placeholder}
      />
    </LkFormGroup>
  )
}

export default LkFlatpickr
