"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doctorGetMe, doctorListVisits } from "@/lib/api";

export default function DoctorPatientsPage() {
  const router = useRouter();
  const [visits, setVisits] = useState<any[]>([]);
  const [branches, setBranches] = useState<{ branchId: number; branchName: string }[]>([]);
  const [date, setDate] = useState<string>("");
  const [branchId, setBranchId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    loadVisits();
  }, [date, branchId]);

  async function loadProfile() {
    try {
      const me = await doctorGetMe();
      setBranches(me.branches ?? []);
    } catch {
      setBranches([]);
    }
  }

  async function loadVisits() {
    setLoading(true);
    setError("");
    try {
      const res = await doctorListVisits({
        date: date || undefined,
        branchId: branchId ? Number(branchId) : undefined,
        limit: 100,
      });
      setVisits(res.visits ?? []);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load visits");
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }

  const patientName = (v: any) => v?.patient?.profile?.displayName ?? v?.patient?.id ?? "—";
  const petName = (v: any) => v?.pet?.name ?? "—";
  const branchName = (v: any) => v?.branch?.name ?? "—";

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12 mb-3">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Patients / Visits</h6>
          <div className="d-flex align-items-center gap-2">
            <input
              type="date"
              className="form-control form-control-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: "150px" }}
            />
            <select
              className="form-select form-select-sm"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              style={{ width: "180px" }}
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.branchId} value={b.branchId}>
                  {b.branchName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger radius-12" role="alert">
          {error}
        </div>
      )}

      <div className="card radius-12">
        <div className="card-body">
          {loading && <p className="text-muted mb-0">Loading...</p>}
          {!loading && visits.length === 0 && (
            <p className="text-muted mb-0">No visits found. Use filters to narrow or leave empty to see all.</p>
          )}
          {!loading && visits.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Branch</th>
                    <th>Patient</th>
                    <th>Pet</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <tr key={v.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/doctor/visits/${v.id}`)}>
                      <td>
                        {new Date(v.createdAt).toLocaleString("en-BD", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td>{branchName(v)}</td>
                      <td>{patientName(v)}</td>
                      <td>{petName(v)}</td>
                      <td>
                        <span className="badge bg-secondary">{v.status ?? "—"}</span>
                      </td>
                      <td>
                        <Link href={`/doctor/visits/${v.id}`} className="btn btn-sm btn-outline-primary" onClick={(e) => e.stopPropagation()}>
                          View
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
    </div>
  );
}
