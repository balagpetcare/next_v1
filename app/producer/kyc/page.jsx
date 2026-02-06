"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

export default function ProducerKycPage() {
  const [form, setForm] = useState({ name: "", countryCode: "BD", docsJson: "{}" });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    try {
      const res = await apiGet("/api/v1/producer/kyc/status");
      setStatus(res?.data || null);
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const submitKyc = async () => {
    setLoading(true);
    try {
      const docs = form.docsJson ? JSON.parse(form.docsJson) : undefined;
      const res = await apiPost("/api/v1/producer/kyc/submit", {
        name: form.name,
        countryCode: form.countryCode,
        docsJson: docs,
      });
      setStatus(res?.data || null);
    } catch (e) {
      alert(e?.message || "Failed to submit KYC");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Producer KYC</h2>
      {status && (
        <div className="alert alert-info">
          Current status: <strong>{status.status}</strong>
        </div>
      )}
      <div className="card">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Company name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="Country (BD)"
                value={form.countryCode}
                onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder='Docs JSON (optional)'
                value={form.docsJson}
                onChange={(e) => setForm({ ...form, docsJson: e.target.value })}
              />
            </div>
          </div>
          <button className="btn btn-primary btn-sm mt-3" onClick={submitKyc} disabled={loading}>
            Submit KYC
          </button>
        </div>
      </div>
    </div>
  );
}
