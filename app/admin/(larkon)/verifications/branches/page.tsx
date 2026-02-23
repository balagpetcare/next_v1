'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VerificationsBranchesRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/verifications?tab=branches')
  }, [router])
  return null
}

