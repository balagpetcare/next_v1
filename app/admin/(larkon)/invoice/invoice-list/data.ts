import { Icon } from 'next/dist/lib/metadata/types/metadata-types'

export type InvoiceType = {
  title: string
  item: number
  icon: string
}

export const invoiceData: InvoiceType[] = [
  {
    title: 'Total Invoice',
    item: 2310,
    icon: 'solar:bill-list-bold-duotone',
  },
  {
    title: 'Pending Invoice',
    item: 1000,
    icon: 'solar:bill-cross-bold-duotone',
  },
  {
    title: 'Paid Invoice',
    item: 1310,
    icon: 'solar:bill-check-bold-duotone',
  },
  {
    title: 'Inactive Invoice',
    item: 1243,
    icon: 'solar:bill-bold-duotone',
  },
]
