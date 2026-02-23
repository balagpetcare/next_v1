'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function VerificationsOwnerDetailRedirect() {
  const router = useRouter()
  const params = useParams<{ id?: string }>()
  useEffect(() => {
    const id = Number(params?.id)
    if (!id) return
    router.replace(`/admin/verifications?tab=owners&open=${id}`)
  }, [params, router])
  return null
}

