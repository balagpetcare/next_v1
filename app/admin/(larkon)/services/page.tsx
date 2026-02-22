'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function ServiceCatalogPage() {
  return (
    <>
      <PageTItle title="SERVICE CATALOG" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Service catalog admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
