import { Row } from 'react-bootstrap'
import Conversions from './components/Conversions'
import Orders from './components/Orders'
import Stats from './components/Stats'
import { Metadata } from 'next'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Dashboard' }

const DashboardPage = () => {
  return (
    <div className='bpa-page bpa-admin-dashboard'>
      <Row>
        <Stats />
        <Conversions />
        <Orders />
      </Row>
    </div>
  )
}

export default DashboardPage
