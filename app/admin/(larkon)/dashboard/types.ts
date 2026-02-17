import { BootstrapVariantType } from '@larkon/types/component-props'

export type StatType = {
  icon: string
  name: string
  amount: string
  variant: BootstrapVariantType
  change: string
}

export type PageType = {
  path: string
  views: number
  rate: string
  variant: BootstrapVariantType
}
