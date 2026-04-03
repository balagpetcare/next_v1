"use client";

/**
 * Standalone /clinic patients list (?branchId=). “View” uses staffClinicPatientDetailPath → cross-shell to
 * /staff/branch/.../patient-detail/... — same-origin cross-shell; docs/CROSS_SHELL_NAVIGATION.md, CLINIC_STANDALONE_VS_STAFF_PATIENT_ROUTES.md.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { staffClinicPatientsList } from "@/lib/api";
import { staffClinicPatientDetailPath } from "@/lib/staffClinicPatientRoutes";

export default function ClinicPatientsPage() {
  const searchParams = useSearchParams();
  const branchIdParam = searchParams?.get("branchId") || "";
  const [branchId, setBranchId] = useState(branchIdParam);
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setBranchId(branchIdParam);
  }, [branchIdParam]);

  useEffect(() => {
    if (!branchId) return;
    loadPatients();
  }, [branchId, search]);

  async function loadPatients() {
    if (!branchId) return;
    setLoading(true);
    setError("");
    try {
      const data = await staffClinicPatientsList(branchId, {
        limit: 50,
        offset: 0,
        search: search || undefined,
      });
      setPatients(data?.patients ?? []);
      setTotal(data?.total ?? 0);
    } catch (e) {
      setError(e?.message || "Failed to load patients");
      setPatients([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Patients (Pets)</h6>
          <div className="d-flex align-items-center gap-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Branch ID"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              style={{ width: "100px" }}
            />
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search name, Pet ID, owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "180px" }}
            />
            <Link href="/clinic" className="btn btn-sm btn-outline-primary radius-12">
              Back
            </Link>
          </div>
        </div>

        <div className="card-body">
          {!branchId && (
            <p className="text-muted mb-0">
              Enter a clinic branch ID above (or open this page with <code>?branchId=...</code>) to list patients.
            </p>
          )}
          {branchId && error && (
            <div className="alert alert-danger py-2">{error}</div>
          )}
          {branchId && !error && (
            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Pet name</th>
                    <th>Pet ID</th>
                    <th>Owner</th>
                    <th>Species</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={6} className="text-center py-3">Loading...</td>
                    </tr>
                  )}
                  {!loading && patients.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No patients yet. Patients appear here after they have an appointment at this branch, or register a new pet.
                      </td>
                    </tr>
                  )}
                  {!loading && patients.map((p, i) => (
                    <tr key={p.id}>
                      <td>{i + 1}</td>
                      <td>{p.name}</td>
                      <td><code>{p.uniquePetId || "—"}</code></td>
                      <td>
                        {p.owner
                          ? (p.owner.displayName || p.owner.phone || p.owner.email || `User #${p.owner.userId}`)
                          : "—"}
                      </td>
                      <td>{p.animalType?.name ?? "—"}</td>
                      <td className="text-end">
                        <Link
                          href={staffClinicPatientDetailPath(branchId, p.id)}
                          className="btn btn-sm btn-outline-primary"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {total > 0 && (
                <small className="text-muted">Total: {total}</small>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
