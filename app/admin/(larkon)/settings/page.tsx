export const dynamic = 'force-dynamic'
import GeneralSettings from './components/GeneralSettings'
import StoreSettings from './components/StoreSettings'
import LocalizationSettings from './components/LocalizationSettings'
import SettingsBoxs from './components/SettingsBoxs'
import CustomersSettings from './components/CustomersSettings'
import PageTItle from '@larkon/components/PageTItle'
import Link from 'next/link'

const SettingsPage = () => {
  return (
    <>
      <PageTItle title="SETTINGS" />
      <GeneralSettings />
      <StoreSettings />
      <LocalizationSettings />
      <SettingsBoxs />
      <CustomersSettings />
      <div className="text-end">
        <Link href="" className="btn btn-danger">
          Cancel
        </Link>
        &nbsp;
        <Link href="" className="btn btn-success">
          Save Change
        </Link>
      </div>
    </>
  )
}

export default SettingsPage
