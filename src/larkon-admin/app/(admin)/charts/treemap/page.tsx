import { Col, Container, Row } from 'react-bootstrap'
import UIExamplesList from '@larkon/components/UIExamplesList'
import AllTreemapCharts from './components/AllTreemapCharts'
import type { Metadata } from 'next'
import PageTItle from '@larkon/components/PageTItle'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Treemap Charts' }

const TreemapCharts = () => {
  return (
    <>
      <PageTItle title="TREEMAP CHARTS" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllTreemapCharts />
          </Col>
          <Col xl={3}>
            <UIExamplesList
              examples={[
                { link: '#basic', label: 'Basic' },
                { link: '#multiple', label: 'Treemap Multiple Series' },
                { link: '#distributed', label: 'Distributed Treemap' },
                { link: '#color-range', label: 'Color Range Treemap' },
              ]}
            />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default TreemapCharts
