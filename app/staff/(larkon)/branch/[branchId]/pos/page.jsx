"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LkFormGroup from "@larkon-ui/components/LkFormGroup";
import LkInput from "@larkon-ui/components/LkInput";
import LkSelect from "@larkon-ui/components/LkSelect";
import LkTextarea from "@larkon-ui/components/LkTextarea";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffOrdersList,
  staffOrderGet,
  staffPosReturn,
  staffPosCancelOrder,
  staffPosGetCurrentShift,
  staffPosOpenShift,
  staffPosCloseShift,
  staffPosGetZReport,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import AccessDenied from "@/src/components/branch/AccessDenied";
import PosSaleWorkspace from "./_components/PosSaleWorkspace";

const REQUIRED_PERM = "pos.view";
const RETURN_REASONS = [
  { value: "customer_request", label: "Customer request" },
  { value: "defective", label: "Defective" },
  { value: "wrong_item", label: "Wrong item" },
];

export default function StaffBranchPosPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const bidNum = useMemo(() => {
    const parsed = parseInt(branchId, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [branchId]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const [activeTab, setActiveTab] = useState("sale");
  const permissions = myAccess?.permissions ?? [];
  const canView = permissions.includes(REQUIRED_PERM);
  const canSell = permissions.includes("pos.sell");
  const canRefund = permissions.includes("pos.refund");
  const canDiscountOverride = permissions.includes("pos.discount.override");
  const canCashOpen = permissions.includes("cashdrawer.open");
  const canCashClose = permissions.includes("cashdrawer.close");

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderDetail, setOrderDetail] = useState(undefined);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);

  const [refundOrderId, setRefundOrderId] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundError, setRefundError] = useState("");
  const [returnOrderDetail, setReturnOrderDetail] = useState(null);
  const [returnLines, setReturnLines] = useState([]);
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState(null);

  const [currentShift, setCurrentShift] = useState(null);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftError, setShiftError] = useState("");
  const [startingCash, setStartingCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [managerOverrideReason, setManagerOverrideReason] = useState("");
  const [zReport, setZReport] = useState(null);
  const [zReportLoading, setZReportLoading] = useState(false);

  useEffect(() => {
    if (errorCode === "unauthorized") {
      router.replace("/staff/login");
    }
  }, [errorCode, router]);

  const reloadOrders = async () => {
    if (!branchId || !canView) return [];
    try {
      const response = await staffOrdersList(branchId, {
        limit: 100,
        status: orderStatusFilter || undefined,
      });
      const items = response?.items ?? [];
      setOrders(items);
      return items;
    } catch (error) {
      setOrdersError(error?.message ?? "Failed to load orders");
      return [];
    }
  };

  useEffect(() => {
    if (!branchId || !canView) return;
    let cancelled = false;
    setOrdersLoading(true);
    setOrdersError("");

    staffOrdersList(branchId, { limit: 100, status: orderStatusFilter || undefined })
      .then((response) => {
        if (!cancelled) setOrders(response?.items ?? []);
      })
      .catch((error) => {
        if (!cancelled) setOrdersError(error?.message ?? "Failed to load orders");
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [branchId, canView, orderStatusFilter]);

  useEffect(() => {
    if (!branchId || !canView) return;
    let cancelled = false;
    setShiftLoading(true);
    setShiftError("");

    staffPosGetCurrentShift(branchId)
      .then((data) => {
        if (!cancelled) setCurrentShift(data);
      })
      .catch((error) => {
        if (!cancelled) setShiftError(error?.message ?? "Failed to load shift");
      })
      .finally(() => {
        if (!cancelled) setShiftLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, branchId, canView]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    const query = String(orderSearch || "").toLowerCase().trim();
    if (query) {
      list = list.filter(
        (order) =>
          String(order.orderNumber || "").toLowerCase().includes(query) ||
          String(order.customer?.profile?.displayName || "").toLowerCase().includes(query)
      );
    }
    return list;
  }, [orderSearch, orders]);

  const openOrderDetail = async (id) => {
    setOrderDetail(null);
    setOrderDetailLoading(true);
    try {
      const order = await staffOrderGet(id);
      setOrderDetail(order);
    } catch {
      setOrderDetail(null);
    } finally {
      setOrderDetailLoading(false);
    }
  };

  const handleRefundSubmit = async () => {
    if (!refundOrderId || !canRefund) return;
    if (!refundReason.trim()) {
      setRefundError("Reason is required.");
      return;
    }
    setRefundSubmitting(true);
    setRefundError("");
    try {
      await staffPosCancelOrder(refundOrderId, refundReason.trim());
      setRefundOrderId(null);
      setRefundReason("");
      setReturnOrderDetail(null);
      setReturnLines([]);
      await reloadOrders();
    } catch (error) {
      setRefundError(error?.message ?? "Failed to process refund");
    } finally {
      setRefundSubmitting(false);
    }
  };

  const openLineItemReturn = async (order) => {
    setReturnSuccess(null);
    setReturnOrderDetail(null);
    setReturnLines([]);
    try {
      const detail = await staffOrderGet(order.id);
      if (!detail?.items?.length) return;
      setReturnOrderDetail(detail);
      setReturnLines(
        detail.items
          .filter((item) => item.variantId)
          .map((item) => ({
            variantId: item.variantId,
            maxQty: item.quantity,
            productName: item.product?.name,
            variantName: item.variant?.title,
            qtyToReturn: 0,
            reason: "customer_request",
          }))
      );
    } catch {
      setReturnOrderDetail(null);
    }
  };

  const updateReturnLine = (variantId, field, value) => {
    setReturnLines((prev) =>
      prev.map((line) => (line.variantId === variantId ? { ...line, [field]: value } : line))
    );
  };

  const handleLineItemReturnSubmit = async () => {
    const items = returnLines
      .filter((line) => (line.qtyToReturn || 0) > 0)
      .map((line) => ({
        variantId: line.variantId,
        quantity: Math.min(Number(line.qtyToReturn) || 0, line.maxQty),
        reason: line.reason,
      }));

    if (items.length === 0) {
      setRefundError("Select at least one item and quantity to return.");
      return;
    }

    setReturnSubmitting(true);
    setRefundError("");
    try {
      const response = await staffPosReturn({
        branchId: bidNum,
        orderId: returnOrderDetail.id,
        items,
      });
      const data = response?.data ?? response;
      setReturnSuccess({
        creditNumber: data?.posCreditNote?.creditNumber ?? data?.creditNumber,
        returnId: data?.id,
      });
      setReturnOrderDetail(null);
      setReturnLines([]);
      await reloadOrders();
      setTimeout(() => setReturnSuccess(null), 8000);
    } catch (error) {
      setRefundError(error?.message ?? "Failed to process return");
    } finally {
      setReturnSubmitting(false);
    }
  };

  const handleOpenShift = async () => {
    if (!canCashOpen) return;
    const amount = parseFloat(startingCash);
    if (Number.isNaN(amount) || amount < 0) {
      setShiftError("Starting cash must be a valid number");
      return;
    }

    setShiftLoading(true);
    setShiftError("");
    try {
      const response = await staffPosOpenShift({ branchId: bidNum, startingCash: amount });
      if (response?.success && response?.data) {
        setCurrentShift(response.data);
        setStartingCash("");
      } else {
        setShiftError(response?.message ?? "Failed to open shift");
      }
    } catch (error) {
      setShiftError(error?.message ?? "Failed to open shift");
    } finally {
      setShiftLoading(false);
    }
  };

  const loadZReport = async (shiftId) => {
    setZReportLoading(true);
    try {
      const data = await staffPosGetZReport(shiftId);
      setZReport(data);
    } catch (error) {
      console.error("Failed to load Z-report:", error);
    } finally {
      setZReportLoading(false);
    }
  };

  const handleCloseShift = async () => {
    if (!canCashClose || !currentShift) return;
    const amount = parseFloat(closingCash);
    if (Number.isNaN(amount) || amount < 0) {
      setShiftError("Closing cash must be a valid number");
      return;
    }

    setShiftLoading(true);
    setShiftError("");
    try {
      const response = await staffPosCloseShift(currentShift.id, {
        closingCash: amount,
        managerOverrideReason: managerOverrideReason || undefined,
      });
      if (response?.success && response?.data) {
        setCurrentShift(null);
        setClosingCash("");
        setManagerOverrideReason("");
        loadZReport(response.data.id);
      } else {
        setShiftError(response?.message ?? "Failed to close shift");
      }
    } catch (error) {
      setShiftError(error?.message ?? "Failed to close shift");
    } finally {
      setShiftLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (value == null) return "-";
    return Number(value).toFixed(2);
  };

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (errorCode === "forbidden" || !hasViewPermission || !canView) {
    return (
      <AccessDenied missingPerm={REQUIRED_PERM} onBack={() => router.push(`/staff/branch/${branchId}`)} />
    );
  }

  return (
    <div
      className={`container-fluid staff-pos-page-root ${
        activeTab === "sale" ? "staff-pos-page-root--sale" : "staff-pos-page-root--support"
      }`}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: [
            "@media print { body * { visibility: hidden; } .pos-invoice-print, .pos-invoice-print * { visibility: visible; } .pos-invoice-print { position: absolute; left: 0; top: 0; width: 100%; background: white; padding: 16px; } }",
            ".staff-pos-page-root{width:100%;max-width:none;margin:0;padding:0 !important;}",
            ".staff-pos-page-header{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px;padding-top:2px;}",
            ".staff-pos-page-header__meta{min-width:0;}",
            ".staff-pos-page-title{font-size:0.95rem;line-height:1.15;}",
            ".staff-pos-page-branch{font-size:11px;line-height:1.2;}",
            ".staff-pos-page-tabs{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:6px;}",
            ".staff-pos-page-tabs .btn{min-height:26px;padding:2px 9px;font-size:11px;border-radius:7px;box-shadow:none;}",
            ".staff-pos-page-root--sale{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;padding:0 0 4px !important;overflow:visible;}",
            ".staff-pos-page-root--sale .staff-pos-page-header{padding:0;flex-shrink:0;}",
            ".staff-pos-page-root--sale .staff-pos-page-tabs{margin-bottom:6px;flex-shrink:0;}",
            ".staff-pos-page-root--sale .staff-pos-sale-body{--staff-pos-workspace-height:calc(100dvh - var(--bs-topbar-height, 100px) - 62px);flex:1 1 auto;height:max(480px, var(--staff-pos-workspace-height));min-height:0;overflow:visible;}",
            ".staff-pos-page-root--sale .pos-reference-workspace{flex:1 1 auto;min-height:0;overflow:visible;}",
            ".staff-pos-page-root--support{padding:4px 0 12px !important;overflow:visible;}",
            ".staff-pos-page-root--support .staff-pos-page-header{padding-top:4px;}",
            "@media (max-height: 680px){.staff-pos-page-root--sale .staff-pos-sale-body{height:max(430px, calc(100dvh - var(--bs-topbar-height, 100px) - 54px));}}",
            "@media (max-width: 991.98px){.staff-pos-page-root--sale .staff-pos-sale-body{height:auto;min-height:0;}}",
          ]
            .filter(Boolean)
            .join(""),
        }}
      />

      <div className="staff-pos-page-header">
        <div className="staff-pos-page-header__meta">
          <div className="d-flex align-items-center gap-8 mb-1">
            <h5 className="mb-0 fw-semibold staff-pos-page-title">POS / Sales</h5>
            <span className="badge rounded-pill bg-success-subtle text-success">
              {activeTab === "sale" ? "New Sale" : "Active"}
            </span>
          </div>
          <p className="mb-0 text-secondary-light d-flex align-items-center gap-6 staff-pos-page-branch">
            <i className="ri-store-2-line" />
            <span>{branch?.name ?? "Branch POS"}</span>
          </p>
        </div>
      </div>

      <div className="staff-pos-page-tabs">
        <button
          type="button"
          className={`btn btn-sm ${activeTab === "sale" ? "btn-primary" : "btn-light border"}`}
          onClick={() => setActiveTab("sale")}
        >
          New Sale
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === "history" ? "btn-primary" : "btn-light border"}`}
          onClick={() => setActiveTab("history")}
        >
          Sales History
        </button>
        {canRefund ? (
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "refunds" ? "btn-primary" : "btn-light border"}`}
            onClick={() => setActiveTab("refunds")}
          >
            Refunds
          </button>
        ) : null}
        <button
          type="button"
          className={`btn btn-sm ${activeTab === "drawer" ? "btn-primary" : "btn-light border"}`}
          onClick={() => setActiveTab("drawer")}
        >
          Cash Drawer
        </button>
      </div>

      {activeTab === "sale" ? (
        <div className="staff-pos-sale-body">
          <PosSaleWorkspace
            branchId={branchId}
            bidNum={bidNum}
            canView={canView}
            canSell={canSell}
            canDiscountOverride={canDiscountOverride}
            onOrdersMutated={reloadOrders}
          />
        </div>
      ) : null}

      {activeTab === "history" ? (
        <Card title="Sales history" subtitle="Branch-scoped orders. View details or refund when permitted.">
          <div className="mb-16 d-flex flex-wrap gap-12">
            <LkSelect
              size="sm"
              className="radius-12"
              style={{ width: 140 }}
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </LkSelect>
            <LkInput
              type="search"
              size="sm"
              className="radius-12"
              style={{ maxWidth: 220 }}
              placeholder="Invoice / customer..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
          </div>

          {ordersError ? (
            <div className="alert alert-danger d-flex align-items-center justify-content-between">
              <span>{ordersError}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => {
                  setOrdersError("");
                  reloadOrders().catch(() => {});
                }}
              >
                Retry
              </button>
            </div>
          ) : null}

          {ordersLoading ? (
            <div className="py-24">
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4].map((row) => (
                      <tr key={row}>
                        <td><span className="placeholder col-4" /></td>
                        <td><span className="placeholder col-2" /></td>
                        <td><span className="placeholder col-3" /></td>
                        <td><span className="placeholder col-2" /></td>
                        <td><span className="placeholder col-2" /></td>
                        <td><span className="placeholder col-2" /></td>
                        <td><span className="placeholder col-2" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-center text-secondary-light mt-12">Loading...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-24 text-center text-secondary-light">No orders found.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}</td>
                      <td>{order.orderNumber ?? order.id}</td>
                      <td>{order.customer?.profile?.displayName ?? "-"}</td>
                      <td>{Number(order.totalAmount ?? 0).toFixed(2)}</td>
                      <td>{order.paymentMethod ?? "-"}</td>
                      <td>
                        <span
                          className={`badge bg-${String(order.status || "").toUpperCase() === "CANCELLED" ? "secondary" : "success"}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary me-8"
                          onClick={() => openOrderDetail(order.id)}
                        >
                          View
                        </button>
                        {canRefund && order.status !== "CANCELLED" ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => {
                              setActiveTab("refunds");
                              setRefundOrderId(order.id);
                              setRefundReason("");
                            }}
                          >
                            Refund
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {orderDetail !== undefined ? (
            <div className="modal show d-block mt-24" style={{ background: "rgba(0,0,0,0.5)" }} aria-modal="true">
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h6 className="modal-title">Order details</h6>
                    <button type="button" className="btn-close" onClick={() => setOrderDetail(undefined)} aria-label="Close" />
                  </div>
                  <div className="modal-body">
                    {orderDetailLoading ? (
                      <p className="text-secondary-light">Loading...</p>
                    ) : orderDetail ? (
                      <>
                        <p>
                          <strong>#{orderDetail.orderNumber}</strong> | {orderDetail.status} |{" "}
                          {Number(orderDetail.totalAmount || 0).toFixed(2)}
                        </p>
                        <ul className="list-unstyled mb-0">
                          {(orderDetail.items || []).map((item, index) => (
                            <li key={index}>
                              {item.product?.name ?? item.productId} x {item.quantity} @{" "}
                              {Number(item.price || 0).toFixed(2)}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="text-secondary-light mb-0">Could not load order.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {activeTab === "refunds" && canRefund ? (
        <Card title="Refunds" subtitle="Full order cancel or line-item return with restock and credit note.">
          {returnSuccess ? (
            <div className="alert alert-success d-flex align-items-center justify-content-between">
              <span>
                Return processed. Credit note: <strong>{returnSuccess.creditNumber}</strong>
              </span>
              <button type="button" className="btn btn-sm btn-outline-success" onClick={() => setReturnSuccess(null)}>
                Dismiss
              </button>
            </div>
          ) : null}

          {refundError ? (
            <div className="alert alert-danger d-flex align-items-center justify-content-between">
              <span>{refundError}</span>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setRefundError("")}>
                Dismiss
              </button>
            </div>
          ) : null}

          {returnOrderDetail ? (
            <div className="border rounded p-16 mb-16">
              <p className="mb-12">
                Line-item return for order <strong>#{returnOrderDetail.orderNumber ?? returnOrderDetail.id}</strong>
              </p>
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Ordered</th>
                      <th>Return qty</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnLines.map((line) => (
                      <tr key={line.variantId}>
                        <td>
                          {line.productName}
                          {line.variantName ? ` | ${line.variantName}` : ""}
                        </td>
                        <td>{line.maxQty}</td>
                        <td>
                          <LkInput
                            type="number"
                            min={0}
                            max={line.maxQty}
                            size="sm"
                            className="radius-12"
                            style={{ width: 70 }}
                            value={line.qtyToReturn}
                            onChange={(e) => updateReturnLine(line.variantId, "qtyToReturn", e.target.value)}
                          />
                        </td>
                        <td>
                          <LkSelect
                            size="sm"
                            className="radius-12"
                            style={{ minWidth: 140 }}
                            value={line.reason}
                            onChange={(e) => updateReturnLine(line.variantId, "reason", e.target.value)}
                          >
                            {RETURN_REASONS.map((reason) => (
                              <option key={reason.value} value={reason.value}>
                                {reason.label}
                              </option>
                            ))}
                          </LkSelect>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="d-flex gap-8 mt-12">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setReturnOrderDetail(null);
                    setReturnLines([]);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-warning btn-sm"
                  disabled={returnSubmitting || !returnLines.some((line) => (line.qtyToReturn || 0) > 0)}
                  onClick={handleLineItemReturnSubmit}
                >
                  {returnSubmitting ? "Processing..." : "Submit return"}
                </button>
              </div>
            </div>
          ) : refundOrderId ? (
            <div className="border rounded p-16 mb-16">
              <p className="mb-8">
                Full refund (cancel) order <strong>#{refundOrderId}</strong>
              </p>
              <LkFormGroup label="Reason (required)" className="text-sm">
                <LkTextarea
                  size="sm"
                  className="radius-12 mb-12"
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer request"
                />
              </LkFormGroup>
              <div className="d-flex gap-8">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setRefundOrderId(null);
                    setRefundReason("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-warning btn-sm"
                  disabled={refundSubmitting || !refundReason.trim()}
                  onClick={handleRefundSubmit}
                >
                  {refundSubmitting ? "Processing..." : "Submit full refund"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-secondary-light mb-0">
              Select an order below: use &quot;Partial return&quot; for line-item return or &quot;Full refund&quot; to cancel the order.
            </p>
          )}

          <div className="table-responsive mt-16">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(orders || [])
                  .filter((order) => order.status !== "CANCELLED")
                  .slice(0, 20)
                  .map((order) => (
                    <tr key={order.id}>
                      <td>{order.orderNumber ?? order.id}</td>
                      <td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}</td>
                      <td>{Number(order.totalAmount ?? 0).toFixed(2)}</td>
                      <td><span className="badge bg-success">{order.status}</span></td>
                      <td>
                        <button type="button" className="btn btn-sm btn-outline-primary me-8" onClick={() => openLineItemReturn(order)}>
                          Partial return
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => {
                            setRefundOrderId(order.id);
                            setRefundReason("");
                            setReturnOrderDetail(null);
                          }}
                        >
                          Full refund
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {activeTab === "drawer" ? (
        <Card title="Cash drawer" subtitle="Open and close the shift with starting and counted cash.">
          {!(canCashOpen || canCashClose) ? (
            <p className="text-secondary-light mb-0">
              You do not have cash drawer permissions (<code>cashdrawer.open</code> / <code>cashdrawer.close</code>).
            </p>
          ) : (
            <div className="row">
              {shiftError ? (
                <div className="col-12 mb-16">
                  <div className="alert alert-danger d-flex align-items-center justify-content-between">
                    <span>{shiftError}</span>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setShiftError("")}>
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="col-12 mb-24">
                <div className={`alert ${currentShift ? "alert-success" : "alert-warning"}`}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <strong>Status:</strong> {shiftLoading ? "Loading..." : currentShift ? "Shift Open" : "No Open Shift"}
                      {currentShift ? (
                        <span className="ms-16 text-sm">
                          Opened {new Date(currentShift.openedAt).toLocaleString()}
                          {currentShift.openedBy?.profile?.displayName ? ` by ${currentShift.openedBy.profile.displayName}` : ""}
                        </span>
                      ) : null}
                    </div>
                    {currentShift ? (
                      <span className="badge bg-success">Starting: {formatCurrency(currentShift.startingCash)}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {canCashOpen && !currentShift ? (
                <div className="col-md-6 mb-24">
                  <div className="border rounded p-16">
                    <h6 className="mb-16">Open Shift</h6>
                    <LkFormGroup label="Starting Cash" className="text-sm">
                      <LkInput
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={startingCash}
                        onChange={(e) => setStartingCash(e.target.value)}
                        disabled={shiftLoading}
                      />
                    </LkFormGroup>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm w-100"
                      disabled={shiftLoading || startingCash === ""}
                      onClick={handleOpenShift}
                    >
                      {shiftLoading ? "Opening..." : "Open Shift"}
                    </button>
                  </div>
                </div>
              ) : null}

              {canCashClose && currentShift ? (
                <div className="col-md-6 mb-24">
                  <div className="border rounded p-16">
                    <h6 className="mb-16">Close Shift</h6>
                    <LkFormGroup label="Closing Cash (counted)" className="text-sm">
                      <LkInput
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={closingCash}
                        onChange={(e) => setClosingCash(e.target.value)}
                        disabled={shiftLoading}
                      />
                    </LkFormGroup>
                    <LkFormGroup label="Manager Override Reason (optional)" className="text-sm">
                      <LkInput
                        type="text"
                        placeholder="e.g. Cash count discrepancy approved"
                        value={managerOverrideReason}
                        onChange={(e) => setManagerOverrideReason(e.target.value)}
                        disabled={shiftLoading}
                      />
                    </LkFormGroup>
                    <button
                      type="button"
                      className="btn btn-warning btn-sm w-100"
                      disabled={shiftLoading || closingCash === ""}
                      onClick={handleCloseShift}
                    >
                      {shiftLoading ? "Closing..." : "Close Shift"}
                    </button>
                  </div>
                </div>
              ) : null}

              {zReport || zReportLoading ? (
                <div className="col-12">
                  <div className="border rounded p-16">
                    <h6 className="mb-16">
                      Z-Report {zReportLoading ? <span className="spinner-border spinner-border-sm ms-8" /> : null}
                    </h6>
                    {zReport ? (
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                          <tbody>
                            <tr>
                              <td><strong>Shift ID</strong></td>
                              <td>{zReport.shiftId}</td>
                            </tr>
                            <tr>
                              <td><strong>Period</strong></td>
                              <td>
                                {new Date(zReport.openedAt).toLocaleString()} -{" "}
                                {zReport.closedAt ? new Date(zReport.closedAt).toLocaleString() : "Open"}
                              </td>
                            </tr>
                            <tr>
                              <td><strong>Starting Cash</strong></td>
                              <td>{formatCurrency(zReport.startingCash)}</td>
                            </tr>
                            <tr>
                              <td><strong>Closing Cash</strong></td>
                              <td>{formatCurrency(zReport.closingCash)}</td>
                            </tr>
                            <tr
                              className={
                                zReport.variance && zReport.variance !== 0
                                  ? zReport.variance > 0
                                    ? "table-success"
                                    : "table-danger"
                                  : ""
                              }
                            >
                              <td><strong>Variance</strong></td>
                              <td>{formatCurrency(zReport.variance)}</td>
                            </tr>
                            <tr className="table-primary">
                              <td><strong>Sales Count</strong></td>
                              <td>{zReport.salesCount}</td>
                            </tr>
                            <tr className="table-primary">
                              <td><strong>Sales Total</strong></td>
                              <td>{formatCurrency(zReport.salesTotal)}</td>
                            </tr>
                            <tr>
                              <td><strong>Tax Total</strong></td>
                              <td>{formatCurrency(zReport.taxTotal)}</td>
                            </tr>
                            <tr>
                              <td><strong>Discount Total</strong></td>
                              <td>{formatCurrency(zReport.discountTotal)}</td>
                            </tr>
                            <tr>
                              <td><strong>Refunds Count</strong></td>
                              <td>{zReport.refundsCount}</td>
                            </tr>
                            <tr>
                              <td><strong>Refunds Total</strong></td>
                              <td>{formatCurrency(zReport.refundsTotal)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
