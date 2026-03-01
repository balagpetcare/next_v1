'use client'

import Link from 'next/link'
import { ReactNode } from 'react'

type Breadcrumb = { label: string; href?: string }

export default function AdminPageShell({
  title,
  breadcrumbs = [],
  actions,
  children,
}: {
  title: string
  breadcrumbs?: Breadcrumb[]
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="mb-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              {breadcrumbs.map((b, i) => (
                <li key={i} className="breadcrumb-item">
                  {b.href ? <Link href={b.href}>{b.label}</Link> : b.label}
                </li>
              ))}
            </ol>
          </nav>
          <h1 className="h4 mb-0">{title}</h1>
        </div>
        {actions ? <div className="d-flex align-items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}
