"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ownerClinicServiceProposals, ownerClinicServiceProposalReview } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

type Proposal = {
  id: number;
  title: string;
  category: string;
  department: string;
  suggestedPrice?: number | null;
  reason?: string | null;
  status: string;
  proposedByUserId: number;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
};

export default function ServiceProposalsPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");

  const load = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const res = await ownerClinicServiceProposals(branchId, statusFilter || undefined);
      setProposals((res?.proposals as Proposal[]) ?? []);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load proposals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [branchId, statusFilter]);

  const handleReview = async (proposalId: number, action: "APPROVED" | "REJECTED", reviewNote?: string) => {
    if (!branchId) return;
    try {
      setError("");
      await ownerClinicServiceProposalReview(branchId, proposalId, { action, reviewNote });
      setProposals((prev) => prev.filter((p) => p.id !== proposalId));
    } catch (e) {
      setError((e as Error)?.message || "Failed to review");
    }
  };

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
        title="Service proposals"
        subtitle={`Branch #${branchId} — requests from doctors`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Services", href: `/owner/clinic/${branchId}/services` },
          { label: "Proposals", href: `/owner/clinic/${branchId}/service-proposals` },
        ]}
        actions={[
          <Link key="services" href={`/owner/clinic/${branchId}/services`} className="btn btn-outline-primary radius-12">
            <i className="ri-arrow-left-line me-1" />
            Back to services
          </Link>,
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <div className="mb-3">
        <select
          className="form-select form-select-sm w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      ) : proposals.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <i className="ri-file-list-3-line fs-1 text-muted mb-3 d-block" />
            <h5 className="mb-3">No proposals</h5>
            <p className="text-muted">Doctors can request new services; they will appear here for approval.</p>
          </div>
        </div>
      ) : (
        <div className="card radius-12">
          <div className="card-body p-24">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Department</th>
                    <th>Suggested price</th>
                    <th>Status</th>
                    <th>Date</th>
                    {statusFilter === "PENDING" && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((p) => (
                    <tr key={p.id}>
                      <td className="fw-semibold">{p.title}</td>
                      <td>{p.category}</td>
                      <td>{p.department}</td>
                      <td>{p.suggestedPrice != null ? p.suggestedPrice : "—"}</td>
                      <td>
                        <span
                          className={`badge radius-8 ${
                            p.status === "PENDING"
                              ? "bg-warning"
                              : p.status === "APPROVED"
                                ? "bg-success"
                                : "bg-secondary"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                      {statusFilter === "PENDING" && (
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-success radius-12"
                              onClick={() => handleReview(p.id, "APPROVED")}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger radius-12"
                              onClick={() => {
                                const note = window.prompt("Rejection note (optional):");
                                handleReview(p.id, "REJECTED", note || undefined);
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
