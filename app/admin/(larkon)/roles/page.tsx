'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RolesRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/role/role-list')
  }, [router])
  return null
}

