"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { staffClinicVisitsList } from "@/lib/api";

export default function ClinicVisitsPage() {
  const searchParams = useSearchParams();
  const branchIdParam = searchParams?.get("branchId") || "";
  const [branchId, setBranchId] = useState(branchIdParam);
  const [petId, setPetId] = useState("");
  const [visits, setVisits] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setBranchId(branchIdParam);
  }, [branchIdParam]);

  useEffect(() => {
    if (!branchId) return;
    loadVisits();
  }, [branchId, petId]);

  async function loadVisits() {
    if (!branchId) return;
    setLoading(true);
    setError("");
    try {
      const data = await staffClinicVisitsList(branchId, {
        limit: 50,
        offset: 0,
        petId: petId ? Number(petId) : undefined,
      });
      setVisits(data?.visits ?? []);
      setTotal(data?.total ?? 0);
    } catch (e) {
      setError((e && e.message) || "Failed to load visits");
      setVisits([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Visits (EMR)</h6>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Branch ID"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              style={{ width: "100px" }}
            />
            <input
              type="number"
              className="form-control form-control-sm"
              placeholder="Pet ID (optional)"
              value={petId}
              onChange={(e) => setPetId(e.target.value)}
              style={{ width: "110px" }}
            />
            <Link href={`/clinic${q}`} className="btn btn-sm btn-outline-primary radius-12">
              Back
            </Link>
          </div>
        </div>
        <div className="card-body">
          {!branchId && (
            <p className="text-muted mb-0">Enter branch ID to load visits.</p>
          )}
          {branchId && error && (
            <div className="alert alert-danger radius-12 mb-3" role="alert">
              {error}
            </div>
          )}
          {branchId && (
            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Pet</th>
                    <th>Owner</th>
                    <th>Doctor</th>
                    <th>Status</th>
                    <th>Vitals / Notes</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        Loading...
                      </td>
                    </tr>
                  )}
                  {!loading && visits.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        No visits found.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    visits.map((v) => {
                      const petName = v.pet?.name ?? "—";
                      const ownerName = v.patient?.profile?.displayName ?? "—";
                      const doctorName = v.doctor?.user?.profile?.displayName ?? "—";
                      const dateStr = v.createdAt
                        ? new Date(v.createdAt).toLocaleDateString()
                        : "—";
                      const counts = v._count
                        ? `${v._count.vitals ?? 0} vitals / ${v._count.notes ?? 0} notes`
                        : "—";
                      return (
                        <tr key={v.id}>
                          <td>{v.id}</td>
                          <td>{dateStr}</td>
                          <td>{petName}</td>
                          <td>{ownerName}</td>
                          <td>{doctorName}</td>
                          <td><span className="badge bg-secondary radius-12">{v.status ?? "—"}</span></td>
                          <td>{counts}</td>
                          <td className="text-end">
                            <Link
                              href={`/clinic/visits/${v.id}?branchId=${encodeURIComponent(branchId)}`}
                              className="btn btn-sm btn-outline-primary radius-12"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
          {branchId && total > 0 && (
            <small className="text-muted d-block mt-2">Total: {total}</small>
          )}
        </div>
      </div>
    </div>
  );
}
