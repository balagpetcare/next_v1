import IconifyIcon from '@larkon/components/wrappers/IconifyIcon'
import LkFormGroup from '@larkon-ui/components/LkFormGroup'
import LkInput from '@larkon-ui/components/LkInput'
import React from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'

const SettingsBoxs = () => {
  return (
    <Row>
      <Col lg={3}>
        <Card>
          <CardHeader>
            <CardTitle as={'h4'} className="d-flex align-items-center gap-1">
              <IconifyIcon icon="solar:box-bold-duotone" className="text-primary fs-20" />
              Categories Settings
            </CardTitle>
          </CardHeader>
          <CardBody>
            <p>Category Product Count </p>
            <div className="d-flex gap-2 align-items-center mb-3">
              <div className="form-check">
                <input className="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault1" defaultChecked />
                <label className="form-check-label" htmlFor="flexRadioDefault1">
                  Yes
                </label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault2" />
                <label className="form-check-label" htmlFor="flexRadioDefault2">
                  No
                </label>
              </div>
            </div>
            <LkFormGroup label="Default Items Per Page" htmlFor="items-par-page">
                <LkInput type="number" id="items-par-page" className="radius-12" placeholder="000" />
              </LkFormGroup>
          </CardBody>
        </Card>
      </Col>
      <Col lg={3}>
        <Card>
          <CardHeader>
            <CardTitle as={'h4'} className="d-flex align-items-center gap-1">
              <IconifyIcon icon="solar:chat-square-check-bold-duotone" className="text-primary fs-20" />
              Reviews Settings
            </CardTitle>
          </CardHeader>
          <CardBody>
            <p>Allow Reviews </p>
            <div className="d-flex gap-2 align-items-center mb-3">
              <div className="form-check">
                <input className="form-check-input" type="radio" name="flexRadioDefault2" id="flexRadioDefault3" defaultChecked />
                <label className="form-check-label" htmlFor="flexRadioDefault3">
                  Yes
                </label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" name="flexRadioDefault2" id="flexRadioDefault4" />
                <label className="form-check-label" htmlFor="flexRadioDefault4">
                  No
                </label>
              </div>
            </div>
            <p className="mt-3 pt-1">Allow Guest Reviews </p>
            <div className="d-flex gap-2 align-items-center mb-2">
              <div className="form-check">
                <input className="form-check-input" type="radio" name="flexRadioDefault3" id="flexRadioDefault5" />
                <label className="form-check-label" htmlFor="flexRadioDefault5">
                  Yes
                </label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" name="flexRadioDefault3" id="flexRadioDefault6" defaultChecked />
                <label className="form-check-label" htmlFor="flexRadioDefault6">
                  No
                </label>
              </div>
            </div>
          </CardBody>
        </Card>
      </Col>
      <Col lg={3}>
        <Card>
          <CardHeader>
            <CardTitle as={'h4'} className="d-flex align-items-center gap-1">
              <IconifyIcon icon="solar:ticket-bold-duotone" className="text-primary fs-20" />
              Vouchers Settings
            </CardTitle>
          </CardHeader>
          <CardBody>
            <LkFormGroup label="Minimum Vouchers" htmlFor="min-vouchers">
                <LkInput type="number" id="min-vouchers" className="radius-12" placeholder="000" defaultValue={1} />
              </LkFormGroup>
              <LkFormGroup label="Maximum Vouchers" htmlFor="mex-vouchers">
                <LkInput type="number" id="mex-vouchers" className="radius-12" placeholder="000" defaultValue={12} />
              </LkFormGroup>
          </CardBody>
        </Card>
      </Col>
      <Col lg={3}>
        <Card>
          <CardHeader>
            <CardTitle as={'h4'} className="d-flex align-items-center gap-1">
              <IconifyIcon icon="solar:ticket-sale-bold-duotone" className="text-primary fs-20" />
              Tax Settings
            </CardTitle>
          </CardHeader>
          <CardBody>
            <p>Prices with Tax</p>
            <div className="d-flex gap-2 align-items-center mb-3">
              <div className="form-check">
                <input className="form-check-input" type="radio" name="flexRadioDefault4" id="flexRadioDefault7" defaultChecked />
                <label className="form-check-label" htmlFor="flexRadioDefault7">
                  Yes
                </label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" name="flexRadioDefault4" id="flexRadioDefault8" />
                <label className="form-check-label" htmlFor="flexRadioDefault8">
                  No
                </label>
              </div>
            </div>
            <LkFormGroup label="Default Tax Rate" htmlFor="items-tax">
                <LkInput type="text" id="items-tax" className="radius-12" placeholder="000" defaultValue="18%" />
              </LkFormGroup>
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default SettingsBoxs
