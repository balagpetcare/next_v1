"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  warehouseById,
  warehouseZonesList,
  warehouseZoneCreate,
  warehouseLocationSetZone,
} from "@/lib/api";

export default function OwnerWarehouseZonesPage() {
  const params = useParams();
  const warehouseId = Number(params?.id);
  const [wh, setWh] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("GENERAL");
  const [saving, setSaving] = useState(false);
  const [locId, setLocId] = useState("");
  const [locZone, setLocZone] = useState("");

  const load = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    setError(null);
    try {
      const [w, z] = await Promise.all([warehouseById(warehouseId), warehouseZonesList(warehouseId)]);
      setWh(w);
      setZones(z as any[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setSaving(true);
    try {
      await warehouseZoneCreate(warehouseId, { code: code.trim(), name: name.trim(), purpose });
      setCode("");
      setName("");
      await load();
    } catch (e: any) {
      alert(e?.message || "Failed to create zone");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignLoc(e: React.FormEvent) {
    e.preventDefault();
    const lid = Number(locId);
    if (!lid) {
      alert("Enter location ID");
      return;
    }
    setSaving(true);
    try {
      await warehouseLocationSetZone(warehouseId, {
        locationId: lid,
        zoneId: locZone === "" ? null : Number(locZone),
      });
      setLocId("");
      setLocZone("");
      alert("Location zone updated");
    } catch (e: any) {
      alert(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary" />
        <p className="mt-2 text-muted">Loading zones…</p>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <Link href={`/owner/warehouse/${warehouseId}`} className="text-muted small text-decoration-none">
        ← Warehouse
      </Link>
      <h4 className="mt-2">Warehouse zones</h4>
      <p className="text-muted small">
        {wh?.name} — define putaway/pick bins, then assign linked locations to a zone.
      </p>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card border">
            <div className="card-header">
              <h6 className="mb-0">Zones</h6>
            </div>
            <div className="card-body p-0">
              {zones.length === 0 ? (
                <div className="p-4 text-center text-muted">No zones yet. Create one below.</div>
              ) : (
                <table className="table table-sm mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Purpose</th>
                      <th>Locations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map((z) => (
                      <tr key={z.id}>
                        <td className="fw-medium">{z.code}</td>
                        <td>{z.name}</td>
                        <td>
                          <span className="badge bg-secondary">{z.purpose}</span>
                        </td>
                        <td>{z._count?.locations ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card border mb-3">
            <div className="card-header">
              <h6 className="mb-0">New zone</h6>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreate} className="vstack gap-2">
                <input
                  className="form-control form-control-sm"
                  placeholder="Code (e.g. A-01)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <input
                  className="form-control form-control-sm"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <select className="form-select form-select-sm" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                  {["GENERAL", "RECEIVING", "STORAGE", "PICKING", "PACKING", "QUARANTINE", "STAGING", "DAMAGE", "RETURN_HOLD"].map(
                    (p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    )
                  )}
                </select>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  Create zone
                </button>
              </form>
            </div>
          </div>
          <div className="card border">
            <div className="card-header">
              <h6 className="mb-0">Assign location → zone</h6>
            </div>
            <div className="card-body">
              <form onSubmit={handleAssignLoc} className="vstack gap-2">
                <input
                  className="form-control form-control-sm"
                  placeholder="Inventory location ID"
                  value={locId}
                  onChange={(e) => setLocId(e.target.value)}
                />
                <select className="form-select form-select-sm" value={locZone} onChange={(e) => setLocZone(e.target.value)}>
                  <option value="">— Clear zone —</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.code} — {z.name}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn btn-outline-primary btn-sm" disabled={saving}>
                  Save assignment
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
