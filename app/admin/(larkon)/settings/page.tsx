'use client'
export const dynamic = 'force-dynamic'
import GeneralSettings from './components/GeneralSettings'
import StoreSettings from './components/StoreSettings'
import LocalizationSettings from './components/LocalizationSettings'
import SettingsBoxs from './components/SettingsBoxs'
import CustomersSettings from './components/CustomersSettings'
import Link from 'next/link'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import SectionCard from '@/src/bpa/admin/components/SectionCard'

const SettingsPage = () => {
  return (
    <AdminPageShell title="Settings" breadcrumbs={[{ label: 'System & Settings' }, { label: 'Settings' }]}>
      <GeneralSettings />
      <StoreSettings />
      <LocalizationSettings />
      <SettingsBoxs />
      <CustomersSettings />

      <SectionCard title="Admin tools" className="mt-3">
        <div className="d-flex flex-wrap gap-2">
          <Link href="/admin/dashboard" className="btn btn-outline-secondary btn-sm">Dashboard</Link>
          <Link href="/admin/products" className="btn btn-outline-primary btn-sm">Products</Link>
          <Link href="/admin/inventory" className="btn btn-outline-primary btn-sm">Inventory</Link>
          <Link href="/admin/policy" className="btn btn-outline-primary btn-sm">Policy center</Link>
          <Link href="/admin/roles" className="btn btn-outline-primary btn-sm">Roles</Link>
          <Link href="/admin/permissions" className="btn btn-outline-primary btn-sm">Permissions</Link>
          <Link href="/admin/support" className="btn btn-outline-primary btn-sm">Support</Link>
          <Link href="/admin/debug" className="btn btn-outline-secondary btn-sm">Debug</Link>
        </div>
      </SectionCard>

      <div className="text-end">
        <Link href="" className="btn btn-danger">
          Cancel
        </Link>
        &nbsp;
        <Link href="" className="btn btn-success">
          Save Change
        </Link>
      </div>
    </AdminPageShell>
  )
}

export default SettingsPage
