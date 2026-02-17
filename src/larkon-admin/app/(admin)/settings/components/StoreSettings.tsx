import IconifyIcon from '@larkon/components/wrappers/IconifyIcon'
import LkChoicesSelect from '@larkon-ui/components/LkChoicesSelect'
import LkFormGroup from '@larkon-ui/components/LkFormGroup'
import LkInput from '@larkon-ui/components/LkInput'
import LkTextarea from '@larkon-ui/components/LkTextarea'
import React from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'

const StoreSettings = () => {
  return (
    <Row>
      <Col lg={12}>
        <Card>
          <CardHeader>
            <CardTitle as={'h4'} className="d-flex align-items-center gap-1">
              <IconifyIcon icon="solar:shop-2-bold-duotone" className="text-primary fs-20" />
              Store Settings
            </CardTitle>
          </CardHeader>
          <CardBody>
            <Row>
              <Col lg={6}>
                <form>
                  <LkFormGroup label="Store Name" htmlFor="store-name">
                    <LkInput type="text" id="store-name" placeholder="Enter name" />
                  </LkFormGroup>
                </form>
              </Col>
              <Col lg={6}>
                <form>
                  <LkFormGroup label="Store Owner Full Name" htmlFor="owner-name">
                    <LkInput type="text" id="owner-name" placeholder="Full name" />
                  </LkFormGroup>
                </form>
              </Col>
              <Col lg={6}>
                <LkFormGroup label="Owner Phone number" htmlFor="schedule-number">
                  <LkInput type="number" id="schedule-number" name="schedule-number" placeholder="Number" />
                </LkFormGroup>
              </Col>
              <Col lg={6}>
                <form>
                  <LkFormGroup label="Owner Email" htmlFor="schedule-email">
                    <LkInput type="email" id="schedule-email" name="schedule-email" placeholder="Email" />
                  </LkFormGroup>
                </form>
              </Col>
              <Col lg={12}>
                <LkFormGroup label="Full Address" htmlFor="address">
                  <LkTextarea className="bg-light-subtle" id="address" rows={3} placeholder="Type address" defaultValue={''} />
                </LkFormGroup>
              </Col>
              <Col lg={4}>
                <form>
                  <LkFormGroup label="Zip-Code" htmlFor="your-zipcode">
                    <LkInput type="number" id="your-zipcode" placeholder="zip-code" />
                  </LkFormGroup>
                </form>
              </Col>
              <Col lg={4}>
                <LkChoicesSelect label="City" htmlFor="choices-city" id="choices-city" data-choices data-choices-groups data-placeholder="Select City">
                  <option>Choose a city</option>
                  <optgroup label="UK">
                    <option value="London">London</option>
                    <option value="Manchester">Manchester</option>
                    <option value="Liverpool">Liverpool</option>
                  </optgroup>
                  <optgroup label="FR">
                    <option value="Paris">Paris</option>
                    <option value="Lyon">Lyon</option>
                    <option value="Marseille">Marseille</option>
                  </optgroup>
                  <optgroup label="DE" disabled>
                    <option value="Hamburg">Hamburg</option>
                    <option value="Munich">Munich</option>
                    <option value="Berlin">Berlin</option>
                  </optgroup>
                  <optgroup label="US">
                    <option value="New York">New York</option>
                    <option value="Washington" disabled>
                      Washington
                    </option>
                    <option value="Michigan">Michigan</option>
                  </optgroup>
                  <optgroup label="SP">
                    <option value="Madrid">Madrid</option>
                    <option value="Barcelona">Barcelona</option>
                    <option value="Malaga">Malaga</option>
                  </optgroup>
                  <optgroup label="CA">
                    <option value="Montreal">Montreal</option>
                    <option value="Toronto">Toronto</option>
                    <option value="Vancouver">Vancouver</option>
                  </optgroup>
                </LkChoicesSelect>
              </Col>
              <Col lg={4}>
                <LkChoicesSelect label="Country" htmlFor="choices-country" id="choices-country" data-choices data-choices-groups data-placeholder="Select Country">
                  <option>Choose a country</option>
                  <optgroup>
                    <option>United Kingdom</option>
                    <option value="Fran">France</option>
                    <option value="Netherlands">Netherlands</option>
                    <option value="U.S.A">U.S.A</option>
                    <option value="Denmark">Denmark</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="India">India</option>
                    <option value="Germany">Germany</option>
                    <option value="Spain">Spain</option>
                    <option value="United Arab Emirates">United Arab Emirates</option>
                  </optgroup>
                </LkChoicesSelect>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default StoreSettings
