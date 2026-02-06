"use client";

import { useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

export default function AdminAuthenticityProductsPage() {
  const [productId, setProductId] = useState("");
  const [versionDescription, setVersionDescription] = useState("");
  const [versionSpecJson, setVersionSpecJson] = useState("{}");
  const [versionId, setVersionId] = useState("");
  const [publicProductId, setPublicProductId] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [versionFilter, setVersionFilter] = useState({ productId: "", status: "" });
  const [loading, setLoading] = useState(false);

  const createVersion = async () => {
    if (!productId) return alert("Product ID required");
    setLoading(true);
    try {
      const spec = versionSpecJson ? JSON.parse(versionSpecJson) : undefined;
      const res = await apiPost(`/api/v1/products/${productId}/versions`, {
        description: versionDescription || undefined,
        specJson: spec,
      });
      setResponse(res);
    } catch (e: any) {
      alert(e?.message || "Failed to create version");
    } finally {
      setLoading(false);
    }
  };

  const approveVersion = async () => {
    if (!versionId) return alert("Version ID required");
    setLoading(true);
    try {
      const res = await apiPost(`/api/v1/products/versions/${versionId}/approve`, {});
      setResponse(res);
    } catch (e: any) {
      alert(e?.message || "Failed to approve version");
    } finally {
      setLoading(false);
    }
  };

  const fetchPublic = async () => {
    if (!publicProductId) return alert("Product ID required");
    setLoading(true);
    try {
      const res = await apiGet(`/api/v1/products/${publicProductId}/public`);
      setResponse(res);
    } catch (e: any) {
      alert(e?.message || "Failed to fetch public product");
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    const qs = new URLSearchParams();
    if (versionFilter.productId) qs.set("productId", versionFilter.productId);
    if (versionFilter.status) qs.set("status", versionFilter.status);
    setLoading(true);
    try {
      const res = await apiGet(`/api/v1/products/versions?${qs.toString()}`);
      setVersions(res?.data?.items || []);
      setResponse(res);
    } catch (e: any) {
      alert(e?.message || "Failed to list versions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Product Authenticity – Product Versions</h2>

      <div className="card mb-4">
        <div className="card-body">
          <h6 className="mb-3">Create Product Version</h6>
          <div className="row g-2">
            <div className="col-md-3">
              <input
                className="form-control"
                placeholder="Product ID"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Description (optional)"
                value={versionDescription}
                onChange={(e) => setVersionDescription(e.target.value)}
              />
            </div>
            <div className="col-md-5">
              <input
                className="form-control"
                placeholder='Spec JSON (e.g. {"weight":"2kg"})'
                value={versionSpecJson}
                onChange={(e) => setVersionSpecJson(e.target.value)}
              />
            </div>
          </div>
          <button className="btn btn-primary btn-sm mt-3" onClick={createVersion} disabled={loading}>
            Create Version
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h6 className="mb-3">Approve Product Version</h6>
          <div className="row g-2">
            <div className="col-md-3">
              <input
                className="form-control"
                placeholder="Version ID"
                value={versionId}
                onChange={(e) => setVersionId(e.target.value)}
              />
            </div>
          </div>
          <button className="btn btn-success btn-sm mt-3" onClick={approveVersion} disabled={loading}>
            Approve Version
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h6 className="mb-3">Public Product View (Verify)</h6>
          <div className="row g-2">
            <div className="col-md-3">
              <input
                className="form-control"
                placeholder="Product ID"
                value={publicProductId}
                onChange={(e) => setPublicProductId(e.target.value)}
              />
            </div>
          </div>
          <button className="btn btn-outline-primary btn-sm mt-3" onClick={fetchPublic} disabled={loading}>
            Fetch Public Product
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h6 className="mb-3">Response</h6>
          <pre style={{ whiteSpace: "pre-wrap" }}>{response ? JSON.stringify(response, null, 2) : "No response yet."}</pre>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h6 className="mb-0">Recent Versions</h6>
            <div className="d-flex gap-2">
              <input
                className="form-control form-control-sm"
                placeholder="Product ID"
                value={versionFilter.productId}
                onChange={(e) => setVersionFilter({ ...versionFilter, productId: e.target.value })}
              />
              <select
                className="form-select form-select-sm"
                value={versionFilter.status}
                onChange={(e) => setVersionFilter({ ...versionFilter, status: e.target.value })}
              >
                <option value="">All</option>
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
              <button className="btn btn-sm btn-outline-primary" onClick={fetchVersions} disabled={loading}>
                Load
              </button>
            </div>
          </div>
          {versions.length === 0 ? (
            <p className="text-secondary">No versions found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => (
                    <tr key={v.id}>
                      <td>{v.id}</td>
                      <td>{v.product?.name || `#${v.productId}`}</td>
                      <td>{v.version}</td>
                      <td>{v.status}</td>
                      <td>{v.createdAt ? new Date(v.createdAt).toLocaleString() : "—"}</td>
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
