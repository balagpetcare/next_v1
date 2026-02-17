import { Metadata } from 'next'
import RoleAddPage from './components/RoleAddPage'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Role Add' }

const Page = () => {
  return <RoleAddPage />
}

export default Page
