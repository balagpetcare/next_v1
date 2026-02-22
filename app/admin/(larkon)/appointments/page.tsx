'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function AppointmentsPage() {
  return (
    <>
      <PageTItle title="APPOINTMENTS" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Appointments admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
