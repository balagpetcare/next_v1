"use client";

// Flat URL for Services catalog (see next.config redirects from .../services-pricing/catalog).
// Matches staff patient flat-route pattern — avoids Next/Turbopack 404 on deep nested segments.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicServicePricingMatrix,
  staffClinicPatchServicePricing,
  staffClinicGetServicePricingHistory,
} from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, PageHeader, SectionCard, LoadingState } from "@/src/components/dashboard";
import { Modal, Button, Form } from "react-bootstrap";
import ServicesPricingNav from "../_components/ServicesPricingNav";
import { staffServicePricingServiceContentPath } from "@/src/lib/staffServicePricingRoutes";

/** Aligned with GET service-pricing/matrix clinic permission set (read + manage). */
const PERMS = [
  "clinic.services.manage",
  "clinic.appointments.manage",
  "clinic.appointments.read",
  "manager.pricing.view",
];

export default function StaffServicesPricingCatalogPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PERMS.some((p) => permissions.includes(p));
  const canEdit = permissions.includes("clinic.services.manage") || permissions.includes("clinic.appointments.manage");

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editRow, setEditRow] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [historyFor, setHistoryFor] = useState<{ id: number; name: string } | null>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const load = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setLoading(true);
    setError("");
    try {
      const data = await staffClinicServicePricingMatrix(branchId);
      setRows(Array.isArray(data?.services) ? data.services : []);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, hasAccess]);

  useEffect(() => {
    load();
  }, [load]);

  const openPricingHistory = useCallback(
    async (serviceId: number, name: string) => {
      if (!branchId) return;
      setHistoryFor({ id: serviceId, name });
      setHistoryLoading(true);
      setHistoryError("");
      setHistoryItems([]);
      try {
        const items = await staffClinicGetServicePricingHistory(branchId, serviceId, { limit: 50 });
        setHistoryItems(items);
      } catch (e) {
        setHistoryError((e as Error)?.message ?? "Failed to load history");
      } finally {
        setHistoryLoading(false);
      }
    },
    [branchId]
  );

  const closePricingHistory = () => {
    setHistoryFor(null);
    setHistoryItems([]);
    setHistoryError("");
  };

  const saveEdit = async () => {
    if (!editRow || !branchId || !canEdit) return;
    setSaving(true);
    setError("");
    try {
      await staffClinicPatchServicePricing(branchId, editRow.id, {
        price: editRow.listPrice ?? editRow.price,
        baseCost: editRow.baseCost === "" ? null : Number(editRow.baseCost),
        minSafePrice: editRow.minSafePrice === "" ? null : Number(editRow.minSafePrice),
        staffInstructions: editRow.staffInstructions || null,
        pricingExplanation: editRow.pricingExplanation || null,
        visibleToPublic: !!editRow.visibleToPublic,
        preparationNotes: editRow.preparationNotes != null ? String(editRow.preparationNotes) : null,
        aftercareNotes: editRow.aftercareNotes != null ? String(editRow.aftercareNotes) : null,
        duration: editRow.duration === "" ? null : Number(editRow.duration),
        name: editRow.name,
        category: editRow.category,
        status: editRow.status,
        reason: editRow.changeReason || null,
      });
      setEditRow(null);
      await load();
    } catch (e) {
      setError((e as Error)?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading..." />
      </PageWorkspace>
    );
  }

  if (!branch) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading branch…" />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        title="Services catalog"
        message="You need at least one of: manager.pricing.view, clinic.services.manage, clinic.appointments.read, or clinic.appointments.manage."
        missingPerm="Services & Pricing (catalog)"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic/dashboard`)}
      />
    );
  }

  return (
    <PageWorkspace>
      <div className="px-1">
        <ServicesPricingNav />
      </div>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <PageHeader
        title="Services catalog"
        subtitle="Branch services, list pricing, floors, and visibility"
      />

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      {loading ? (
        <SectionCard title="Services">
          <LoadingState message="Loading services…" />
        </SectionCard>
      ) : rows.length === 0 ? (
        <SectionCard title="Services">
          <p className="text-muted mb-2">No services found for this branch.</p>
          <p className="small text-muted mb-0">
            Add or enable branch services from the branch catalog if your role allows.
          </p>
        </SectionCard>
      ) : (
        <SectionCard title="Services" subtitle={canEdit ? "Edit updates pricing fields (audited). Content opens prep/aftercare & media." : "Read-only."}>
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Service</th>
                  <th>Code</th>
                  <th>Category</th>
                  <th className="text-end">List ৳</th>
                  <th className="text-end">Min safe</th>
                  <th className="text-end">Base cost</th>
                  <th className="text-center">Providers</th>
                  <th className="text-center">Pending ack</th>
                  <th>Status</th>
                  <th>Public</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="fw-medium">{r.name}</div>
                      {r.pricingExplanation ? (
                        <div className="text-muted small mt-1" style={{ maxWidth: 280 }} title={String(r.pricingExplanation)}>
                          {String(r.pricingExplanation)}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-muted small">{r.serviceCode ?? "—"}</td>
                    <td>
                      <span className="badge bg-secondary-subtle text-secondary-emphasis">{r.category}</span>
                    </td>
                    <td className="text-end">৳{Number(r.listPrice ?? r.price ?? 0).toLocaleString()}</td>
                    <td className="text-end">{r.minSafePrice != null ? `৳${Number(r.minSafePrice).toLocaleString()}` : "—"}</td>
                    <td className="text-end">{r.baseCost != null ? `৳${Number(r.baseCost).toLocaleString()}` : "—"}</td>
                    <td className="text-center">{r.assignedDoctorCount ?? 0}</td>
                    <td className="text-center">
                      {(r.pendingAckCount ?? 0) > 0 ? (
                        <span className="badge bg-warning text-dark">{r.pendingAckCount}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{r.status}</td>
                    <td>{r.visibleToPublic === false ? "No" : "Yes"}</td>
                    <td className="text-end text-nowrap">
                      <Link
                        href={staffServicePricingServiceContentPath(branchId, r.id)}
                        className="btn btn-link btn-sm"
                      >
                        Content
                      </Link>
                      <button
                        type="button"
                        className="btn btn-link btn-sm"
                        onClick={() => openPricingHistory(r.id, r.name)}
                      >
                        History
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm radius-8 ms-1"
                          onClick={() =>
                            setEditRow({
                              ...r,
                              changeReason: "",
                              baseCost: r.baseCost ?? "",
                              minSafePrice: r.minSafePrice ?? "",
                              listPrice: r.listPrice ?? r.price,
                            })
                          }
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <Modal show={!!historyFor} onHide={closePricingHistory} size="lg" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Pricing history{historyFor ? ` — ${historyFor.name}` : ""}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {historyError && <div className="alert alert-danger radius-12 mb-2">{historyError}</div>}
          {historyLoading ? (
            <LoadingState message="Loading history…" />
          ) : historyItems.length === 0 ? (
            <p className="text-muted small mb-0">No audited pricing changes yet for this service.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead className="table-light">
                  <tr>
                    <th>When</th>
                    <th>Actor</th>
                    <th>Reason</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {historyItems.map((h: any) => {
                    const after = h?.afterJson && typeof h.afterJson === "object" ? h.afterJson : {};
                    const before = h?.beforeJson && typeof h.beforeJson === "object" ? h.beforeJson : {};
                    const priceAfter = after.price != null ? String(after.price) : "—";
                    const priceBefore = before.price != null ? String(before.price) : "—";
                    return (
                      <tr key={h.id}>
                        <td className="small text-nowrap">
                          {h.createdAt ? new Date(h.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="small">{h.actorUserId ?? "—"}</td>
                        <td className="small">{h.reason ?? "—"}</td>
                        <td className="small">
                          List ৳ {priceBefore} → {priceAfter}
                          {after.pricingExplanation != null && String(after.pricingExplanation).trim() !== "" ? (
                            <div className="text-muted mt-1" title={String(after.pricingExplanation)}>
                              Note: {String(after.pricingExplanation).slice(0, 120)}
                              {String(after.pricingExplanation).length > 120 ? "…" : ""}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={closePricingHistory}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!editRow} onHide={() => setEditRow(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit service pricing</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editRow && (
            <div className="d-flex flex-column gap-2">
              <Form.Group>
                <Form.Label>Name</Form.Label>
                <Form.Control value={editRow.name} onChange={(e) => setEditRow({ ...editRow, name: e.target.value })} />
              </Form.Group>
              <Form.Group>
                <Form.Label>Category</Form.Label>
                <Form.Control value={editRow.category} onChange={(e) => setEditRow({ ...editRow, category: e.target.value })} />
              </Form.Group>
              <div className="row g-2">
                <div className="col-md-4">
                  <Form.Group>
                    <Form.Label>List price</Form.Label>
                    <Form.Control
                      type="number"
                      value={editRow.listPrice ?? ""}
                      onChange={(e) =>
                        setEditRow({ ...editRow, listPrice: e.target.value === "" ? "" : Number(e.target.value) })
                      }
                    />
                  </Form.Group>
                </div>
                <div className="col-md-4">
                  <Form.Group>
                    <Form.Label>Min safe price</Form.Label>
                    <Form.Control
                      type="number"
                      value={editRow.minSafePrice}
                      onChange={(e) => setEditRow({ ...editRow, minSafePrice: e.target.value })}
                    />
                  </Form.Group>
                </div>
                <div className="col-md-4">
                  <Form.Group>
                    <Form.Label>Base cost</Form.Label>
                    <Form.Control
                      type="number"
                      value={editRow.baseCost}
                      onChange={(e) => setEditRow({ ...editRow, baseCost: e.target.value })}
                    />
                  </Form.Group>
                </div>
              </div>
              <Form.Group>
                <Form.Label>Duration (min)</Form.Label>
                <Form.Control
                  type="number"
                  value={editRow.duration ?? ""}
                  onChange={(e) => setEditRow({ ...editRow, duration: e.target.value })}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select value={editRow.status} onChange={(e) => setEditRow({ ...editRow, status: e.target.value })}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </Form.Select>
              </Form.Group>
              <Form.Check
                type="switch"
                id="vis"
                label="Visible to public"
                checked={!!editRow.visibleToPublic}
                onChange={(e) => setEditRow({ ...editRow, visibleToPublic: e.target.checked })}
              />
              <Form.Group>
                <Form.Label>Staff instructions</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={editRow.staffInstructions ?? ""}
                  onChange={(e) => setEditRow({ ...editRow, staffInstructions: e.target.value })}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Pricing explanation</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editRow.pricingExplanation ?? ""}
                  onChange={(e) => setEditRow({ ...editRow, pricingExplanation: e.target.value })}
                  placeholder="Shown to staff in catalog context where supported"
                />
                <Form.Text className="text-muted">Visible in the services catalog row for managers (internal context).</Form.Text>
              </Form.Group>
              <Form.Group>
                <Form.Label>Preparation notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={editRow.preparationNotes ?? ""}
                  onChange={(e) => setEditRow({ ...editRow, preparationNotes: e.target.value })}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Aftercare notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={editRow.aftercareNotes ?? ""}
                  onChange={(e) => setEditRow({ ...editRow, aftercareNotes: e.target.value })}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Change reason (audit)</Form.Label>
                <Form.Control
                  value={editRow.changeReason ?? ""}
                  onChange={(e) => setEditRow({ ...editRow, changeReason: e.target.value })}
                  placeholder="Optional note for pricing log"
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setEditRow(null)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={saveEdit} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>
    </PageWorkspace>
  );
}
