import { Col, Container, Row } from 'react-bootstrap'
import UIExamplesList from '@larkon/components/UIExamplesList'
import AllMixedCharts from './components/AllMixedCharts'
import type { Metadata } from 'next'
import PageTItle from '@larkon/components/PageTItle'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Mixed Charts' }

const MixedCharts = () => {
  return (
    <>
      <PageTItle title="MIXED CHARTS" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllMixedCharts />
          </Col>
          <Col xl={3}>
            <UIExamplesList
              examples={[
                { link: '#line-column', label: 'Line & Column Chart' },
                { link: '#multiple-yaxis', label: 'Multiple Y-Axis Chart' },
                { link: '#line-area', label: 'Line & Area Chart' },
                { link: '#all', label: 'Line, Column & Area Chart' },
              ]}
            />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default MixedCharts
