import IconifyIcon from '@larkon/components/wrappers/IconifyIcon'
import LkChoicesSelect from '@larkon-ui/components/LkChoicesSelect'
import LkFormGroup from '@larkon-ui/components/LkFormGroup'
import LkInput from '@larkon-ui/components/LkInput'
import LkTextarea from '@larkon-ui/components/LkTextarea'
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'

const GeneralSettings = () => {
  return (
    <Row>
      <Col lg={12}>
        <Card>
          <CardHeader>
            <CardTitle as={'h4'} className="d-flex align-items-center gap-1">
              <IconifyIcon icon="solar:settings-bold-duotone" className="text-primary fs-20" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardBody>
            <Row>
              <Col lg={6}>
                <LkFormGroup label="Meta Title" htmlFor="meta-name">
                  <LkInput type="text" id="meta-name" className="radius-12" placeholder="Title" />
                </LkFormGroup>
              </Col>
              <Col lg={6}>
                <LkFormGroup label="Meta Tag Keyword" htmlFor="meta-tag">
                  <LkInput type="text" id="meta-tag" className="radius-12" placeholder="Enter word" />
                </LkFormGroup>
              </Col>
              <Col lg={6}>
                <LkChoicesSelect label="Store Themes" htmlFor="themes" id="themes" data-choices data-choices-groups data-placeholder="Select Themes">
                  <option>Default</option>
                  <option value="Dark">Dark</option>
                  <option value="Minimalist">Minimalist</option>
                  <option value="High Contrast">High Contrast</option>
                </LkChoicesSelect>
              </Col>
              <Col lg={6}>
                <LkChoicesSelect label="Layout" htmlFor="layout" id="layout" data-choices data-choices-groups data-placeholder="Select Layout">
                  <option>Default</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Dining">Dining</option>
                  <option value="Interior">Interior</option>
                  <option value="Home">Home</option>
                </LkChoicesSelect>
              </Col>
              <Col lg={12}>
                <LkFormGroup label="Description" htmlFor="description">
                  <LkTextarea className="radius-12 bg-light-subtle" id="description" rows={4} placeholder="Type description" defaultValue={''} />
                </LkFormGroup>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default GeneralSettings
