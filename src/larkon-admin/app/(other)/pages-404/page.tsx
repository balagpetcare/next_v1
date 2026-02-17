export const dynamic = 'force-dynamic'
import Pages404 from './components/Pages404'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pages 404' }

const Pages404Page = () => {
  return <Pages404 />
}

export default Pages404Page
