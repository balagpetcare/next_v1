import PageTItle from '@larkon/components/PageTItle'
import { Metadata } from 'next'
import CustomerDataCard from './components/CustomerDataCard'
import CustomerDataList from './components/CustomerDataList'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Customer' }

const CustomerPage = () => {
  return (
    <>
      <PageTItle title="CUSTOMER LIST" />
      <CustomerDataCard />
      <CustomerDataList />
    </>
  )
}

export default CustomerPage
