'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Admin orders index: redirect to orders list.
 * Menu /admin/orders can point here or directly to /admin/orders/orders-list.
 */
export default function AdminOrdersPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/orders/orders-list')
  }, [router])
  return (
    <div className="container-fluid">
      <p className="text-secondary">Redirecting to orders list…</p>
    </div>
  )
}
