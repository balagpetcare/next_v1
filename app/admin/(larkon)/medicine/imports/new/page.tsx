"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminCountriesApi, adminMedicineCatalogImportApi } from "@/lib/adminApi";
import MedicineConfirmModal from "../../_components/MedicineConfirmModal";
import { ADMIN_MEDICINE_BASE, ADMIN_MEDICINE_IMPORTS } from "../../_lib/paths";

type CountryOpt = { id: number; code: string; name: string };

export default function AdminMedicineImportsNewPage() {
  const router = useRouter();
  const [countries, setCountries] = useState<CountryOpt[]>([]);
  const [countryId, setCountryId] = useState<number | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dupHint, setDupHint] = useState<{ batchId: number; status?: string; fileSha256?: string } | null>(null);
  const [dupAllowOpen, setDupAllowOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminCountriesApi.list({ isActive: true });
        const list = (res?.data ?? []) as CountryOpt[];
        setCountries(list);
        const bd = list.find((c) => c.code === "BD");
        if (bd) setCountryId(bd.id);
      } catch {
        setCountries([]);
      }
    })();
  }, []);

  const runUpload = async (allowDuplicateFile: boolean) => {
    if (!file) {
      setError("Choose a CSV file");
      return;
    }
    if (countryId === "") {
      setError("Select a country");
      return;
    }
    try {
      setBusy(true);
      setError("");
      setDupHint(null);
      const res = await adminMedicineCatalogImportApi.upload(file, {
        countryId: Number(countryId),
        allowDuplicateFile,
      });
      const batchId = res?.data?.batchId;
      if (batchId != null && Number.isFinite(Number(batchId))) {
        router.push(`${ADMIN_MEDICINE_IMPORTS}/${batchId}`);
        return;
      }
      setError("Upload did not return batch id");
    } catch (err) {
      const e = err as Error & {
        status?: number;
        payload?: {
          data?: { existingBatchId?: number; existingStatus?: string; fileSha256?: string };
        };
      };
      const dup = e.payload?.data;
      if (e.status === 409 && dup?.existingBatchId != null) {
        setDupHint({
          batchId: dup.existingBatchId,
          status: dup.existingStatus,
          fileSha256: dup.fileSha256,
        });
        setError(e.message || "Duplicate file for this country.");
      } else {
        setError(e?.message || "Upload failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runUpload(false);
  };

  return (
    <div className="dashboard-main-body">
      <div className="d-flex flex-wrap gap-2 mb-3">
        <Link href={ADMIN_MEDICINE_IMPORTS} className="text-muted small">
          ← Import history
        </Link>
        <span className="text-muted small">·</span>
        <Link href={ADMIN_MEDICINE_BASE} className="text-muted small">
          Medicine Control Center
        </Link>
      </div>
      <h1 className="h4 mb-4">New medicine catalog import</h1>
      <p className="text-muted small mb-4">
        Required columns (flexible headers): <code>genericName</code>, <code>brandName</code>, <code>dosageType</code>,{" "}
        <code>strength</code>, <code>manufacturer</code>. Optional: <code>packageMark</code>.
      </p>

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      {dupHint && (
        <div className="alert alert-warning radius-12 mb-3">
          <p className="small mb-2">
            An import with the same file checksum (SHA-256) is already open for this country
            {dupHint.status ? ` (status ${dupHint.status})` : ""}. Prefer continuing the existing batch unless you intentionally need a parallel
            staging copy.
          </p>
          {dupHint.fileSha256 ? (
            <p className="small text-muted mb-2 text-break user-select-all">
              Checksum: {dupHint.fileSha256}
            </p>
          ) : null}
          <Link href={`${ADMIN_MEDICINE_IMPORTS}/${dupHint.batchId}`} className="btn btn-sm btn-outline-primary radius-8 me-2">
            Open batch #{dupHint.batchId}
          </Link>
          <button type="button" className="btn btn-sm btn-outline-secondary radius-8" disabled={busy} onClick={() => setDupAllowOpen(true)}>
            Create new batch anyway…
          </button>
        </div>
      )}

      <MedicineConfirmModal
        open={dupAllowOpen}
        title="Create a second import batch with the same file?"
        confirmVariant="warning"
        confirmLabel="Yes, upload as new batch"
        cancelLabel="Cancel"
        busy={busy}
        onClose={() => setDupAllowOpen(false)}
        onConfirm={async () => {
          setDupAllowOpen(false);
          await runUpload(true);
        }}
      >
        <p className="mb-0">
          This bypasses duplicate detection for this country and checksum. Use when you deliberately need a separate staging batch (e.g. after
          cancelling the first). The API still applies normal preview/confirm/apply safeguards.
        </p>
      </MedicineConfirmModal>

      <div className="card radius-12" style={{ maxWidth: 560 }}>
        <div className="card-body p-24">
          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label className="form-label fw-medium">Country</label>
              <select
                className="form-select"
                value={countryId === "" ? "" : String(countryId)}
                onChange={(e) => setCountryId(e.target.value ? Number(e.target.value) : "")}
                required
              >
                <option value="">Select country…</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
              <div className="form-text">Bangladesh (BD) is pre-selected when available. Same workflow for IN, PK, US, etc.</div>
            </div>
            <div className="mb-4">
              <label className="form-label fw-medium">CSV file</label>
              <input
                type="file"
                accept=".csv,text/csv"
                className="form-control"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <button type="submit" className="btn btn-primary radius-12" disabled={busy}>
              {busy ? "Uploading…" : "Upload & preview"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
