'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function LiveMonitorPage() {
  return (
    <>
      <PageTItle title="LIVE MONITOR" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Live Monitor admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
