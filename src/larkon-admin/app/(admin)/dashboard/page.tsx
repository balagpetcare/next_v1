import { Row } from 'react-bootstrap'
import Conversions from './components/Conversions'
import Orders from './components/Orders'
import Stats from './components/Stats'
import { Metadata } from 'next'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Dashboard' }

const DashboardPage = () => {
  return (
    <>
      <Row>
        <Stats />
        <Conversions />
        <Orders />
      </Row>
    </>
  )
}

export default DashboardPage
