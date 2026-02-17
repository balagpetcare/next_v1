import { Icon } from 'next/dist/lib/metadata/types/metadata-types'

export type StokeType = {
  title: string
  item: number
  icon: string
  change?: number
}

export const stokeData: StokeType[] = [
  {
    title: 'Total Product Items',
    item: 3521,
    icon: 'solar:box-broken',
  },
  {
    title: 'In Stock Product',
    item: 1311,
    icon: 'solar:reorder-broken',
  },
  {
    title: 'Out Of Stock Product',
    item: 231,
    icon: 'solar:bag-cross-broken',
  },
  {
    title: 'Total Visited Customer',
    item: 2334,
    icon: 'solar:users-group-two-rounded-broken',
    change: 4.5,
  },
]
