import UIExamplesList from '@larkon/components/UIExamplesList'
import { Col, Container, Row } from 'react-bootstrap'
import AllCandlestickCharts from './components/AllCandlestickCharts'
import type { Metadata } from 'next'
import PageTItle from '@larkon/components/PageTItle'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Candlestick Alert' }

const CandlestickCharts = () => {
  return (
    <>
      <PageTItle title="CANDLESTICK CHARTS" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllCandlestickCharts />
          </Col>
          <Col xl={3}>
            <UIExamplesList
              examples={[
                { link: '#simple', label: 'Simple Candlestick Chart' },
                { link: '#x-axis', label: 'Category X-Axis' },
                { link: '#line', label: 'Candlestick with Line' },
              ]}
            />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default CandlestickCharts
