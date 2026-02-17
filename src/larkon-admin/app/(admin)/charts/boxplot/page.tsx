import { Col, Container, Row } from 'react-bootstrap'
import UIExamplesList from '@larkon/components/UIExamplesList'
import AllBoxPlotCharts from './components/AllBoxPlotCharts'
import type { Metadata } from 'next'
import PageTItle from '@larkon/components/PageTItle'
export const dynamic = 'force-dynamic'


const metadata: Metadata = { title: 'Boxplot Alert' }

const BoxPlotCharts = () => {
  return (
    <>
      <PageTItle title="APEX BOXPLOT CHART" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllBoxPlotCharts />
          </Col>
          <Col xl={3}>
            <UIExamplesList
              examples={[
                { link: '#basic', label: 'Basic Boxplot' },
                { link: '#scatter', label: 'Scatter Boxplot' },
              ]}
            />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default BoxPlotCharts
