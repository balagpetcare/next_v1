"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

interface BatchRecall {
  id: number;
  lotId: number;
  lotCode: string;
  productName: string;
  expDate: string;
  mfgDate: string;
  reason: string;
  severity: "STANDARD" | "URGENT" | "CRITICAL";
  status: "ACTIVE" | "QUARANTINED" | "RESOLVED" | "CANCELLED";
  initiatedBy: { id: number; name: string };
  resolvedBy?: { id: number; name: string } | null;
  createdAt: string;
  resolvedAt?: string | null;
  notes?: string | null;
  allocationReleasedAt?: string | null;
  allocationReleasedByUserId?: number | null;
}

interface AffectedLocation {
  locationId: number;
  locationName: string;
  locationType: string;
  branchId: number;
  branchName: string;
  onHandQty: number;
  reservedQty: number;
}

export default function BatchRecallPage() {
  const [recalls, setRecalls] = useState<BatchRecall[]>([]);
  const [selectedRecall, setSelectedRecall] = useState<BatchRecall | null>(null);
  const [affectedLocations, setAffectedLocations] = useState<AffectedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [orgLoaded, setOrgLoaded] = useState(false);

  // Create recall form state
  const [createForm, setCreateForm] = useState({
    lotCode: "",
    reason: "",
    severity: "STANDARD" as "STANDARD" | "URGENT" | "CRITICAL",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        type MeRes = { organizations?: { id: number }[]; data?: { organizations?: { id: number }[] } };
        const me = await ownerGet<MeRes>("/api/v1/owner/me").catch(() => ({}));
        if (cancelled) return;
        const orgs = me?.organizations ?? me?.data?.organizations ?? [];
        setOrgId(orgs[0]?.id ?? null);
      } finally {
        if (!cancelled) setOrgLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!orgLoaded) return;
    loadRecalls();
  }, [orgLoaded, orgId]);

  const loadRecalls = async () => {
    setLoading(true);
    try {
      if (!orgId) {
        setRecalls([]);
        setError("No organization found for your account.");
        return;
      }
      setError(null);
      const res = await fetch(`/api/v1/inventory/recalls?orgId=${encodeURIComponent(String(orgId))}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setRecalls(data.items || []);
      } else {
        setError("Failed to load recalls");
      }
    } catch (err) {
      console.error("Failed to load recalls:", err);
      setError("Failed to load recalls");
    } finally {
      setLoading(false);
    }
  };

  const loadRecallDetail = async (recallId: number) => {
    setDetailLoading(true);
    try {
      if (!orgId) return;
      const res = await fetch(`/api/v1/inventory/recalls/${recallId}?orgId=${encodeURIComponent(String(orgId))}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedRecall(data.recall ?? data.data?.recall ?? null);
        setAffectedLocations(data.affectedLocations || data.data?.affectedLocations || []);
      }
    } catch (err) {
      console.error("Failed to load recall detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateRecall = async () => {
    if (!createForm.lotCode.trim() || !createForm.reason.trim()) {
      alert("Please provide lot code and reason");
      return;
    }
    if (!orgId) {
      alert("No organization selected");
      return;
    }

    setActionLoading(true);
    try {
      const locRes = await fetch("/api/v1/inventory/locations", {
        credentials: "include",
        cache: "no-store",
      });
      if (!locRes.ok) {
        alert("Failed to load inventory locations");
        return;
      }
      const locJson = await locRes.json();
      const locations = Array.isArray(locJson?.data) ? locJson.data : [];
      const orgLocs = locations.filter((l: { branch?: { orgId?: number } }) => l.branch?.orgId === orgId);
      const codeNorm = createForm.lotCode.trim();
      let lotIdFound: number | null = null;
      for (const loc of orgLocs as { id: number }[]) {
        const lotsRes = await fetch(
          `/api/v1/inventory/lots?locationId=${loc.id}&excludeExpired=false`,
          { credentials: "include", cache: "no-store" }
        );
        if (!lotsRes.ok) continue;
        const lotsJson = await lotsRes.json();
        const lots = Array.isArray(lotsJson?.data) ? lotsJson.data : [];
        const hit = lots.find(
          (row: { lot?: { lotCode?: string }; lotId?: number }) =>
            row.lot?.lotCode === codeNorm ||
            String(row.lot?.lotCode || "").toUpperCase() === codeNorm.toUpperCase()
        );
        if (hit?.lotId != null) {
          lotIdFound = hit.lotId;
          break;
        }
      }

      if (lotIdFound == null) {
        alert(`Lot code "${createForm.lotCode}" not found in your organization's inventory locations`);
        return;
      }

      const res = await fetch("/api/v1/inventory/recalls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orgId,
          lotId: lotIdFound,
          reason: createForm.reason,
          severity: createForm.severity,
        }),
      });

      if (res.ok) {
        alert("Recall created successfully");
        setShowCreateModal(false);
        setCreateForm({ lotCode: "", reason: "", severity: "STANDARD" });
        loadRecalls();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Failed to create recall");
      }
    } catch (err) {
      console.error("Failed to create recall:", err);
      alert("Failed to create recall");
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuarantine = async (recallId: number, locationId: number) => {
    if (!confirm("Quarantine this lot at this location? Stock will be moved to DAMAGE_AREA.")) {
      return;
    }

    setActionLoading(true);
    try {
      // Find DAMAGE_AREA location
      const locsRes = await fetch("/api/v1/inventory/locations", {
        credentials: "include",
        cache: "no-store",
      });
      
      if (!locsRes.ok) {
        alert("Failed to load locations");
        return;
      }

      const locs = await locsRes.json();
      const damageArea = locs.find((l: any) => l.type === "DAMAGE_AREA");
      
      if (!damageArea) {
        alert("No DAMAGE_AREA location found. Please create one first.");
        return;
      }

      const res = await fetch(`/api/v1/inventory/recalls/${recallId}/quarantine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          locationId,
          targetLocationId: damageArea.id,
        }),
      });

      if (res.ok) {
        alert("Stock quarantined successfully");
        loadRecallDetail(recallId);
        loadRecalls();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Failed to quarantine");
      }
    } catch (err) {
      console.error("Failed to quarantine:", err);
      alert("Failed to quarantine");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (recallId: number) => {
    const notes = prompt("Enter resolution notes (optional):");
    if (notes === null) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/inventory/recalls/${recallId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes }),
      });

      if (res.ok) {
        alert("Recall resolved successfully");
        setSelectedRecall(null);
        loadRecalls();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Failed to resolve recall");
      }
    } catch (err) {
      console.error("Failed to resolve:", err);
      alert("Failed to resolve recall");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseAllocation = async (recallId: number) => {
    if (!orgId) return;
    if (
      !confirm(
        "Release allocation for this recall? FEFO and outbound picks may include this lot again while the recall stays ACTIVE (supervised)."
      )
    ) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/inventory/recalls/${recallId}/release-allocation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orgId }),
      });
      if (res.ok) {
        await loadRecallDetail(recallId);
        await loadRecalls();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Failed to release allocation");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to release allocation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (recallId: number) => {
    const notes = prompt("Enter cancellation reason:");
    if (notes === null) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/inventory/recalls/${recallId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes }),
      });

      if (res.ok) {
        alert("Recall cancelled successfully");
        setSelectedRecall(null);
        loadRecalls();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Failed to cancel recall");
      }
    } catch (err) {
      console.error("Failed to cancel:", err);
      alert("Failed to cancel recall");
    } finally {
      setActionLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      STANDARD: "bg-secondary",
      URGENT: "bg-warning",
      CRITICAL: "bg-danger",
    };
    return colors[severity as keyof typeof colors] || "bg-secondary";
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      ACTIVE: "bg-danger",
      QUARANTINED: "bg-warning",
      RESOLVED: "bg-success",
      CANCELLED: "bg-secondary",
    };
    return colors[status as keyof typeof colors] || "bg-secondary";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="dashboard-main-body">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0">Batch Recall Management</h5>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-danger" onClick={() => setShowCreateModal(true)}>
            Create Recall
          </button>
          <Link href="/owner/inventory/recalls/campaigns" className="btn btn-outline-primary">
            Recall campaigns
          </Link>
          <Link href="/owner/pharmacy" className="btn btn-outline-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">Loading...</div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div className="row">
          <div className={selectedRecall ? "col-md-7" : "col-12"}>
            <div className="card radius-12">
              <div className="card-body">
                <h6 className="mb-3">Recall List</h6>
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Lot Code</th>
                        <th>Product</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th>Allocation</th>
                        <th>Initiated By</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recalls.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center text-muted py-4">
                            No recalls found
                          </td>
                        </tr>
                      ) : (
                        recalls.map((recall) => (
                          <tr
                            key={recall.id}
                            className={selectedRecall?.id === recall.id ? "table-active" : ""}
                            style={{ cursor: "pointer" }}
                            onClick={() => loadRecallDetail(recall.id)}
                          >
                            <td>{recall.id}</td>
                            <td>
                              <code className="small">{recall.lotCode}</code>
                            </td>
                            <td>{recall.productName}</td>
                            <td>
                              <span className={`badge ${getSeverityBadge(recall.severity)}`}>
                                {recall.severity}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${getStatusBadge(recall.status)}`}>
                                {recall.status}
                              </span>
                            </td>
                            <td className="small">
                              {recall.allocationReleasedAt ? (
                                <span className="badge bg-success">Released</span>
                              ) : recall.status === "ACTIVE" ? (
                                <span className="badge bg-secondary">Frozen</span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>{recall.initiatedBy.name}</td>
                            <td>{formatDate(recall.createdAt)}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  loadRecallDetail(recall.id);
                                }}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Detail Panel */}
          {selectedRecall && (
            <div className="col-md-5">
              <div className="card radius-12">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">Recall Details</h6>
                  <button
                    className="btn btn-sm btn-light"
                    onClick={() => setSelectedRecall(null)}
                  >
                    ×
                  </button>
                </div>
                <div className="card-body">
                  {detailLoading ? (
                    <div className="text-center py-3">Loading...</div>
                  ) : (
                    <>
                      <div className="mb-3">
                        <strong>Recall ID:</strong> {selectedRecall.id}
                      </div>
                      <div className="mb-3">
                        <strong>Lot Code:</strong>{" "}
                        <code>{selectedRecall.lotCode}</code>
                      </div>
                      <div className="mb-3">
                        <strong>Product:</strong> {selectedRecall.productName}
                      </div>
                      <div className="mb-3">
                        <strong>Severity:</strong>{" "}
                        <span className={`badge ${getSeverityBadge(selectedRecall.severity)}`}>
                          {selectedRecall.severity}
                        </span>
                      </div>
                      <div className="mb-3">
                        <strong>Status:</strong>{" "}
                        <span className={`badge ${getStatusBadge(selectedRecall.status)}`}>
                          {selectedRecall.status}
                        </span>
                      </div>
                      {selectedRecall.status === "ACTIVE" && (
                        <div className="mb-3 p-2 rounded border bg-light">
                          <strong className="small d-block mb-1">FEFO / allocation</strong>
                          {selectedRecall.allocationReleasedAt ? (
                            <p className="small text-success mb-0">
                              Allocation released — supervised outbound allowed. Lot #{selectedRecall.lotId}{" "}
                              <code>{selectedRecall.lotCode}</code>
                            </p>
                          ) : (
                            <p className="small text-muted mb-0">
                              Frozen for FEFO and outbound until allocation is released (quarantine and audit still apply).
                            </p>
                          )}
                        </div>
                      )}
                      <div className="mb-3">
                        <strong>Reason:</strong>
                        <p className="text-muted small mt-1">{selectedRecall.reason}</p>
                      </div>
                      <div className="mb-3">
                        <strong>Initiated By:</strong> {selectedRecall.initiatedBy.name}
                      </div>
                      <div className="mb-3">
                        <strong>Created:</strong> {formatDate(selectedRecall.createdAt)}
                      </div>
                      {selectedRecall.resolvedAt && (
                        <>
                          <div className="mb-3">
                            <strong>Resolved:</strong> {formatDate(selectedRecall.resolvedAt)}
                          </div>
                          <div className="mb-3">
                            <strong>Resolved By:</strong> {selectedRecall.resolvedBy?.name || "N/A"}
                          </div>
                        </>
                      )}
                      {selectedRecall.notes && (
                        <div className="mb-3">
                          <strong>Notes:</strong>
                          <p className="text-muted small mt-1">{selectedRecall.notes}</p>
                        </div>
                      )}

                      <hr />

                      <h6 className="mb-3">Affected Locations</h6>
                      {affectedLocations.length === 0 ? (
                        <p className="text-muted small">All locations cleared</p>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-sm">
                            <thead>
                              <tr>
                                <th>Location</th>
                                <th>Branch</th>
                                <th>Qty</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {affectedLocations.map((loc) => (
                                <tr key={loc.locationId}>
                                  <td>{loc.locationName}</td>
                                  <td>{loc.branchName}</td>
                                  <td>{loc.onHandQty}</td>
                                  <td>
                                    {selectedRecall.status === "ACTIVE" && (
                                      <button
                                        className="btn btn-xs btn-warning"
                                        onClick={() =>
                                          handleQuarantine(selectedRecall.id, loc.locationId)
                                        }
                                        disabled={actionLoading}
                                      >
                                        Quarantine
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <hr />

                      {/* Actions */}
                      <div className="d-flex gap-2">
                        {(selectedRecall.status === "ACTIVE" || selectedRecall.status === "QUARANTINED") && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleResolve(selectedRecall.id)}
                            disabled={actionLoading}
                          >
                            Resolve Recall
                          </button>
                        )}
                        {selectedRecall.status === "ACTIVE" && !selectedRecall.allocationReleasedAt && (
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() => handleReleaseAllocation(selectedRecall.id)}
                            disabled={actionLoading}
                          >
                            Release allocation (FEFO)
                          </button>
                        )}
                        {selectedRecall.status === "ACTIVE" && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleCancel(selectedRecall.id)}
                            disabled={actionLoading}
                          >
                            Cancel Recall
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Recall Modal */}
      {showCreateModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Create Batch Recall</h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Lot Code</label>
                  <input
                    type="text"
                    className="form-control"
                    value={createForm.lotCode}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, lotCode: e.target.value })
                    }
                    placeholder="Enter lot code"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Severity</label>
                  <select
                    className="form-select"
                    value={createForm.severity}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        severity: e.target.value as any,
                      })
                    }
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="URGENT">Urgent</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Reason</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={createForm.reason}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, reason: e.target.value })
                    }
                    placeholder="Describe the reason for recall"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleCreateRecall}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Creating..." : "Create Recall"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
