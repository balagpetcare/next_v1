'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function AdminUsersStubPage() {
  return (
    <>
      <PageTItle title="USERS" />
      <Card>
        <Card.Body className="text-center py-5">
          <h5 className="text-muted mb-3">Coming Soon</h5>
          <p className="text-muted mb-0">
            Placeholder for <code>/admin/users</code>. User management module will be wired here.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
