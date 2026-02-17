import { Col, Container, Row } from 'react-bootstrap'
import UIExamplesList from '@larkon/components/UIExamplesList'
import AllRadialBarCharts from './components/AllRadialBarCharts'
import type { Metadata } from 'next'
import PageTItle from '@larkon/components/PageTItle'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'RadialBar Charts' }

const RadialBarCharts = () => {
  return (
    <>
      <PageTItle title="RADIALBAR CHARTS" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllRadialBarCharts />
          </Col>
          <Col xl={3}>
            <UIExamplesList
              examples={[
                { label: 'Basic RadialBar Chart', link: '#basic' },
                { label: 'Multiple RadialBars', link: '#multiple' },
                { label: 'Circle Chart - Custom Angle', link: '#circle-angle' },
                { label: 'Circle Chart with Image', link: '#image' },
                { label: 'Stroked Circular Gauge', link: '#stroked-guage' },
                { label: 'Gradient Circular Chart', link: '#gradient' },
                { label: 'Semi Circle Gauge', link: '#semi-circle' },
              ]}
            />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default RadialBarCharts
