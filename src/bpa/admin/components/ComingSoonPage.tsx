'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

type ComingSoonPageProps = {
  /** Page title shown in header (e.g. "LIVE MONITOR") */
  title: string
  /** Optional short description; defaults to "Module not enabled yet. ... coming soon." */
  description?: string
}

const defaultDescription = 'Module not enabled yet. This feature is coming soon.'

export default function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  const text = description ?? defaultDescription
  return (
    <>
      <PageTItle title={title} />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">{text}</p>
        </Card.Body>
      </Card>
    </>
  )
}
