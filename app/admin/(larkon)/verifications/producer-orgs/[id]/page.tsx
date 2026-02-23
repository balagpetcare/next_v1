'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function VerificationsProducerOrgDetailRedirect() {
  const router = useRouter()
  const params = useParams<{ id?: string }>()
  useEffect(() => {
    const id = Number(params?.id)
    if (!id) return
    router.replace(`/admin/verifications?tab=producer_orgs&open=${id}`)
  }, [params, router])
  return null
}

