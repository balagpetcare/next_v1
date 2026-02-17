import { Metadata } from 'next'
import InvoiceDetails from './components/InvoiceDetails'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Invoice Details' }

const Page = () => {
  return <InvoiceDetails />
}

export default Page
