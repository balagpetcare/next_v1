"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { usePolicyFeatures } from "@/lib/usePolicyFeatures";

export default function AdminFundraisingPage() {
  const { donationEnabled, loading: policyLoading } = usePolicyFeatures();
  const [holdList, setHoldList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [note, setNote] = useState({});

  const fetchHold = () => {
    setLoading(true);
    setError(null);
    const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "?limit=50";
    apiGet(`/api/v1/fundraising/admin/donations/hold${qs}`)
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) setHoldList(res.data);
        else setHoldList([]);
      })
      .catch((e) => {
        setError(e?.message || "Failed to load donations");
        setHoldList([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!donationEnabled && !policyLoading) return;
    fetchHold();
  }, [donationEnabled, policyLoading, statusFilter]);

  const handleStatus = (donationId, status) => {
    setUpdatingId(donationId);
    apiPatch(`/api/v1/fundraising/admin/donations/${donationId}/status`, {
      status,
      note: note[donationId] || undefined,
    })
      .then(() => {
        setNote((prev) => ({ ...prev, [donationId]: "" }));
        fetchHold();
      })
      .catch((e) => {
        alert(e?.message || "Update failed");
      })
      .finally(() => setUpdatingId(null));
  };

  if (policyLoading) {
    return (
      <div className="p-4">
        <p className="text-secondary">Loading policy…</p>
      </div>
    );
  }

  if (!donationEnabled) {
    return (
      <div className="p-4">
        <h2 className="h4 mb-3">Fundraising</h2>
        <p className="text-secondary">
          Donation is not enabled for the selected country. Change country or enable the feature in policy.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <h2 className="h4 mb-0">Fundraising – Donations on Hold</h2>
        <div className="d-flex align-items-center gap-2">
          <select
            className="form-select form-select-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: "auto" }}
          >
            <option value="">All (Hold + KYC)</option>
            <option value="ON_HOLD_REVIEW">On Hold Review</option>
            <option value="KYC_REQUIRED">KYC Required</option>
          </select>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={fetchHold} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-secondary">Loading donations…</p>
      ) : holdList.length === 0 ? (
        <p className="text-secondary">No donations on hold.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Campaign</th>
                <th>Donor</th>
                <th>Created</th>
                <th>Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {holdList.map((d) => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.amount != null ? Number(d.amount).toLocaleString() : "—"}</td>
                  <td>
                    <span className={`badge ${d.status === "KYC_REQUIRED" ? "bg-warning" : "bg-info"}`}>
                      {d.status}
                    </span>
                  </td>
                  <td>{d.campaign?.title ?? "—"}</td>
                  <td>{d.donor?.profile?.displayName ?? d.donor?.profile?.username ?? "—"}</td>
                  <td>{d.createdAt ? new Date(d.createdAt).toLocaleString() : "—"}</td>
                  <td>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Optional note"
                      value={note[d.id] ?? ""}
                      onChange={(e) => setNote((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      style={{ minWidth: 120 }}
                    />
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        disabled={updatingId === d.id}
                        onClick={() => handleStatus(d.id, "SUCCESS")}
                      >
                        {updatingId === d.id ? "…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        disabled={updatingId === d.id}
                        onClick={() => handleStatus(d.id, "FAILED")}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
