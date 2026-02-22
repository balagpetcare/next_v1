'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function ProductVersionsPage() {
  return (
    <>
      <PageTItle title="PRODUCT VERSIONS" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Product versions admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
