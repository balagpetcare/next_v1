"use client";

// Flat URL for Pricing matrix (see next.config redirects from .../services-pricing/matrix).

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffClinicServicePricingMatrix } from "@/lib/api";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, PageHeader, SectionCard, LoadingState } from "@/src/components/dashboard";
import ServicesPricingNav from "../_components/ServicesPricingNav";

const PERMS = [
  "manager.pricing.view",
  "clinic.services.manage",
  "clinic.appointments.manage",
  "clinic.appointments.read",
];

export default function StaffServicesPricingMatrixPage() {
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
        title="Pricing matrix"
        message="You need at least one of: manager.pricing.view, clinic.services.manage, clinic.appointments.read, or clinic.appointments.manage."
        missingPerm="Services & Pricing (matrix)"
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
      <PageHeader title="Pricing matrix" subtitle="List price, fee spread across doctors, pending acknowledgments" />

      {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}

      {loading ? (
        <SectionCard>
          <div className="text-center py-5 text-muted">Loading…</div>
        </SectionCard>
      ) : (
        <SectionCard title="Services × pricing">
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Service</th>
                  <th>Category</th>
                  <th className="text-end">List</th>
                  <th className="text-end">Fee min</th>
                  <th className="text-end">Fee max</th>
                  <th className="text-center">Doctors</th>
                  <th className="text-center">Pending ack</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="fw-medium">{r.name}</td>
                    <td>
                      <span className="badge bg-light text-dark">{r.category}</span>
                    </td>
                    <td className="text-end">৳{Number(r.listPrice ?? r.price ?? 0).toLocaleString()}</td>
                    <td className="text-end">{r.feeMin != null ? `৳${Number(r.feeMin).toLocaleString()}` : "—"}</td>
                    <td className="text-end">{r.feeMax != null ? `৳${Number(r.feeMax).toLocaleString()}` : "—"}</td>
                    <td className="text-center">{r.assignedDoctorCount ?? 0}</td>
                    <td className="text-center">
                      {r.pendingAckCount > 0 ? (
                        <span className="badge bg-warning text-dark">{r.pendingAckCount}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {!loading && feeRows.length > 0 && (
        <SectionCard title="Doctor fee rows (detail)" className="mt-3">
          <div className="table-responsive" style={{ maxHeight: 360 }}>
            <table className="table table-sm mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th>Doctor</th>
                  <th>Service</th>
                  <th>Model</th>
                  <th className="text-end">Resolved ৳</th>
                  <th>Pending ack</th>
                </tr>
              </thead>
              <tbody>
                {feeRows.map((f) => (
                  <tr key={f.id}>
                    <td className="text-nowrap small">{f.doctorName ?? f.memberId}</td>
                    <td className="small">{f.serviceId}</td>
                    <td className="small">{f.feeModel}</td>
                    <td className="text-end">{f.resolvedAmount != null ? Number(f.resolvedAmount).toLocaleString() : "—"}</td>
                    <td>{f.pendingAck ? "Yes" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </PageWorkspace>
  );
}
