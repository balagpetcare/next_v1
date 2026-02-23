'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { apiGet, apiPost } from '@/lib/api'
import AdminPageShell from '@/src/bpa/admin/components/AdminPageShell'
import SectionCard from '@/src/bpa/admin/components/SectionCard'
import StatusChip from '@/src/bpa/admin/components/StatusChip'
import { adminToast } from '@/src/bpa/admin/lib/adminToast'

type ProductRecord = {
  id: number
  name?: string
  slug?: string
  description?: string
  status?: string
  approvalStatus?: string
  createdAt?: string
  category?: { name?: string }
  brand?: { name?: string }
  variants?: { id: number; sku?: string; title?: string; price?: number; stock?: number }[]
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="d-flex justify-content-between gap-3 py-1" style={{ fontSize: 13 }}>
      <div className="text-secondary" style={{ minWidth: 140 }}>{label}</div>
      <div className="text-end" style={{ fontWeight: 600, wordBreak: 'break-word' }}>{value != null && value !== '' ? String(value) : '—'}</div>
    </div>
  )
}

export default function AdminProductDetailPage() {
  const params = useParams()
  const id = params?.id as string | undefined
  const [product, setProduct] = useState<ProductRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const r = await apiGet<{ data?: ProductRecord }>(`/api/v1/products/${id}`)
      setProduct(r?.data ?? null)
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleApprove = async () => {
    if (!id) return
    try {
      await apiPost(`/api/v1/products/${id}/approve`, {})
      adminToast.success('Product approved')
      load()
    } catch (e) {
      adminToast.error((e as Error)?.message ?? 'Failed to approve')
    }
  }

  const handleReject = async () => {
    if (!id) return
    const reason = window.prompt('Enter rejection reason:')
    if (reason == null) return
    try {
      await apiPost(`/api/v1/products/${id}/reject`, { reason: reason || undefined })
      adminToast.success('Product rejected')
      load()
    } catch (e) {
      adminToast.error((e as Error)?.message ?? 'Failed to reject')
    }
  }

  if (loading && !product) {
    return (
      <AdminPageShell title="Product" breadcrumbs={[{ label: 'Products', href: '/admin/products/product-list' }, { label: '…' }]}>
        <div className="text-secondary">Loading…</div>
      </AdminPageShell>
    )
  }
  if (error && !product) {
    return (
      <AdminPageShell title="Product" breadcrumbs={[{ label: 'Products', href: '/admin/products/product-list' }, { label: 'Error' }]}>
        <div className="alert alert-danger">{error}</div>
        <Link href="/admin/products/product-list" className="btn btn-outline-secondary btn-sm mt-2">← Back</Link>
      </AdminPageShell>
    )
  }
  if (!product) {
    return (
      <AdminPageShell title="Product" breadcrumbs={[{ label: 'Products', href: '/admin/products/product-list' }, { label: 'Not found' }]}>
        <div className="text-secondary">Product not found.</div>
        <Link href="/admin/products/product-list" className="btn btn-outline-secondary btn-sm mt-2">← Back</Link>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell
      title="Product Details"
      breadcrumbs={[
        { label: 'Products', href: '/admin/products/product-list' },
        { label: `#${product.id}` },
      ]}
      actions={
        <div className="d-flex gap-2">
          {product.approvalStatus === 'PENDING_APPROVAL' && (
            <>
              <button type="button" className="btn btn-success btn-sm" onClick={handleApprove}>
                <Icon icon="solar:check-circle-bold" /> Approve
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={handleReject}>
                <Icon icon="solar:close-circle-bold" /> Reject
              </button>
            </>
          )}
          <Link href="/admin/products/product-list" className="btn btn-outline-secondary btn-sm">← Back</Link>
        </div>
      }
    >
      <p className="text-secondary mb-3" style={{ fontSize: 13 }}>
        ID: {product.id} • <StatusChip status={product.status} /> <StatusChip status={product.approvalStatus} />
      </p>

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <SectionCard title="Product Information">
            <Field label="Name" value={product.name} />
            <Field label="Slug" value={product.slug} />
            <Field label="Description" value={product.description} />
            <Field label="Category" value={product.category?.name} />
            <Field label="Brand" value={product.brand?.name} />
            <Field label="Status" value={product.status} />
            <Field label="Approval Status" value={product.approvalStatus} />
            <Field label="Created" value={product.createdAt ? new Date(product.createdAt).toLocaleString() : undefined} />
          </SectionCard>
        </div>

        <div className="col-12 col-xl-6">
          <SectionCard title="Variants">
            {product.variants && product.variants.length > 0 ? (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Title</th>
                      <th>Price</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((v) => (
                      <tr key={v.id}>
                        <td>{v.sku ?? '—'}</td>
                        <td>{v.title ?? 'Standard'}</td>
                        <td>{v.price != null ? `৳${v.price}` : '—'}</td>
                        <td>{v.stock ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-secondary">No variants</div>
            )}
          </SectionCard>
        </div>
      </div>
    </AdminPageShell>
  )
}
