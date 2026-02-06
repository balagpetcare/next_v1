"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import StatusBadge from "@/app/owner/_components/StatusBadge";

export default function TransferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) loadTransfer();
  }, [id]);

  const loadTransfer = async () => {
    try {
      setLoading(true);
      const res = await ownerGet(`/api/v1/transfers/${id}`);
      setTransfer(res?.data ?? res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!confirm("Send this transfer?")) return;
    try {
      await ownerPost(`/api/v1/transfers/${id}/send`, {});
      loadTransfer();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleReceive = async () => {
    if (!confirm("Mark as received (full receive)?")) return;
    try {
      await ownerPost(`/api/v1/transfers/${id}/receive`, { items: [] });
      loadTransfer();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  if (loading) return <div className="container py-4">Loading...</div>;
  if (error || !transfer) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{error || "Transfer not found"}</div>
        <button className="btn btn-outline-secondary" onClick={() => router.push("/owner/transfers")}>
          Back to Transfers
        </button>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <button className="btn btn-outline-secondary btn-sm mb-2" onClick={() => router.push("/owner/transfers")}>
            Back
          </button>
          <h5 className="mb-1">Transfer #{transfer.id}</h5>
          <StatusBadge status={transfer.status} />
        </div>
        <div className="d-flex gap-2">
          {transfer.status === "DRAFT" && (
            <button className="btn btn-primary" onClick={handleSend}>
              Send Transfer
            </button>
          )}
          {(transfer.status === "SENT" || transfer.status === "IN_TRANSIT") && (
            <button className="btn btn-success" onClick={handleReceive}>
              Mark Received
            </button>
          )}
        </div>
      </div>

      <div className="card radius-12">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-6">
              <strong>From:</strong> {transfer.fromLocation?.name ?? "—"}
            </div>
            <div className="col-md-6">
              <strong>To:</strong> {transfer.toLocation?.name ?? "—"}
            </div>
          </div>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Variant</th>
                <th>SKU</th>
                <th>Sent</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {(transfer.items ?? []).map((item: any) => (
                <tr key={item.id}>
                  <td>{item.variant?.title ?? "—"}</td>
                  <td>{item.variant?.sku ?? "—"}</td>
                  <td>{item.quantitySent}</td>
                  <td>{item.quantityReceived ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transfer.discrepancies?.length > 0 && (
            <div className="mt-3">
              <strong>Discrepancies:</strong>
              <ul className="mb-0">
                {transfer.discrepancies.map((d: any) => (
                  <li key={d.id}>
                    Expected {d.expectedQty}, received {d.receivedQty}, missing {d.missingQty}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
