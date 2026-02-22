'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function PricingPage() {
  return (
    <>
      <PageTItle title="PRICING" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Pricing admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
