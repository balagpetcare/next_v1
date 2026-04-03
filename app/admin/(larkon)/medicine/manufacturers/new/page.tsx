"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";
import { ADMIN_MEDICINE_BASE } from "../../_lib/paths";

export default function AdminMedicineManufacturerNewPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBusy(true);
      setError("");
      const res = await adminMedicineWorkspaceApi.manufacturersCreate({ displayName: displayName.trim() });
      const id = (res.data as { id?: number })?.id;
      if (id) router.push(`${ADMIN_MEDICINE_BASE}/manufacturers/${id}`);
      else setError("No id returned");
    } catch (err) {
      setError((err as Error)?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dashboard-main-body">
      <Link href={`${ADMIN_MEDICINE_BASE}/manufacturers`} className="text-muted small d-inline-block mb-3">
        ← Manufacturers
      </Link>
      <h1 className="h4 mb-3">New manufacturer</h1>
      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      <div className="card radius-12" style={{ maxWidth: 480 }}>
        <div className="card-body p-24">
          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label className="form-label fw-medium">Display name</label>
              <input className="form-control" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
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
