'use client'

import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import { useEffect, useState } from 'react'

export default function AdminDebugPage() {
  const [host, setHost] = useState<string>('')
  const [pathname, setPathname] = useState<string>('')
  const [userAgent, setUserAgent] = useState<string>('')

  useEffect(() => {
    setHost(window.location.host)
    setPathname(window.location.pathname)
    setUserAgent(window.navigator.userAgent)
  }, [])

  return (
    <AdminPageShell title="Debug" breadcrumbs={[{ label: 'System & Settings' }, { label: 'Debug' }]}>
      <SectionCard title="Admin panel routing">
        <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{`ADMIN\nHost: ${host || '—'}\nPath: ${pathname || '—'}\nUser-Agent: ${userAgent || '—'}\n`}</pre>
        <p className="mt-3 mb-0 text-secondary">
          If you see <strong>ADMIN</strong> here and the host/port is correct, routing is working.
        </p>
      </SectionCard>
    </AdminPageShell>
  )
}

