import { Icon } from 'next/dist/lib/metadata/types/metadata-types'

export type ReceivedOrderType = {
  title: string
  item: number
  icon: string
}

export const receivedOrderData: ReceivedOrderType[] = [
  {
    title: 'Pending Review',
    item: 210,
    icon: 'solar:clipboard-remove-broken',
  },
  {
    title: 'Pending Payment',
    item: 608,
    icon: 'solar:clock-circle-broken',
  },
  {
    title: 'Delivered',
    item: 200,
    icon: 'solar:clipboard-check-broken',
  },
  {
    title: 'In Progress',
    item: 656,
    icon: 'solar:inbox-line-broken',
  },
]
