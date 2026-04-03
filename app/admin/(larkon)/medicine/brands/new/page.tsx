"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";
import { ADMIN_MEDICINE_BASE } from "../../_lib/paths";

export default function AdminMedicineBrandNewPage() {
  const router = useRouter();
  const [manufacturers, setManufacturers] = useState<{ id: number; displayName: string }[]>([]);
  const [manufacturerId, setManufacturerId] = useState<number | "">("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminMedicineWorkspaceApi
      .manufacturersList({ page: 1, limit: 500, includeInactive: false })
      .then((r) => {
        const d = r.data as { items?: Record<string, unknown>[] };
        setManufacturers(
          (d?.items ?? []).map((m) => ({ id: Number(m.id), displayName: String(m.displayName ?? "") }))
        );
      })
      .catch(() => {});
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manufacturerId === "") {
      setError("Select manufacturer");
      return;
    }
    try {
      setBusy(true);
      setError("");
      const res = await adminMedicineWorkspaceApi.brandsCreate({
        manufacturerId: Number(manufacturerId),
        displayName: displayName.trim(),
      });
      const id = (res.data as { id?: number })?.id;
      if (id) router.push(`${ADMIN_MEDICINE_BASE}/brands/${id}`);
      else setError("No id returned");
    } catch (err) {
      setError((err as Error)?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dashboard-main-body">
      <Link href={`${ADMIN_MEDICINE_BASE}/brands`} className="text-muted small d-inline-block mb-3">
        ← Brands
      </Link>
      <h1 className="h4 mb-3">New brand</h1>
      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
      <div className="card radius-12" style={{ maxWidth: 520 }}>
        <div className="card-body p-24">
          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label className="form-label fw-medium">Manufacturer</label>
              <select
                className="form-select"
                required
                value={manufacturerId === "" ? "" : String(manufacturerId)}
                onChange={(e) => setManufacturerId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Select…</option>
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
              <div className="form-text">
                <Link href={`${ADMIN_MEDICINE_BASE}/manufacturers`}>Manage manufacturers</Link>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-medium">Brand display name</label>
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
