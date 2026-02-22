'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function SupportTicketsPage() {
  return (
    <>
      <PageTItle title="SUPPORT TICKETS" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Support tickets admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
