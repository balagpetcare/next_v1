'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function IntegrationsPage() {
  return (
    <>
      <PageTItle title="INTEGRATIONS" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Integrations admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
