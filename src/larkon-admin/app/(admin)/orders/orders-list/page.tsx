import PageTItle from '@larkon/components/PageTItle'
import OrdersDataCardPage from './components/OrdersDataCard'
import OrdersList from './components/OrdersList'
import { Metadata } from 'next'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Orders List' }

const page = () => {
  return (
    <>
      <PageTItle title="ORDERS LIST" />
      <OrdersDataCardPage />
      <OrdersList />
    </>
  )
}

export default page
