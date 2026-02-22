'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function FundraisingPage() {
  return (
    <>
      <PageTItle title="FUNDRAISING" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Fundraising admin panel coming soon. This feature is policy-gated (DONATION).
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
