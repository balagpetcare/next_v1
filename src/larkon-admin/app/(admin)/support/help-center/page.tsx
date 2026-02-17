export const dynamic = 'force-dynamic'
import HelpCenter from './components/HelpCenter'
import PageTItle from '@larkon/components/PageTItle'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Help Center' }

const HelpCenterPage = () => {
  return (
    <>
      <PageTItle title="HELP CENTER" />
      <HelpCenter />
    </>
  )
}

export default HelpCenterPage
