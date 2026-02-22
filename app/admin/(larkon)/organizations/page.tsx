'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function AdminOrganizationsStubPage() {
  return (
    <>
      <PageTItle title="ORGANIZATIONS" />
      <Card>
        <Card.Body className="text-center py-5">
          <h5 className="text-muted mb-3">Coming Soon</h5>
          <p className="text-muted mb-0">
            Placeholder for <code>/admin/organizations</code>. Organization management module will be wired here.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
