export const dynamic = 'force-dynamic'
import SellerDetails from './components/SellerDetails'
import SellerDataEdit from './components/SellerDataEdit'
import { Row } from 'react-bootstrap'
import PageTItle from '@larkon/components/PageTItle'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Seller Edit' }

const SellerEditPage = () => {
  return (
    <>
      <PageTItle title="SELLER EDIT" />
      <Row>
        <SellerDetails />
        <SellerDataEdit />
      </Row>
    </>
  )
}

export default SellerEditPage
