'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function PosTransactionsPage() {
  return (
    <>
      <PageTItle title="POS TRANSACTIONS" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. POS transactions admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
