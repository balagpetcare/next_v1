"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicVisitsList,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import EmptyState from "@/src/components/dashboard/EmptyState";
import StatusBadge from "@/src/components/dashboard/StatusBadge";

const VISITS_PERMS = ["clinic.visits.read", "clinic.visits.manage", "clinic.emr.read", "clinic.emr.write"];
const PAGE_SIZE = 25;

export default function StaffBranchClinicVisitsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [visits, setVisits] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [petIdFilter, setPetIdFilter] = useState("");
  const [patientIdFilter, setPatientIdFilter] = useState("");

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = VISITS_PERMS.some((p) => permissions.includes(p));

  const loadVisits = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    setError("");
    const offset = (page - 1) * PAGE_SIZE;
    staffClinicVisitsList(branchId, {
      petId: petIdFilter ? Number(petIdFilter) : undefined,
      patientId: patientIdFilter ? Number(patientIdFilter) : undefined,
      limit: PAGE_SIZE,
      offset,
    })
      .then((data) => {
        setVisits(data?.visits ?? []);
        setTotal(data?.total ?? 0);
      })
      .catch((e) => {
        setError(e?.message || "Failed to load visits.");
        setVisits([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [branchId, page, petIdFilter, patientIdFilter]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.visits.read"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <div className="d-flex align-items-center gap-12 mb-24">
        <Link href={`/staff/branch/${branchId}/clinic`} className="btn btn-outline-secondary btn-sm">
          ← Clinic
        </Link>
        <h5 className="mb-0">Visits</h5>
      </div>

      <Card title="Visit history" subtitle="Encounter records for this branch.">
        <div className="mb-16 d-flex align-items-center gap-2 flex-wrap">
          <input
            type="number"
            className="form-control form-control-sm"
            style={{ width: 100 }}
            placeholder="Pet ID"
            value={petIdFilter}
            onChange={(e) => {
              setPetIdFilter(e.target.value);
              setPage(1);
            }}
          />
          <input
            type="number"
            className="form-control form-control-sm"
            style={{ width: 100 }}
            placeholder="Patient ID"
            value={patientIdFilter}
            onChange={(e) => {
              setPatientIdFilter(e.target.value);
              setPage(1);
            }}
          />
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={loadVisits}>
            Apply
          </button>
          <Link href={`/staff/branch/${branchId}/clinic/appointments`} className="btn btn-outline-primary btn-sm">
            Appointments
          </Link>
          <Link href={`/staff/branch/${branchId}/clinic/queue`} className="btn btn-outline-primary btn-sm">
            Queue
          </Link>
        </div>

        {error && (
          <div className="alert alert-danger py-2 mb-16">{error}</div>
        )}

        {loading ? (
          <div className="py-24 text-center text-secondary-light">Loading visits...</div>
        ) : visits.length === 0 ? (
          <EmptyState
            title="No visits yet"
            description="Visits are created when you check in appointments from the queue. Start by booking appointments and using the queue to begin visits."
            icon="ri:calendar-check-line"
            action={
              <div className="d-flex flex-wrap justify-content-center gap-2">
                <Link href={`/staff/branch/${branchId}/clinic/appointments`} className="btn btn-primary btn-sm radius-8">
                  Appointments
                </Link>
                <Link href={`/staff/branch/${branchId}/clinic/queue`} className="btn btn-outline-primary btn-sm radius-8">
                  Queue
                </Link>
              </div>
            }
          />
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead>
                <tr>
                  <th>Treatment #</th>
                  <th>Pet</th>
                  <th>Owner</th>
                  <th>Doctor</th>
                  <th>Started</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => {
                  const petName = v.pet?.name ?? `Pet #${v.petId ?? ""}`;
                  const ownerName = v.patient?.profile?.displayName ?? `Patient #${v.patientId ?? ""}`;
                  const doctorName = v.doctor?.user?.profile?.displayName ?? "—";
                  const started = v.startedAt ? new Date(v.startedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—";
                  return (
                    <tr key={v.id}>
                      <td>{v.treatmentCode ?? v.id}</td>
                      <td>{petName}</td>
                      <td>{ownerName}</td>
                      <td>{doctorName}</td>
                      <td>{started}</td>
                      <td>
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="text-end">
                        <Link
                          href={`/staff/branch/${branchId}/clinic/visits/${v.id}`}
                          className="btn btn-sm btn-outline-primary"
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

        {total > 0 && (
          <div className="d-flex align-items-center justify-content-between mt-16 flex-wrap gap-2">
            <small className="text-muted">
              Showing {from}–{to} of {total}
            </small>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="align-self-center small">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
