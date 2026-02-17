import type React from 'react'

export interface LegacyInputLike {
  name?: string
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  disabled?: boolean
  placeholder?: string
  id?: string
}

export function toLarkonInputProps(legacy: LegacyInputLike & { error?: boolean }) {
  return {
    name: legacy.name,
    value: legacy.value,
    onChange: legacy.onChange,
    onBlur: legacy.onBlur,
    disabled: legacy.disabled,
    placeholder: legacy.placeholder,
    id: legacy.id,
    error: legacy.error,
  }
}
