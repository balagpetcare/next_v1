import { Metadata } from 'next'
export const dynamic = 'force-dynamic'
import ComingSoon from './components/ComingSoon'

export const metadata: Metadata = { title: 'Coming Soon' }

const ComingSoonPage = () => {
  return <ComingSoon />
}

export default ComingSoonPage
