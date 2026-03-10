"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { doctorGetMe, doctorGetMyServices, doctorPutMyServices } from "@/lib/api";

export default function DoctorServicesPage() {
  const [profile, setProfile] = useState<{ branches: { branchId: number; branchName: string }[] } | null>(null);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const p = await doctorGetMe();
        setProfile(p ?? null);
        if (p?.branches?.length && branchId === null) setBranchId(p.branches[0].branchId);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadServices = useCallback(async () => {
    if (branchId == null) return;
    setLoading(true);
    setError("");
    try {
      const list = await doctorGetMyServices(branchId);
      setServices(Array.isArray(list) ? list : []);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const updateFee = (idx: number, fee: number) => {
    setServices((prev) => {
      const next = [...prev];
      if (next[idx]) next[idx] = { ...next[idx], fee };
      return next;
    });
  };

  const handleSave = async () => {
    if (branchId == null) return;
    setSaving(true);
    setError("");
    try {
      await doctorPutMyServices(branchId, {
        services: services.map((s) => ({
          serviceId: s.serviceId,
          fee: Number(s.fee),
          species: s.species ?? null,
          durationMin: s.durationMin ?? null,
          isActive: s.isActive !== false,
          notes: s.notes ?? null,
        })),
      });
      await loadServices();
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12"><div className="card-body text-center py-5">Loading…</div></div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <h5 className="mb-0">My services</h5>
        <Link href="/doctor/dashboard" className="btn btn-sm btn-outline-secondary radius-12">Dashboard</Link>
      </div>

      {profile.branches?.length > 1 && (
        <div className="mb-3">
          <label className="form-label">Clinic</label>
          <select
            className="form-select w-auto"
            value={branchId ?? ""}
            onChange={(e) => setBranchId(Number(e.target.value))}
          >
            {profile.branches.map((b) => (
              <option key={b.branchId} value={b.branchId}>{b.branchName}</option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      {loading ? (
        <div className="card radius-12"><div className="card-body text-center py-5">Loading…</div></div>
      ) : services.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <p className="text-muted mb-0">No services configured. Complete onboarding for this clinic to add services.</p>
            {branchId && (
              <Link href={`/doctor/onboarding/${branchId}`} className="btn btn-primary radius-12 mt-3">Go to onboarding</Link>
            )}
          </div>
        </div>
      ) : (
        <div className="card radius-12">
          <div className="card-body p-24">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Category</th>
                  <th>Your fee</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s, idx) => (
                  <tr key={s.id ?? idx}>
                    <td>{s.service?.name ?? s.serviceId}</td>
                    <td>{s.service?.category ?? "—"}</td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm w-100"
                        style={{ maxWidth: 120 }}
                        value={s.fee ?? ""}
                        onChange={(e) => updateFee(idx, parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td>{s.durationMin != null ? `${s.durationMin} min` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn btn-primary radius-12" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
