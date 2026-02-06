"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";

export default function StaffAccessApprovals({ branchId }) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    if (branchId) {
      loadPendingRequests();
    }
  }, [branchId]);

  async function loadPendingRequests() {
    try {
      setLoading(true);
      const response = await apiGet("/api/v1/branch-access/pending");
      const data = response?.data || response || [];
      // Filter for this branch
      const branchRequests = Array.isArray(data)
        ? data.filter((req) => req.branchId === Number(branchId))
        : [];
      setPendingRequests(branchRequests);
    } catch (error) {
      console.error("Error loading pending requests:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(permissionId, expiresAt = null) {
    try {
      setProcessing({ ...processing, [permissionId]: "approving" });
      
      const response = await apiPost(
        `/api/v1/branch-access/${permissionId}/approve`,
        expiresAt ? { expiresAt } : {}
      );
      
      await loadPendingRequests();
      alert("Access approved successfully!");
    } catch (error) {
      console.error("Error approving access:", error);
      alert(error?.message || "Failed to approve access");
    } finally {
      setProcessing({ ...processing, [permissionId]: null });
    }
  }

  async function handleRevoke(permissionId) {
    if (!confirm("আপনি কি নিশ্চিত যে আপনি এই access revoke করতে চান?")) {
      return;
    }

    try {
      setProcessing({ ...processing, [permissionId]: "revoking" });
      
      await apiPost(`/api/v1/branch-access/${permissionId}/revoke`);
      
      await loadPendingRequests();
      alert("Access revoked successfully!");
    } catch (error) {
      console.error("Error revoking access:", error);
      alert(error?.message || "Failed to revoke access");
    } finally {
      setProcessing({ ...processing, [permissionId]: null });
    }
  }

  if (loading) {
    return (
      <Card title="Staff Access Approvals">
        <div className="text-center py-20">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Card>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <Card title="Staff Access Approvals" subtitle="Manage staff branch access permissions">
        <div className="text-center py-30">
          <i className="ri-checkbox-circle-line text-success" style={{ fontSize: "48px" }}></i>
          <p className="mt-16 text-secondary-light mb-0">
            কোন pending approval request নেই
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Staff Access Approvals" 
      subtitle={`${pendingRequests.length} pending request(s)`}
    >
      <div className="table-responsive">
        <table className="table table-hover">
          <thead>
            <tr>
              <th>Staff Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Requested At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingRequests.map((request) => (
              <tr key={request.id}>
                <td>
                  <strong>
                    {request.user?.profile?.displayName || 
                     request.user?.auth?.email || 
                     "Unknown"}
                  </strong>
                </td>
                <td>{request.user?.auth?.email || "N/A"}</td>
                <td>
                  <span className="badge bg-primary-100 text-primary-600">
                    {request.user?.branchMemberships?.[0]?.role || "STAFF"}
                  </span>
                </td>
                <td>
                  {request.requestedAt
                    ? new Date(request.requestedAt).toLocaleString("bn-BD")
                    : "N/A"}
                </td>
                <td>
                  <div className="d-flex gap-8">
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleApprove(request.id)}
                      disabled={processing[request.id]}
                    >
                      {processing[request.id] === "approving" ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-8"></span>
                          Approving...
                        </>
                      ) : (
                        <>
                          <i className="ri-check-line me-4"></i>
                          Approve
                        </>
                      )}
                    </button>
                    
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRevoke(request.id)}
                      disabled={processing[request.id]}
                    >
                      {processing[request.id] === "revoking" ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-8"></span>
                          Revoking...
                        </>
                      ) : (
                        <>
                          <i className="ri-close-line me-4"></i>
                          Decline
                        </>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-20">
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={loadPendingRequests}
        >
          <i className="ri-refresh-line me-8"></i>
          Refresh
        </button>
      </div>
    </Card>
  );
}
