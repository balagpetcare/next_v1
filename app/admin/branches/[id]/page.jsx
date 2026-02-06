"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Icon } from '@iconify/react';
import PageHeader from '@/src/bpa/components/PageHeader';
import { apiGet, apiPatch } from "../../../../lib/api";
import { branchManagerApi } from "@/lib/adminApi";
import SectionCard from '@/src/bpa/admin/components/SectionCard';
import StatusChip from '@/src/bpa/admin/components/StatusChip';
import StatCard from '@/src/bpa/admin/components/StatCard';

const STATUS = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "INACTIVE", "BLOCKED"]; 
const VERIF = ["UNSUBMITTED", "SUBMITTED", "VERIFIED", "REJECTED"]; 

export default function Page() {
  const params = useParams();
  const id = params?.id;
  const [row, setRow] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [sales, setSales] = useState(null);
  const [managerKpis, setManagerKpis] = useState(null);
  const [staffOverview, setStaffOverview] = useState(null);
  const [form, setForm] = useState({ name: "", status: "DRAFT", verificationStatus: "UNSUBMITTED", typeCodes: [], capabilitiesJson: {}, featuresJson: {} });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!id) return;
    setError("");
    try {
      const [branch, inv, rev, kpisRes, staffRes] = await Promise.all([
        apiGet(`/api/v1/admin/branches/${id}`),
        apiGet(`/api/v1/inventory?branchId=${id}`).catch(() => ({ data: null })),
        apiGet(`/api/v1/reports/revenue?branchId=${id}`).catch(() => ({ data: null })),
        branchManagerApi.kpis(id).catch(() => ({ data: null })),
        branchManagerApi.staffOverview(id).catch(() => ({ data: null })),
      ]);
      const data = branch?.data || null;
      setRow(data);
      setInventory(inv?.data || null);
      setSales(rev?.data || null);
      setManagerKpis(kpisRes?.data || null);
      setStaffOverview(staffRes?.data || null);
      setForm({
        name: data?.name || "",
        status: data?.status || "DRAFT",
        verificationStatus: data?.verificationStatus || "UNSUBMITTED",
        typeCodes: (data?.typeLinks || []).map((x) => x?.branchType?.code).filter(Boolean),
        capabilitiesJson: data?.capabilitiesJson || {},
        featuresJson: data?.featuresJson || {},
      });
    } catch (e) {
      setError(e?.message || "Failed");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const typeCodesStr = useMemo(() => (form.typeCodes || []).join(", "), [form.typeCodes]);

  async function save() {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      await apiPatch(`/api/v1/admin/branches/${id}`, {
        name: form.name,
        status: form.status,
        verificationStatus: form.verificationStatus,
        typeCodes: String(typeCodesStr)
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        capabilitiesJson: form.capabilitiesJson,
        featuresJson: form.featuresJson,
      });
      await load();
      alert("Saved");
    } catch (e) {
      setError(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount || 0);
  };

  if (!row) return <div className="container-fluid"><div className="text-secondary">Loading...</div></div>;

  return (
    <div className="container-fluid">
      <PageHeader
        title={`Branch #${row.id}`}
        subtitle={
          <span className="text-secondary" style={{ fontSize: 13 }}>
            Org #{row.orgId} • {row.org?.name || "—"} • OwnerUser #{row.org?.ownerUserId || "—"}
          </span>
        }
        right={<a href="/admin/branches" className="btn btn-outline-secondary">← Back</a>}
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {managerKpis && (
        <div className="row g-3 mb-3">
          <div className="col-12">
            <h6 className="text-secondary mb-2">Manager KPIs (Today)</h6>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="Orders Today"
              value={managerKpis.orders?.countToday ?? 0}
              icon={<Icon icon="solar:cart-bold" />}
              tone="primary"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="Sales Today"
              value={formatCurrency(parseFloat(managerKpis.orders?.totalAmountToday || "0"))}
              icon={<Icon icon="solar:wallet-money-bold" />}
              tone="success"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="Active Staff"
              value={managerKpis.staff?.totalActive ?? 0}
              icon={<Icon icon="solar:user-id-bold" />}
              tone="info"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="Pending Access Requests"
              value={managerKpis.accessRequests?.pending ?? 0}
              icon={<Icon icon="solar:clock-circle-bold" />}
              tone="warning"
            />
          </div>
        </div>
      )}

      {sales && (
        <div className="row g-3 mb-3">
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Total Revenue" 
              value={formatCurrency(sales.totalRevenue)}
              icon={<Icon icon="solar:wallet-money-bold" />}
              tone="success"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Total Orders" 
              value={sales.totalOrders}
              icon={<Icon icon="solar:cart-bold" />}
              tone="primary"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Avg Order Value" 
              value={formatCurrency(sales.averageOrderValue)}
              icon={<Icon icon="solar:chart-2-bold" />}
              tone="info"
            />
          </div>
        </div>
      )}

      {inventory && (
        <div className="row g-3 mb-3">
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Inventory Items" 
              value={inventory.summary?.totalItems || inventory.items?.length || 0}
              icon={<Icon icon="solar:box-bold" />}
              tone="info"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard 
              title="Low Stock" 
              value={inventory.summary?.lowStockCount || 0}
              icon={<Icon icon="solar:warning-bold" />}
              tone="warning"
            />
          </div>
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <SectionCard title="Branch Information">
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input 
                className="form-control" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Status</label>
              <select 
                className="form-select" 
                value={form.status} 
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUS.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Verification Status</label>
              <select 
                className="form-select" 
                value={form.verificationStatus} 
                onChange={(e) => setForm({ ...form, verificationStatus: e.target.value })}
              >
                {VERIF.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Type codes (comma separated)</label>
              <input
                className="form-control"
                value={typeCodesStr}
                onChange={(e) => setForm({ ...form, typeCodes: String(e.target.value).split(",").map((x) => x.trim()).filter(Boolean) })}
                placeholder="CLINIC, PET_SHOP"
              />
            </div>
            <button onClick={save} disabled={busy} className="btn btn-primary">
              {busy ? "Saving..." : "Save Changes"}
            </button>
          </SectionCard>
        </div>

        <div className="col-12 col-xl-6">
          <SectionCard title="KYC & Verification">
            <Field label="KYC Documents" value={`${(row.profileDetails?.documents || []).length} document(s)`} />
            <Field label="Latest Publish Request" value={row.publishRequests?.[0] ? `#${row.publishRequests[0].id} • ${row.publishRequests[0].status}` : "—"} />
            <div className="mt-3">
              <a href={`/admin/verifications/branches/${row.profileDetails?.id}`} className="btn btn-sm btn-outline-primary">
                View Verification
              </a>
            </div>
          </SectionCard>

          <SectionCard title="Operations" className="mt-3">
            <p className="text-secondary small mb-2">Toggle branch capabilities. Save to apply.</p>
            <div className="d-flex flex-wrap gap-3 mb-2">
              {["onlineSelling", "pos", "delivery", "appointment"].map((k) => {
                const v = !!(form.featuresJson || {})[k];
                return (
                  <label key={k} className="d-flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={v}
                      onChange={(e) => {
                        const next = { ...(form.featuresJson || {}), [k]: e.target.checked };
                        setForm({ ...form, featuresJson: next });
                      }}
                    />
                    <span className="small">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                  </label>
                );
              })}
            </div>
            <button onClick={save} disabled={busy} className="btn btn-sm btn-primary">
              {busy ? "Saving..." : "Save operations"}
            </button>
          </SectionCard>

          <SectionCard title="Capabilities & Features" className="mt-3">
            <div className="mb-3">
              <label className="form-label">Capabilities JSON</label>
              <textarea
                className="form-control"
                rows={3}
                value={JSON.stringify(form.capabilitiesJson || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const j = JSON.parse(e.target.value || "{}");
                    setForm({ ...form, capabilitiesJson: j });
                  } catch {}
                }}
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" }}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Features JSON</label>
              <textarea
                className="form-control"
                rows={3}
                value={JSON.stringify(form.featuresJson || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const j = JSON.parse(e.target.value || "{}");
                    setForm({ ...form, featuresJson: j });
                  } catch {}
                }}
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" }}
              />
            </div>
          </SectionCard>

          {staffOverview && (
            <SectionCard title="Branch Staff (Manager View)" className="mt-3">
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Access</th>
                      <th>Last Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffOverview.map((m) => {
                      const access = m.branchAccess;
                      return (
                        <tr key={m.memberId}>
                          <td>
                            <div className="d-flex flex-column">
                              <span>{m.user?.displayName || `User #${m.userId}`}</span>
                              <span className="text-secondary small">
                                {m.user?.email || m.user?.phone || m.user?.username || "—"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <StatusChip size="sm" tone="info" label={m.role || "—"} />
                          </td>
                          <td>
                            <StatusChip size="sm" tone={m.status === "ACTIVE" ? "success" : "warning"} label={m.status} />
                          </td>
                          <td>
                            {access ? (
                              <StatusChip
                                size="sm"
                                tone={
                                  access.status === "APPROVED"
                                    ? "success"
                                    : access.status === "PENDING"
                                    ? "warning"
                                    : "danger"
                                }
                                label={access.status}
                              />
                            ) : (
                              <span className="text-secondary small">—</span>
                            )}
                          </td>
                          <td className="text-secondary small">
                            {access?.lastLoginAt
                              ? new Date(access.lastLoginAt).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          <div id="staff">
            <SectionCard title="Staff roster" className="mt-3">
              {(row.members || []).length > 0 ? (
              <div className="d-flex flex-column gap-2">
                {row.members.map((m) => (
                  <div key={m.id} className="d-flex align-items-center justify-content-between p-2 border rounded">
                    <div>
                      <div className="fw-semibold">{m.user?.profile?.displayName ?? `User #${m.userId}`}</div>
                      <div className="text-secondary small">{m.user?.auth?.phone ?? m.user?.auth?.email ?? "—"}</div>
                    </div>
                    <div className="d-flex gap-1">
                      {(m.roles || []).map((r) => (
                        <span key={r.roleId} className="badge bg-secondary">{r.role?.key ?? ""}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                <div className="text-secondary small">No staff assigned.</div>
              )}
            </SectionCard>
          </div>
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
