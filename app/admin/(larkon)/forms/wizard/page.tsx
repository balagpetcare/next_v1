export const dynamic = 'force-dynamic'
import type { Metadata } from 'next'
import AllWizard from './components/AllWizard'

export const metadata: Metadata = { title: 'Wizard' }

const Wizard = () => {
  return <AllWizard />
}

export default Wizard
