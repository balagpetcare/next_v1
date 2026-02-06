"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Icon } from '@iconify/react';
import PageHeader from '@/src/bpa/components/PageHeader';
import { apiGet, apiPatch } from "../../../../lib/api";
import SectionCard from '@/src/bpa/admin/components/SectionCard';
import StatusChip from '@/src/bpa/admin/components/StatusChip';
import StatCard from '@/src/bpa/admin/components/StatCard';

const STATUS = ["PENDING_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"]; 

export default function Page() {
  const params = useParams();
  const id = params?.id;
  const [row, setRow] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({ name: "", supportPhone: "", status: "PENDING_REVIEW" });

  async function load() {
    if (!id) return;
    setError("");
    try {
      const [org, fin] = await Promise.all([
        apiGet(`/api/v1/admin/organizations/${id}`),
        apiGet(`/api/v1/reports/revenue?orgId=${id}`).catch(() => ({ data: null })),
      ]);
      setRow(org?.data || null);
      setFinancial(fin?.data || null);
      setForm({
        name: org?.data?.name || "",
        supportPhone: org?.data?.supportPhone || "",
        status: org?.data?.status || "PENDING_REVIEW",
      });
    } catch (e) {
      setError(e?.message || "Failed");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const branches = useMemo(() => row?.branches || [], [row]);

  async function save() {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      await apiPatch(`/api/v1/admin/organizations/${id}`, {
        name: form.name,
        supportPhone: form.supportPhone || null,
        status: form.status,
      });
      await load();
    } catch (e) {
      setError(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount || 0);
  };

  if (error) return <div className="container-fluid"><div className="alert alert-danger">{error}</div></div>;
  if (!row) return <div className="container-fluid"><div className="text-secondary">Loading...</div></div>;

  return (
    <div className="container-fluid">
      <PageHeader
        title={`Organization #${row.id}`}
        subtitle={`Owner User #${row.ownerUserId} • <StatusChip status={row.status} />`}
        right={<a href="/admin/organizations" className="btn btn-outline-secondary">← Back</a>}
      />

      {financial && (
        <div className="row g-3 mb-3">
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Total Revenue" 
              value={formatCurrency(financial.totalRevenue)}
              icon={<Icon icon="solar:wallet-money-bold" />}
              tone="success"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Total Orders" 
              value={financial.totalOrders}
              icon={<Icon icon="solar:cart-bold" />}
              tone="primary"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Branches" 
              value={branches.length}
              icon={<Icon icon="solar:shop-2-bold" />}
              tone="info"
            />
          </div>
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <SectionCard title="Organization Information">
            <div className="mb-3">
              <label className="form-label">Organization name</label>
              <input 
                className="form-control" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Support phone</label>
              <input 
                className="form-control" 
                value={form.supportPhone} 
                onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} 
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Status</label>
              <select 
                className="form-select" 
                value={form.status} 
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button onClick={save} disabled={busy} className="btn btn-primary">
              {busy ? "Saving..." : "Save Changes"}
            </button>
          </SectionCard>
        </div>

        <div className="col-12 col-xl-6">
          <SectionCard title="KYC Information">
            <Field label="Has legal profile" value={row.legalProfile ? "Yes" : "No"} />
            {row.legalProfile ? (
              <>
                <Field label="Registration type" value={row.legalProfile.registrationType} />
                <Field label="Trade license" value={row.legalProfile.tradeLicenseNumber || "—"} />
                <Field label="TIN" value={row.legalProfile.tinNumber || "—"} />
                <Field label="Verification Status" value={row.legalProfile.verificationStatus} />
                {row.legalProfile.verificationStatus && (
                  <div className="mt-2">
                    <a 
                      href={`/admin/verifications/organizations/${row.legalProfile.id}`} 
                      className="btn btn-sm btn-outline-primary"
                    >
                      View Verification
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div className="text-secondary-light">No KYC profile attached yet.</div>
            )}
          </SectionCard>
        </div>
      </div>

      <div className="row g-3 mt-3">
        <div className="col-12">
          <SectionCard title={`Branches (${branches.length})`}>
            <div className="row g-2">
              {branches.map((b) => (
                <div key={b.id} className="col-12 col-md-6 col-lg-4">
                  <div className="card radius-12 p-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-semibold">{b.name}</div>
                        <div className="text-secondary" style={{ fontSize: 12 }}>
                          #{b.id} • <StatusChip status={b.status} /> • <StatusChip status={b.verificationStatus} />
                        </div>
                      </div>
                      <a href={`/admin/branches/${b.id}`} className="btn btn-sm btn-primary">
                        View
                      </a>
                    </div>
                  </div>
                </div>
              ))}
              {!branches.length && (
                <div className="col-12 text-secondary text-center py-3">No branches.</div>
              )}
            </div>
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
      <div className="text-end" style={{ fontWeight: 600 }}>{String(value ?? "—")}</div>
    </div>
  );
}
