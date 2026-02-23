'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VerificationsOwnersRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/verifications?tab=owners')
  }, [router])
  return null
}

