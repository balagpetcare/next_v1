"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

function statusBadge(status) {
  switch (status) {
    case "APPROVED":
      return "badge bg-success";
    case "PENDING":
      return "badge bg-warning text-dark";
    case "REVOKED":
    case "REJECTED":
      return "badge bg-danger";
    case "SUSPENDED":
      return "badge bg-secondary";
    default:
      return "badge bg-secondary";
  }
}

export default function OwnerAccessRequestDetail({ params }) {
  const router = useRouter();
  const requestId = Number(params?.id);
  const [request, setRequest] = useState(null);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState("");

  const load = useCallback(async () => {
    if (!requestId) return;
    setError("");
    try {
      const res = await ownerGet(`/api/v1/owner/branch-access/${requestId}`);
      setRequest(res?.data ?? res);
    } catch (e) {
      setError(e?.message || "Failed to load request");
    }
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAction(action, note) {
    if (!requestId) return;
    setProcessing(action);
    setError("");
    try {
      if (action === "approve") {
        await ownerPost(`/api/v1/owner/branch-access/${requestId}/approve`, {});
      } else if (action === "reject") {
        await ownerPost(`/api/v1/owner/branch-access/${requestId}/reject`, { note });
      } else if (action === "suspend") {
        await ownerPost(`/api/v1/owner/branch-access/${requestId}/suspend`, { note });
      } else if (action === "remove") {
        await ownerPost(`/api/v1/owner/branch-access/${requestId}/remove`, { note });
      }
      await load();
    } catch (e) {
      setError(e?.message || "Action failed");
    } finally {
      setProcessing("");
    }
  }

  if (!requestId) {
    return (
      <div className="dashboard-main-body">
        <PageHeader title="Branch Access Request" subtitle="Invalid request id" />
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Branch Access Request"
        subtitle="Review and take action on this request."
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Staff Access", href: "/owner/staff-access" },
          { label: "Requests", href: "/owner/staff-access/requests" },
          { label: `Request #${requestId}`, href: `/owner/staff-access/requests/${requestId}` },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-1" />
          {error}
        </div>
      )}

      {!request ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="card radius-12 mb-24">
          <div className="card-body p-24">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-16 mb-24">
              <div>
                <h5 className="mb-4">{request?.user?.profile?.displayName || "Staff"}</h5>
                <div className="text-secondary-light small">
                  {request?.user?.auth?.email || request?.user?.auth?.phone || "—"}
                </div>
              </div>
              <span className={statusBadge(request.status)}>{request.status}</span>
            </div>

            <dl className="row mb-0">
              <dt className="col-sm-3">Branch</dt>
              <dd className="col-sm-9">{request?.branch?.name || "—"}</dd>

              <dt className="col-sm-3">Role</dt>
              <dd className="col-sm-9">{request?.role || "—"}</dd>

              <dt className="col-sm-3">Requested at</dt>
              <dd className="col-sm-9">
                {request?.requestedAt ? new Date(request.requestedAt).toLocaleString("bn-BD") : "—"}
              </dd>

              <dt className="col-sm-3">Approved at</dt>
              <dd className="col-sm-9">
                {request?.approvedAt ? new Date(request.approvedAt).toLocaleString("bn-BD") : "—"}
              </dd>

              <dt className="col-sm-3">Note</dt>
              <dd className="col-sm-9">{request?.note || "—"}</dd>
            </dl>

            <div className="d-flex flex-wrap gap-12 mt-24">
              {request.status === "PENDING" ? (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={processing === "approve"}
                    onClick={() => handleAction("approve")}
                  >
                    {processing === "approve" ? "Approving..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    disabled={processing === "reject"}
                    onClick={() => {
                      const note = prompt("Reason for rejection (optional)") || undefined;
                      handleAction("reject", note);
                    }}
                  >
                    {processing === "reject" ? "Rejecting..." : "Reject"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={processing === "suspend"}
                    onClick={() => {
                      const note = prompt("Reason for suspension (optional)") || undefined;
                      handleAction("suspend", note);
                    }}
                  >
                    {processing === "suspend" ? "Suspending..." : "Suspend"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    disabled={processing === "remove"}
                    onClick={() => {
                      if (!confirm("Remove access permanently?")) return;
                      const note = prompt("Reason (optional)") || undefined;
                      handleAction("remove", note);
                    }}
                  >
                    {processing === "remove" ? "Removing..." : "Remove"}
                  </button>
                </>
              )}
              <button type="button" className="btn btn-link" onClick={() => router.back()}>
                Go back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
