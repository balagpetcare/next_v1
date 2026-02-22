'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function ContentHubPage() {
  return (
    <>
      <PageTItle title="CONTENT HUB" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Content hub admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
