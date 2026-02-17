import { Metadata } from 'next'
import ListGroupPage from './components/ListGroupPage'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'List Group' }

const Page = () => {
  return <ListGroupPage />
}

export default Page
