'use client'

import React from 'react'
import Nouislider, { type NouisliderProps } from 'nouislider-react'
import LkFormGroup from './LkFormGroup'

export type LkSliderProps = {
  label?: React.ReactNode
  help?: React.ReactNode
  error?: React.ReactNode
  htmlFor?: string
  className?: string
  sliderClassName?: string
} & NouisliderProps

const DEFAULT_SLIDER_CLASS = 'product-price-range'

function LkSlider({
  label,
  help,
  error,
  htmlFor,
  className,
  sliderClassName,
  ...nouiProps
}: LkSliderProps) {
  const cn = [DEFAULT_SLIDER_CLASS, sliderClassName].filter(Boolean).join(' ')
  return (
    <LkFormGroup label={label} help={help} error={error} htmlFor={htmlFor} className={className}>
      <Nouislider className={cn} {...nouiProps} />
    </LkFormGroup>
  )
}

export default LkSlider
