'use client'
import logoDark from '@larkon/assets/images/logo-dark.png'
import IconifyIcon from '@larkon/components/wrappers/IconifyIcon'
import LkChoicesSelect from '@larkon-ui/components/LkChoicesSelect'
import LkFlatpickr from '@larkon-ui/components/LkFlatpickr'
import LkFormGroup from '@larkon-ui/components/LkFormGroup'
import LkInput from '@larkon-ui/components/LkInput'
import LkTextarea from '@larkon-ui/components/LkTextarea'
import Image from 'next/image'
import Link from 'next/link'
import { Alert, Card, CardBody, Col, Row } from 'react-bootstrap'

const InvoiceAdd = () => {
  return (
    <>
      <Row className="justify-content-center">
        <Col lg={10}>
          <Card>
            <CardBody>
              <div className="pb-3 mb-4 position-relative border-bottom">
                <Row className="justify-content-between">
                  <Col lg={5}>
                    <div>
                      <div
                        className="w-50 auth-logo  bg-light-subtle p-2 border-primary rounded"
                        style={{ borderStyle: 'dashed', border: '1', borderWidth: 1 }}>
                        <div className="profile-photo-edit">
                          <input id="profile-img-file-input" type="file" className="profile-img-file-input" />
                          <label htmlFor="profile-img-file-input" className="profile-photo-edit avatar-xs">
                            <Image src={logoDark} className="logo-dark me-1 user-profile-image" alt="user-profile-image" height={24} />
                          </label>
                        </div>
                      </div>
                      <div className="mt-5 pt-2">
                        <LkFormGroup label="Sender Name" htmlFor="sender-name" className="text-dark">
                          <LkInput type="text" id="sender-name" className="radius-12" placeholder="First name" />
                        </LkFormGroup>
                        <LkFormGroup label="Sender Full Address" htmlFor="sender-address" className="text-dark">
                          <LkTextarea id="sender-address" className="radius-12" rows={3} placeholder="Enter address" defaultValue={''} />
                        </LkFormGroup>
                        <LkFormGroup label="Phone number" htmlFor="sender-number" className="text-dark">
                          <LkInput type="number" id="sender-number" className="radius-12" placeholder="Number" />
                        </LkFormGroup>
                      </div>
                    </div>
                  </Col>
                  <Col lg={5}>
                    <LkFormGroup label="Invoice Number :" htmlFor="invoice-no" className="text-dark">
                      <LkInput type="text" id="invoice-no" className="radius-12" placeholder="#INV-****" defaultValue="#INV-0758267/90" />
                    </LkFormGroup>
                    <LkFlatpickr label="Issue Date :" htmlFor="schedule-date" className="text-dark" placeholder="Basic datepicker" options={{ enableTime: false }} />
                    <LkFlatpickr label="Due Date :" htmlFor="due-date" className="text-dark" placeholder="dd-mm-yyyy" options={{ enableTime: false }} />
                    <LkFormGroup label="Amount :" htmlFor="product-price" className="text-dark">
                      <div className="input-group mb-3">
                        <span className="input-group-text fs-20 bg-light text-dark">
                          <IconifyIcon icon="bx:dollar" />
                        </span>
                        <LkInput type="number" id="product-price" className="radius-12" placeholder="000" />
                      </div>
                    </LkFormGroup>
                    <LkChoicesSelect label="Status :" htmlFor="status" className="text-dark" inputClassName="form-select radius-12" id="status" aria-label="Default select example">
                      <option>Paid</option>
                      <option value="Cancel">Cancel</option>
                      <option value="Pending">Pending</option>
                    </LkChoicesSelect>
                  </Col>
                </Row>
              </div>
              <Row className="justify-content-between">
                <Col lg={5}>
                  <h4 className="mb-3">Issue From :</h4>
                  <LkFormGroup label="" htmlFor="buyer-from" className="mb-2">
                    <LkInput type="text" id="buyer-from" className="radius-12" placeholder="First name" />
                  </LkFormGroup>
                  <LkFormGroup label="" htmlFor="buyer-address" className="mb-2">
                    <LkTextarea id="buyer-address" className="radius-12" rows={3} placeholder="Enter address" defaultValue={''} />
                  </LkFormGroup>
                  <LkFormGroup label="" htmlFor="buyer-number" className="mb-2">
                    <LkInput type="number" id="buyer-number" className="radius-12" placeholder="Number" />
                  </LkFormGroup>
                  <LkFormGroup label="" htmlFor="buyer-email" className="mb-2">
                    <LkInput type="email" id="buyer-email" className="radius-12" placeholder="Email Address" />
                  </LkFormGroup>
                </Col>
                <Col lg={5}>
                  <h4 className="mb-3">Issue For :</h4>
                  <LkFormGroup label="" htmlFor="issuer-from" className="mb-2">
                    <LkInput type="text" id="issuer-from" className="radius-12" placeholder="First name" />
                  </LkFormGroup>
                  <LkFormGroup label="" htmlFor="issuer-address" className="mb-2">
                    <LkTextarea id="issuer-address" className="radius-12" rows={3} placeholder="Enter address" defaultValue={''} />
                  </LkFormGroup>
                  <LkFormGroup label="" htmlFor="issuer-number" className="mb-2">
                    <LkInput type="number" id="issuer-number" className="radius-12" placeholder="Number" />
                  </LkFormGroup>
                  <LkFormGroup label="" htmlFor="issuer-email" className="mb-2">
                    <LkInput type="email" id="issuer-email" className="radius-12" placeholder="Email Address" />
                  </LkFormGroup>
                </Col>
              </Row>
              <Row className="mt-4">
                <Col xs={12}>
                  <div className="table-responsive table-borderless text-nowrap table-centered">
                    <table className="table mb-0">
                      <thead className="bg-light bg-opacity-50">
                        <tr>
                          <th className="border-0 py-2">Product Name</th>
                          <th className="border-0 py-2">Quantity</th>
                          <th className="border-0 py-2">Price</th>
                          <th className="border-0 py-2">Tax</th>
                          <th className="border-0 py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <div className="d-flex gap-3">
                              <div className="auth-logo border-0 rounded" style={{ borderStyle: 'dashed !important' }}>
                                <div className="profile-photo-edit">
                                  <input id="profile-img-file-input1" type="file" className="profile-img-file-input1" />
                                  <label htmlFor="profile-img-file-input1" className="profile-photo-edit avatar bg-light rounded"></label>
                                </div>
                              </div>
                              <div className="w-75">
                                <LkFormGroup label="" className="mb-3">
                                  <LkInput type="text" id="product-name" className="radius-12" placeholder="Product Name" />
                                </LkFormGroup>
                                <LkFormGroup label="" className="mb-3">
                                  <LkInput type="text" id="product-size" className="radius-12" placeholder="Product Size" />
                                </LkFormGroup>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="quantity">
                              <div className="input-step border bg-body-secondary p-1 rounded d-inline-flex overflow-visible">
                                <button type="button" className="minus bg-light text-dark border-0 rounded-1 fs-20 lh-1 h-100">
                                  -
                                </button>
                                <input
                                  type="number"
                                  className="text-dark text-center border-0 bg-body-secondary rounded h-100"
                                  defaultValue={1}
                                  min={0}
                                  max={100}
                                  readOnly
                                />
                                <button type="button" className="plus bg-light text-dark border-0 rounded-1 fs-20 lh-1 h-100">
                                  +
                                </button>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="input-group">
                              <span className="input-group-text fs-20 bg-light text-dark">
                                <IconifyIcon icon="bx:dollar" />
                              </span>
                              <LkInput type="number" id="product-price-table" className="radius-12" placeholder="000" />
                            </div>
                          </td>
                          <td>
                            <div className="input-group">
                              <span className="input-group-text fs-20 bg-light text-dark">
                                <IconifyIcon icon="bx:dollar" />
                              </span>
                              <LkInput type="number" id="product-tax" className="radius-12" placeholder="000" />
                            </div>
                          </td>
                          <td>
                            <div className="input-group">
                              <span className="input-group-text fs-20 bg-light text-dark">
                                <IconifyIcon icon="bx:dollar" />
                              </span>
                              <LkInput type="number" id="total" className="radius-12" placeholder="000" />
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="text-end border-top">
                    <div className="pt-3">
                      <Link href="#" className="btn btn-primary">
                        Clear Product
                      </Link>
                      &nbsp;
                      <Link href="#" className="btn btn-outline-primary">
                        Add More
                      </Link>
                    </div>
                  </div>
                </Col>
              </Row>
              <Row className="justify-content-end">
                <Col lg={4}>
                  <LkFormGroup label="Sub Total :" htmlFor="sub-total" className="text-dark">
                    <div className="input-group mb-3">
                      <span className="input-group-text fs-20 bg-light text-dark">
                        <IconifyIcon icon="bx:dollar" />
                      </span>
                      <LkInput type="number" id="sub-total" className="radius-12" />
                    </div>
                  </LkFormGroup>
                  <LkFormGroup label="Discount :" htmlFor="discount-price" className="text-dark">
                    <div className="input-group mb-3">
                      <span className="input-group-text fs-20 bg-light text-dark">
                        <IconifyIcon icon="bx:dollar" />
                      </span>
                      <LkInput type="number" id="discount-price" className="radius-12" />
                    </div>
                  </LkFormGroup>
                  <LkFormGroup label="Estimated Tax (15.5%) :" htmlFor="estimated-tax" className="text-dark">
                    <div className="input-group mb-3">
                      <span className="input-group-text fs-20 bg-light text-dark">
                        <IconifyIcon icon="bx:dollar" />
                      </span>
                      <LkInput type="number" id="estimated-tax" className="radius-12" />
                    </div>
                  </LkFormGroup>
                  <div className="border-top">
                    <LkFormGroup label="Grand Amount :" htmlFor="grand-total" className="text-dark pt-3">
                      <div className="input-group mb-3">
                        <span className="input-group-text fs-20 bg-light text-dark">
                          <IconifyIcon icon="bx:dollar" />
                        </span>
                        <LkInput type="number" id="grand-total" className="radius-12" />
                      </div>
                    </LkFormGroup>
                  </div>
                </Col>
              </Row>
              <Row className="mt-3">
                <Col lg={12}>
                  <Alert className="alert-danger alert-icon p-2" role="alert">
                    <div className="d-flex align-items-center">
                      <div className="avatar-sm rounded bg-danger d-flex justify-content-center align-items-center fs-18 me-2 flex-shrink-0">
                        <IconifyIcon icon="bx-info-circle" className="text-white" />
                      </div>
                      <div className="flex-grow-1">
                        All accounts are to be paid within 7 days from receipt of invoice. To be paid by cheque or credit card or direct payment
                        online. If account is not paid within 7 days the credits details supplied as confirmation of work undertaken will be charged
                        the agreed quoted fee noted above.
                      </div>
                    </div>
                  </Alert>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default InvoiceAdd
