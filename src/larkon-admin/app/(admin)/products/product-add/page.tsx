export const dynamic = 'force-dynamic'
import PageTItle from '@larkon/components/PageTItle'
import { Metadata } from 'next'
import { Row } from 'react-bootstrap'
import AddProduct from './components/AddProduct'
import ProductDetails from './components/ProductDetails'

export const metadata: Metadata = { title: 'Product Add' }

const ProductAddPage = () => {
  return (
    <>
      <PageTItle title="CREATE PRODUCT" />
      <Row>
        <ProductDetails />
        <AddProduct />
      </Row>
    </>
  )
}

export default ProductAddPage
