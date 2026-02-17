import PageTItle from '@larkon/components/PageTItle'
import { Metadata } from 'next'
import CouponsBoxs from './components/CouponsBoxs'
import CouponsDataList from './components/CouponsDataList'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Coupons List' }

const CouponsListPage = () => {
  return (
    <>
      <PageTItle title="COUPONS" />
      <CouponsBoxs />
      <CouponsDataList />
    </>
  )
}

export default CouponsListPage
