import { Metadata } from 'next'
import InvoicePage from './InvoicePage'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Invoice Add' }

const Page = () => {
  return <InvoicePage />
}

export default Page
