export const dynamic = 'force-dynamic'
import ProductDetails from './components/ProductDetails'
import Step from './components/Step'
import Review from './components/Review'
import ItemDetails from './components/ItemDetails'
import { Metadata } from 'next'
import { Row } from 'react-bootstrap'
import { getProductById } from '@larkon/helpers/data'
import { title } from 'process'
import { notFound } from 'next/navigation'
import PageTItle from '@larkon/components/PageTItle'

type ParamsProductId = {
  params: {
    productId: string
  }
}

export const generateMetadata = async ({ params }: ParamsProductId): Promise<Metadata> => {
  const product = await getProductById(params.productId)
  return { title: product?.id ?? 'Product Details' }
}

const ProductDetailsPage = async ({ params }: ParamsProductId) => {
  const product = await getProductById(params.productId)
  if (!product) notFound()

  return (
    <>
      <PageTItle title="PRODUCT DETAILS" />
      <ProductDetails />
      <Step />
      <Row>
        <ItemDetails />
        <Review />
      </Row>
    </>
  )
}

export default ProductDetailsPage
