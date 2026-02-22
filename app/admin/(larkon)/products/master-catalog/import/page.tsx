'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function MasterCatalogImportPage() {
  return (
    <>
      <PageTItle title="MASTER CATALOG IMPORT" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. CSV import for master catalog coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
