import { Icon } from 'next/dist/lib/metadata/types/metadata-types'

export type PurchaseType = {
  title: string
  item: number
  icon: string
  variant: string
  change: number
}

export const purchaseData: PurchaseType[] = [
  {
    title: 'Total Orders',
    item: 472,
    icon: 'solar:box-broken',
    change: 6.9,
    variant: 'danger',
  },
  {
    title: 'Order Items Over Time',
    item: 231,
    icon: 'solar:sort-by-time-broken',
    change: 13.2,
    variant: 'success',
  },
  {
    title: 'Return Order',
    item: 367,
    icon: 'solar:bag-cross-broken',
    change: 2.1,
    variant: 'success',
  },
  {
    title: 'Fulfilled Orders Over Time',
    item: 123,
    icon: 'solar:bag-smile-broken',
    change: 3.1,
    variant: 'danger',
  },
]
