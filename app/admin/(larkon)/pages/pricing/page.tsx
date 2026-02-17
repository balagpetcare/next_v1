export const dynamic = 'force-dynamic'
import PageTItle from '@larkon/components/PageTItle'
import IconifyIcon from '@larkon/components/wrappers/IconifyIcon'
import { Metadata } from 'next'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { pricingData, PricingType } from './data'

export const metadata: Metadata = { title: 'Pricing' }

const PricingCard = ({ title, month, features, isPopular }: PricingType) => {
  return (
    <Card className="card-pricing">
      <CardBody>
        {isPopular && <div className="pricing-ribbon pricing-ribbon-primary float-end">Popular</div>}
        <h5 className="mt-0 mb-3 fs-14 text-uppercase fw-semibold">{title}</h5>
        <h2 className="mt-0 mb-3 fw-bold">
          ${month} <span className="fs-14 fw-medium text-muted">/ Month</span>
        </h2>
        <ul className="card-pricing-features text-muted border-top pt-2 mt-2 ps-0 list-unstyled">
          {features.map((data, idx) => (
            <li className="text-dark" key={idx}>
              <IconifyIcon icon="bx:check-circle" className="text-primary fs-15 me-1" />
              {data}
            </li>
          ))}
        </ul>
        <div className="mt-4 text-center">
          {isPopular ? (
            <button className="btn btn-primary px-sm-4 disabled w-100">Current Plan</button>
          ) : (
            <button className="btn btn-primary px-sm-4 w-100">Get Started</button>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

const PricingPage = () => {
  return (
    <>
      <PageTItle title="PRICING" />
      <Row>
        <Col xs={12}>
          <div className="text-center my-4">
            <h3>Simple Pricing Plans</h3>
            <p className="text-muted text-center">Get the power and control you need to manage your organization&apos;s technical documentation</p>
          </div>
          <Row className="justify-content-center">
            {pricingData.map((item, idx) => (
              <Col lg={3} key={idx}>
                <PricingCard {...item} />
              </Col>
            ))}
          </Row>
        </Col>
      </Row>
    </>
  )
}

export default PricingPage
