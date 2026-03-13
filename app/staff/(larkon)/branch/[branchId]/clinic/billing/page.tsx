"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, PageHeader, LoadingState, SectionCard, ReportDataDisplay } from "@/src/components/dashboard";
import {
  staffClinicBillingSummary,
  staffClinicVisitOrders,
  staffClinicVisitPaymentStatus,
  staffClinicVisitsList,
} from "@/lib/api";

const BILLING_PERMS = ["clinic.billing.view", "manager.billing.create_invoice", "manager.billing.collect_payment"];

export default function StaffClinicBillingPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);
  const [visitIdInput, setVisitIdInput] = useState("");
  const [lookupVisitId, setLookupVisitId] = useState<number | null>(null);
  const [billingSummary, setBillingSummary] = useState<unknown>(null);
  const [orders, setOrders] = useState<unknown[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<{ serviceId: number; serviceName: string; paid: boolean; receiptNumber?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentUnpaid, setRecentUnpaid] = useState<{ id: number; treatmentCode?: string; pet?: { name?: string }; patient?: { profile?: { displayName?: string } }; status?: string }[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = BILLING_PERMS.some((p) => permissions.includes(p));

  const loadVisitBilling = useCallback(() => {
    const vid = visitIdInput ? Number(visitIdInput) : null;
    if (!branchId || vid == null || Number.isNaN(vid)) {
      setLookupVisitId(null);
      setBillingSummary(null);
      setOrders([]);
      setPaymentStatus([]);
      return;
    }
    setLoading(true);
    setError("");
    setLookupVisitId(vid);
    Promise.all([
      staffClinicBillingSummary(branchId, vid),
      staffClinicVisitOrders(branchId, vid),
      staffClinicVisitPaymentStatus(branchId, vid),
    ])
      .then(([summary, ords, status]) => {
        setBillingSummary(summary ?? null);
        setOrders(Array.isArray(ords) ? ords : []);
        setPaymentStatus(Array.isArray(status) ? status : []);
      })
      .catch((e) => {
        setError(e?.message ?? "Failed to load billing");
        setBillingSummary(null);
        setOrders([]);
        setPaymentStatus([]);
      })
      .finally(() => setLoading(false));
  }, [branchId, visitIdInput]);

  const loadRecentVisits = useCallback(() => {
    if (!branchId) return;
    setRecentLoading(true);
    staffClinicVisitsList(branchId, { limit: 20, offset: 0 })
      .then((data) => {
        const list = (data?.visits ?? []).slice(0, 10);
        setRecentUnpaid(list);
      })
      .catch(() => setRecentUnpaid([]))
      .finally(() => setRecentLoading(false));
  }, [branchId]);

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading..." />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.billing.view"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  return (
    <PageWorkspace>
      <div className="row g-0">
        <div className="col-12">
          <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <Link href={`/staff/branch/${branchId}/clinic`} className="btn btn-outline-secondary btn-sm radius-8">← Clinic</Link>
            <nav aria-label="Breadcrumb" className="d-flex align-items-center gap-2">
              <Link href={`/staff/branch/${branchId}/clinic`} className="text-muted small">Clinic</Link>
              <span className="text-muted small">/</span>
              <span className="fw-semibold">Billing</span>
            </nav>
          </div>
          <PageHeader
            title="Billing"
            subtitle="Visit billing, invoices, payment collection"
            breadcrumbs={[{ label: "Clinic", href: `/staff/branch/${branchId}/clinic` }, { label: "Billing" }]}
          />
          <p className="small text-muted mb-2">
            Workflow:{" "}
            <Link href={`/staff/branch/${branchId}/clinic/appointments`}>Appointments</Link>
            {" → "}
            <Link href={`/staff/branch/${branchId}/clinic/visits`}>Visits</Link>
            {" → "}
            <Link href={`/staff/branch/${branchId}/clinic/cases`}>Cases</Link>
            {" → "}
            <span className="fw-semibold">Billing</span>
          </p>

          <SectionCard title="Visit-based billing" subtitle="Look up a visit to see billing summary, orders, and payment status.">
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <div className="card radius-12 border">
                  <div className="card-body">
                    <h6 className="text-muted text-uppercase small mb-1">Bill by visit</h6>
                    <p className="mb-0 small">Enter visit ID below or use recent visits.</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card radius-12 border">
                  <div className="card-body">
                    <h6 className="text-muted text-uppercase small mb-1">Payment collection</h6>
                    <Link href={`/staff/branch/${branchId}/clinic/appointments`} className="btn btn-sm btn-outline-primary">
                      Appointments (collect payment)
                    </Link>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card radius-12 border">
                  <div className="card-body">
                    <h6 className="text-muted text-uppercase small mb-1">Visits</h6>
                    <Link href={`/staff/branch/${branchId}/clinic/visits`} className="btn btn-sm btn-outline-primary">
                      Visit history
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small">Visit ID</label>
              <div className="d-flex gap-2 flex-wrap">
                <input
                  type="number"
                  className="form-control form-control-sm"
                  style={{ width: 120 }}
                  placeholder="e.g. 123"
                  value={visitIdInput}
                  onChange={(e) => setVisitIdInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadVisitBilling()}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={loadVisitBilling} disabled={loading}>
                  {loading ? "Loading…" : "Look up"}
                </button>
              </div>
            </div>

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            {lookupVisitId != null && !loading && (billingSummary != null || orders.length > 0 || paymentStatus.length > 0) && (
              <div className="mt-3">
                <h6 className="mb-2">Visit #{lookupVisitId}</h6>
                <div className="d-flex gap-2 mb-2">
                  <Link href={`/staff/branch/${branchId}/clinic/visits/${lookupVisitId}`} className="btn btn-sm btn-outline-secondary">
                    Open visit
                  </Link>
                </div>
                {billingSummary != null && (
                  <div className="card radius-8 border mb-2">
                    <div className="card-body py-2">
                      <strong>Billing summary:</strong>
                      <div className="small mt-1"><ReportDataDisplay data={billingSummary} /></div>
                    </div>
                  </div>
                )}
                {paymentStatus.length > 0 && (
                  <div className="table-responsive mb-2">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Service</th>
                          <th>Paid</th>
                          <th>Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentStatus.map((s, i) => (
                          <tr key={s.serviceId ?? i}>
                            <td>{s.serviceName ?? s.serviceId}</td>
                            <td>{s.paid ? "Yes" : "No"}</td>
                            <td>{s.receiptNumber ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {orders.length > 0 && (
                  <p className="small text-muted mb-0">Orders: {orders.length} order(s). Create invoice from visit page or API.</p>
                )}
              </div>
            )}

            {lookupVisitId != null && !loading && billingSummary == null && orders.length === 0 && paymentStatus.length === 0 && !error && (
              <p className="small text-muted mb-0">No billing data for this visit.</p>
            )}
          </SectionCard>

          <SectionCard title="Recent visits" subtitle="Quick links to visit billing.">
            <button type="button" className="btn btn-sm btn-outline-secondary mb-2" onClick={loadRecentVisits} disabled={recentLoading}>
              {recentLoading ? "Loading…" : "Load recent visits"}
            </button>
            {recentUnpaid.length > 0 && (
              <ul className="list-unstyled mb-0 small">
                {recentUnpaid.map((v) => (
                  <li key={v.id} className="mb-1">
                    <Link href={`/staff/branch/${branchId}/clinic/visits/${v.id}`}>
                      Visit {v.treatmentCode ?? v.id} — {v.pet?.name ?? "Pet"} / {v.patient?.profile?.displayName ?? "Owner"}
                    </Link>
                    {" · "}
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0"
                      onClick={() => {
                        setVisitIdInput(String(v.id));
                        setError("");
                        setLoading(true);
                        setLookupVisitId(v.id);
                        Promise.all([
                          staffClinicBillingSummary(branchId, v.id),
                          staffClinicVisitOrders(branchId, v.id),
                          staffClinicVisitPaymentStatus(branchId, v.id),
                        ])
                          .then(([summary, ords, status]) => {
                            setBillingSummary(summary ?? null);
                            setOrders(Array.isArray(ords) ? ords : []);
                            setPaymentStatus(Array.isArray(status) ? status : []);
                          })
                          .catch((e) => {
                            setError(e?.message ?? "Failed to load billing");
                            setBillingSummary(null);
                            setOrders([]);
                            setPaymentStatus([]);
                          })
                          .finally(() => setLoading(false));
                      }}
                    >
                      Look up billing
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </PageWorkspace>
  );
}
