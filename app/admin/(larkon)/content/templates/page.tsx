'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function TemplateLibraryPage() {
  return (
    <>
      <PageTItle title="TEMPLATE LIBRARY" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Template library admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
