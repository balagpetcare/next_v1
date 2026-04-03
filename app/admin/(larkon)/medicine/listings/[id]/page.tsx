"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";
import { ListingStatusBadge } from "../../_components/MedicineUiHelpers";
import { ADMIN_MEDICINE_BASE, ADMIN_MEDICINE_IMPORTS } from "../../_lib/paths";
import MedicineListingDetailSections, { type RelatedMedicinesBundle } from "../_components/MedicineListingDetailSections";
import MedicineListingRxBadge from "../_components/MedicineListingRxBadge";
import MedicineListingSourceBadge from "../_components/MedicineListingSourceBadge";
import MedicineTypeIcon from "../_components/MedicineTypeIcon";
import { parseWorkspaceProfile } from "../_lib/medicineWorkspaceProfile.types";

type AuditLine = {
  id: number;
  action: string;
  createdAt: string;
  user?: { auth?: { email?: string | null }; profile?: { displayName?: string } };
};

type ModalKind = "deactivate" | "activate" | "archive" | "restore" | null;

export default function AdminMedicineListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pkg, setPkg] = useState("");
  const [reason, setReason] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [deactivateNote, setDeactivateNote] = useState("");
  const [auditLines, setAuditLines] = useState<AuditLine[]>([]);
  const [auditErr, setAuditErr] = useState("");

  const load = useCallback(async () => {
    if (!id || Number.isNaN(id)) return;
    const res = await adminMedicineWorkspaceApi.listingsGet(id);
    const d = res.data as Record<string, unknown>;
    setRow(d);
    setPkg(String(d?.packageMarkDisplay ?? ""));
  }, [id]);

  const loadAudit = useCallback(async () => {
    if (!id || Number.isNaN(id)) return;
    try {
      setAuditErr("");
      const res = await adminMedicineWorkspaceApi.medicineAuditLogs({
        entityType: "CountryMedicineBrand",
        entityId: id,
        limit: 25,
      });
      setAuditLines((res.data?.items ?? []) as AuditLine[]);
    } catch (e) {
      setAuditErr((e as Error)?.message || "Could not load activity");
      setAuditLines([]);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      if (!id || Number.isNaN(id)) {
        router.push(`${ADMIN_MEDICINE_BASE}/listings`);
        return;
      }
      try {
        setLoading(true);
        await load();
        setError("");
      } catch (e) {
        setError((e as Error)?.message || "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router, load]);

  useEffect(() => {
    if (!id || Number.isNaN(id)) return;
    loadAudit().catch(() => {});
  }, [id, loadAudit]);

  if (loading || !row) {
    return (
      <div className="dashboard-main-body py-5 text-center">
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  const archived = row.archivedAt != null;
  const presentation = row.presentation as Record<string, unknown> | undefined;
  const brand = row.brand as Record<string, unknown> | undefined;
  const country = row.country as Record<string, unknown> | undefined;
  const firstBatch = row.firstBatch as { id?: number; filename?: string; status?: string } | null | undefined;
  const lastBatch = row.lastBatch as { id?: number; filename?: string; status?: string } | null | undefined;
  const hasImportLineage = Boolean(firstBatch?.id || lastBatch?.id);
  const relatedMedicines = row.relatedMedicines as RelatedMedicinesBundle | undefined;
  const dosageFormName = String((presentation?.dosageForm as Record<string, unknown>)?.displayName ?? "");
  const rxCount = Number(row.prescriptionItemCount ?? 0);
  const brandTitle = String(brand?.displayName ?? "Medicine");
  const strengthTitle = String(presentation?.strengthDisplay ?? "").trim();
  const listingHeading = strengthTitle ? `${brandTitle} · ${strengthTitle}` : brandTitle;
  const workspaceProfile = parseWorkspaceProfile(row.workspaceProfileJson);
  const reviewStatus = row.reviewStatus != null ? String(row.reviewStatus) : "";
  const workspaceEntries = Object.entries(workspaceProfile).filter(
    ([, v]) => v != null && String(v).trim() !== "",
  ) as [string, string][];

  const closeModal = () => {
    setModal(null);
    setDeactivateNote("");
  };

  const onSavePackage = async () => {
    try {
      setBusy(true);
      setError("");
      await adminMedicineWorkspaceApi.listingsPatch(id, { packageMarkDisplay: pkg });
      await load();
      await loadAudit();
    } catch (e) {
      setError((e as Error)?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const submitDeactivate = async () => {
    try {
      setBusy(true);
      setError("");
      await adminMedicineWorkspaceApi.listingsPatch(id, {
        isActive: false,
        deactivatedReason: deactivateNote.trim() || undefined,
      });
      await load();
      await loadAudit();
      closeModal();
    } catch (e) {
      setError((e as Error)?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const submitActivate = async () => {
    try {
      setBusy(true);
      setError("");
      await adminMedicineWorkspaceApi.listingsPatch(id, { isActive: true, deactivatedReason: null });
      await load();
      await loadAudit();
      closeModal();
    } catch (e) {
      setError((e as Error)?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const submitArchive = async () => {
    try {
      setBusy(true);
      setError("");
      await adminMedicineWorkspaceApi.listingsArchive(id, { reason: reason || undefined });
      await load();
      await loadAudit();
      closeModal();
    } catch (e) {
      setError((e as Error)?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const submitRestore = async () => {
    try {
      setBusy(true);
      setError("");
      await adminMedicineWorkspaceApi.listingsRestore(id);
      await load();
      await loadAudit();
      closeModal();
    } catch (e) {
      setError((e as Error)?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dashboard-main-body">
      <Link href={`${ADMIN_MEDICINE_BASE}/listings`} className="text-muted small d-inline-block mb-3">
        ← Medicines
      </Link>
      <div className="d-flex flex-wrap align-items-start gap-3 mb-3">
        <MedicineTypeIcon dosageFormDisplay={dosageFormName || null} />
        <div className="flex-grow-1 min-w-0">
          <h1 className="h4 mb-1 fw-semibold">{listingHeading}</h1>
          <p className="text-muted small mb-1">
            {String(country?.code ?? "")} · {String(country?.name ?? "")}
          </p>
          <p className="small text-muted mb-0">Internal listing ref. {id}</p>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <MedicineListingSourceBadge firstImportBatchId={row.firstImportBatchId as number | null | undefined} />
            <MedicineListingRxBadge prescriptionCount={rxCount} />
          </div>
        </div>
      </div>
      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      <div className="row g-3 mb-4">
        <div className="col-lg-4 col-md-6">
          <div className="card radius-12 h-100">
            <div className="card-header bg-transparent fw-semibold">1 · Basic</div>
            <div className="card-body small">
              <div>
                <strong>Internal ref.:</strong> <span className="font-monospace">{id}</span>
              </div>
              <div>
                <strong>Country:</strong> {String(country?.name ?? "—")} ({String(country?.code ?? "")})
              </div>
              <div className="mt-2 text-muted text-break">
                <strong>Fingerprint:</strong> {String(row.importFingerprint ?? "")}
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-4 col-md-6">
          <div className="card radius-12 h-100">
            <div className="card-header bg-transparent fw-semibold">2 · Generic &amp; presentation</div>
            <div className="card-body small">
              <div>
                <strong>Generic:</strong>{" "}
                {String((presentation?.generic as Record<string, unknown>)?.displayName ?? "—")}
              </div>
              <div>
                <strong>Dosage form:</strong>{" "}
                {String((presentation?.dosageForm as Record<string, unknown>)?.displayName ?? "—")}
              </div>
              <div>
                <strong>Strength:</strong> {String(presentation?.strengthDisplay ?? "—")}
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-4 col-md-12">
          <div className="card radius-12 h-100">
            <div className="card-header bg-transparent fw-semibold">3 · Brand &amp; manufacturer</div>
            <div className="card-body small">
              <div>
                <strong>Brand:</strong> {String(brand?.displayName ?? "—")}
              </div>
              <div>
                <strong>Manufacturer:</strong>{" "}
                {String((brand?.manufacturer as Record<string, unknown>)?.displayName ?? "—")}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card radius-12 h-100">
            <div className="card-header bg-transparent fw-semibold">4 · Package, source &amp; status</div>
            <div className="card-body">
              <p className="small mb-2">
                <ListingStatusBadge isActive={Boolean(row.isActive)} archivedAt={(row.archivedAt as string | null) ?? null} />
              </p>
              {!archived && row.deactivatedReason ? (
                <p className="small text-muted mb-2">
                  <strong>Last note:</strong> {String(row.deactivatedReason)}
                </p>
              ) : null}
              <div className="mb-3">
                <label className="form-label small fw-medium">Package mark</label>
                <input className="form-control form-control-sm" value={pkg} onChange={(e) => setPkg(e.target.value)} disabled={archived} />
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary radius-8 me-2"
                disabled={busy || archived}
                onClick={onSavePackage}
              >
                Save package
              </button>
              {row.isActive ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-warning radius-8"
                  disabled={busy || archived}
                  onClick={() => {
                    setDeactivateNote(String(row.deactivatedReason ?? ""));
                    setModal("deactivate");
                  }}
                >
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success radius-8"
                  disabled={busy || archived}
                  onClick={() => setModal("activate")}
                >
                  Activate
                </button>
              )}
              <hr />
              <input
                className="form-control form-control-sm mb-2"
                placeholder="Archive reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={archived}
              />
              <button
                type="button"
                className="btn btn-sm btn-outline-danger radius-8 me-2"
                disabled={busy || archived}
                onClick={() => setModal("archive")}
              >
                Archive
              </button>
              {archived && (
                <button type="button" className="btn btn-sm btn-success radius-8" disabled={busy} onClick={() => setModal("restore")}>
                  Restore
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card radius-12 h-100">
            <div className="card-header bg-transparent fw-semibold">5 · Prescription usage</div>
            <div className="card-body small">
              <p className="mb-2">
                <strong>Rx-linked lines:</strong> {rxCount}
              </p>
              <p className="text-muted mb-0 small">
                Historical prescription lines keep references; archive is blocked when Rx lines exist.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card radius-12 mb-4">
        <div className="card-header bg-transparent fw-semibold d-flex flex-wrap align-items-center gap-2">
          <span>6 · Workspace profile &amp; review</span>
          {reviewStatus ? (
            <span className="badge bg-light text-dark border small fw-normal">{reviewStatus}</span>
          ) : (
            <span className="text-muted small fw-normal">No review status</span>
          )}
        </div>
        <div className="card-body small">
          <p className="text-muted mb-3">
            Extended catalog fields (do not change import fingerprint). Use <strong>Edit listing</strong> to change.
          </p>
          {workspaceEntries.length === 0 ? (
            <p className="text-muted mb-0">No workspace fields saved yet.</p>
          ) : (
            <dl className="row mb-0">
              {workspaceEntries.map(([key, value]) => (
                <div key={key} className="col-md-6 mb-2">
                  <dt className="text-muted small mb-0 text-break">
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}
                  </dt>
                  <dd className="mb-0 text-break">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {hasImportLineage && (
        <div className="card radius-12 mb-4">
          <div className="card-header bg-transparent fw-semibold">Import lineage</div>
          <div className="card-body small">
            <p className="text-muted mb-2">
              First and last catalog-import batches that touched this fingerprint (when created via import).
            </p>
            <div className="row g-2">
              <div className="col-md-6">
                <strong>First batch</strong>
                {firstBatch?.id ? (
                  <div>
                    <Link href={`${ADMIN_MEDICINE_IMPORTS}/${firstBatch.id}`} className="text-decoration-none fw-medium">
                      {firstBatch.filename ?? "Open batch"}
                    </Link>
                    <div className="text-muted small">
                      Ref. <span className="font-monospace">{firstBatch.id}</span>
                      {firstBatch.status ? (
                        <span className="badge bg-light text-dark ms-2">{firstBatch.status}</span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted">—</div>
                )}
              </div>
              <div className="col-md-6">
                <strong>Last batch</strong>
                {lastBatch?.id ? (
                  <div>
                    <Link href={`${ADMIN_MEDICINE_IMPORTS}/${lastBatch.id}`} className="text-decoration-none fw-medium">
                      {lastBatch.filename ?? "Open batch"}
                    </Link>
                    <div className="text-muted small">
                      Ref. <span className="font-monospace">{lastBatch.id}</span>
                      {lastBatch.status ? (
                        <span className="badge bg-light text-dark ms-2">{lastBatch.status}</span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted">—</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <MedicineListingDetailSections related={relatedMedicines} />

      <div className="card radius-12 mb-4">
        <div className="card-header bg-transparent fw-semibold">Activity (master audit)</div>
        <div className="card-body small">
          {auditErr ? <div className="text-muted">{auditErr}</div> : null}
          {!auditErr && auditLines.length === 0 ? (
            <p className="text-muted mb-0">No audit entries yet for this listing.</p>
          ) : (
            <ul className="list-unstyled mb-0">
              {auditLines.map((a) => (
                <li key={a.id} className="border-bottom py-2">
                  <span className="badge bg-light text-dark me-2">{a.action}</span>
                  <span className="text-muted">{new Date(a.createdAt).toLocaleString()}</span>
                  {a.user?.profile?.displayName || a.user?.auth?.email ? (
                    <span className="text-muted ms-2">
                      · {a.user?.profile?.displayName ?? a.user?.auth?.email}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {modal === "deactivate" && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">Deactivate listing</h5>
                <button type="button" className="btn-close" onClick={closeModal} aria-label="Close" />
              </div>
              <div className="modal-body small">
                <p>
                  This hides the medicine from <strong>new</strong> prescription catalog search. Existing prescription lines keep their
                  historical reference.
                </p>
                <label className="form-label">Optional note (audit)</label>
                <input
                  className="form-control form-control-sm"
                  value={deactivateNote}
                  onChange={(e) => setDeactivateNote(e.target.value)}
                  placeholder="Reason or reference…"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm radius-8" onClick={closeModal}>
                  Cancel
                </button>
                <button type="button" className="btn btn-warning btn-sm radius-8" disabled={busy} onClick={() => void submitDeactivate()}>
                  {busy ? "Saving…" : "Deactivate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === "activate" && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">Activate listing</h5>
                <button type="button" className="btn-close" onClick={closeModal} aria-label="Close" />
              </div>
              <div className="modal-body small">
                <p>Activate this medicine for new prescribing in the catalog?</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm radius-8" onClick={closeModal}>
                  Cancel
                </button>
                <button type="button" className="btn btn-success btn-sm radius-8" disabled={busy} onClick={() => void submitActivate()}>
                  {busy ? "Saving…" : "Activate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === "archive" && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">Archive listing</h5>
                <button type="button" className="btn-close" onClick={closeModal} aria-label="Close" />
              </div>
              <div className="modal-body small">
                <p>
                  Archive is blocked if any prescription lines reference this listing. Archived rows are excluded from normal catalog
                  flows.
                </p>
                <p className="text-muted mb-0">
                  Optional reason is in the field above; you can close this dialog to edit it first.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm radius-8" onClick={closeModal}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger btn-sm radius-8" disabled={busy} onClick={() => void submitArchive()}>
                  {busy ? "Archiving…" : "Archive"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === "restore" && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">Restore from archive</h5>
                <button type="button" className="btn-close" onClick={closeModal} aria-label="Close" />
              </div>
              <div className="modal-body small">
                <p>Restore this listing from archive? Confirm regulatory and catalog policy before continuing.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm radius-8" onClick={closeModal}>
                  Cancel
                </button>
                <button type="button" className="btn btn-success btn-sm radius-8" disabled={busy} onClick={() => void submitRestore()}>
                  {busy ? "Restoring…" : "Restore"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
