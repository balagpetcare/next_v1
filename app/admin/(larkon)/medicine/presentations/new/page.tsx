"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";
import { ADMIN_MEDICINE_BASE } from "../../_lib/paths";

export default function AdminMedicinePresentationNewPage() {
  const router = useRouter();
  const [genericId, setGenericId] = useState("");
  const [dosageFormId, setDosageFormId] = useState("");
  const [strengthDisplay, setStrengthDisplay] = useState("");
  const [strengthKey, setStrengthKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const gid = Number(genericId);
    const did = Number(dosageFormId);
    if (!Number.isFinite(gid) || !Number.isFinite(did)) {
      setError("Generic ref. and dosage form ref. are required.");
      return;
    }
    try {
      setBusy(true);
      setError("");
      const res = await adminMedicineWorkspaceApi.presentationsCreate({
        genericId: gid,
        dosageFormId: did,
        strengthDisplay: strengthDisplay.trim(),
        ...(strengthKey.trim() ? { strengthNormalizedKey: strengthKey.trim() } : {}),
      });
      const id = (res.data as { id?: number })?.id;
      if (id) router.push(`${ADMIN_MEDICINE_BASE}/presentations/${id}`);
      else setError("No id returned");
    } catch (err) {
      setError((err as Error)?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dashboard-main-body">
      <Link href={`${ADMIN_MEDICINE_BASE}/presentations`} className="text-muted small d-inline-block mb-3">
        ← Presentations
      </Link>
      <h1 className="h4 mb-3">New strength / presentation</h1>
      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      <div className="card radius-12" style={{ maxWidth: 520 }}>
        <div className="card-body p-24">
          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label className="form-label fw-medium">Generic (internal ref.)</label>
              <input
                className="form-control"
                required
                inputMode="numeric"
                placeholder="From Generics → Open"
                value={genericId}
                onChange={(e) => setGenericId(e.target.value)}
              />
              <div className="form-text">
                <Link href={`${ADMIN_MEDICINE_BASE}/generics`}>Browse generics</Link>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-medium">Dosage form (internal ref.)</label>
              <input
                className="form-control"
                required
                inputMode="numeric"
                placeholder="From Dosage forms → Open"
                value={dosageFormId}
                onChange={(e) => setDosageFormId(e.target.value)}
              />
              <div className="form-text">
                <Link href={`${ADMIN_MEDICINE_BASE}/dosage-forms`}>Browse forms</Link>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-medium">Strength display</label>
              <input className="form-control" required value={strengthDisplay} onChange={(e) => setStrengthDisplay(e.target.value)} />
            </div>
            <div className="mb-4">
              <label className="form-label fw-medium">Normalized strength key (optional)</label>
              <input className="form-control" value={strengthKey} onChange={(e) => setStrengthKey(e.target.value)} />
              <p className="form-text small text-muted mb-0">
                Leave blank to let the server derive a key from the strength display. Set explicitly when aligning with existing import data.
              </p>
            </div>
            <button type="submit" className="btn btn-primary radius-12" disabled={busy}>
              {busy ? "Saving…" : "Create"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
