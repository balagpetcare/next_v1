"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicPatientsList, getAnimalTypes } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace } from "@/src/components/dashboard";
import {
  staffClinicPatientRegisterPath,
  staffClinicPatientDetailPath,
  staffClinicPatientEditPath,
} from "@/lib/staffClinicPatientRoutes";
import { PaginationBar } from "@/src/components/common/PaginationBar";

const PATIENTS_PERMS = ["clinic.patients.read", "clinic.patients.manage"];
const PAGE_SIZE = 25;

export default function StaffBranchClinicPatientsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [animalTypeId, setAnimalTypeId] = useState("");
  const [animalTypes, setAnimalTypes] = useState([]);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PATIENTS_PERMS.some((p) => permissions.includes(p));
  const hasManage = permissions.includes("clinic.patients.manage");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    getAnimalTypes()
      .then(setAnimalTypes)
      .catch(() => setAnimalTypes([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- list fetch lifecycle
    setLoading(true);
    setError("");
    const offset = (page - 1) * PAGE_SIZE;
    staffClinicPatientsList(branchId, {
      search: search || undefined,
      limit: PAGE_SIZE,
      offset,
      animalTypeId: animalTypeId ? Number(animalTypeId) : undefined,
    })
      .then((data) => {
        if (!cancelled) {
          setPatients(data?.patients ?? []);
          setTotal(data?.total ?? 0);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setPatients([]);
          setTotal(0);
          setError(e?.message || "Failed to load patients.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, search, page, animalTypeId]);

  if (ctxLoading) {
    return (
      <div className="py-40 px-3 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.patients.read"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <div className="d-flex align-items-center justify-content-between flex-wrap gap-12 mb-24">
        <div>
          <div className="d-flex align-items-center gap-12 flex-wrap">
            <Link href={`/staff/branch/${branchId}/clinic`} className="btn btn-outline-secondary btn-sm">
              ← Clinic
            </Link>
            <h4 className="mb-0">Patients</h4>
          </div>
          <p className="text-muted small mb-0 mt-8">
            Clinical patients are <strong>pets</strong> linked to an <strong>owner (User)</strong>. Records are scoped to this branch when registered here or seen via appointment/visit.
          </p>
        </div>
        {hasManage && (
          <Link href={staffClinicPatientRegisterPath(branchId)} className="btn btn-sm btn-primary">
            Add patient
          </Link>
        )}
      </div>

      <Card title="Patient directory" subtitle="Search, filter by species, open workspace">
        <div className="mb-16 row g-2 align-items-end">
          <div className="col-md-4 col-lg-3">
            <label className="form-label small text-muted mb-4">Species</label>
            <select
              className="form-select form-select-sm"
              value={animalTypeId}
              onChange={(e) => {
                setAnimalTypeId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All species</option>
              {animalTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-8 col-lg-9">
            <label className="form-label small text-muted mb-4">Search</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Name, Pet ID, owner phone/email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-danger py-2 mb-16" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-40 text-center text-secondary-light">
            <div className="spinner-border text-primary" role="status" aria-label="Loading patients" />
            <p className="mt-16 mb-0">Loading patients…</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="py-40 text-center border rounded radius-12 bg-light bg-opacity-50">
            <p className="fw-semibold mb-8">No patients match your filters</p>
            <p className="text-muted small mb-16 px-3">
              Register a patient, or they will appear after an appointment or visit at this branch. Clear filters or adjust search.
            </p>
            <div className="d-flex flex-wrap gap-2 justify-content-center">
              {hasManage && (
                <Link href={staffClinicPatientRegisterPath(branchId)} className="btn btn-sm btn-primary">
                  Register patient
                </Link>
              )}
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  setSearchInput("");
                  setAnimalTypeId("");
                  setPage(1);
                }}
              >
                Clear filters
              </button>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover table-sm align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Pet ID</th>
                  <th>Patient (pet)</th>
                  <th>Owner</th>
                  <th>Species / breed</th>
                  <th>Updated</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <code className="small">{p.uniquePetId ?? "—"}</code>
                    </td>
                    <td>
                      <span className="fw-medium">{p.name ?? "—"}</span>
                      <div className="small text-muted">Record #{p.id}</div>
                    </td>
                    <td>
                      <div>{p.owner?.displayName ?? "—"}</div>
                      <div className="small text-muted">{p.owner?.phone || p.owner?.email || "—"}</div>
                    </td>
                    <td>
                      <div>{p.animalType?.name ?? "—"}</div>
                      <div className="small text-muted">{p.breed?.name ?? "—"}</div>
                    </td>
                    <td className="text-muted small">
                      {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="text-end text-nowrap">
                      <Link
                        href={staffClinicPatientDetailPath(branchId, p.id)}
                        className="btn btn-sm btn-outline-primary me-4"
                      >
                        Open
                      </Link>
                      {hasManage && (
                        <Link
                          href={staffClinicPatientEditPath(branchId, p.id)}
                          className="btn btn-sm btn-outline-secondary"
                        >
                          Edit
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > 0 && (
          <PaginationBar
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            totalPages={totalPages}
            disabled={loading}
            onPageChange={setPage}
            className="mt-24 pt-16 border-top"
            ariaLabel="Patients list pages"
          />
        )}
      </Card>
    </PageWorkspace>
  );
}
