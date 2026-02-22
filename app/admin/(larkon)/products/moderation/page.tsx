'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function ModerationQueuePage() {
  return (
    <>
      <PageTItle title="MODERATION QUEUE" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Product moderation queue coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
