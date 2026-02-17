import IconifyIcon from '@larkon/components/wrappers/IconifyIcon'
import LkChoicesSelect from '@larkon-ui/components/LkChoicesSelect'
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'

const LocalizationSettings = () => {
  return (
    <Row>
      <Col lg={12}>
        <Card>
          <CardHeader>
            <CardTitle as={'h4'} className="d-flex align-items-center gap-1">
              <IconifyIcon icon="solar:compass-bold-duotone" className="text-primary fs-20" />
              Localization Settings
            </CardTitle>
          </CardHeader>
          <CardBody>
            <Row>
              <Col lg={6}>
                <LkChoicesSelect label="Country" htmlFor="choices-country1" id="choices-country1" data-choices data-choices-groups data-placeholder="Select Country">
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
              <Col lg={6}>
                <LkChoicesSelect label="Language" htmlFor="choices-language" id="choices-language" data-choices data-choices-groups data-placeholder="Select language">
                  <option>English</option>
                  <optgroup>
                    <option>Russian</option>
                    <option value="Arabic">Arabic</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Turkish">Turkish</option>
                    <option value="German">German</option>
                    <option value="Armenian">Armenian</option>
                    <option value="Italian">Italian</option>
                    <option value="Catalán">Catalán</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Japanese">Japanese</option>
                    <option value="French">French</option>
                  </optgroup>
                </LkChoicesSelect>
              </Col>
              <Col lg={6}>
                <LkChoicesSelect label="Currency" htmlFor="choices-currency" id="choices-currency" data-choices data-choices-groups data-placeholder="Select Currency">
                  <option>Us Dollar</option>
                  <optgroup>
                    <option>Pound</option>
                    <option value="Indian Rupee">Indian Rupee</option>
                    <option value="Euro">Euro</option>
                    <option value="Australian Dollar">Australian Dollar</option>
                    <option value="Japanese Yen">Japanese Yen</option>
                    <option value="Korean Won">Korean Won</option>
                  </optgroup>
                </LkChoicesSelect>
              </Col>
              <Col lg={6}>
                <LkChoicesSelect label="Length Class" htmlFor="choices-length" id="choices-length" data-choices data-choices-groups data-placeholder="Select Length">
                  <option>Centimeter</option>
                  <optgroup>
                    <option>Millimeter</option>
                    <option value="Inch">Inch</option>
                  </optgroup>
                </LkChoicesSelect>
              </Col>
              <Col lg={6}>
                <LkChoicesSelect label="Weight Class" htmlFor="choices-weight" id="choices-weight" data-choices data-choices-groups data-placeholder="Select Weight">
                  <option>Kilogram</option>
                  <optgroup>
                    <option>Gram</option>
                    <option value="Pound">Pound</option>
                    <option value="Ounce">Ounce</option>
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

export default LocalizationSettings
