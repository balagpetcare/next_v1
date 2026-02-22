'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function AuditLogsPage() {
  return (
    <>
      <PageTItle title="AUDIT LOGS" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Audit logs admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
