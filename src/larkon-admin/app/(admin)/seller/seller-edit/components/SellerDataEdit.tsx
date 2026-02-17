'use client'
import FileUpload from '@larkon/components/FileUpload'
import IconifyIcon from '@larkon/components/wrappers/IconifyIcon'
import LkChoicesSelect from '@larkon-ui/components/LkChoicesSelect'
import LkFormGroup from '@larkon-ui/components/LkFormGroup'
import LkInput from '@larkon-ui/components/LkInput'
import LkSlider from '@larkon-ui/components/LkSlider'
import Link from 'next/link'
import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'

const SellerDataEdit = () => {
  const [selectedValue, setSelectedValue] = useState([0, 200])
  const handleSliderChange = (values: any) => {
    setSelectedValue(values)
  }

  const handleInputChange = (event: any) => {
    if (selectedValue[0] <= Math.round(event.target.value)) {
      setSelectedValue([selectedValue[0], Math.round(event.target.value)])
    }
  }
  return (
    <Col xl={9} lg={8}>
      <FileUpload title="Add Brand Logo" />
      <Card>
        <CardHeader>
          <CardTitle as={'h4'}>Seller Information</CardTitle>
        </CardHeader>
        <CardBody>
          <Row>
            <Col lg={6}>
              <LkFormGroup label="Brand Title" htmlFor="brand-title">
                <LkInput type="text" id="brand-title" className="radius-12" placeholder="Enter Title" defaultValue="ZARA International" />
              </LkFormGroup>
            </Col>
            <Col lg={6}>
              <form>
                <label htmlFor="product-categories" className="form-label">
                  Product Categories
                </label>
                <ChoicesFormInput
                  className="form-control"
                  id="product-categories"
                  data-choices
                  data-choices-groups
                  data-placeholder="Select Categories">
                  <option>Choose a categories</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Footwear">Footwear</option>
                  <option value="Sportswear">Sportswear</option>
                  <option value="Watches">Watches</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Appliances">Appliances</option>
                  <option value="Headphones">Headphones</option>
                  <option value="Other Accessories">Other Accessories</option>
                </ChoicesFormInput>
              </form>
            </Col>
            <Col lg={6}>
              <LkFormGroup label="Brand Link" htmlFor="brand-link">
                <LkInput type="text" id="brand-link" className="radius-12" placeholder="www.****" defaultValue="www.zarafashion.co" />
              </LkFormGroup>
            </Col>
            <Col lg={6}>
              <LkFormGroup label="Location" htmlFor="seller-location">
                <div className="input-group mb-3">
                  <span className="input-group-text fs-20">
                    <IconifyIcon icon="solar:point-on-map-bold-duotone" className="fs-18" />
                  </span>
                  <LkInput
                    type="text"
                    id="seller-location"
                    className="radius-12"
                    placeholder="Add Address"
                    defaultValue="4604 , Philli Lane Kiowa IN 47404"
                  />
                </div>
              </LkFormGroup>
            </Col>
            <Col lg={6}>
              <LkFormGroup label="Email" htmlFor="seller-email">
                <div className="input-group mb-3">
                  <span className="input-group-text fs-20">
                    <IconifyIcon icon="solar:letter-bold-duotone" className="fs-18" />
                  </span>
                  <LkInput type="email" id="seller-email" className="radius-12" placeholder="Add Email" defaultValue="zarafashionworld@dayrep.com" />
                </div>
              </LkFormGroup>
            </Col>
            <Col lg={6}>
              <LkFormGroup label="Phone Number" htmlFor="seller-number">
                <div className="input-group mb-3">
                  <span className="input-group-text fs-20">
                    <IconifyIcon icon="solar:outgoing-call-rounded-bold-duotone" className="fs-20" />
                  </span>
                  <LkInput type="text" id="seller-number" className="radius-12" placeholder="Phone number" defaultValue="+243 812-801-9335" />
                </div>
              </LkFormGroup>
            </Col>
            <Col lg={12}>
              <LkSlider
                label="Yearly Revenue"
                htmlFor="customRange1"
                range={{ min: 0, max: 1500 }}
                start={selectedValue}
                connect={true}
                onSlide={handleSliderChange}
              />
              <div id="product-price-range" />
              <div className="formCost d-flex gap-2 align-items-center mt-2">
                <LkInput
                  size="sm"
                  className="text-center w-50 radius-12"
                  type="text"
                  id="maxCost"
                  value={selectedValue[1]}
                  onChange={handleInputChange}
                />
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle as={'h4'}>Seller Product Information</CardTitle>
        </CardHeader>
        <CardBody>
          <Row>
            <Col lg={4}>
              <LkFormGroup label="Items Stock" htmlFor="items-stock">
                <LkInput type="number" id="items-stock" className="radius-12" placeholder="000" defaultValue={865} />
              </LkFormGroup>
            </Col>
            <Col lg={4}>
              <LkFormGroup label="Product Sells" htmlFor="items-sells">
                <LkInput type="number" id="items-sells" className="radius-12" placeholder="000" defaultValue={4897} />
              </LkFormGroup>
            </Col>
            <Col lg={4}>
              <LkFormGroup label="Happy Client" htmlFor="happy-client">
                <LkInput type="number" id="happy-client" className="radius-12" placeholder="000" defaultValue={2826} />
              </LkFormGroup>
            </Col>
          </Row>
        </CardBody>
      </Card>
      <div className="p-3 bg-light mb-3 rounded">
        <Row className="justify-content-end g-2">
          <Col lg={2}>
            <Link href="" className="btn btn-outline-secondary w-100">
              Save Change
            </Link>
          </Col>
          <Col lg={2}>
            <Link href="" className="btn btn-primary w-100">
              Cancel
            </Link>
          </Col>
        </Row>
      </div>
    </Col>
  )
}

export default SellerDataEdit
