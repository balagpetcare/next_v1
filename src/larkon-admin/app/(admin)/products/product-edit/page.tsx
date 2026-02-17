export const dynamic = 'force-dynamic'
import { Row } from 'react-bootstrap'
import ProductDetails from './components/ProductDetails'
import AddProduct from './components/AddProduct'
import PageTItle from '@larkon/components/PageTItle'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Product Edit' }

const ProductEditPage = () => {
  return (
    <>
      <PageTItle title="PRODUCT EDIT" />
      <Row>
        <ProductDetails />
        <AddProduct />
      </Row>
    </>
  )
}

export default ProductEditPage
