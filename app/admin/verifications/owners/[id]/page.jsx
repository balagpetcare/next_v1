"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PageHeader from '@/src/bpa/components/PageHeader';
import { apiGet } from '@/lib/api';
import SectionCard from '@/src/bpa/admin/components/SectionCard';
import StatusChip from '@/src/bpa/admin/components/StatusChip';
import DecisionPanel from '@/src/bpa/admin/components/DecisionPanel';
import DocGrid from '@/src/bpa/admin/components/DocGrid';
import CommentThread from '@/src/bpa/admin/components/CommentThread';
import TimelineView from '@/src/bpa/admin/components/TimelineView';
import { apiPost } from '@/lib/api';

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
      const r = await apiGet(`/api/v1/admin/verifications/owners/${id}`);
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
        title="Owner KYC Review"
        subtitle={
          <span className="text-secondary" style={{ fontSize: 13 }}>
            #{row.id} • User #{row.userId} • <StatusChip status={row.verificationStatus} />
          </span>
        }
        right={<a href="/admin/verifications/owners" className="btn btn-outline-secondary">← Back</a>}
      />

      <div className="row g-3">
        {/* Left: Summary */}
        <div className="col-12 col-xl-4">
          <SectionCard title="Owner Summary">
            <Field label="Full name" value={row.fullName} />
            <Field label="Mobile" value={row.mobile || row.user?.auth?.phone} />
            <Field label="Email" value={row.email || row.user?.auth?.email} />
            <Field label="NID" value={row.nidNumber} />
            <Field label="Emergency" value={`${row.emergencyContactName || '—'} (${row.emergencyContactPhone || '—'})`} />
            <Field label="Submitted" value={row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—'} />
          </SectionCard>

          <div className="mt-3">
            <SectionCard title="Decision">
              <DecisionPanel 
                basePath={`/api/v1/admin/verifications/owners/${row.id}`} 
                onDone={load} 
              />
            </SectionCard>
          </div>
        </div>

        {/* Middle: Documents */}
        <div className="col-12 col-xl-5">
          <SectionCard title="Documents">
            <DocGrid documents={row.documents || []} />
          </SectionCard>

          <div className="mt-3">
            <SectionCard title="Verification History Timeline">
              <TimelineView logs={row.logs || []} />
            </SectionCard>
          </div>
        </div>

        {/* Right: Comments */}
        <div className="col-12 col-xl-3">
          <SectionCard title="Comments / Notes">
            <CommentThread 
              comments={row.logs?.filter(l => ['COMMENT', 'INTERNAL_NOTE'].includes(l.action)) || []}
              onSend={async (text) => {
                try {
                  await apiPost(`/api/v1/admin/verifications/owners/${row.id}/comment`, { comment: text });
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
