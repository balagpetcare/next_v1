"use client";

// Flat URL for Doctor agreements hub (acknowledgment summary + links to assignments / matrix).

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicServicePricingMatrix } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, PageHeader, SectionCard, LoadingState } from "@/src/components/dashboard";
import ServicesPricingNav from "../_components/ServicesPricingNav";
import { staffServicePricingMatrixPath } from "@/src/lib/staffServicePricingRoutes";

const PERMS = [
  "clinic.doctors.manage_services",
  "clinic.doctors.view",
  "manager.pricing.view",
  "clinic.services.manage",
  "clinic.appointments.read",
  "clinic.appointments.manage",
];

export default function StaffServicesPricingAgreementsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = PERMS.some((p) => permissions.includes(p));

  const [rows, setRows] = useState<any[]>([]);
  const [feeRows, setFeeRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const assignmentHref = `/staff/branch/${branchId}/clinic/doctors/service-assignment`;
  const matrixHref = staffServicePricingMatrixPath(branchId);

  const load = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setLoading(true);
    setError("");
    try {
      const data = await staffClinicServicePricingMatrix(branchId);
      setRows(Array.isArray(data?.services) ? data.services : []);
      setFeeRows(Array.isArray(data?.feeRows) ? data.feeRows : []);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load");
      setRows([]);
      setFeeRows([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, hasAccess]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingFeeRows = feeRows.filter((f: any) => f.pendingAck);
  const servicesWithPending = rows.filter((r: any) => (r.pendingAckCount ?? 0) > 0);
  const totalPendingAckServices = servicesWithPending.length;

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading..." />
      </PageWorkspace>
    );
  }

  if (!branch) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading branch…" />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.doctors.manage_services"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic/dashboard`)}
      />
    );
  }

  return (
    <PageWorkspace>
      <div className="px-1">
        <ServicesPricingNav />
      </div>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <PageHeader
        title="Doctor agreements & acknowledgments"
        subtitle="Doctors confirm fee updates in their Service fees & pricing screen. Pending counts below match the pricing matrix."
      />

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Link href={assignmentHref} className="btn btn-primary btn-sm radius-8">
          Manage service assignments
        </Link>
        <Link href={matrixHref} className="btn btn-outline-secondary btn-sm radius-8">
          Open pricing matrix
        </Link>
      </div>

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      {loading ? (
        <SectionCard title="Summary">
          <LoadingState message="Loading acknowledgment summary…" />
        </SectionCard>
      ) : (
        <>
          {totalPendingAckServices === 0 && pendingFeeRows.length === 0 && !error ? (
            <div className="alert alert-success radius-12 mb-3" role="status">
              <strong>All clear.</strong> No pending doctor acknowledgments for service fees on this branch.
            </div>
          ) : null}

          <SectionCard title="Summary">
            <ul className="mb-0 small">
              <li>
                Services with pending acknowledgments:{" "}
                <strong>{totalPendingAckServices}</strong>
              </li>
              <li>
                Doctor fee rows awaiting ack: <strong>{pendingFeeRows.length}</strong>
              </li>
            </ul>
            <p className="text-muted small mt-3 mb-0">
              Doctors acknowledge updated fees from <strong>Doctor → Service fees &amp; pricing</strong> (<code>/doctor/service-fees</code>).
              Use <strong>Manage service assignments</strong> to control which services each doctor performs.
            </p>
          </SectionCard>

          {pendingFeeRows.length > 0 && (
            <SectionCard title="Fee rows awaiting acknowledgment" className="mt-3">
              <div className="table-responsive" style={{ maxHeight: 320 }}>
                <table className="table table-sm mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th>Doctor</th>
                      <th>Service ID</th>
                      <th>Model</th>
                      <th className="text-end">Resolved ৳</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingFeeRows.map((f: any) => (
                      <tr key={f.id}>
                        <td className="small text-nowrap">{f.doctorName ?? f.memberId ?? "—"}</td>
                        <td className="small">{f.serviceId}</td>
                        <td className="small">{f.feeModel ?? "—"}</td>
                        <td className="text-end small">
                          {f.resolvedAmount != null ? Number(f.resolvedAmount).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {servicesWithPending.length > 0 && (
            <SectionCard title="Services with pending acknowledgments" className="mt-3">
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Service</th>
                      <th>Category</th>
                      <th className="text-center">Pending ack</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicesWithPending.map((r: any) => (
                      <tr key={r.id}>
                        <td className="fw-medium">{r.name}</td>
                        <td>
                          <span className="badge bg-light text-dark">{r.category}</span>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-warning text-dark">{r.pendingAckCount}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </>
      )}
    </PageWorkspace>
  );
}
