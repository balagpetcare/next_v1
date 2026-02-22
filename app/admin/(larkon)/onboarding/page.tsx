'use client'

import PageTItle from '@larkon/components/PageTItle'
import { Card } from 'react-bootstrap'

export default function OnboardingPage() {
  return (
    <>
      <PageTItle title="ONBOARDING" />
      <Card>
        <Card.Body>
          <p className="text-secondary mb-0">
            Module not enabled yet. Onboarding admin panel coming soon.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}
