"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";
import MedicineAliasesJsonField, { type MedicineAliasesJsonFieldHandle } from "../../_components/MedicineAliasesJsonField";
import MedicineConfirmModal from "../../_components/MedicineConfirmModal";
import { ADMIN_MEDICINE_BASE } from "../../_lib/paths";

export default function AdminMedicineBrandEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [aliasReloadToken, setAliasReloadToken] = useState(0);
  const aliasesRef = useRef<MedicineAliasesJsonFieldHandle>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmKind, setConfirmKind] = useState<null | "toggle" | "archive">(null);

  const load = useCallback(async () => {
    const res = await adminMedicineWorkspaceApi.brandsGet(id);
    const d = res.data as Record<string, unknown>;
    setRow(d);
    setDisplayName(String(d.displayName ?? ""));
    setAliasReloadToken((t) => t + 1);
  }, [id]);

  useEffect(() => {
    (async () => {
      if (!id || Number.isNaN(id)) {
        router.push(`${ADMIN_MEDICINE_BASE}/brands`);
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
        <p className="text-muted small mt-3 mb-0">Loading brand…</p>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="dashboard-main-body">
        <Link href={`${ADMIN_MEDICINE_BASE}/brands`} className="text-muted small d-inline-block mb-3">
          ← Brands
        </Link>
        {error ? <div className="alert alert-danger radius-12">{error}</div> : <p className="text-muted">Record not found.</p>}
      </div>
    );
  }

  const mfr = row.manufacturer as Record<string, unknown> | undefined;

  const onSave = async () => {
    const ser = aliasesRef.current?.serialize();
    if (!ser || !ser.ok) {
      setError(ser && !ser.ok ? ser.message : "Could not read alternate names.");
      return;
    }
    const aliasesJson = ser.value as object;
    try {
      setBusy(true);
      setError("");
      await adminMedicineWorkspaceApi.brandsPatch(id, { displayName: displayName.trim(), aliasesJson });
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
        await adminMedicineWorkspaceApi.brandsPatch(id, { isActive: !row.isActive });
        setConfirmKind(null);
        await load();
      } else {
        await adminMedicineWorkspaceApi.brandsArchive(id);
        setConfirmKind(null);
        router.push(`${ADMIN_MEDICINE_BASE}/brands`);
      }
    } catch (e) {
      setError((e as Error)?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dashboard-main-body">
      <Link href={`${ADMIN_MEDICINE_BASE}/brands`} className="text-muted small d-inline-block mb-3">
        ← Brands
      </Link>
      <h1 className="h4 mb-1 fw-semibold">{displayName || "Brand"}</h1>
      <p className="small text-muted mb-2">Internal ref. {id}</p>
      <p className="text-muted small mb-0">
        Manufacturer:{" "}
        {mfr?.id ? (
          <Link href={`${ADMIN_MEDICINE_BASE}/manufacturers/${String(mfr.id)}`} className="text-decoration-none">
            {String(mfr.displayName ?? "—")}
          </Link>
        ) : (
          String(mfr?.displayName ?? "—")
        )}
      </p>
      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      <div className="card radius-12 mb-3">
        <div className="card-body p-24">
          <div className="mb-3">
            <label className="form-label fw-medium">Display name</label>
            <input className="form-control" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="mb-3">
            <MedicineAliasesJsonField
              ref={aliasesRef}
              idPrefix="brand"
              reloadToken={aliasReloadToken}
              initialValue={row.aliasesJson}
              listLabel="Alternate brand names"
              listHint="Other trade names or spellings that should match this brand in imports and search."
            />
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
        title={row.isActive ? "Deactivate brand?" : "Activate brand?"}
        confirmVariant={row.isActive ? "warning" : "success"}
        confirmLabel={row.isActive ? "Deactivate" : "Activate"}
        busy={busy}
        onClose={() => setConfirmKind(null)}
        onConfirm={submitLifecycleConfirm}
      >
        <p className="mb-0">
          {row.isActive
            ? "This brand will be hidden from new composition where APIs require active masters. Existing catalog rows are unchanged."
            : "This brand becomes selectable again for new catalog composition."}
        </p>
      </MedicineConfirmModal>

      <MedicineConfirmModal
        open={confirmKind === "archive"}
        title="Archive brand?"
        confirmVariant="danger"
        confirmLabel="Archive (soft)"
        busy={busy}
        onClose={() => setConfirmKind(null)}
        onConfirm={submitLifecycleConfirm}
      >
        <p className="mb-0">
          Soft archive is audit-logged. The API blocks this while country medicine listings still reference this brand. Not a hard delete.
        </p>
      </MedicineConfirmModal>
    </div>
  );
}
