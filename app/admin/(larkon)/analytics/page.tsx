'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function AnalyticsPage() {
  return (
    <>
      <PageTItle title="ANALYTICS" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Analytics admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
