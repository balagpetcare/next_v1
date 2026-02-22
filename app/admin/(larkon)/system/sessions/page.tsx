'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function ActiveSessionsPage() {
  return (
    <>
      <PageTItle title="ACTIVE SESSIONS" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Active sessions admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
