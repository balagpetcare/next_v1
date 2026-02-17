import { Metadata } from 'next'
import Coupons from './Coupons'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Coupons Add' }

const CouponsAddPage = () => {
  return (
    <>
      <Coupons />
    </>
  )
}

export default CouponsAddPage
