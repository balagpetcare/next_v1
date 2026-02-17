import PageTItle from '@larkon/components/PageTItle'
import PurchaseListPage from '../purchase-list/page'
import ReturnDataCard from './Components/ReturnDataCard'
import { Metadata } from 'next'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Purchase Returns' }

const PurchaseReturnsPage = () => {
  return (
    <>
      <PageTItle title="PURCHASE ORDER" />
      <ReturnDataCard />
      <PurchaseListPage />
    </>
  )
}

export default PurchaseReturnsPage
