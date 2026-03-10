"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicDiscountPoliciesList,
  ownerClinicDiscountAuditLog,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

type PolicyItem = {
  id: number;
  name: string;
  discountType: string;
  scope: string;
  calcType: string;
  maxPercent?: number | null;
  maxAmount?: number | string | null;
  absorptionMode?: string;
  requiresApproval?: boolean;
  status?: string;
};

export default function ClinicDiscountPoliciesPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [items, setItems] = useState<PolicyItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [auditItems, setAuditItems] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);

  const load = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const res = await ownerClinicDiscountPoliciesList(branchId, { page: 1, limit: 50 });
      setItems((res.items ?? []) as PolicyItem[]);
      setPagination(res.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (e) {
      setError((e as Error)?.message || "Failed to load discount policies");
    } finally {
      setLoading(false);
    }
  };

  const loadAudit = async () => {
    if (!branchId) return;
    try {
      const res = await ownerClinicDiscountAuditLog(branchId, { limit: 100 });
      setAuditItems((res as { items?: unknown[] })?.items ?? []);
    } catch {
      setAuditItems([]);
    }
  };

  useEffect(() => {
    load();
  }, [branchId]);

  useEffect(() => {
    if (auditOpen && branchId) loadAudit();
  }, [auditOpen, branchId]);

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Discount policies"
        subtitle={`Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Discount policies", href: `/owner/clinic/${branchId}/discount-policies` },
        ]}
        actions={[
          <button
            key="audit"
            type="button"
            className="btn btn-outline-secondary radius-12"
            onClick={() => setAuditOpen(!auditOpen)}
          >
            {auditOpen ? "Hide audit" : "Discount audit"}
          </button>,
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      {auditOpen && (
        <div className="card radius-12 mb-4">
          <div className="card-header bg-transparent">
            <h6 className="mb-0">Discount audit log</h6>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Action</th>
                    <th>Policy</th>
                    <th>Amount</th>
                    <th>Order/Case</th>
                  </tr>
                </thead>
                <tbody>
                  {auditItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-muted text-center py-3">No audit entries</td>
                    </tr>
                  ) : (
                    (auditItems as Array<{ createdAt?: string; action?: string; discountPolicyId?: number; amount?: number; orderId?: number; caseId?: number }>).map((a, i) => (
                      <tr key={i}>
                        <td>{a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}</td>
                        <td>{a.action ?? "—"}</td>
                        <td>#{a.discountPolicyId ?? "—"}</td>
                        <td>{a.amount ?? 0}</td>
                        <td>{a.orderId ? `Order #${a.orderId}` : a.caseId ? `Case #${a.caseId}` : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="card radius-12">
        <div className="card-body">
          <h6 className="mb-3">Policies</h6>
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Scope</th>
                    <th>Calc</th>
                    <th>Max %</th>
                    <th>Max amount</th>
                    <th>Approval</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-muted text-center py-4">
                        No discount policies. Create policies to control discounts by type, scope, and approval.
                      </td>
                    </tr>
                  ) : (
                    items.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td><span className="badge bg-secondary radius-8">{p.discountType}</span></td>
                        <td>{p.scope}</td>
                        <td>{p.calcType}</td>
                        <td>{p.maxPercent ?? "—"}</td>
                        <td>{p.maxAmount != null ? Number(p.maxAmount) : "—"}</td>
                        <td>{p.requiresApproval ? "Yes" : "No"}</td>
                        <td><span className={`badge radius-8 ${p.status === "ACTIVE" ? "bg-success" : "bg-secondary"}`}>{p.status ?? "ACTIVE"}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-muted small mb-0 mt-2">
            Configure policies via API or add a create/edit form. Use &quot;Discount audit&quot; to see applied discounts.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Link href={`/owner/clinic/${branchId}`} className="btn btn-outline-secondary radius-12">
          <i className="ri-arrow-left-line me-1" />
          Back to clinic
        </Link>
      </div>
    </div>
  );
}
