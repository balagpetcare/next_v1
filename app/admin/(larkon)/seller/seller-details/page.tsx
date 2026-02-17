export const dynamic = 'force-dynamic'
import SellerDetails from './components/SellerDetails'
import SellerChat from './components/SellerChat'
import LatestProduct from './components/LatestProduct'
import PageTItle from '@larkon/components/PageTItle'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Seller Details' }

const SellerDetailsPage = () => {
  return (
    <>
      <PageTItle title="SELLER DETAILS" />
      <SellerDetails />
      <SellerChat />
      <LatestProduct />
    </>
  )
}

export default SellerDetailsPage
