import { lazy, Suspense } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import type { Metadata } from 'next'
import PageTItle from '@larkon/components/PageTItle'
export const dynamic = 'force-dynamic'


const CalendarPage = lazy(() => import('./components/CalendarPage'))

export const metadata: Metadata = { title: 'Schedule' }
const Schedule = () => {
  return (
    <>
      <PageTItle title="CALENDAR" />
      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <Row>
                <Suspense>
                  <CalendarPage />
                </Suspense>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default Schedule
