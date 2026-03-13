"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { staffClinicSupplyRequestById, staffClinicSupplyRequestUpdateDraft } from "@/lib/api";

type RequestDetail = {
  id: number;
  requestNo: string;
  status: string;
  priority: string;
  department?: string | null;
  requestType?: string | null;
  neededBy?: string | null;
  reason?: string | null;
  note?: string | null;
  items?: Array<{
    id: number;
    clinicalItemId?: number | null;
    variantId?: number | null;
    itemNameSnapshot?: string | null;
    unitSnapshot?: string | null;
    requestedQty: number;
    note?: string | null;
    lineNote?: string | null;
    clinicalItem?: { name: string } | null;
    variant?: { variantName: string } | null;
  }>;
};

const PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "ROUTINE", label: "Routine" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
  { value: "EMERGENCY", label: "Emergency" },
];

const REQUEST_TYPES = [
  { value: "MANUAL", label: "Manual" },
  { value: "LOW_STOCK", label: "Low stock" },
  { value: "PROCEDURE_PREP", label: "Procedure prep" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "REPLACEMENT", label: "Replacement" },
  { value: "TRANSFER_NEED", label: "Transfer need" },
];

export default function EditSupplyRequestPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.branchId as string | undefined;
  const requestId = params?.requestId as string | undefined;
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [department, setDepartment] = useState("");
  const [requestType, setRequestType] = useState("MANUAL");
  const [priority, setPriority] = useState("NORMAL");
  const [neededBy, setNeededBy] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Array<{ clinicalItemId?: number; variantId?: number; requestedQty: number; note?: string; lineNote?: string; sourceType?: "CUSTOM"; itemNameSnapshot?: string; unitSnapshot?: string }>>([]);

  const load = useCallback(async () => {
    if (!branchId || !requestId) return;
    try {
      const data = await staffClinicSupplyRequestById(branchId, Number(requestId));
      if (data) {
        const r = data as RequestDetail;
        setRequest(r);
        if (r.status !== "DRAFT") {
          setError("Only draft requests can be edited.");
          return;
        }
        setDepartment(r.department ?? "");
        setRequestType(r.requestType ?? "MANUAL");
        setPriority(r.priority ?? "NORMAL");
        setNeededBy(r.neededBy ? new Date(r.neededBy).toISOString().slice(0, 10) : "");
        setReason(r.reason ?? r.note ?? "");
        setNote(r.note ?? "");
        setItems(
          (r.items ?? []).map((i) => {
            const isCustom = !i.clinicalItemId && !!i.itemNameSnapshot && !!i.unitSnapshot;
            return {
              clinicalItemId: i.clinicalItemId ?? undefined,
              variantId: i.variantId ?? undefined,
              requestedQty: i.requestedQty,
              note: i.note ?? undefined,
              lineNote: i.lineNote ?? undefined,
              ...(isCustom ? { sourceType: "CUSTOM" as const, itemNameSnapshot: i.itemNameSnapshot!, unitSnapshot: i.unitSnapshot! } : {}),
            };
          })
        );
      }
    } catch (e) {
      setError((e as Error)?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [branchId, requestId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!branchId || !requestId) return;
    const valid = items.filter((i) => i.requestedQty > 0);
    if (valid.length === 0) {
      setError("At least one item with quantity > 0 is required.");
      return;
    }
    const neededByDate = neededBy ? new Date(neededBy) : null;
    if (neededByDate && neededByDate.getTime() < Date.now()) {
      setError("Needed by date cannot be in the past.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await staffClinicSupplyRequestUpdateDraft(branchId, Number(requestId), {
        department: department.trim() || null,
        requestType,
        priority,
        neededBy: neededBy || null,
        reason: reason.trim() || null,
        note: note.trim() || null,
        items: valid
          .filter((i) => ("sourceType" in i && i.sourceType === "CUSTOM") || (i.clinicalItemId != null && i.clinicalItemId > 0))
          .map((i) =>
            "sourceType" in i && i.sourceType === "CUSTOM" && i.itemNameSnapshot && i.unitSnapshot
              ? { sourceType: "CUSTOM" as const, itemNameSnapshot: i.itemNameSnapshot, unitSnapshot: i.unitSnapshot, requestedQty: i.requestedQty, lineNote: i.lineNote }
              : { clinicalItemId: i.clinicalItemId!, variantId: i.variantId, requestedQty: i.requestedQty, note: i.note, lineNote: i.lineNote }
          ),
      });
      router.push(`/staff/branch/${branchId}/clinic/supply-requests/${requestId}`);
    } catch (e) {
      setError((e as Error)?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const updateItemQty = (index: number, qty: number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, requestedQty: Math.max(0, qty) } : item)));
  };
  const updateItemNote = (index: number, note: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, lineNote: note, note } : item)));
  };
  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  if (!branchId || !requestId) {
    return (
      <div className="p-4">
        <div className="alert alert-warning">Invalid branch or request.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="text-muted mt-2 mb-0">Loading…</p>
        </div>
      </div>
    );
  }

  if (!request || request.status !== "DRAFT") {
    return (
      <div className="dashboard-main-body">
        {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
        <p className="text-muted">This request cannot be edited.</p>
        <Link href={`/staff/branch/${branchId}/clinic/supply-requests/${requestId}`} className="btn btn-outline-primary btn-sm radius-8">
          View request
        </Link>
      </div>
    );
  }

  const neededByDate = neededBy ? new Date(neededBy) : null;
  const neededByInPast = neededByDate && neededByDate.getTime() < Date.now();

  return (
    <div className="dashboard-main-body">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h5 mb-0">Edit draft — {request.requestNo}</h1>
        <Link href={`/staff/branch/${branchId}/clinic/supply-requests/${requestId}`} className="btn btn-outline-secondary btn-sm radius-8">
          Back to request
        </Link>
      </div>

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      <div className="card radius-12 mb-4">
        <div className="card-body p-24">
          <h6 className="fw-semibold mb-3">Request details</h6>
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label small">Department</label>
              <input type="text" className="form-control form-control-sm radius-8" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Request type</label>
              <select className="form-select form-select-sm radius-8" value={requestType} onChange={(e) => setRequestType(e.target.value)}>
                {REQUEST_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small">Priority</label>
              <select className="form-select form-select-sm radius-8" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small">Needed by</label>
              <input type="date" className={`form-control form-control-sm radius-8 ${neededByInPast ? "is-invalid" : ""}`} value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
            </div>
            <div className="col-12">
              <label className="form-label small">Reason / Note</label>
              <textarea className="form-control form-control-sm radius-8" rows={2} value={reason || note} onChange={(e) => { setReason(e.target.value); setNote(e.target.value); }} />
            </div>
          </div>
        </div>
      </div>

      <div className="card radius-12 mb-4">
        <div className="card-header bg-transparent p-24">
          <h6 className="mb-0 fw-semibold">Items ({items.length} line(s))</h6>
        </div>
        <div className="card-body p-24">
          {items.length === 0 ? (
            <p className="text-muted mb-0">No items. Add items from the new request flow and save as draft, or restore from list.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th>Requested qty</th>
                    <th>Note</th>
                    <th className="text-end">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        {"itemNameSnapshot" in item && item.itemNameSnapshot
                          ? `${item.itemNameSnapshot} (${item.unitSnapshot ?? ""})`
                          : request.items?.[idx]?.itemNameSnapshot ?? request.items?.[idx]?.clinicalItem?.name ?? `Item ${idx + 1}`}
                      </td>
                      <td>
                        <input type="number" min={0} className="form-control form-control-sm" style={{ width: 80 }} value={item.requestedQty} onChange={(e) => updateItemQty(idx, parseInt(e.target.value, 10) || 0)} />
                      </td>
                      <td>
                        <input type="text" className="form-control form-control-sm" placeholder="Optional" value={item.lineNote ?? item.note ?? ""} onChange={(e) => updateItemNote(idx, e.target.value)} />
                      </td>
                      <td className="text-end">
                        <button type="button" className="btn btn-sm btn-outline-danger radius-8" onClick={() => removeItem(idx)} aria-label="Remove">
                          <i className="ri-delete-bin-line" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="d-flex gap-2">
        <button type="button" className="btn btn-primary radius-8" onClick={handleSave} disabled={saving || items.filter((i) => i.requestedQty > 0).length === 0 || !!neededByInPast}>
          {saving ? "Saving…" : "Save draft"}
        </button>
        <Link href={`/staff/branch/${branchId}/clinic/supply-requests/${requestId}`} className="btn btn-outline-secondary radius-8">
          Cancel
        </Link>
      </div>
    </div>
  );
}
