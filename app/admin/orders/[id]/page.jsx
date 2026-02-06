"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import PageHeader from '@/src/bpa/components/PageHeader';
import { apiGet, apiPost } from '@/lib/api';
import SectionCard from '@/src/bpa/admin/components/SectionCard';
import StatusChip from '@/src/bpa/admin/components/StatusChip';

export default function Page() {
  const params = useParams();
  const id = params?.id;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const r = await apiGet(`/api/v1/orders/${id}`);
      setOrder(r?.data || null);
    } catch (e) {
      setError(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const handleStatusUpdate = async (newStatus) => {
    if (!confirm(`Update order status to ${newStatus}?`)) return;
    try {
      await apiPost(`/api/v1/orders/${id}/status`, { status: newStatus });
      alert("Status updated");
      load();
    } catch (e) {
      alert(e?.message || "Failed to update");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount || 0);
  };

  if (loading) return <div className="container-fluid"><div className="text-secondary">Loading...</div></div>;
  if (error) return <div className="container-fluid"><div className="alert alert-danger">{error}</div></div>;
  if (!order) return <div className="container-fluid"><div className="text-secondary">Not found.</div></div>;

  return (
    <div className="container-fluid">
      <PageHeader
        title="Order Details"
        subtitle={
          <span className="text-secondary" style={{ fontSize: 13 }}>
            Order #{order.id} • <StatusChip status={order.status} /> • <StatusChip status={order.paymentStatus} />
          </span>
        }
        right={
          <div className="d-flex gap-2">
            {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
              <div className="dropdown">
                <button className="btn btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                  Update Status
                </button>
                <ul className="dropdown-menu">
                  <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleStatusUpdate('CONFIRMED'); }}>Confirmed</a></li>
                  <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleStatusUpdate('PROCESSING'); }}>Processing</a></li>
                  <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleStatusUpdate('SHIPPED'); }}>Shipped</a></li>
                  <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleStatusUpdate('DELIVERED'); }}>Delivered</a></li>
                  <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleStatusUpdate('CANCELLED'); }}>Cancel</a></li>
                </ul>
              </div>
            )}
            <a href="/admin/orders" className="btn btn-outline-secondary">← Back</a>
          </div>
        }
      />

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <SectionCard title="Order Information">
            <Field label="Order ID" value={order.id} />
            <Field label="Customer" value={order.customer?.name || 'Guest'} />
            <Field label="Phone" value={order.customer?.phone || order.phone} />
            <Field label="Email" value={order.customer?.email || order.email} />
            <Field label="Branch" value={order.branch?.name} />
            <Field label="Status" value={order.status} />
            <Field label="Payment Status" value={order.paymentStatus} />
            <Field label="Payment Method" value={order.paymentMethod} />
            <Field label="Total Amount" value={formatCurrency(order.totalAmount)} />
            <Field label="Created" value={order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'} />
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
                        <td>{item.product?.name || '—'}</td>
                        <td>{item.variant?.title || 'Standard'}</td>
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
              <div className="text-secondary-light">No items</div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="d-flex justify-content-between gap-3 py-1" style={{ fontSize: 13 }}>
      <div className="text-secondary" style={{ minWidth: 140 }}>{label}</div>
      <div className="text-end" style={{ fontWeight: 600 }}>{String(value ?? '—')}</div>
    </div>
  );
}
