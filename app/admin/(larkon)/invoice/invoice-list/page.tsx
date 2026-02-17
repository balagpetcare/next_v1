import PageTItle from '@larkon/components/PageTItle'
import { Metadata } from 'next'
import InvoiceCard from './components/InvoiceCard'
import InvoiceList from './components/InvoiceList'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Invoice List' }

const InvoiceListPage = () => {
  return (
    <>
      <PageTItle title="INVOICES LIST" />
      <InvoiceCard />
      <InvoiceList />
    </>
  )
}

export default InvoiceListPage
