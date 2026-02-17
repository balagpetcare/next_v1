import UIExamplesList from '@larkon/components/UIExamplesList'
import type { Metadata } from 'next'
import { Col, Container, Row } from 'react-bootstrap'
import AllPlaceholders from './components/AllPlaceholders'
import PageTItle from '@larkon/components/PageTItle'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Placeholder' }

const PLaceholders = () => {
  return (
    <>
      <PageTItle title="PLACEHOLDER" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllPlaceholders />
          </Col>
          <Col xl={3}>
            <UIExamplesList
              examples={[
                { link: '#default', label: 'Overview' },
                { link: '#how-works', label: 'How it works' },
                { link: '#width', label: 'Width' },
                { link: '#color', label: 'Color' },
              ]}
            />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default PLaceholders
