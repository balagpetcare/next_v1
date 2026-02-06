"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";

export default function VerifyAuthCodePage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (!code) return;
    setLoading(true);
    try {
      const res = await apiPost("/api/v1/auth/verify", { code });
      setResult(res?.data || null);
    } catch (e) {
      setResult({ status: "INVALID", message: e?.message || "Verify failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Verify Product Code</h2>
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex gap-2">
            <input
              className="form-control"
              placeholder="Enter code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className="btn btn-primary" onClick={verify} disabled={loading}>
              Verify
            </button>
          </div>
        </div>
      </div>
      {result && (
        <div className="card">
          <div className="card-body">
            <h6>Status: {result.status}</h6>
            {result.product && (
              <div className="mt-2">
                <div><strong>Product:</strong> {result.product.productName}</div>
                <div><strong>Brand:</strong> {result.product.brandName}</div>
                <div><strong>SKU:</strong> {result.product.sku}</div>
                <div><strong>Pack:</strong> {result.product.packSize || "—"}</div>
              </div>
            )}
            {result.batch && (
              <div className="mt-2">
                <div><strong>Batch:</strong> {result.batch.batchNo}</div>
                <div><strong>MFG:</strong> {result.batch.mfgDate ? new Date(result.batch.mfgDate).toLocaleDateString() : "—"}</div>
                <div><strong>EXP:</strong> {result.batch.expDate ? new Date(result.batch.expDate).toLocaleDateString() : "—"}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
