"use client";

import { useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

export default function AdminAuthenticityFactoriesPage() {
  const [factories, setFactories] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [selectedFactoryId, setSelectedFactoryId] = useState("");
  const [factoryForm, setFactoryForm] = useState({ name: "", countryCode: "BD" });
  const [lineForm, setLineForm] = useState({ lineCode: "", deviceId: "" });
  const [loading, setLoading] = useState(false);

  const loadFactories = async () => {
    setLoading(true);
    try {
      const res = await apiGet("/api/v1/factories");
      setFactories(res?.data || []);
    } catch (e: any) {
      alert(e?.message || "Failed to load factories");
    } finally {
      setLoading(false);
    }
  };

  const createFactory = async () => {
    if (!factoryForm.name) return alert("Factory name required");
    setLoading(true);
    try {
      await apiPost("/api/v1/factories", {
        name: factoryForm.name,
        countryCode: factoryForm.countryCode,
      });
      setFactoryForm({ name: "", countryCode: "BD" });
      loadFactories();
    } catch (e: any) {
      alert(e?.message || "Failed to create factory");
    } finally {
      setLoading(false);
    }
  };

  const loadLines = async (factoryId: string) => {
    if (!factoryId) return setLines([]);
    setLoading(true);
    try {
      const res = await apiGet(`/api/v1/factories/${factoryId}/lines`);
      setLines(res?.data || []);
    } catch (e: any) {
      alert(e?.message || "Failed to load lines");
    } finally {
      setLoading(false);
    }
  };

  const createLine = async () => {
    if (!selectedFactoryId) return alert("Select factory first");
    if (!lineForm.lineCode) return alert("Line code required");
    setLoading(true);
    try {
      await apiPost(`/api/v1/factories/${selectedFactoryId}/lines`, {
        lineCode: lineForm.lineCode,
        deviceId: lineForm.deviceId || undefined,
      });
      setLineForm({ lineCode: "", deviceId: "" });
      loadLines(selectedFactoryId);
    } catch (e: any) {
      alert(e?.message || "Failed to create line");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Product Authenticity – Factories & Lines</h2>

      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h6 className="mb-0">Factories</h6>
            <button className="btn btn-sm btn-outline-primary" onClick={loadFactories} disabled={loading}>
              Load Factories
            </button>
          </div>
          <div className="row g-2 mb-3">
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Factory name"
                value={factoryForm.name}
                onChange={(e) => setFactoryForm({ ...factoryForm, name: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="Country (BD)"
                value={factoryForm.countryCode}
                onChange={(e) => setFactoryForm({ ...factoryForm, countryCode: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary w-100" onClick={createFactory} disabled={loading}>
                Create Factory
              </button>
            </div>
          </div>
          {factories.length === 0 ? (
            <p className="text-secondary">No factories loaded.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Country</th>
                  </tr>
                </thead>
                <tbody>
                  {factories.map((f) => (
                    <tr key={f.id}>
                      <td>{f.id}</td>
                      <td>{f.name}</td>
                      <td>{f.countryCode || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h6 className="mb-0">Production Lines</h6>
          </div>
          <div className="row g-2 mb-3">
            <div className="col-md-3">
              <select
                className="form-select"
                value={selectedFactoryId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedFactoryId(id);
                  loadLines(id);
                }}
              >
                <option value="">Select Factory</option>
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} (#{f.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <input
                className="form-control"
                placeholder="Line code"
                value={lineForm.lineCode}
                onChange={(e) => setLineForm({ ...lineForm, lineCode: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <input
                className="form-control"
                placeholder="Device ID (optional)"
                value={lineForm.deviceId}
                onChange={(e) => setLineForm({ ...lineForm, deviceId: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <button className="btn btn-success w-100" onClick={createLine} disabled={loading}>
                Create Line
              </button>
            </div>
          </div>
          {lines.length === 0 ? (
            <p className="text-secondary">No lines loaded.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Line Code</th>
                    <th>Device</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id}>
                      <td>{l.id}</td>
                      <td>{l.lineCode}</td>
                      <td>{l.deviceId || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
