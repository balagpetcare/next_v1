import { Col, Container, Row } from 'react-bootstrap'
import UIExamplesList from '@larkon/components/UIExamplesList'
import AllFormValidation from './components/AllFormValidation'
import type { Metadata } from 'next'
import PageTItle from '@larkon/components/PageTItle'
export const dynamic = 'force-dynamic'


export const metadata: Metadata = { title: 'Validation' }

const Validation = () => {
  return (
    <>
      <PageTItle title="FORM VALIDATION" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllFormValidation />
          </Col>
          <Col xl={3}>
            <UIExamplesList
              examples={[
                { link: '#browser-defaults', label: 'Browser Defaults' },
                { link: '#custom-styles', label: 'Custom Styles' },
                { link: '#server-side', label: 'Server side' },
                { link: '#supported-elements', label: 'Supported Elements' },
                { link: '#tooltips', label: 'Tooltips' },
              ]}
            />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default Validation
