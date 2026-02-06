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
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const r = await apiGet(`/api/v1/products/${id}`);
      setProduct(r?.data || null);
    } catch (e) {
      setError(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const handleApprove = async () => {
    if (!confirm("Approve this product?")) return;
    try {
      await apiPost(`/api/v1/products/${id}/approve`, {});
      alert("Product approved");
      load();
    } catch (e) {
      alert(e?.message || "Failed to approve");
    }
  };

  const handleReject = async () => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      await apiPost(`/api/v1/products/${id}/reject`, { reason });
      alert("Product rejected");
      load();
    } catch (e) {
      alert(e?.message || "Failed to reject");
    }
  };

  if (loading) return <div className="container-fluid"><div className="text-secondary">Loading...</div></div>;
  if (error) return <div className="container-fluid"><div className="alert alert-danger">{error}</div></div>;
  if (!product) return <div className="container-fluid"><div className="text-secondary">Not found.</div></div>;

  return (
    <div className="container-fluid">
      <PageHeader
        title="Product Details"
        subtitle={
          <span className="text-secondary" style={{ fontSize: 13 }}>
            ID: {product.id} • <StatusChip status={product.status} /> • <StatusChip status={product.approvalStatus} />
          </span>
        }
        right={
          <div className="d-flex gap-2">
            {product.approvalStatus === 'PENDING_APPROVAL' && (
              <>
                <button className="btn btn-success" onClick={handleApprove}>
                  <Icon icon="solar:check-circle-bold" /> Approve
                </button>
                <button className="btn btn-danger" onClick={handleReject}>
                  <Icon icon="solar:close-circle-bold" /> Reject
                </button>
              </>
            )}
            <a href="/admin/products" className="btn btn-outline-secondary">← Back</a>
          </div>
        }
      />

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
            <Field label="Created" value={product.createdAt ? new Date(product.createdAt).toLocaleString() : '—'} />
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
                        <td>{v.sku || '—'}</td>
                        <td>{v.title || 'Standard'}</td>
                        <td>{v.price ? `৳${v.price}` : '—'}</td>
                        <td>{v.stock || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-secondary-light">No variants</div>
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
      <div className="text-end" style={{ fontWeight: 600, wordBreak: 'break-word' }}>{String(value ?? '—')}</div>
    </div>
  );
}
