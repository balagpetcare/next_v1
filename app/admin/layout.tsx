'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (
      pathname?.startsWith('/admin/login') ||
      pathname?.startsWith('/admin/logout') ||
      pathname === '/admin/forbidden'
    ) {
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const apiBase =
          typeof window !== 'undefined'
            ? ''
            : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000')
        const res = await fetch(`${apiBase}/api/v1/admin/auth/me`, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        if (cancelled) return
        if (res.status === 401) {
          const next = encodeURIComponent(pathname || '/admin')
          router.replace(`/admin/login?next=${next}`)
          return
        }
        if (res.status === 403) {
          router.replace('/admin/forbidden')
          return
        }
        if (!res.ok) {
          const next = encodeURIComponent(pathname || '/admin')
          router.replace(`/admin/login?next=${next}`)
        }
      } catch {
        if (cancelled) return
        const next = encodeURIComponent(pathname || '/admin')
        router.replace(`/admin/login?next=${next}`)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pathname, router])

  return <>{children}</>
}
