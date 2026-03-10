"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { doctorGetMe, doctorListPrescriptions } from "@/lib/api";

export default function DoctorPrescriptionsPage() {
  const [branches, setBranches] = useState<{ branchId: number; branchName: string }[]>([]);
  const [branchId, setBranchId] = useState<string>("");
  const [status, setStatus] = useState<string>("DRAFT");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    doctorGetMe()
      .then((me) => {
        setBranches(me?.branches ?? []);
        if ((me?.branches ?? []).length > 0) setBranchId(String(me.branches[0].branchId));
      })
      .catch((e) => setError((e as Error)?.message || "Failed to load profile"));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await doctorListPrescriptions({
        branchId: branchId ? Number(branchId) : undefined,
        status: status as any,
        limit: 100,
      });
      setRows(data.items ?? []);
    } catch (e) {
      setRows([]);
      setError((e as Error)?.message || "Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  }, [branchId, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12 mb-3">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h6 className="mb-0">My Prescriptions</h6>
          <Link href="/doctor/dashboard" className="btn btn-sm btn-outline-primary radius-12">Dashboard</Link>
        </div>
      </div>

      {error ? <div className="alert alert-danger radius-12">{error}</div> : null}

      <div className="card radius-12 mb-3">
        <div className="card-body d-flex flex-wrap gap-2">
          <select className="form-select form-select-sm" style={{ width: 200 }} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">All Clinics</option>
            {branches.map((b) => (
              <option key={b.branchId} value={b.branchId}>{b.branchName}</option>
            ))}
          </select>
          <select className="form-select form-select-sm" style={{ width: 180 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="DRAFT">DRAFT</option>
            <option value="FINALIZED">FINALIZED</option>
            <option value="DISPENSED">DISPENSED</option>
          </select>
          <button type="button" className="btn btn-sm btn-primary radius-12" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      <div className="card radius-12">
        <div className="card-body">
          {loading ? (
            <p className="text-muted mb-0">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-muted mb-0">No prescriptions found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Pet</th>
                    <th>Owner</th>
                    <th>Clinic</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{row.visit?.pet?.name ?? "—"}</td>
                      <td>{row.visit?.patient?.profile?.displayName ?? "—"}</td>
                      <td>{row.visit?.branch?.name ?? "—"}</td>
                      <td><span className="badge bg-light text-dark">{row.status}</span></td>
                      <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</td>
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
