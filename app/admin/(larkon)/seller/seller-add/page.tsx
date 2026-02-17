export const dynamic = 'force-dynamic'
import SellerAddDetails from './components/SellerAddDetails'
import SellerAddData from './components/SellerAddData'
import { Row } from 'react-bootstrap'
import PageTItle from '@larkon/components/PageTItle'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Seller Add' }

const SellerAddPage = () => {
  return (
    <>
      <PageTItle title="SELLER ADD" />
      <Row>
        <SellerAddDetails />
        <SellerAddData />
      </Row>
    </>
  )
}

export default SellerAddPage
