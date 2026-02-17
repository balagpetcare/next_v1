export const dynamic = 'force-dynamic'
import smallImg from '@larkon/assets/images/small/img-2.jpg'
import IconifyIcon from '@larkon/components/wrappers/IconifyIcon'
import LkInput from '@larkon-ui/components/LkInput'
import { privacyData, PrivacyType } from './data'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import PageTItle from '@larkon/components/PageTItle'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy' }

const PrivacyCard = ({ title, description }: PrivacyType) => {
  return (
    <Card>
      <CardBody>
        <div className="d-flex align-items-center mb-3">
          <IconifyIcon icon="solar:black-hole-bold-duotone" className="fs-28 text-primary" />
          <h3 className="mb-0 ms-2">{title}</h3>
        </div>
        <p className="mb-0">{description}</p>
      </CardBody>
    </Card>
  )
}

const PrivacyPolicyPage = () => {
  return (
    <>
      <PageTItle title="PRIVACY POLICY" />
      <Row className="justify-content-center">
        <Col lg={12}>
          <Card className="overflow-hidden" style={{ background: `url(${smallImg.src})` }}>
            <div className="position-absolute top-0 end-0 bottom-0 start-0 bg-dark opacity-75" />
            <CardBody>
              <Row className="justify-content-center">
                <Col lg={7} className="text-center   ">
                  <h3 className="text-white">Privacy Policy</h3>
                  <p className="text-white-50">Our code of conduct and your pledge to be an upstanding member of the product</p>
                  <div className="search-bar">
                    <span className="icons-center">
                      <IconifyIcon icon="bx:search-alt" />
                    </span>
                    <LkInput type="search" className="rounded-pill bg-white border-0" id="search" placeholder="Search ..." />
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col xs={12}>
          {privacyData.map((item, idx) => (
            <PrivacyCard key={idx} {...item} />
          ))}
        </Col>
      </Row>
    </>
  )
}

export default PrivacyPolicyPage
