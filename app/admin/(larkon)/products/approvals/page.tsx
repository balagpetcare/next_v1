'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function ProductApprovalsPage() {
  return (
    <>
      <PageTItle title="PRODUCT APPROVALS" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Product approvals admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
