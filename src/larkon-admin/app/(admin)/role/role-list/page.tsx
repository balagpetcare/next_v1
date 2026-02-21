import PageTItle from '@larkon/components/PageTItle'
import IconifyIcon from '@larkon/components/wrappers/IconifyIcon'
import { getRoleListData } from '@larkon/helpers/data'
import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Fragment } from 'react'
export const dynamic = 'force-dynamic'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { PaginationWithRouter } from '@/src/components/common/PaginationWithRouter'

export const metadata: Metadata = { title: 'Role List' }

const RoleListPage = async () => {
  const roleListData = await getRoleListData()
  return (
    <>
      <PageTItle title="ROLES LIST" />
      <Card className="overflow-hiddenCoupons">
        <CardBody className="p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0 table-hover table-centered">
              <thead className="bg-light-subtle">
                <tr>
                  <th>Role</th>
                  <th>Workspace</th>
                  <th>Tags</th>
                  <th>Users</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {roleListData.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.role}</td>
                    {item.icon ? (
                      <td>
                        {item.icon && <Image src={item.icon} className="avatar-xs rounded-circle me-1" alt="..." />} {item.workspace}
                      </td>
                    ) : (
                      <td>
                        <Link href="" className="link-primary">
                          + {item.workspace}
                        </Link>
                      </td>
                    )}
                    <td>
                      {item.tags.map((tagItem, idx) => (
                          <span key={idx} className="badge bg-light-subtle text-muted border py-1 px-2 me-1">
                            {tagItem}
                          </span>
                      ))}{' '}
                    </td>
                    <td>
                      <div className="avatar-group">
                        {item.users &&
                          item.users.map((user, idx) => (
                            <Fragment key={idx}>
                              {user.image &&
                                user.image.map((img, idx) => (
                                  <div className="avatar" key={idx}>
                                    <Image src={img} alt="avatar" className="rounded-circle avatar-sm" />
                                  </div>
                                ))}
                              {user.TextAvatar &&
                                user.TextAvatar.map((text, idx) => (
                                  <div className="avatar" key={idx}>
                                    <span
                                      className={`avatar-sm d-flex align-items-center justify-content-center bg-${text.variant}-subtle text-${text.variant} rounded-circle fw-bold shadow`}>
                                      {text.text}
                                    </span>
                                  </div>
                                ))}
                            </Fragment>
                          ))}
                        {!item.users && (
                          <Link href="" className="link-primary">
                            + Add User
                          </Link>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="form-check form-switch">
                        {item.status ? (
                          <input className="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckChecked1" defaultChecked />
                        ) : (
                          <input className="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckChecked1" />
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Link href="" className="btn btn-light btn-sm">
                          <IconifyIcon icon="solar:eye-broken" className="align-middle fs-18" />
                        </Link>
                        <Link href="/role/role-edit" className="btn btn-soft-primary btn-sm">
                          <IconifyIcon icon="solar:pen-2-broken" className="align-middle fs-18" />
                        </Link>
                        <Link href="" className="btn btn-soft-danger btn-sm">
                          <IconifyIcon icon="solar:trash-bin-minimalistic-2-broken" className="align-middle fs-18" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
        <Row className="g-0 align-items-center justify-content-between text-center text-sm-start p-3 border-top">
          <div className="col-sm">
            <div className="text-muted">
              Showing <span className="fw-semibold">10</span> of <span className="fw-semibold">59</span> Results
            </div>
          </div>
          <Col sm={'auto'} className="mt-3 mt-sm-0">
            <PaginationWithRouter currentPage={1} totalPages={3} align="end" ariaLabel="Role list pagination" />
          </Col>
        </Row>
      </Card>
    </>
  )
}

export default RoleListPage
