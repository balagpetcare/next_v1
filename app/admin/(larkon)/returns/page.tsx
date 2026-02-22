'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function ReturnsPage() {
  return (
    <>
      <PageTItle title="RETURNS" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Returns admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
