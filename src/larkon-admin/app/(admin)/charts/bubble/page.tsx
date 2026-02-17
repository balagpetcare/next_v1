import { Col, Container, Row } from 'react-bootstrap'
import UIExamplesList from '@larkon/components/UIExamplesList'
import AllBubbleCharts from './components/AllBubbleCharts'
import type { Metadata } from 'next'
import PageTItle from '@larkon/components/PageTItle'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Bubble Charts' }

const BubbleCharts = () => {
  return (
    <>
      <PageTItle title="BUBBLE CHARTS" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllBubbleCharts />
          </Col>
          <Col xl={3}>
            <UIExamplesList
              examples={[
                { link: '#simple', label: 'Simple Bubble Chart' },
                { link: '#3d-bubble', label: '3D Bubble Chart' },
              ]}
            />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default BubbleCharts
