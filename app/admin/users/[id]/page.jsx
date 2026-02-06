"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import StatusChip from "@/src/bpa/admin/components/StatusChip";

const TABS = [
  { key: "account", label: "Account" },
  { key: "linked", label: "Linked entities" },
  { key: "activity", label: "Activity" },
  { key: "flags", label: "Flags" },
  { key: "notes", label: "Notes" },
  { key: "audit", label: "Audit" },
];

export default function UserDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("account");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const r = await apiGet(`/api/v1/admin/users/${id}`);
      setUser(r?.data ?? null);
    } catch (e) {
      setError(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (newStatus) => {
    if (!confirm(`Change user status to ${newStatus}?`)) return;
    try {
      await apiPatch(`/api/v1/admin/users/${id}`, { status: newStatus });
      alert("Status updated.");
      load();
    } catch (e) {
      alert(e?.message ?? "Failed to update");
    }
  };

  const handleForceLogout = async () => {
    if (!confirm("Revoke all sessions for this user?")) return;
    try {
      await apiPost(`/api/v1/admin/users/${id}/force-logout`, {});
      alert("Sessions revoked.");
      load();
    } catch (e) {
      alert(e?.message ?? "Force logout failed");
    }
  };

  if (loading && !user) return <div className="container-fluid"><div className="text-secondary">Loading...</div></div>;
  if (error) return <div className="container-fluid"><div className="alert alert-danger">{error}</div></div>;
  if (!user) return <div className="container-fluid"><div className="text-secondary">Not found.</div></div>;

  return (
    <div className="container-fluid">
      <PageHeader
        title="User Profile"
        subtitle={
          <span className="text-secondary" style={{ fontSize: 13 }}>
            User #{user.id} • <StatusChip status={user.status} />
          </span>
        }
        right={
          <div className="d-flex gap-2 flex-wrap">
            {user.status !== "ACTIVE" && (
              <button className="btn btn-success btn-sm" onClick={() => handleStatusChange("ACTIVE")}>
                <Icon icon="solar:check-circle-bold" /> Activate
              </button>
            )}
            {user.status !== "BLOCKED" && (
              <button className="btn btn-warning btn-sm" onClick={() => handleStatusChange("BLOCKED")}>
                <Icon icon="solar:ban-bold" /> Block
              </button>
            )}
            <button className="btn btn-outline-danger btn-sm" onClick={handleForceLogout}>
              <Icon icon="solar:logout-2-bold" /> Force logout
            </button>
            <a href="/admin/users" className="btn btn-outline-secondary btn-sm">← Back</a>
          </div>
        }
      />

      <div className="d-flex gap-2 mb-3 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn btn-sm ${activeTab === t.key ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12">
          {activeTab === "account" && (
            <SectionCard title="Account">
              <div className="row">
                <div className="col-12 col-md-6">
                  <Field label="User ID" value={user.id} />
                  <Field label="Display Name" value={user.displayName} />
                  <Field label="Username" value={user.username} />
                  <Field label="Email" value={user.email} />
                  <Field label="Phone" value={user.phone} />
                </div>
                <div className="col-12 col-md-6">
                  <Field label="Provider" value={user.provider || "LOCAL"} />
                  <Field label="Status" value={user.status} />
                  <Field label="Created" value={user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"} />
                  <Field label="Updated" value={user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "—"} />
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === "linked" && (
            <SectionCard title="Linked entities">
              {user.ownerKyc && (
                <div className="mb-3">
                  <div className="fw-semibold mb-2">Owner KYC</div>
                  <StatusChip status={user.ownerKyc.verificationStatus} />
                  <a href={`/admin/verifications/owners/${user.ownerKyc.id}`} className="btn btn-sm btn-outline-primary ms-2">
                    View KYC
                  </a>
                </div>
              )}
              {user.organizations && user.organizations.length > 0 ? (
                <div>
                  <div className="fw-semibold mb-2">Organizations ({user.organizations.length})</div>
                  {user.organizations.map((org) => (
                    <div key={org.id} className="d-flex align-items-center gap-2 mb-2 p-2 border rounded">
                      <span>{org.name}</span>
                      <StatusChip status={org.status} />
                      <a href={`/admin/organizations/${org.id}`} className="btn btn-sm btn-outline-secondary">
                        View
                      </a>
                    </div>
                  ))}
                </div>
              ) : !user.ownerKyc ? (
                <div className="text-secondary">No linked entities.</div>
              ) : null}
            </SectionCard>
          )}

          {activeTab === "activity" && (
            <SectionCard title="Activity">
              <div className="text-secondary">Activity summary not yet available. Use Audit tab for history.</div>
            </SectionCard>
          )}

          {activeTab === "flags" && (
            <SectionCard title="Flags">
              <div className="text-secondary">No flags.</div>
            </SectionCard>
          )}

          {activeTab === "notes" && (
            <SectionCard title="Notes">
              <div className="text-secondary">Internal notes not yet available.</div>
            </SectionCard>
          )}

          {activeTab === "audit" && (
            <SectionCard title="Audit">
              <a href={`/admin/audit?actor=${user.id}`} className="btn btn-primary">
                <Icon icon="solar:clipboard-list-bold" className="me-2" />
                View audit log for this user
              </a>
            </SectionCard>
          )}
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
