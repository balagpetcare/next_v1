"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPost, ownerPatch } from "@/app/owner/_lib/ownerApi";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type Location = { id: number; name: string; branch?: { id: number; name: string } };
type Session = {
  id: number;
  locationId: number;
  status: string;
  frozenAt?: string | null;
  postedAt?: string | null;
  note?: string | null;
  location?: { id: number; name: string };
  createdBy?: { id: number; profile?: { displayName?: string } };
  lines?: Array<{
    id: number;
    variantId: number;
    systemQty: number;
    countedQty: number;
    varianceQty: number;
    variant?: { id: number; sku: string; title: string };
  }>;
};

export default function OwnerInventoryStockCountsPage() {
  const toast = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [locationId, setLocationId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [countedValues, setCountedValues] = useState<Record<number, number>>({});
  const [posting, setPosting] = useState(false);

  const loadLocations = useCallback(async () => {
    try {
      const res = await ownerGet<{ data: Location[] }>("/api/v1/inventory/locations");
      setLocations(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      toast.error(getMessageFromApiError(e as Error));
      setLocations([]);
    }
  }, [toast]);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ownerGet<{ data: Session[] }>("/api/v1/inventory/stock-counts");
      setSessions(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      toast.error(getMessageFromApiError(e as Error));
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadLocations();
    loadSessions();
  }, [loadLocations, loadSessions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const locId = parseInt(locationId, 10);
    if (!Number.isInteger(locId)) {
      toast.warning("Select a location.");
      return;
    }
    setCreating(true);
    try {
      await ownerPost("/api/v1/inventory/stock-counts", { locationId: locId, note: note.trim() || undefined });
      toast.success("Stock count session created.");
      setNote("");
      await loadSessions();
    } catch (e) {
      toast.error(getMessageFromApiError(e as Error));
    } finally {
      setCreating(false);
    }
  };

  const handleFreeze = async (session: Session) => {
    try {
      await ownerPost(`/api/v1/inventory/stock-counts/${session.id}/freeze`, {});
      toast.success("Session frozen; system quantities snapshotted.");
      await loadSessions();
      const updated = await ownerGet<{ data: Session }>(`/api/v1/inventory/stock-counts/${session.id}`);
      if (updated?.data) setSelectedSession(updated.data);
    } catch (e) {
      toast.error(getMessageFromApiError(e as Error));
    }
  };

  const handleSaveCounts = async () => {
    if (!selectedSession?.lines) return;
    const lines = selectedSession.lines.map((l) => ({
      variantId: l.variantId,
      countedQty: countedValues[l.id] ?? l.countedQty,
    }));
    try {
      await ownerPatch(`/api/v1/inventory/stock-counts/${selectedSession.id}/lines`, { lines });
      toast.success("Counts saved.");
      const updated = await ownerGet<{ data: Session }>(`/api/v1/inventory/stock-counts/${selectedSession.id}`);
      if (updated?.data) setSelectedSession(updated.data);
      await loadSessions();
    } catch (e) {
      toast.error(getMessageFromApiError(e as Error));
    }
  };

  const handlePost = async () => {
    if (!selectedSession) return;
    if (!confirm("Post this count? ADJUSTMENT ledger entries will be created for variances. This cannot be undone.")) return;
    setPosting(true);
    try {
      await ownerPost(`/api/v1/inventory/stock-counts/${selectedSession.id}/post`, {});
      toast.success("Stock count posted; adjustments applied.");
      setSelectedSession(null);
      setCountedValues({});
      await loadSessions();
    } catch (e) {
      toast.error(getMessageFromApiError(e as Error));
    } finally {
      setPosting(false);
    }
  };

  const openSession = async (session: Session) => {
    try {
      const res = await ownerGet<{ data: Session }>(`/api/v1/inventory/stock-counts/${session.id}`);
      const s = res?.data;
      if (s) {
        setSelectedSession(s);
        const vals: Record<number, number> = {};
        s.lines?.forEach((l) => { vals[l.id] = l.countedQty; });
        setCountedValues(vals);
      }
    } catch (e) {
      toast.error(getMessageFromApiError(e as Error));
    }
  };

  const hasNoLocations = !loading && locations.length === 0;

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Stock count (cycle count)"
        subtitle="Create a session, freeze to snapshot system qty, enter counted qty, then post to create adjustments."
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Stock count", href: "/owner/inventory/stock-counts" },
        ]}
      />

      {hasNoLocations && (
        <div className="alert alert-info radius-12 mb-3">
          <span>No locations found. </span>
          <Link href="/owner/inventory/locations" className="btn btn-primary btn-sm ms-2">Create locations</Link>
        </div>
      )}

      <div className="card radius-12 mb-3">
        <div className="card-body p-24">
          <h6 className="mb-3">New session</h6>
          <form onSubmit={handleCreate} className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small">Location</label>
              <select
                className="form-select form-select-sm"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                required
                disabled={hasNoLocations}
              >
                <option value="">Select</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name} {loc.branch ? `(${loc.branch.name})` : ""}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small">Note (optional)</label>
              <input type="text" className="form-control form-control-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Monthly count" />
            </div>
            <div className="col-md-2">
              <button type="submit" className="btn btn-primary btn-sm" disabled={creating || hasNoLocations}>
                {creating ? "Creating…" : "Create session"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card radius-12 mb-3">
        <div className="card-body p-24">
          <h6 className="mb-3">Sessions</h6>
          {loading ? (
            <p className="text-muted small">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="text-muted small">No sessions yet. Create one above.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Frozen</th>
                    <th>Posted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td>{s.id}</td>
                      <td>{s.location?.name ?? s.locationId}</td>
                      <td><span className={`badge ${s.status === "POSTED" ? "bg-success" : s.status === "FROZEN" ? "bg-info" : "bg-secondary"}`}>{s.status}</span></td>
                      <td>{s.frozenAt ? new Date(s.frozenAt).toLocaleString() : "—"}</td>
                      <td>{s.postedAt ? new Date(s.postedAt).toLocaleString() : "—"}</td>
                      <td>
                        {s.status === "DRAFT" && (
                          <button type="button" className="btn btn-outline-primary btn-sm me-1" onClick={() => handleFreeze(s)}>Freeze</button>
                        )}
                        {(s.status === "FROZEN" || s.status === "SUBMITTED") && (
                          <>
                            <button type="button" className="btn btn-outline-secondary btn-sm me-1" onClick={() => openSession(s)}>Enter counts</button>
                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => { openSession(s); setTimeout(handlePost, 100); }} disabled={posting}>Post</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedSession && (selectedSession.status === "FROZEN" || selectedSession.status === "SUBMITTED") && selectedSession.lines && (
        <div className="card radius-12 mb-3">
          <div className="card-body p-24">
            <h6 className="mb-3">Enter counts — Session #{selectedSession.id} ({selectedSession.location?.name})</h6>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Variant (SKU)</th>
                    <th>System qty</th>
                    <th>Counted qty</th>
                    <th>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSession.lines.map((l) => (
                    <tr key={l.id}>
                      <td>{l.variant?.sku ?? l.variantId} {l.variant?.title}</td>
                      <td>{l.systemQty}</td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          min={0}
                          value={countedValues[l.id] ?? l.countedQty}
                          onChange={(e) => setCountedValues((prev) => ({ ...prev, [l.id]: parseInt(e.target.value, 10) || 0 }))}
                        />
                      </td>
                      <td>{(countedValues[l.id] ?? l.countedQty) - l.systemQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2">
              <button type="button" className="btn btn-primary btn-sm me-2" onClick={handleSaveCounts}>Save counts</button>
              <button type="button" className="btn btn-success btn-sm me-2" onClick={handlePost} disabled={posting}>
                {posting ? "Posting…" : "Post adjustments"}
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setSelectedSession(null); setCountedValues({}); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      <Link href="/owner/inventory" className="btn btn-outline-secondary btn-sm">← Inventory</Link>
    </div>
  );
}
