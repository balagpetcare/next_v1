import PageTItle from '@larkon/components/PageTItle'
import AllTimelineCharts from './components/AllTimelineCharts'
import UIExamplesList from '@larkon/components/UIExamplesList'
import type { Metadata } from 'next'
import { Col, Container, Row } from 'react-bootstrap'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Timeline Charts' }

const TimelineCharts = () => {
  return (
    <>
      <PageTItle title="TIMELINE CHARTS" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllTimelineCharts />
          </Col>
          <Col xl={3}>
            <UIExamplesList
              examples={[
                { link: '#basic', label: 'Basic Timeline' },
                { link: '#distributed', label: 'Distributed Timeline' },
                { link: '#multi-series', label: 'Multi Series Timeline' },
                { link: '#advanced', label: 'Advanced Timeline' },
                { link: '#group-rows', label: 'Multiple Series - Group Rows' },
              ]}
            />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default TimelineCharts
