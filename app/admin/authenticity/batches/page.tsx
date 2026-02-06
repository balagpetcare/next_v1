"use client";

import { useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

export default function AdminAuthenticityBatchesPage() {
  const [createForm, setCreateForm] = useState({
    productVersionId: "",
    factoryId: "",
    lineId: "",
    requestedQty: "",
    mfgDate: "",
    expDate: "",
  });
  const [approveForm, setApproveForm] = useState({ batchId: "", approvedQty: "" });
  const [issueForm, setIssueForm] = useState({ batchId: "", qty: "" });
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [factories, setFactories] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [batchFilters, setBatchFilters] = useState({ status: "", productVersionId: "", factoryId: "" });

  const createBatch = async () => {
    if (!createForm.productVersionId || !createForm.factoryId || !createForm.requestedQty) {
      return alert("productVersionId, factoryId, requestedQty required");
    }
    setLoading(true);
    try {
      const res = await apiPost("/api/v1/batches", {
        productVersionId: Number(createForm.productVersionId),
        factoryId: Number(createForm.factoryId),
        lineId: createForm.lineId ? Number(createForm.lineId) : undefined,
        requestedQty: Number(createForm.requestedQty),
        mfgDate: createForm.mfgDate || undefined,
        expDate: createForm.expDate || undefined,
      });
      setResponse(res);
    } catch (e: any) {
      alert(e?.message || "Failed to create batch");
    } finally {
      setLoading(false);
    }
  };

  const approveBatch = async () => {
    if (!approveForm.batchId || !approveForm.approvedQty) return alert("batchId and approvedQty required");
    setLoading(true);
    try {
      const res = await apiPost(`/api/v1/batches/${approveForm.batchId}/approve`, {
        approvedQty: Number(approveForm.approvedQty),
      });
      setResponse(res);
    } catch (e: any) {
      alert(e?.message || "Failed to approve batch");
    } finally {
      setLoading(false);
    }
  };

  const issueSerials = async () => {
    if (!issueForm.batchId || !issueForm.qty) return alert("batchId and qty required");
    setLoading(true);
    try {
      const res = await apiPost(`/api/v1/batches/${issueForm.batchId}/issue-serials`, {
        qty: Number(issueForm.qty),
      });
      setResponse(res);
    } catch (e: any) {
      alert(e?.message || "Failed to issue serials");
    } finally {
      setLoading(false);
    }
  };

  const loadFactories = async () => {
    try {
      const res = await apiGet("/api/v1/factories");
      setFactories(res?.data || []);
    } catch (e: any) {
      alert(e?.message || "Failed to load factories");
    }
  };

  const loadLines = async (factoryId: string) => {
    if (!factoryId) return setLines([]);
    try {
      const res = await apiGet(`/api/v1/factories/${factoryId}/lines`);
      setLines(res?.data || []);
    } catch (e: any) {
      alert(e?.message || "Failed to load lines");
    }
  };

  const fetchBatches = async () => {
    const qs = new URLSearchParams();
    if (batchFilters.status) qs.set("status", batchFilters.status);
    if (batchFilters.productVersionId) qs.set("productVersionId", batchFilters.productVersionId);
    if (batchFilters.factoryId) qs.set("factoryId", batchFilters.factoryId);
    setLoading(true);
    try {
      const res = await apiGet(`/api/v1/batches?${qs.toString()}`);
      setBatches(res?.data?.items || []);
      setResponse(res);
    } catch (e: any) {
      alert(e?.message || "Failed to list batches");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Product Authenticity – Batches</h2>

      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h6 className="mb-0">Factories</h6>
            <button className="btn btn-sm btn-outline-primary" onClick={loadFactories}>
              Load Factories
            </button>
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

      <div className="card mb-4">
        <div className="card-body">
          <h6 className="mb-3">Create Batch</h6>
          <div className="row g-2">
            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="ProductVersion ID"
                value={createForm.productVersionId}
                onChange={(e) => setCreateForm({ ...createForm, productVersionId: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={createForm.factoryId}
                onChange={(e) => {
                  const factoryId = e.target.value;
                  setCreateForm({ ...createForm, factoryId });
                  loadLines(factoryId);
                }}
              >
                <option value="">Factory</option>
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} (#{f.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={createForm.lineId}
                onChange={(e) => setCreateForm({ ...createForm, lineId: e.target.value })}
              >
                <option value="">Line (optional)</option>
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.lineCode} (#{l.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="Requested Qty"
                value={createForm.requestedQty}
                onChange={(e) => setCreateForm({ ...createForm, requestedQty: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="MFG Date (YYYY-MM-DD)"
                value={createForm.mfgDate}
                onChange={(e) => setCreateForm({ ...createForm, mfgDate: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="EXP Date (YYYY-MM-DD)"
                value={createForm.expDate}
                onChange={(e) => setCreateForm({ ...createForm, expDate: e.target.value })}
              />
            </div>
          </div>
          <button className="btn btn-primary btn-sm mt-3" onClick={createBatch} disabled={loading}>
            Create Batch
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h6 className="mb-3">Approve Batch</h6>
          <div className="row g-2">
            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="Batch ID"
                value={approveForm.batchId}
                onChange={(e) => setApproveForm({ ...approveForm, batchId: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="Approved Qty"
                value={approveForm.approvedQty}
                onChange={(e) => setApproveForm({ ...approveForm, approvedQty: e.target.value })}
              />
            </div>
          </div>
          <button className="btn btn-success btn-sm mt-3" onClick={approveBatch} disabled={loading}>
            Approve Batch
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h6 className="mb-3">Issue Serials</h6>
          <div className="row g-2">
            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="Batch ID"
                value={issueForm.batchId}
                onChange={(e) => setIssueForm({ ...issueForm, batchId: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="Qty"
                value={issueForm.qty}
                onChange={(e) => setIssueForm({ ...issueForm, qty: e.target.value })}
              />
            </div>
          </div>
          <button className="btn btn-warning btn-sm mt-3" onClick={issueSerials} disabled={loading}>
            Issue Serials
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
            <h6 className="mb-0">Recent Batches</h6>
            <div className="d-flex gap-2">
              <input
                className="form-control form-control-sm"
                placeholder="ProductVersion ID"
                value={batchFilters.productVersionId}
                onChange={(e) => setBatchFilters({ ...batchFilters, productVersionId: e.target.value })}
              />
              <input
                className="form-control form-control-sm"
                placeholder="Factory ID"
                value={batchFilters.factoryId}
                onChange={(e) => setBatchFilters({ ...batchFilters, factoryId: e.target.value })}
              />
              <select
                className="form-select form-select-sm"
                value={batchFilters.status}
                onChange={(e) => setBatchFilters({ ...batchFilters, status: e.target.value })}
              >
                <option value="">All</option>
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="ISSUED">ISSUED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
              <button className="btn btn-sm btn-outline-primary" onClick={fetchBatches} disabled={loading}>
                Load
              </button>
            </div>
          </div>
          {batches.length === 0 ? (
            <p className="text-secondary">No batches found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Status</th>
                    <th>ProductVersion</th>
                    <th>Factory</th>
                    <th>Approved Qty</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id}>
                      <td>{b.id}</td>
                      <td>{b.status}</td>
                      <td>{b.productVersionId}</td>
                      <td>{b.factory?.name || b.factoryId}</td>
                      <td>{b.approvedQty ?? "—"}</td>
                      <td>{b.createdAt ? new Date(b.createdAt).toLocaleString() : "—"}</td>
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
