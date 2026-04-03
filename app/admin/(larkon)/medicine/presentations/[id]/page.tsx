"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";
import MedicineConfirmModal from "../../_components/MedicineConfirmModal";
import { ADMIN_MEDICINE_BASE } from "../../_lib/paths";

export default function AdminMedicinePresentationEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [strengthDisplay, setStrengthDisplay] = useState("");
  const [strengthKey, setStrengthKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmKind, setConfirmKind] = useState<null | "toggle" | "archive">(null);

  const load = useCallback(async () => {
    const res = await adminMedicineWorkspaceApi.presentationsGet(id);
    const d = res.data as Record<string, unknown>;
    setRow(d);
    setStrengthDisplay(String(d.strengthDisplay ?? ""));
    setStrengthKey(String(d.strengthNormalizedKey ?? ""));
  }, [id]);

  useEffect(() => {
    (async () => {
      if (!id || Number.isNaN(id)) {
        router.push(`${ADMIN_MEDICINE_BASE}/presentations`);
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
        <p className="text-muted small mt-3 mb-0">Loading presentation…</p>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="dashboard-main-body">
        <Link href={`${ADMIN_MEDICINE_BASE}/presentations`} className="text-muted small d-inline-block mb-3">
          ← Strengths / Presentations
        </Link>
        {error ? <div className="alert alert-danger radius-12">{error}</div> : <p className="text-muted">Record not found.</p>}
      </div>
    );
  }

  const gen = row.generic as Record<string, unknown> | undefined;
  const form = row.dosageForm as Record<string, unknown> | undefined;

  const onSave = async () => {
    try {
      setBusy(true);
      setError("");
      await adminMedicineWorkspaceApi.presentationsPatch(id, {
        strengthDisplay: strengthDisplay.trim(),
        strengthNormalizedKey: strengthKey.trim() || undefined,
      });
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
        await adminMedicineWorkspaceApi.presentationsPatch(id, { isActive: !row.isActive });
        setConfirmKind(null);
        await load();
      } else {
        await adminMedicineWorkspaceApi.presentationsArchive(id);
        setConfirmKind(null);
        router.push(`${ADMIN_MEDICINE_BASE}/presentations`);
      }
    } catch (e) {
      setError((e as Error)?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dashboard-main-body">
      <Link href={`${ADMIN_MEDICINE_BASE}/presentations`} className="text-muted small d-inline-block mb-3">
        ← Strengths / Presentations
      </Link>
      <h1 className="h4 mb-1 fw-semibold">{strengthDisplay || "Strength / presentation"}</h1>
      <p className="text-muted small mb-1">
        {String(gen?.displayName ?? "—")} · {String(form?.displayName ?? "—")}
      </p>
      <p className="small text-muted mb-3">Internal ref. {id}</p>
      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      <div className="card radius-12 mb-3">
        <div className="card-body p-24">
          <div className="mb-3">
            <label className="form-label fw-medium">Strength display</label>
            <input className="form-control" value={strengthDisplay} onChange={(e) => setStrengthDisplay(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="form-label fw-medium">Normalized strength key</label>
            <input className="form-control" value={strengthKey} onChange={(e) => setStrengthKey(e.target.value)} />
            <p className="form-text small text-muted mb-0">
              Stable machine key for matching imports and deduplication. Usually left in sync with strength display unless you are correcting a
              legacy value.
            </p>
          </div>
          <button type="button" className="btn btn-primary radius-12 me-2" disabled={busy} onClick={onSave}>
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
          <button type="button" className="btn btn-outline-danger radius-12" disabled={busy} onClick={() => setConfirmKind("archive")}>
            Archive
          </button>
        </div>
      </div>

      <MedicineConfirmModal
        open={confirmKind === "toggle"}
        title={row.isActive ? "Deactivate presentation?" : "Activate presentation?"}
        confirmVariant={row.isActive ? "warning" : "success"}
        confirmLabel={row.isActive ? "Deactivate" : "Activate"}
        busy={busy}
        onClose={() => setConfirmKind(null)}
        onConfirm={submitLifecycleConfirm}
      >
        <p className="mb-0">
          {row.isActive
            ? "New catalog listings should not reference inactive presentations where the API enforces it. Existing rows keep their reference."
            : "This strength/presentation becomes available for new catalog composition."}
        </p>
      </MedicineConfirmModal>

      <MedicineConfirmModal
        open={confirmKind === "archive"}
        title="Archive presentation?"
        confirmVariant="danger"
        confirmLabel="Archive (soft)"
        busy={busy}
        onClose={() => setConfirmKind(null)}
        onConfirm={submitLifecycleConfirm}
      >
        <p className="mb-0">
          Soft archive is audit-logged. Blocked if any country medicine listing references this presentation. Not a hard delete.
        </p>
      </MedicineConfirmModal>
    </div>
  );
}
