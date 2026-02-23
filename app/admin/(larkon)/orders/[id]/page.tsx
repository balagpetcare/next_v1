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

type OrderRecord = {
  id: number
  status?: string
  paymentStatus?: string
  paymentMethod?: string
  totalAmount?: number
  createdAt?: string
  customer?: { name?: string; phone?: string; email?: string }
  phone?: string
  email?: string
  branch?: { name?: string }
  items?: { id: number; quantity?: number; price?: number; total?: number; product?: { name?: string }; variant?: { title?: string } }[]
}

const STATUS_OPTIONS = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="d-flex justify-content-between gap-3 py-1" style={{ fontSize: 13 }}>
      <div className="text-secondary" style={{ minWidth: 140 }}>{label}</div>
      <div className="text-end" style={{ fontWeight: 600 }}>{value != null && value !== '' ? String(value) : '—'}</div>
    </div>
  )
}

export default function AdminOrderDetailPage() {
  const params = useParams()
  const id = params?.id as string | undefined
  const [order, setOrder] = useState<OrderRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const r = await apiGet<{ data?: OrderRecord }>(`/api/v1/orders/${id}`)
      setOrder(r?.data ?? null)
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const formatCurrency = (amount: number | undefined) =>
    new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount ?? 0)

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id) return
    try {
      await apiPost(`/api/v1/orders/${id}/status`, { status: newStatus })
      adminToast.success('Status updated')
      load()
    } catch (e) {
      adminToast.error((e as Error)?.message ?? 'Failed to update')
    }
  }

  if (loading && !order) {
    return (
      <AdminPageShell title="Order" breadcrumbs={[{ label: 'Orders', href: '/admin/orders/orders-list' }, { label: '…' }]}>
        <div className="text-secondary">Loading…</div>
      </AdminPageShell>
    )
  }
  if (error && !order) {
    return (
      <AdminPageShell title="Order" breadcrumbs={[{ label: 'Orders', href: '/admin/orders/orders-list' }, { label: 'Error' }]}>
        <div className="alert alert-danger">{error}</div>
        <Link href="/admin/orders/orders-list" className="btn btn-outline-secondary btn-sm mt-2">← Back</Link>
      </AdminPageShell>
    )
  }
  if (!order) {
    return (
      <AdminPageShell title="Order" breadcrumbs={[{ label: 'Orders', href: '/admin/orders/orders-list' }, { label: 'Not found' }]}>
        <div className="text-secondary">Order not found.</div>
        <Link href="/admin/orders/orders-list" className="btn btn-outline-secondary btn-sm mt-2">← Back</Link>
      </AdminPageShell>
    )
  }

  const canUpdateStatus = order.status !== 'DELIVERED' && order.status !== 'CANCELLED'

  return (
    <AdminPageShell
      title="Order Details"
      breadcrumbs={[
        { label: 'Orders', href: '/admin/orders/orders-list' },
        { label: `#${order.id}` },
      ]}
      actions={
        <div className="d-flex gap-2">
          {canUpdateStatus && (
            <div className="dropdown">
              <button className="btn btn-primary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                Update Status
              </button>
              <ul className="dropdown-menu">
                {STATUS_OPTIONS.map((s) => (
                  <li key={s}>
                    <button type="button" className="dropdown-item" onClick={() => handleStatusUpdate(s)}>
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link href="/admin/orders/orders-list" className="btn btn-outline-secondary btn-sm">← Back</Link>
        </div>
      }
    >
      <p className="text-secondary mb-3" style={{ fontSize: 13 }}>
        Order #{order.id} • <StatusChip status={order.status} /> <StatusChip status={order.paymentStatus} />
      </p>

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <SectionCard title="Order Information">
            <Field label="Order ID" value={order.id} />
            <Field label="Customer" value={order.customer?.name ?? 'Guest'} />
            <Field label="Phone" value={order.customer?.phone ?? order.phone} />
            <Field label="Email" value={order.customer?.email ?? order.email} />
            <Field label="Branch" value={order.branch?.name} />
            <Field label="Status" value={order.status} />
            <Field label="Payment Status" value={order.paymentStatus} />
            <Field label="Payment Method" value={order.paymentMethod} />
            <Field label="Total Amount" value={formatCurrency(order.totalAmount)} />
            <Field label="Created" value={order.createdAt ? new Date(order.createdAt).toLocaleString() : undefined} />
          </SectionCard>
        </div>

        <div className="col-12 col-xl-6">
          <SectionCard title="Order Items">
            {order.items && order.items.length > 0 ? (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Variant</th>
                      <th>Qty</th>
                      <th className="text-end">Price</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.product?.name ?? '—'}</td>
                        <td>{item.variant?.title ?? 'Standard'}</td>
                        <td>{item.quantity}</td>
                        <td className="text-end">{formatCurrency(item.price)}</td>
                        <td className="text-end fw-semibold">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="text-end fw-semibold">Total:</td>
                      <td className="text-end fw-bold">{formatCurrency(order.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-secondary">No items</div>
            )}
          </SectionCard>
        </div>
      </div>
    </AdminPageShell>
  )
}
