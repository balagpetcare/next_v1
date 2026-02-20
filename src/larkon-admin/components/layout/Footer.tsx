import { Col, Container, Row } from 'react-bootstrap'
import FooterBrandWPA from '@/src/components/FooterBrandWPA'

const Footer = () => {
  return (
    <footer className="footer">
      <Container fluid>
        <Row>
          <Col xs={12}>
            <FooterBrandWPA />
          </Col>
        </Row>
      </Container>
    </footer>
  )
}

export default Footer
