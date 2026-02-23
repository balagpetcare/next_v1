'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VerificationsOrganizationsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/verifications?tab=organizations')
  }, [router])
  return null
}

