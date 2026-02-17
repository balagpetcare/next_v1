import ReceivedOrdersDetails from './components/ReceivedOrdersDetails'
import ReceivedOrderData from './components/ReceivedOrderData'
import PageTItle from '@larkon/components/PageTItle'
import { Metadata } from 'next'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Received Orders' }

const ReceivedOrdersPage = () => {
  return (
    <>
      <PageTItle title="RECEIVED ORDERS" />
      <ReceivedOrdersDetails />
      <ReceivedOrderData />
    </>
  )
}

export default ReceivedOrdersPage
