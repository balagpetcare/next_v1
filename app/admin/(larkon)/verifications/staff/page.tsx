'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VerificationsStaffRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/verifications?tab=staff')
  }, [router])
  return null
}

