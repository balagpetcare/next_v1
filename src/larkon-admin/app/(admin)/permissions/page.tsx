export const dynamic = 'force-dynamic'
import PermissionsCard from './components/PermissionsCard'
import PermissionsList from './components/PermissionsList'
import PageTItle from '@larkon/components/PageTItle'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Permissions' }

const PermissionsPage = () => {
  return (
    <>
      <PageTItle title="PERMISSIONS" />
      <PermissionsCard />
      <PermissionsList />
    </>
  )
}

export default PermissionsPage
