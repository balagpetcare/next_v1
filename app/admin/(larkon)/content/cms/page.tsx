'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function CmsPagesPage() {
  return (
    <>
      <PageTItle title="CMS PAGES" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. CMS pages admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
