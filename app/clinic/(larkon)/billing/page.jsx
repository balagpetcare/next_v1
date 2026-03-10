"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  staffClinicBillingSummary,
  staffClinicVisitOrders,
  staffClinicCreateInvoice,
} from "@/lib/api";

export default function ClinicBillingPage() {
  const searchParams = useSearchParams();
  const branchIdParam = searchParams?.get("branchId") || "";
  const visitIdParam = searchParams?.get("visitId");
  const [branchId, setBranchId] = useState(branchIdParam);
  const [visitId, setVisitId] = useState(visitIdParam ? String(visitIdParam) : "");
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState(null);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    customerId: "",
    items: [{ productId: "", variantId: "", quantity: "1", price: "" }],
    paymentMethod: "",
    notes: "",
  });

  useEffect(() => {
    setBranchId(branchIdParam);
    if (visitIdParam) setVisitId(String(visitIdParam));
  }, [branchIdParam, visitIdParam]);

  useEffect(() => {
    if (!branchId || !visitId) return;
    const vid = Number(visitId);
    if (!vid) return;
    loadBilling();
  }, [branchId, visitId]);

  async function loadBilling() {
    if (!branchId || !visitId) return;
    const vid = Number(visitId);
    if (!vid) return;
    setLoading(true);
    setError("");
    try {
      const [sum, ordList] = await Promise.all([
        staffClinicBillingSummary(branchId, vid),
        staffClinicVisitOrders(branchId, vid),
      ]);
      setSummary(sum ?? null);
      setOrders(Array.isArray(ordList) ? ordList : []);
    } catch (e) {
      setError((e && e.message) || "Failed to load billing");
      setSummary(null);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateInvoice(e) {
    e.preventDefault();
    if (!branchId || !visitId) return;
    const vid = Number(visitId);
    if (!vid) return;
    setActioning("invoice");
    setError("");
    try {
      const items = invoiceForm.items
        .filter((i) => i.productId && i.quantity && i.price)
        .map((i) => ({
          productId: Number(i.productId),
          variantId: i.variantId ? Number(i.variantId) : undefined,
          quantity: Number(i.quantity),
          price: Number(i.price),
        }));
      await staffClinicCreateInvoice(branchId, vid, {
        customerId: Number(invoiceForm.customerId),
        items,
        paymentMethod: invoiceForm.paymentMethod || undefined,
        notes: invoiceForm.notes || undefined,
      });
      setShowCreateInvoice(false);
      setInvoiceForm({
        customerId: "",
        items: [{ productId: "", variantId: "", quantity: "1", price: "" }],
        paymentMethod: "",
        notes: "",
      });
      await loadBilling();
    } catch (e) {
      setError((e && e.message) || "Create invoice failed");
    } finally {
      setActioning(null);
    }
  }

  const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12 mb-3">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Billing</h6>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input type="text" className="form-control form-control-sm" placeholder="Branch ID" value={branchId} onChange={(e) => setBranchId(e.target.value)} style={{ width: "100px" }} />
            <input type="number" className="form-control form-control-sm" placeholder="Visit ID" value={visitId} onChange={(e) => setVisitId(e.target.value)} style={{ width: "90px" }} />
            {visitId && (
              <Link href={`/clinic/visits/${visitId}?branchId=${encodeURIComponent(branchId)}`} className="btn btn-sm btn-outline-secondary radius-12">Visit #{visitId}</Link>
            )}
            <Link href={`/clinic${q}`} className="btn btn-sm btn-outline-primary radius-12">Back</Link>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger radius-12 mb-3" role="alert">{error}</div>}

      {!branchId && (
        <div className="card radius-12">
          <div className="card-body text-center text-muted py-5">
            <p className="mb-0">Enter branch ID and Visit ID to view billing summary and create invoice.</p>
          </div>
        </div>
      )}

      {branchId && visitId && (
        <>
          {loading && <p className="text-muted mb-2">Loading...</p>}
          {!loading && summary && (
            <>
              {Array.isArray(summary.servicePaymentStatus) && summary.servicePaymentStatus.length > 0 && (
                <div className="card radius-12 mb-3">
                  <div className="card-header"><h6 className="mb-0">Services – payment status</h6></div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Service</th>
                            <th>Status</th>
                            <th>Receipt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.servicePaymentStatus.map((row) => (
                            <tr key={row.serviceId}>
                              <td>{row.serviceName}</td>
                              <td>
                                <span className={`badge radius-8 ${row.paid ? "bg-success" : "bg-warning text-dark"}`}>
                                  {row.paid ? "Paid" : "Unpaid"}
                                </span>
                              </td>
                              <td className="text-muted small">{row.paid && row.receiptNumber ? row.receiptNumber : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              <div className="card radius-12 mb-3">
                <div className="card-header"><h6 className="mb-0">Visit billing summary</h6></div>
                <div className="card-body">
                  <p className="mb-1"><strong>Pet:</strong> {summary.pet?.name ?? "—"} · <strong>Customer:</strong> {summary.patient?.profile?.displayName ?? "—"}</p>
                  {summary.appointment?.service && (
                    <p className="mb-0 text-muted small">Appointment service: {summary.appointment.service.name} · {summary.appointment.service.price != null ? `Base price: ${Number(summary.appointment.service.price).toFixed(2)}` : ""}</p>
                  )}
                </div>
              </div>
            </>
          )}
          <div className="card radius-12 mb-3">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="mb-0">Visit orders</h6>
              <button type="button" className="btn btn-sm btn-primary radius-12" onClick={() => setShowCreateInvoice(!showCreateInvoice)}>
                {showCreateInvoice ? "Cancel" : "Create invoice"}
              </button>
            </div>
            {showCreateInvoice && (
              <div className="card-body border-top">
                <form onSubmit={handleCreateInvoice}>
                  <div className="row g-2 mb-2">
                    <div className="col-md-3"><input type="number" className="form-control form-control-sm" placeholder="Customer ID" value={invoiceForm.customerId} onChange={(e) => setInvoiceForm((f) => ({ ...f, customerId: e.target.value }))} required /></div>
                    <div className="col-md-3"><input type="text" className="form-control form-control-sm" placeholder="Payment method" value={invoiceForm.paymentMethod} onChange={(e) => setInvoiceForm((f) => ({ ...f, paymentMethod: e.target.value }))} /></div>
                    <div className="col-md-6"><input type="text" className="form-control form-control-sm" placeholder="Notes" value={invoiceForm.notes} onChange={(e) => setInvoiceForm((f) => ({ ...f, notes: e.target.value }))} /></div>
                  </div>
                  {(invoiceForm.items || []).map((item, idx) => (
                    <div key={idx} className="row g-2 mb-2 align-items-center">
                      <div className="col-md-2"><input type="number" className="form-control form-control-sm" placeholder="Product ID" value={item.productId} onChange={(e) => setInvoiceForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, productId: e.target.value } : it) }))} /></div>
                      <div className="col-md-2"><input type="number" className="form-control form-control-sm" placeholder="Variant ID" value={item.variantId} onChange={(e) => setInvoiceForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, variantId: e.target.value } : it) }))} /></div>
                      <div className="col-md-2"><input type="number" className="form-control form-control-sm" placeholder="Qty" value={item.quantity} onChange={(e) => setInvoiceForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, quantity: e.target.value } : it) }))} /></div>
                      <div className="col-md-2"><input type="number" step="0.01" className="form-control form-control-sm" placeholder="Price" value={item.price} onChange={(e) => setInvoiceForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, price: e.target.value } : it) }))} /></div>
                    </div>
                  ))}
                  <button type="submit" className="btn btn-sm btn-success radius-12" disabled={!!actioning}>{actioning === "invoice" ? "..." : "Create invoice"}</button>
                </form>
              </div>
            )}
            <div className="card-body">
              {!loading && orders.length === 0 && <p className="text-muted mb-0">No orders for this visit.</p>}
              {!loading && orders.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle">
                    <thead><tr><th>Order ID</th><th>Total</th><th>Status</th></tr></thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id}>
                          <td>{o.id}</td>
                          <td>{o.totalAmount != null ? Number(o.totalAmount).toFixed(2) : "—"}</td>
                          <td>{o.status ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
