"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { createReverseStockReturn } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type Loc = { id: number; name?: string; type?: string; branch?: { orgId?: number; name?: string } };

const REASONS = ["DAMAGED", "WRONG_ITEM", "NEAR_EXPIRY", "OVERSTOCK", "OTHER"] as const;

export default function StockReturnIntakePage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [reason, setReason] = useState<string>("OTHER");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState([{ variantId: "", lotId: "", quantityReturned: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const br = await fetch("/api/v1/owner/branches", { credentials: "include" }).then((r) => r.json());
      const rows = (br?.data ?? []) as { org?: { id: number } }[];
      setOrgId(rows[0]?.org?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const locRes = await fetch("/api/v1/inventory/locations", { credentials: "include", cache: "no-store" });
      if (!locRes.ok) return;
      const j = await locRes.json();
      const all = Array.isArray(j?.data) ? j.data : [];
      setLocations((all as Loc[]).filter((l) => l.branch?.orgId === orgId));
    })();
  }, [orgId]);

  const addLine = () => setLines((prev) => [...prev, { variantId: "", lotId: "", quantityReturned: "" }]);

  const updateLine = (i: number, field: "variantId" | "lotId" | "quantityReturned", v: string) => {
    setLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: v };
      return next;
    });
  };

  const removeLine = (i: number) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);
    setError(null);
    try {
      const items = lines
        .map((ln) => ({
          variantId: parseInt(ln.variantId, 10),
          lotId: ln.lotId.trim() ? parseInt(ln.lotId, 10) : undefined,
          quantityReturned: parseInt(ln.quantityReturned, 10),
        }))
        .filter((x) => Number.isFinite(x.variantId) && Number.isFinite(x.quantityReturned) && x.quantityReturned > 0);
      if (!items.length) throw new Error("Add at least one line with variant ID and quantity.");
      const fi = parseInt(fromId, 10);
      const ti = parseInt(toId, 10);
      if (!Number.isFinite(fi) || !Number.isFinite(ti)) throw new Error("Select from and to locations.");
      await createReverseStockReturn({
        orgId,
        fromLocationId: fi,
        toLocationId: ti,
        reason,
        note: note.trim() || undefined,
        items,
      });
      window.location.href = "/owner/inventory/reverse-logistics";
    } catch (err) {
      setError(getMessageFromApiError(err as Error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid py-4">
      <PageHeader
        title="New stock return"
        subtitle="Register a branch → warehouse return. Use variant and optional lot IDs from your catalog and lot traceability."
      />
      <Link href="/owner/inventory/reverse-logistics" className="btn btn-link btn-sm px-0 mb-3">
        ← Back to reverse logistics
      </Link>
      {error && <div className="alert alert-danger">{error}</div>}
      {!orgId && <p className="text-muted">Loading organization…</p>}
      {orgId != null && (
        <form onSubmit={submit} className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label">From location (branch / sending)</label>
                <select className="form-select" value={fromId} onChange={(e) => setFromId(e.target.value)} required>
                  <option value="">Select…</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name ?? `#${l.id}`} ({l.type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">To location (receiving / DC)</label>
                <select className="form-select" value={toId} onChange={(e) => setToId(e.target.value)} required>
                  <option value="">Select…</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name ?? `#${l.id}`} ({l.type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Reason</label>
                <select className="form-select" value={reason} onChange={(e) => setReason(e.target.value)}>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Note (optional)</label>
                <input className="form-control" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Carrier, RMA ref, etc." />
              </div>
            </div>

            <h6 className="mb-2">Line items</h6>
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Variant ID</th>
                    <th>Lot ID (optional)</th>
                    <th>Qty returned</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((ln, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          className="form-control form-control-sm"
                          inputMode="numeric"
                          value={ln.variantId}
                          onChange={(e) => updateLine(i, "variantId", e.target.value)}
                          required={i === 0}
                        />
                      </td>
                      <td>
                        <input
                          className="form-control form-control-sm"
                          inputMode="numeric"
                          value={ln.lotId}
                          onChange={(e) => updateLine(i, "lotId", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="form-control form-control-sm"
                          inputMode="numeric"
                          value={ln.quantityReturned}
                          onChange={(e) => updateLine(i, "quantityReturned", e.target.value)}
                          required={i === 0}
                        />
                      </td>
                      <td>
                        {lines.length > 1 && (
                          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => removeLine(i)}>
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn btn-sm btn-outline-primary mb-3" onClick={addLine}>
              Add line
            </button>

            <div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Creating…" : "Create stock return"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
