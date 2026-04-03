"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";
import MedicineConfirmModal from "../../_components/MedicineConfirmModal";
import { ADMIN_MEDICINE_BASE } from "../../_lib/paths";

export default function AdminMedicineManufacturerEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmKind, setConfirmKind] = useState<null | "toggle" | "archive">(null);

  const load = useCallback(async () => {
    const res = await adminMedicineWorkspaceApi.manufacturersGet(id);
    const d = res.data as Record<string, unknown>;
    setRow(d);
    setDisplayName(String(d.displayName ?? ""));
  }, [id]);

  useEffect(() => {
    (async () => {
      if (!id || Number.isNaN(id)) {
        router.push(`${ADMIN_MEDICINE_BASE}/manufacturers`);
        return;
      }
      try {
        setLoading(true);
        await load();
      } catch (e) {
        setError((e as Error)?.message || "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router, load]);

  if (loading) {
    return (
      <div className="dashboard-main-body py-5 text-center">
        <div className="spinner-border text-primary" />
        <p className="text-muted small mt-3 mb-0">Loading manufacturer…</p>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="dashboard-main-body">
        <Link href={`${ADMIN_MEDICINE_BASE}/manufacturers`} className="text-muted small d-inline-block mb-3">
          ← Manufacturers
        </Link>
        {error ? <div className="alert alert-danger radius-12">{error}</div> : <p className="text-muted">Record not found.</p>}
      </div>
    );
  }

  const isSystem = Boolean(row.isSystem);

  const onSave = async () => {
    try {
      setBusy(true);
      setError("");
      await adminMedicineWorkspaceApi.manufacturersPatch(id, { displayName: displayName.trim() });
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const submitLifecycleConfirm = async () => {
    if (!confirmKind) return;
    try {
      setBusy(true);
      setError("");
      if (confirmKind === "toggle") {
        await adminMedicineWorkspaceApi.manufacturersPatch(id, { isActive: !row.isActive });
        setConfirmKind(null);
        await load();
      } else {
        await adminMedicineWorkspaceApi.manufacturersArchive(id);
        setConfirmKind(null);
        router.push(`${ADMIN_MEDICINE_BASE}/manufacturers`);
      }
    } catch (e) {
      setError((e as Error)?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dashboard-main-body">
      <Link href={`${ADMIN_MEDICINE_BASE}/manufacturers`} className="text-muted small d-inline-block mb-3">
        ← Manufacturers
      </Link>
      <h1 className="h4 mb-1 fw-semibold">{displayName || "Manufacturer"}</h1>
      <p className="small text-muted mb-3">Internal ref. {id}</p>
      {isSystem && <div className="alert alert-info radius-12 small">System manufacturer: display name cannot be changed from this screen.</div>}
      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      <div className="card radius-12 mb-3">
        <div className="card-body p-24">
          <div className="mb-3">
            <label className="form-label fw-medium">Display name</label>
            <input className="form-control" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={isSystem} />
          </div>
          <button type="button" className="btn btn-primary radius-12 me-2" disabled={busy || isSystem} onClick={onSave}>
            Save
          </button>
          {row.isActive ? (
            <button type="button" className="btn btn-outline-warning radius-12 me-2" disabled={busy} onClick={() => setConfirmKind("toggle")}>
              Deactivate
            </button>
          ) : (
            <button type="button" className="btn btn-outline-success radius-12 me-2" disabled={busy} onClick={() => setConfirmKind("toggle")}>
              Activate
            </button>
          )}
          <button type="button" className="btn btn-outline-danger radius-12" disabled={busy || isSystem} onClick={() => setConfirmKind("archive")}>
            Archive
          </button>
        </div>
      </div>

      <MedicineConfirmModal
        open={confirmKind === "toggle"}
        title={row.isActive ? "Deactivate manufacturer?" : "Activate manufacturer?"}
        confirmVariant={row.isActive ? "warning" : "success"}
        confirmLabel={row.isActive ? "Deactivate" : "Activate"}
        busy={busy}
        onClose={() => setConfirmKind(null)}
        onConfirm={submitLifecycleConfirm}
      >
        <p className="mb-0">
          {row.isActive
            ? "New brand rows may require active manufacturers where the API enforces it."
            : "This manufacturer becomes available for new brands."}
        </p>
      </MedicineConfirmModal>

      <MedicineConfirmModal
        open={confirmKind === "archive"}
        title="Archive manufacturer?"
        confirmVariant="danger"
        confirmLabel="Archive (soft)"
        busy={busy}
        onClose={() => setConfirmKind(null)}
        onConfirm={submitLifecycleConfirm}
      >
        <p className="mb-0">
          Blocked for system manufacturers and while brands still reference this record. Soft archive with audit trail — not a hard delete.
        </p>
      </MedicineConfirmModal>
    </div>
  );
}
