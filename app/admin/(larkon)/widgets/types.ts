import { BootstrapVariantType } from '@larkon/types/component-props'

export type StatisticType = {
  icon: string
  name: string
  amount: string
  variant: BootstrapVariantType
  change: string
}

export type StatType = {
  icon: string
  iconColor: string
  amount: string
  title: string
  change: string
  changeColor: string
  badgeIcon: string
}

export type ScheduleType = {
  time: string
  title: string
  variant: string
  duration: string
}

export type Statistic2Type = {
  icon: string
  iconColor: string
  title: string
  amount: string
  change: string
  changeColor: string
}
