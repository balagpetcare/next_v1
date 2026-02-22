'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function MasterCatalogPage() {
  return (
    <>
      <PageTItle title="MASTER CATALOG" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Master catalog admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
