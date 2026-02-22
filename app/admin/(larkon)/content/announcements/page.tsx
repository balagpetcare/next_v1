'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function AnnouncementsPage() {
  return (
    <>
      <PageTItle title="ANNOUNCEMENTS" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Announcements admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
