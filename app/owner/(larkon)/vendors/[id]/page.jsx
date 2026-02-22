"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ownerGet, ownerPatch, ownerDelete } from "@/app/owner/_lib/ownerApi";
import StatusBadge from "@/app/owner/_components/StatusBadge";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

const VENDOR_TYPES = [
  "DISTRIBUTOR", "WHOLESALER", "IMPORTER", "LOCAL", "MANUFACTURER", "OTHER",
];
const TAB_KEYS = ["details", "ledger", "attachments"];

/** Parse form value to number or null for optional numeric fields. "" / null / undefined -> null; "30" -> 30. */
function parseOptionalNumber(value) {
  if (value === "" || value == null) return null;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export default function VendorDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id;
  const createdId = searchParams?.get("created");

  const [vendor, setVendor] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [tab, setTab] = useState("details");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const toast = useToast();
  const orgId = vendor?.orgId;

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await ownerGet(`/api/v1/vendors/${id}`);
        const data = res?.data;
        setVendor(data);
        setForm({
          name: data?.name ?? "",
          code: data?.code ?? "",
          phone: data?.phone ?? "",
          email: data?.email ?? "",
          addressLine1: data?.addressLine1 ?? "",
          addressLine2: data?.addressLine2 ?? "",
          district: data?.district ?? "",
          city: data?.city ?? "",
          country: data?.country ?? "",
          vendorType: data?.vendorType ?? "OTHER",
          defaultPaymentTermsDays: data?.defaultPaymentTermsDays ?? "",
          creditLimit: data?.creditLimit ?? "",
          notes: data?.notes ?? "",
        });
      } catch (e) {
        toast.error(getMessageFromApiError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (tab === "ledger" && id && orgId) {
      setLoadingLedger(true);
      ownerGet(`/api/v1/vendors/${id}/ledger?limit=50`)
        .then((res) => setLedger(res?.data ?? []))
        .catch(() => setLedger([]))
        .finally(() => setLoadingLedger(false));
    }
  }, [tab, id, orgId]);

  async function handleSave() {
    if (!id || orgId == null) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        orgId,
        defaultPaymentTermsDays: parseOptionalNumber(form.defaultPaymentTermsDays),
        creditLimit: parseOptionalNumber(form.creditLimit),
      };
      await ownerPatch(`/api/v1/vendors/${id}`, payload); // id from route = vendor.id
      toast.success("Vendor updated successfully");
      setEditing(false);
      const res = await ownerGet(`/api/v1/vendors/${id}`);
      setVendor(res?.data);
    } catch (e) {
      toast.error(getMessageFromApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(newStatus) {
    if (!id || orgId == null) return;
    try {
      await ownerPatch(`/api/v1/vendors/${id}/status`, { status: newStatus, orgId });
      toast.success("Status updated");
      const res = await ownerGet(`/api/v1/vendors/${id}`);
      setVendor(res?.data);
    } catch (e) {
      toast.error(getMessageFromApiError(e));
    }
  }

  if (loading && !vendor) {
    return (
      <div className="container py-4">
        <div className="card radius-12">
          <div className="card-body p-24 text-center text-secondary">Loading vendor...</div>
        </div>
      </div>
    );
  }

  if (!vendor && !loading) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning">Vendor not found.</div>
        <Link className="btn btn-primary" href="/owner/vendors">Back to Vendors</Link>
      </div>
    );
  }

  const isNewlyCreated = createdId && String(id) === String(createdId);

  return (
    <div className="dashboard-main-body">
      <div className="container py-3">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
          <div className="d-flex align-items-center gap-2">
            <Link className="btn btn-outline-secondary btn-sm" href="/owner/vendors">← Back</Link>
            <h2 className="mb-0">
              {vendor?.name || "Vendor"}
              {vendor?.code && <span className="text-muted small ms-2">({vendor.code})</span>}
            </h2>
            {isNewlyCreated && <span className="badge bg-success">New</span>}
          </div>
          <div className="d-flex align-items-center gap-2">
            <StatusBadge status={vendor?.status} />
            {vendor?.status === "ACTIVE" && (
              <>
                <button
                  type="button"
                  className="btn btn-outline-warning btn-sm"
                  onClick={() => setStatus("INACTIVE")}
                >
                  Deactivate
                </button>
              </>
            )}
            {vendor?.status === "INACTIVE" && (
              <button
                type="button"
                className="btn btn-outline-success btn-sm"
                onClick={() => setStatus("ACTIVE")}
              >
                Activate
              </button>
            )}
          </div>
        </div>

        <ul className="nav nav-tabs mb-3">
          {TAB_KEYS.map((t) => (
            <li key={t} className="nav-item">
              <button
                type="button"
                className={`nav-link ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            </li>
          ))}
        </ul>

        {tab === "details" && (
          <div className="card radius-12">
            <div className="card-body p-24">
              {editing ? (
                <>
                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Code</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.code}
                        onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Address</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.addressLine1}
                        onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
                        placeholder="Line 1"
                      />
                      <input
                        type="text"
                        className="form-control mt-1"
                        value={form.addressLine2}
                        onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))}
                        placeholder="Line 2"
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">District</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.district}
                        onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.city}
                        onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">Country</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.country}
                        onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Vendor type</label>
                      <select
                        className="form-select"
                        value={form.vendorType}
                        onChange={(e) => setForm((f) => ({ ...f, vendorType: e.target.value }))}
                      >
                        {VENDOR_TYPES.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-md-3">
                      <label className="form-label">Payment terms (days)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.defaultPaymentTermsDays}
                        onChange={(e) => setForm((f) => ({ ...f, defaultPaymentTermsDays: e.target.value }))}
                      />
                    </div>
                    <div className="col-12 col-md-3">
                      <label className="form-label">Credit limit</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        value={form.creditLimit}
                        onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={form.notes}
                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                  <button type="button" className="btn btn-primary me-2" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <dl className="row mb-0">
                    <dt className="col-sm-3">Name</dt>
                    <dd className="col-sm-9">{vendor?.name ?? "—"}</dd>
                    <dt className="col-sm-3">Code</dt>
                    <dd className="col-sm-9">{vendor?.code ?? "—"}</dd>
                    <dt className="col-sm-3">Phone</dt>
                    <dd className="col-sm-9">{vendor?.phone ?? "—"}</dd>
                    <dt className="col-sm-3">Email</dt>
                    <dd className="col-sm-9">{vendor?.email ?? "—"}</dd>
                    <dt className="col-sm-3">Address</dt>
                    <dd className="col-sm-9">
                      {[vendor?.addressLine1, vendor?.addressLine2, [vendor?.district, vendor?.city, vendor?.country].filter(Boolean).join(", ")]
                        .filter(Boolean).join(", ") || "—"}
                    </dd>
                    <dt className="col-sm-3">Vendor type</dt>
                    <dd className="col-sm-9">{vendor?.vendorType ?? "—"}</dd>
                    <dt className="col-sm-3">Payment terms</dt>
                    <dd className="col-sm-9">{vendor?.defaultPaymentTermsDays != null ? `${vendor.defaultPaymentTermsDays} days` : "—"}</dd>
                    <dt className="col-sm-3">Credit limit</dt>
                    <dd className="col-sm-9">{vendor?.creditLimit != null ? `৳${Number(vendor.creditLimit).toLocaleString()}` : "—"}</dd>
                    <dt className="col-sm-3">GRNs / Orders</dt>
                    <dd className="col-sm-9">{vendor?.orderCount ?? 0}</dd>
                    {vendor?.notes && (
                      <>
                        <dt className="col-sm-3">Notes</dt>
                        <dd className="col-sm-9">{vendor.notes}</dd>
                      </>
                    )}
                  </dl>
                  <button type="button" className="btn btn-outline-primary mt-2" onClick={() => setEditing(true)}>
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {tab === "ledger" && (
          <div className="card radius-12">
            <div className="card-body p-24">
              <h6 className="mb-3">Ledger entries</h6>
              {loadingLedger ? (
                <p className="text-secondary">Loading...</p>
              ) : ledger.length === 0 ? (
                <p className="text-secondary">No ledger entries yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Source</th>
                        <th>Ref</th>
                        <th className="text-end">Debit</th>
                        <th className="text-end">Credit</th>
                        <th className="text-end">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((entry) => {
                        const isAmountPending =
                          entry.sourceId?.includes("amount_pending") ||
                          (Number(entry.debit) === 0 && Number(entry.credit) === 0);
                        const refDisplay = (entry.sourceId?.replace(/\|amount_pending$/, "").trim() || entry.sourceId) ?? "—";
                        return (
                          <tr key={entry.id}>
                            <td>{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : "—"}</td>
                            <td>{entry.sourceType ?? "—"}</td>
                            <td>
                              {refDisplay}
                              {isAmountPending && (
                                <span className="badge bg-secondary ms-1" title="Debit/credit will be set when invoice or PO amount is linked">
                                  Amount pending
                                </span>
                              )}
                            </td>
                            <td className="text-end">{Number(entry.debit) ? `৳${Number(entry.debit).toLocaleString()}` : "—"}</td>
                            <td className="text-end">{Number(entry.credit) ? `৳${Number(entry.credit).toLocaleString()}` : "—"}</td>
                            <td className="text-end">{entry.balanceAfter != null ? `৳${Number(entry.balanceAfter).toLocaleString()}` : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "attachments" && (
          <div className="card radius-12">
            <div className="card-body p-24">
              <h6 className="mb-3">Attachments</h6>
              {vendor?.attachments?.length ? (
                <ul className="list-group list-group-flush">
                  {vendor.attachments.map((a) => (
                    <li key={a.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <span>{a.type} – {a.fileKey}</span>
                      {a.note && <small className="text-muted">{a.note}</small>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-secondary">No attachments. Use API POST /api/v1/vendors/:id/attachments with fileKey (after MinIO upload) to add.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
