"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ChallanPrintPage() {
  const params = useParams();
  const id = params?.id as string;
  const dispatchId = params?.dispatchId as string;
  const [dispatch, setDispatch] = useState<any>(null);

  useEffect(() => {
    if (!dispatchId) return;
    ownerGet(`/api/v1/inventory/dispatches/${dispatchId}`)
      .then((res: any) => setDispatch(res?.data ?? res))
      .catch(() => setDispatch(null));
  }, [dispatchId]);

  if (!dispatch) {
    return <div className="p-4">Loading challan…</div>;
  }

  return (
    <div className="p-4" style={{ maxWidth: 800, margin: "0 auto" }}>
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h4 className="mb-0">Delivery Challan</h4>
          <p className="text-muted mb-0 small">#{dispatch.id}</p>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => window.print()}>
          Print
        </button>
      </div>
      <table className="table table-bordered small mb-3">
        <tbody>
          <tr><th style={{ width: 140 }}>From</th><td>{dispatch.fromLocation?.name ?? dispatch.fromLocationId}</td></tr>
          <tr><th>To</th><td>{dispatch.toLocation?.name ?? dispatch.toLocationId}</td></tr>
          <tr><th>Status</th><td>{dispatch.status}</td></tr>
          <tr><th>Created</th><td>{formatDate(dispatch.createdAt)}</td></tr>
          {dispatch.carrierType && <tr><th>Carrier</th><td>{dispatch.carrierType}</td></tr>}
          {dispatch.vehicleNo && <tr><th>Vehicle</th><td>{dispatch.vehicleNo}</td></tr>}
          {dispatch.driverName && <tr><th>Driver</th><td>{dispatch.driverName} {dispatch.driverPhone ? `(${dispatch.driverPhone})` : ""}</td></tr>}
          {dispatch.trackingId && <tr><th>Tracking ID</th><td>{dispatch.trackingId}</td></tr>}
          {dispatch.note && <tr><th>Note</th><td>{dispatch.note}</td></tr>}
        </tbody>
      </table>
      <table className="table table-bordered table-sm">
        <thead>
          <tr>
            <th>#</th>
            <th>Variant (SKU)</th>
            <th>Lot</th>
            <th>Expiry</th>
            <th>Qty</th>
          </tr>
        </thead>
        <tbody>
          {(dispatch.items ?? []).map((item: any, idx: number) => (
            <tr key={item.id ?? idx}>
              <td>{idx + 1}</td>
              <td>{item.variant?.title ?? item.variant?.sku ?? item.variantId}</td>
              <td>{item.lot?.lotCode ?? item.lotId}</td>
              <td>{item.lot?.expDate ? formatDate(item.lot.expDate) : "—"}</td>
              <td>{item.quantityDispatched}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-muted small mt-3">Stock Request #{dispatch.stockRequestId ?? id}</p>
    </div>
  );
}
