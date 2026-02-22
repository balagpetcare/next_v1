'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function SystemHubPage() {
  return (
    <>
      <PageTItle title="SYSTEM HUB" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. System hub admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
