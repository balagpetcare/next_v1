'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function OnlineStorePage() {
  return (
    <>
      <PageTItle title="ONLINE STORE" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Online store admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
