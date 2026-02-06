"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PageHeader from '@/src/bpa/components/PageHeader';
import { apiGet, apiPost } from '@/lib/api';
import SectionCard from '@/src/bpa/admin/components/SectionCard';
import StatusChip from '@/src/bpa/admin/components/StatusChip';
import DecisionPanel from '@/src/bpa/admin/components/DecisionPanel';
import CommentThread from '@/src/bpa/admin/components/CommentThread';

export default function Page() {
  const params = useParams();
  const id = params?.id;
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const r = await apiGet(`/api/v1/admin/verifications/staff/${id}`);
      setRow(r?.data || null);
    } catch (e) {
      setError(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <div className="container-fluid"><div className="text-secondary">Loading...</div></div>;
  if (error) return <div className="container-fluid"><div className="alert alert-danger">{error}</div></div>;
  if (!row) return <div className="container-fluid"><div className="text-secondary">Not found.</div></div>;

  return (
    <div className="container-fluid">
      <PageHeader
        title="Staff Verification Review"
        subtitle={
          <span className="text-secondary" style={{ fontSize: 13 }}>
            Staff #{row.id} • User #{row.userId} • <StatusChip status={row.status} />
          </span>
        }
        right={<a href="/admin/verifications/staff" className="btn btn-outline-secondary">← Back</a>}
      />

      <div className="row g-3">
        {/* Left: Summary */}
        <div className="col-12 col-xl-4">
          <SectionCard title="Staff Summary">
            <Field label="Full Name" value={row.fullName} />
            <Field label="Phone" value={row.phone || row.user?.auth?.phone} />
            <Field label="Email" value={row.user?.auth?.email} />
            <Field label="Title" value={row.title} />
            <Field label="User ID" value={row.userId} />
            <Field label="Status" value={row.status} />
          </SectionCard>

          <div className="mt-3">
            <SectionCard title="Roles">
              {row.roles && row.roles.length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {row.roles.map((sr, idx) => (
                    <span key={idx} className="badge bg-primary-50 text-primary-600">
                      {sr.role?.key || sr.role?.name || '—'}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-secondary-light">No roles assigned</div>
              )}
            </SectionCard>
          </div>

          <div className="mt-3">
            <SectionCard title="Branch Assignments">
              {row.branches && row.branches.length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {row.branches.map((sb, idx) => (
                    <div key={idx} className="p-2 border radius-8">
                      <div className="fw-semibold">{sb.branch?.name || `Branch #${sb.branchId}`}</div>
                      {sb.position && (
                        <div className="text-secondary-light" style={{ fontSize: 12 }}>Position: {sb.position}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-secondary-light">No branch assignments</div>
              )}
            </SectionCard>
          </div>

          <div className="mt-3">
            <SectionCard title="Decision">
              <DecisionPanel 
                basePath={`/api/v1/admin/verifications/staff/${row.id}`} 
                onDone={load} 
              />
            </SectionCard>
          </div>
        </div>

        {/* Middle: Timeline */}
        <div className="col-12 col-xl-5">
          <SectionCard title="Verification History Timeline">
            <Timeline logs={row.logs || []} />
          </SectionCard>
        </div>

        {/* Right: Comments */}
        <div className="col-12 col-xl-3">
          <SectionCard title="Comments / Notes">
            <CommentThread 
              comments={row.logs?.filter(l => ['COMMENT', 'INTERNAL_NOTE'].includes(l.action)) || []}
              onSend={async (text) => {
                try {
                  await apiPost(`/api/v1/admin/verifications/staff/${row.id}/comment`, { comment: text });
                  load();
                } catch (e) {
                  alert(e?.message || 'Failed to send comment');
                }
              }}
            />
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

function Timeline({ logs }) {
  const items = (logs || []).filter((l) => !['COMMENT', 'INTERNAL_NOTE'].includes(l.action));
  if (!items.length) return <div className="text-secondary text-center py-3" style={{ fontSize: 13 }}>No audit logs.</div>;

  const getStatusColor = (status) => {
    if (!status) return 'secondary';
    const s = status.toUpperCase();
    if (s === 'ACTIVE' || s === 'APPROVED') return 'success';
    if (s === 'REJECTED') return 'danger';
    if (s === 'PENDING' || s === 'UNDER_REVIEW') return 'info';
    if (s === 'SUSPENDED') return 'warning';
    return 'secondary';
  };

  return (
    <div className="d-flex flex-column gap-2">
      {items.map((l, idx) => (
        <div key={l.id || idx} className="border radius-12 p-3 position-relative" style={{ paddingLeft: 40 }}>
          <div 
            className="position-absolute start-0 top-0 h-100 d-flex align-items-center"
            style={{ width: 4, background: `var(--bs-${getStatusColor(l.toStatus)}-500)`, borderRadius: '12px 0 0 12px' }}
          />
          <div className="d-flex justify-content-between gap-2 mb-1">
            <div className="fw-semibold" style={{ fontSize: 14 }}>{l.action}</div>
            <div className="text-secondary" style={{ fontSize: 12 }}>{new Date(l.createdAt).toLocaleString()}</div>
          </div>
          {(l.fromStatus || l.toStatus) && (
            <div className="d-flex align-items-center gap-2 mb-2">
              {l.fromStatus && (
                <span className={`badge bg-${getStatusColor(l.fromStatus)}-50 text-${getStatusColor(l.fromStatus)}-600`}>
                  {l.fromStatus}
                </span>
              )}
              {l.fromStatus && l.toStatus && <span>→</span>}
              {l.toStatus && (
                <span className={`badge bg-${getStatusColor(l.toStatus)}-50 text-${getStatusColor(l.toStatus)}-600`}>
                  {l.toStatus}
                </span>
              )}
            </div>
          )}
          {l.note && (
            <div className="text-secondary-light mt-2 p-2 bg-light radius-8" style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
              {l.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
