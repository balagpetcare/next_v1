export const dynamic = 'force-dynamic'
import UIExamplesList from '@larkon/components/UIExamplesList'
import type { Metadata } from 'next'
import { Col, Container, Row } from 'react-bootstrap'
import AllPagination from './components/AllPagination'
import PageTItle from '@larkon/components/PageTItle'

export const metadata: Metadata = { title: 'Pagination' }

const Pagination = () => {
  return (
    <>
      <PageTItle title="PAGINATION" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllPagination />
          </Col>
          <Col xl={3}>
            <UIExamplesList
              examples={[
                { link: '#default-buttons', label: 'Default Pagination' },
                { link: '#rounded-pagination', label: 'Rounded Pagination' },
                { link: '#alignment', label: 'Alignment' },
                { link: '#sizing', label: 'Sizing' },
              ]}
            />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default Pagination
