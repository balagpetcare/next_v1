"use client"
import Link from 'next/link'
import { Card, CardBody, CardFooter, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'
import LkChoicesSelect from '@larkon-ui/components/LkChoicesSelect'
import LkFormGroup from '@larkon-ui/components/LkFormGroup'
import LkInput from '@larkon-ui/components/LkInput'
import LkRadio from '@larkon-ui/components/LkRadio'

const RoleAdd = () => {
  return (
    <Row>
      <Col lg={12}>
        <Card>
          <CardHeader>
            <CardTitle as={'h4'}>Roles Information</CardTitle>
          </CardHeader>
          <CardBody>
            <Row>
              <Col lg={6}>
                <form>
                  <LkFormGroup label="Roles Name" htmlFor="roles-name">
                    <LkInput type="text" id="roles-name" placeholder="Role name" />
                  </LkFormGroup>
                </form>
              </Col>
              <Col lg={6}>
                <LkChoicesSelect label="Add Workspace" htmlFor="workspace" id="workspace" data-choices data-choices-groups data-placeholder="Select Workspace" defaultValue="Select Workspace">
                  <option value="Facebook">Facebook</option>
                  <option value="Slack">Slack</option>
                  <option value="Zoom">Zoom</option>
                  <option value="Analytics">Analytics</option>
                  <option value="Meet">Meet</option>
                  <option value="Mail">Mail</option>
                  <option value="Strip">Strip</option>
                </LkChoicesSelect>
              </Col>
              <Col lg={6}>
                <LkChoicesSelect
                  label="Tag"
                  htmlFor="role-tag"
                  options={{ removeItemButton: true }}
                  id="choices-multiple-remove-button"
                  data-choices
                  data-choices-removeitem
                  multiple>
                  <option value="Manager">Manager</option>
                  <option value="Product">Product</option>
                  <option value="Data">Data</option>
                  <option value="Designer">Designer</option>
                  <option value="Supporter">Supporter</option>
                  <option value="System Design">System Design</option>
                  <option value="QA">QA</option>
                </LkChoicesSelect>
              </Col>
              <Col lg={6}>
<LkFormGroup label="User Name" htmlFor="user-name">
                    <LkInput type="text" id="user-name" placeholder="Enter name" />
                  </LkFormGroup>
              </Col>
              <Col lg={6}>
                <p>User Status </p>
                <div className="d-flex gap-2 align-items-center">
                  <LkRadio type="radio" name="flexRadioDefault" id="flexRadioDefault1" defaultChecked label="Active" />
                  <LkRadio type="radio" name="flexRadioDefault" id="flexRadioDefault2" label="In Active" />
                </div>
              </Col>
            </Row>
          </CardBody>
          <CardFooter className="border-top">
            <Link href="" className="btn btn-primary">
              Create Roles
            </Link>
          </CardFooter>
        </Card>
      </Col>
    </Row>
  )
}

export default RoleAdd
