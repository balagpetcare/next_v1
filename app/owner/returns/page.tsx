"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import StatusBadge from "@/app/owner/_components/StatusBadge";

function formatCurrency(amount) {
  return `৳${Number(amount).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ownerGet("/api/v1/returns").catch(() => ({ success: false, data: [] }));
      const items = res?.data?.items || res?.data || res || [];
      setReturns(Array.isArray(items) ? items : []);
    } catch (error: any) {
      setError(error?.message || "Failed to load returns");
      console.error("Load returns error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (returnId: number) => {
    if (!confirm("Approve this return request?")) return;
    try {
      await ownerPost(`/api/v1/returns/${returnId}/approve`, {});
      alert("Return approved successfully");
      loadReturns();
    } catch (error: any) {
      alert(error?.message || "Failed to approve return");
    }
  };

  const handleReceive = async (returnId: number) => {
    if (!confirm("Mark this return as received?")) return;
    try {
      await ownerPost(`/api/v1/returns/${returnId}/receive`, { items: [] });
      alert("Return received successfully");
      loadReturns();
    } catch (error: any) {
      alert(error?.message || "Failed to receive return");
    }
  };

  const handleReject = async (returnId: number) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      await ownerPost(`/api/v1/returns/${returnId}/reject`, { reason });
      alert("Return rejected");
      loadReturns();
    } catch (error: any) {
      alert(error?.message || "Failed to reject return");
    }
  };

  return (
    <div className="container py-3">
      <div className="mb-4">
        <h2 className="mb-1">Return Requests</h2>
        <div className="text-secondary">Manage customer return requests and refunds</div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card radius-12">
        <div className="card-body p-24">
          {loading ? (
            <div className="text-center text-secondary py-4">Loading returns...</div>
          ) : returns.length === 0 ? (
            <div className="text-center text-secondary py-4">No return requests found</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Return ID</th>
                    <th>Order ID</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th style={{ width: 200 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((ret) => (
                    <tr key={ret.id}>
                      <td className="fw-semibold">#{ret.id}</td>
                      <td>
                        {ret.orderId ? (
                          <Link href={`/owner/orders/${ret.orderId}`} className="text-primary">
                            #{ret.orderId}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="fw-semibold">{formatCurrency(ret.totalAmount || ret.amount || 0)}</td>
                      <td>
                        <StatusBadge status={ret.status || "PENDING"} />
                      </td>
                      <td className="text-muted small">{formatDate(ret.createdAt)}</td>
                      <td className="text-end">
                        <div className="d-flex gap-2 justify-content-end">
                          {ret.status === "PENDING" && (
                            <>
                              <button
                                className="btn btn-outline-success btn-sm"
                                onClick={() => handleApprove(ret.id)}
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleReject(ret.id)}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {ret.status === "APPROVED" && (
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => handleReceive(ret.id)}
                            >
                              Receive
                            </button>
                          )}
                          <Link href={`/owner/returns/${ret.id}`} className="btn btn-outline-secondary btn-sm">
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
