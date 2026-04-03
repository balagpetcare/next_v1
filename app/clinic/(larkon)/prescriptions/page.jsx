"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  staffClinicPrescriptionsByVisit,
  staffClinicPrescriptionByQr,
} from "@/lib/api";

export default function ClinicPrescriptionsPage() {
  const searchParams = useSearchParams();
  const branchId = searchParams?.get("branchId") || "";
  const visitIdParam = searchParams?.get("visitId");
  const visitId = visitIdParam ? Number(visitIdParam) : null;
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState(null);
  const [qrToken, setQrToken] = useState("");
  const [qrResult, setQrResult] = useState(null);

  useEffect(() => {
    if (!branchId || !visitId) return;
    loadPrescriptions();
  }, [branchId, visitId]);

  async function loadPrescriptions() {
    if (!branchId || !visitId) return;
    setLoading(true);
    setError("");
    try {
      const list = await staffClinicPrescriptionsByVisit(branchId, visitId);
      setPrescriptions(Array.isArray(list) ? list : []);
    } catch (e) {
      setError((e && e.message) || "Failed to load prescriptions");
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleQrVerify() {
    if (!branchId || !qrToken.trim()) return;
    setActioning("qr");
    setError("");
    setQrResult(null);
    try {
      const data = await staffClinicPrescriptionByQr(branchId, qrToken.trim());
      setQrResult(data);
    } catch (e) {
      setError((e && e.message) || "Verify failed");
      setQrResult(null);
    } finally {
      setActioning(null);
    }
  }

  const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12 mb-3">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Prescriptions (read-only)</h6>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Branch ID"
              value={branchId}
              readOnly
              style={{ width: "100px" }}
            />
            {visitId && (
              <Link href={`/clinic/visits/${visitId}?branchId=${encodeURIComponent(branchId)}`} className="btn btn-sm btn-outline-secondary radius-12">
                Visit #{visitId}
              </Link>
            )}
            <Link href={`/clinic${q}`} className="btn btn-sm btn-outline-primary radius-12">Back</Link>
          </div>
        </div>
        <div className="card-body small text-muted">
          Create, edit, and finalize prescriptions in the doctor workspace. This screen lists and prints only.
        </div>
      </div>

      {!branchId && (
        <div className="card radius-12">
          <div className="card-body text-center text-muted py-5">
            <p className="mb-0">Open with branchId (and optionally visitId) to list prescriptions.</p>
          </div>
        </div>
      )}

      {branchId && !visitId && (
        <div className="card radius-12 mb-3">
          <div className="card-body">
            <h6 className="mb-2">Verify by QR</h6>
            <div className="d-flex gap-2 flex-wrap align-items-center">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="QR token"
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                style={{ width: "200px" }}
              />
              <button type="button" className="btn btn-sm btn-primary radius-12" onClick={handleQrVerify} disabled={!!actioning}>
                {actioning === "qr" ? "..." : "Verify"}
              </button>
            </div>
            {qrResult && (
              <div className="mt-3 p-3 bg-light radius-12 small">
                <pre className="mb-0">{JSON.stringify(qrResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger radius-12 mb-3" role="alert">{error}</div>
      )}

      {branchId && visitId && (
        <>
          <div className="card radius-12 mb-3">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="mb-0">List (Visit #{visitId})</h6>
              <button type="button" className="btn btn-sm btn-outline-secondary radius-12" onClick={loadPrescriptions} disabled={loading}>
                Refresh
              </button>
            </div>
          </div>

          <div className="card radius-12">
            <div className="card-body">
              {loading && <p className="text-muted mb-0">Loading...</p>}
              {!loading && prescriptions.length === 0 && <p className="text-muted mb-0">No prescriptions for this visit.</p>}
              {!loading && prescriptions.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Status</th>
                        <th>Items</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.map((p) => (
                        <tr key={p.id}>
                          <td>{p.id}</td>
                          <td><span className={`badge ${p.status === "DISPENSED" ? "bg-success" : p.status === "FINALIZED" ? "bg-info" : "bg-secondary"} radius-12`}>{p.status || "DRAFT"}</span></td>
                          <td>{(p.items || p.lines || []).length} item(s)</td>
                          <td className="text-end">
                            <Link
                              href={`/staff/branch/${branchId}/clinic/prescriptions/${p.id}/print`}
                              className="btn btn-sm btn-outline-primary radius-12"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Print
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
