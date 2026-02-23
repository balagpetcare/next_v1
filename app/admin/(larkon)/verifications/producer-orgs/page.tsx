'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VerificationsProducerOrgsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/verifications?tab=producer_orgs')
  }, [router])
  return null
}

