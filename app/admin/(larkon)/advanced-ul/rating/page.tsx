export const dynamic = 'force-dynamic'
import type { Metadata } from 'next'
import RatingPage from './components/RatingPage'

export const metadata: Metadata = { title: 'Ratings' }

const Page = () => {
  return <RatingPage />
}

export default Page
