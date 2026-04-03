"use client";

/**
 * Canonical create route (flat segment) — avoids Next.js 16 nested-route 404 under [branchId]/pharmacy/requisitions/new.
 * Legacy URL .../pharmacy/requisitions/new redirects here (proxy + next.config + thin redirect page).
 */

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { medicineRequisitionCreate } from "@/lib/api";
import { pharmacyApiUserMessage, logPharmacyApiError } from "@/src/lib/pharmacyApiMessage";
import { useToast } from "@/src/hooks/useToast";
import MedicineRequisitionPickerModal, {
  REQUISITION_UNITS,
  type MedicineSearchHit,
  type RequisitionUnit,
  defaultUnitForMedicine,
  formatMedicineSummaryLine,
} from "../_components/MedicineRequisitionPickerModal";

type ItemRow = {
  medicineListingId: number;
  summaryLine: string;
  requestedQty: string;
  unit: RequisitionUnit;
  note: string;
  allowSubstitute: boolean;
};

export default function BranchPharmacyRequisitionCreatePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const branchId = params?.branchId as string;

  const [urgency, setUrgency] = useState("NORMAL");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const existingIds = useMemo(() => new Set(items.map((i) => i.medicineListingId)), [items]);

  function addMedicinesFromPicker(meds: MedicineSearchHit[]) {
    if (!meds.length) {
      toast.warning("Select at least one medicine.");
      return;
    }
    const byId = new Map<number, MedicineSearchHit>();
    for (const m of meds) {
      byId.set(m.id, m);
    }
    const unique = [...byId.values()];
    setItems((prev) => {
      const have = new Set(prev.map((i) => i.medicineListingId));
      const toAdd: ItemRow[] = [];
      let skippedReq = 0;
      for (const med of unique) {
        if (have.has(med.id)) {
          skippedReq += 1;
          continue;
        }
        have.add(med.id);
        toAdd.push({
          medicineListingId: med.id,
          summaryLine: formatMedicineSummaryLine(med),
          requestedQty: "1",
          unit: defaultUnitForMedicine(med),
          note: "",
          allowSubstitute: false,
        });
      }
      const added = toAdd.length;
      if (added && skippedReq) {
        toast.info(`Added ${added} medicine(s). ${skippedReq} already on the requisition were skipped.`);
      } else if (added) {
        toast.success(`Added ${added} medicine(s).`);
      } else if (skippedReq) {
        toast.warning("All selected medicines are already on the requisition.");
      }
      return added ? [...prev, ...toAdd] : prev;
    });
  }

  function removeItem(listingId: number) {
    setItems((prev) => prev.filter((i) => i.medicineListingId !== listingId));
  }

  function updateItem(listingId: number, patch: Partial<Pick<ItemRow, "requestedQty" | "unit" | "note" | "allowSubstitute">>) {
    setItems((prev) => prev.map((item) => (item.medicineListingId === listingId ? { ...item, ...patch } : item)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length) {
      toast.warning("Add at least one medicine using “+ Add Item”.");
      return;
    }
    const validItems = items.filter((i) => {
      const q = Number(i.requestedQty);
      return Number.isInteger(q) && q >= 1 && REQUISITION_UNITS.includes(i.unit);
    });
    if (validItems.length !== items.length) {
      toast.warning("Each line needs a positive whole quantity and a unit from the list.");
      return;
    }

    setSubmitting(true);
    try {
      await medicineRequisitionCreate({
        branchId: Number(branchId),
        urgency: urgency || undefined,
        note: note || undefined,
        items: validItems.map((i) => ({
          medicineListingId: i.medicineListingId,
          requestedQty: Number(i.requestedQty),
          unit: i.unit,
          note: i.note?.trim() || undefined,
          allowSubstitute: i.allowSubstitute,
        })),
      });
      toast.success("Draft requisition created.");
      router.push(`/staff/branch/${branchId}/pharmacy/requisitions`);
    } catch (err: unknown) {
      logPharmacyApiError("requisition create", err);
      toast.error(pharmacyApiUserMessage(err, "Could not create the requisition."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dashboard-main-body">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">New Medicine Requisition</h5>
        <Link href={`/staff/branch/${branchId}/pharmacy/requisitions`} className="btn btn-outline-secondary btn-sm">
          &#8592; Back
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card radius-12 mb-3">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-sm-6 col-md-4">
                <label className="form-label small">Urgency</label>
                <select className="form-select form-select-sm" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                  <option value="NORMAL">Normal</option>
                  <option value="URGENT">Urgent</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="col-sm-6 col-md-8">
                <label className="form-label small">Note (optional)</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Any special instructions..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card radius-12 mb-3">
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h6 className="mb-0">Items</h6>
            <button type="button" className="btn btn-outline-primary btn-sm radius-12" onClick={() => setPickerOpen(true)}>
              + Add Item
            </button>
          </div>
          <div className="card-body p-0">
            {items.length === 0 ? (
              <div className="p-4 text-center text-muted small">
                No medicines yet. Click <strong>+ Add Item</strong> to search and select from the catalog.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ minWidth: 260 }}>Medicine</th>
                      <th style={{ width: 88 }}>Qty</th>
                      <th style={{ width: 120 }}>Unit</th>
                      <th>Note</th>
                      <th style={{ width: 100 }} className="text-center">
                        Substitute OK
                      </th>
                      <th style={{ width: 56 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.medicineListingId}>
                        <td>
                          <span className="small" style={{ lineHeight: 1.35 }}>
                            {item.summaryLine}
                          </span>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            min={1}
                            step={1}
                            value={item.requestedQty}
                            onChange={(e) => updateItem(item.medicineListingId, { requestedQty: e.target.value })}
                            required
                            aria-label="Quantity"
                          />
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={item.unit}
                            onChange={(e) => updateItem(item.medicineListingId, { unit: e.target.value as RequisitionUnit })}
                            aria-label="Unit"
                          >
                            {REQUISITION_UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={item.note}
                            onChange={(e) => updateItem(item.medicineListingId, { note: e.target.value })}
                            placeholder="Optional"
                          />
                        </td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={item.allowSubstitute}
                            onChange={(e) => updateItem(item.medicineListingId, { allowSubstitute: e.target.checked })}
                            aria-label="Allow substitute"
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => removeItem(item.medicineListingId)}
                            aria-label="Remove line"
                          >
                            ×
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

        <div className="d-flex gap-2 mb-4">
          <button type="submit" className="btn btn-primary btn-sm radius-12" disabled={submitting}>
            {submitting ? "Creating..." : "Create Draft Requisition"}
          </button>
          <Link href={`/staff/branch/${branchId}/pharmacy/requisitions`} className="btn btn-outline-secondary btn-sm radius-12">
            Cancel
          </Link>
        </div>
      </form>

      <MedicineRequisitionPickerModal
        show={pickerOpen}
        branchId={branchId}
        onClose={() => setPickerOpen(false)}
        onAddMany={addMedicinesFromPicker}
        existingListingIds={existingIds}
      />
    </div>
  );
}
