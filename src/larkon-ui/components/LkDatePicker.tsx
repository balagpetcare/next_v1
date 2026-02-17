'use client'

import React from 'react'
import LkInput from './LkInput'

export type LkDatePickerProps = Omit<React.ComponentProps<typeof LkInput>, 'type'> & {
  /** Uses native input[type=date]; no extra deps. */
}

function LkDatePicker(props: LkDatePickerProps) {
  return <LkInput type="date" {...props} />
}

export default LkDatePicker
