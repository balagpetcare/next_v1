import UIExamplesList from '@larkon/components/UIExamplesList'
import AllCollapse from './components/AllCollapse'
import type { Metadata } from 'next'
import { Col, Container, Row } from 'react-bootstrap'
import PageTItle from '@larkon/components/PageTItle'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Collapse' }

const Collapse = () => {
  return (
    <>
      <PageTItle title="COLLAPSE" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllCollapse />
          </Col>
          <Col xl={3}>
            <UIExamplesList
              examples={[
                { label: 'Default Example', link: '#default' },
                { label: 'Horizontal Collapse', link: '#horizontal' },
                { label: 'Multiple Targets', link: '#multiple-targets' },
              ]}
            />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default Collapse
