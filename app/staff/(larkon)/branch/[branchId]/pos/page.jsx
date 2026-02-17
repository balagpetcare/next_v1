"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import LkFormGroup from "@larkon-ui/components/LkFormGroup";
import LkInput from "@larkon-ui/components/LkInput";
import LkSelect from "@larkon-ui/components/LkSelect";
import LkTextarea from "@larkon-ui/components/LkTextarea";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffPosProducts,
  staffPosSale,
  staffPosReceipt,
  staffOrdersList,
  staffOrderGet,
  staffOrderCancel,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import PermissionGate from "@/src/components/branch/PermissionGate";

const REQUIRED_PERM = "pos.view";
const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "MOBILE", label: "Mobile wallet" },
  { value: "ONLINE", label: "Online" },
];
const DISCOUNT_PRESETS = [0, 5, 10, 15, 20];

export default function StaffBranchPosPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const [activeTab, setActiveTab] = useState("sale"); // sale | history | refunds | drawer
  const permissions = myAccess?.permissions ?? [];
  const canView = permissions.includes(REQUIRED_PERM);
  const canSell = permissions.includes("pos.sell");
  const canRefund = permissions.includes("pos.refund");
  const canDiscountOverride = permissions.includes("pos.discount.override");
  const canCashOpen = permissions.includes("cashdrawer.open");
  const canCashClose = permissions.includes("cashdrawer.close");

  // New Sale state
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState([]); // { productId, variantId?, productName, variantName?, sku, quantity, price, key }
  const [customerId, setCustomerId] = useState(""); // optional
  const [discountPreset, setDiscountPreset] = useState(0);
  const [discountCustom, setDiscountCustom] = useState(""); // only if canDiscountOverride
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [saleLoading, setSaleLoading] = useState(false);
  const [saleError, setSaleError] = useState("");
  const [saleSuccess, setSaleSuccess] = useState(null); // { orderNumber, orderId }
  const [receiptData, setReceiptData] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  // Sales History state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderDetail, setOrderDetail] = useState(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);

  // Refund state
  const [refundOrderId, setRefundOrderId] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundError, setRefundError] = useState("");

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  // Load products for New Sale
  useEffect(() => {
    if (!branchId || !canView) return;
    let cancelled = false;
    staffPosProducts(branchId)
      .then((data) => { if (!cancelled) setProducts(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [branchId, canView]);

  // Load orders for History / Refunds
  useEffect(() => {
    if (!branchId || !canView) return;
    let cancelled = false;
    setOrdersLoading(true);
    setOrdersError("");
    staffOrdersList(branchId, { limit: 100, status: orderStatusFilter || undefined })
      .then((res) => { if (!cancelled) setOrders(res.items ?? []); })
      .catch((e) => { if (!cancelled) setOrdersError(e?.message ?? "Failed to load orders"); })
      .finally(() => { if (!cancelled) setOrdersLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, canView, orderStatusFilter]);

  const flattenProducts = useMemo(() => {
    const out = [];
    (products || []).forEach((p) => {
      const name = p.name ?? "";
      if ((p.variants || []).length === 0) {
        const stock = p.baseStock ?? 0;
        if (stock > 0) out.push({ productId: p.id, variantId: null, name, sku: p.sku ?? p.id, title: "Standard", stock, product: p });
      } else {
        (p.variants || []).forEach((v) => {
          const stock = v.stock ?? 0;
          if (stock > 0) out.push({ productId: p.id, variantId: v.id, name, sku: v.sku ?? v.id, title: v.title ?? "", stock, product: p, variant: v });
        });
      }
    });
    return out;
  }, [products]);

  const searchFiltered = useMemo(() => {
    const q = (productSearch || "").toLowerCase().trim();
    if (!q) return flattenProducts.slice(0, 30);
    return flattenProducts.filter(
      (x) =>
        (x.name || "").toLowerCase().includes(q) ||
        (x.sku || "").toLowerCase().includes(q) ||
        (x.title || "").toLowerCase().includes(q)
    ).slice(0, 30);
  }, [flattenProducts, productSearch]);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + (Number(l.price) || 0) * (Number(l.quantity) || 0), 0), [cart]);
  const discountPercent = canDiscountOverride && discountCustom !== "" ? parseFloat(discountCustom) : discountPreset;
  const discountAmount = (subtotal * (discountPercent / 100)) || 0;
  const taxAmount = 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);

  const addToCart = (item) => {
    const key = `${item.productId}-${item.variantId ?? "b"}-${Date.now()}`;
    setCart((prev) => [...prev, {
      key,
      productId: item.productId,
      variantId: item.variantId ?? undefined,
      productName: item.name,
      variantName: item.title,
      sku: item.sku,
      quantity: 1,
      price: 0,
    }]);
  };

  const updateCartLine = (key, field, value) => {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  };

  const removeCartLine = (key) => setCart((prev) => prev.filter((l) => l.key !== key));

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    if (!canSell) return;
    if (cart.length === 0) { setSaleError("Add at least one item."); return; }
    const bid = parseInt(branchId, 10);
    if (!bid) { setSaleError("Invalid branch."); return; }
    const items = cart.map((l) => ({
      productId: l.productId,
      variantId: l.variantId || undefined,
      quantity: parseInt(String(l.quantity), 10) || 1,
      price: grandTotal / cart.length, // spread total so backend gets correct total (discount applied proportionally)
    }));
    if (items.some((i) => !i.productId || i.quantity < 1)) { setSaleError("Invalid cart."); return; }
    const totalToSend = grandTotal;
    const ratio = totalToSend / subtotal || 1;
    const adjustedItems = cart.map((l) => {
      const lineTotal = (Number(l.price) || 0) * (Number(l.quantity) || 0);
      const newPrice = subtotal > 0 ? (lineTotal * ratio) / (Number(l.quantity) || 1) : 0;
      return { productId: l.productId, variantId: l.variantId, quantity: parseInt(String(l.quantity), 10) || 1, price: Math.round(newPrice * 100) / 100 };
    });
    setSaleLoading(true);
    setSaleError("");
    try {
      const res = await staffPosSale({
        branchId: bid,
        items: adjustedItems,
        paymentMethod,
        customerId: customerId ? parseInt(customerId, 10) : undefined,
        notes: notes || "POS Sale",
      });
      const order = res?.data ?? res;
      setSaleSuccess({ orderNumber: order?.orderNumber ?? order?.id, orderId: order?.id });
      setCart([]);
      setNotes("");
      setDiscountPreset(0);
      setDiscountCustom("");
      setTimeout(() => setSaleSuccess(null), 8000);
      const listRes = await staffOrdersList(branchId, { limit: 100 });
      setOrders(listRes.items ?? []);
    } catch (err) {
      setSaleError(err?.message ?? "Failed to complete sale");
    } finally {
      setSaleLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    let list = orders;
    const q = (orderSearch || "").toLowerCase().trim();
    if (q) {
      list = list.filter(
        (o) =>
          (o.orderNumber || "").toLowerCase().includes(q) ||
          (o.customer?.profile?.displayName || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, orderSearch]);

  const openOrderDetail = async (id) => {
    setOrderDetail(null);
    setOrderDetailLoading(true);
    try {
      const o = await staffOrderGet(id);
      setOrderDetail(o);
    } catch {
      setOrderDetail(null);
    } finally {
      setOrderDetailLoading(false);
    }
  };

  const handleRefundSubmit = async () => {
    if (!refundOrderId || !canRefund) return;
    if (!refundReason.trim()) { setRefundError("Reason is required."); return; }
    setRefundSubmitting(true);
    setRefundError("");
    try {
      await staffOrderCancel(refundOrderId, refundReason.trim());
      setRefundOrderId(null);
      setRefundReason("");
      const res = await staffOrdersList(branchId, { limit: 100 });
      setOrders(res.items ?? []);
    } catch (err) {
      setRefundError(err?.message ?? "Failed to process refund");
    } finally {
      setRefundSubmitting(false);
    }
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
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <div className="d-flex align-items-center gap-12 mb-24">
        <Link href={`/staff/branch/${branchId}`} className="btn btn-outline-secondary btn-sm">
          ← Branch
        </Link>
        <h5 className="mb-0">POS / Sales</h5>
      </div>

      <ul className="nav nav-tabs mb-16">
        <li className="nav-item">
          <button type="button" className={`nav-link ${activeTab === "sale" ? "active" : ""}`} onClick={() => setActiveTab("sale")}>
            New Sale
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
            Sales History
          </button>
        </li>
        {canRefund && (
          <li className="nav-item">
            <button type="button" className={`nav-link ${activeTab === "refunds" ? "active" : ""}`} onClick={() => setActiveTab("refunds")}>
              Refunds
            </button>
          </li>
        )}
        <li className="nav-item">
          <button type="button" className={`nav-link ${activeTab === "drawer" ? "active" : ""}`} onClick={() => setActiveTab("drawer")}>
            Cash Drawer
          </button>
        </li>
      </ul>

      {activeTab === "sale" && (
        <>
          {saleSuccess && (
            <div className="alert alert-success d-flex align-items-center justify-content-between flex-wrap gap-8">
              <span>Sale completed. Order #{saleSuccess.orderNumber}</span>
              <div className="d-flex gap-8">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success"
                  onClick={async () => {
                    if (!saleSuccess?.orderId) return;
                    setReceiptLoading(true);
                    setReceiptData(null);
                    try {
                      const r = await staffPosReceipt(saleSuccess.orderId);
                      setReceiptData(r);
                    } catch {
                      setReceiptData(false);
                    } finally {
                      setReceiptLoading(false);
                    }
                  }}
                >
                  {receiptLoading ? "Loading..." : "View receipt"}
                </button>
                <button type="button" className="btn btn-sm btn-outline-success" onClick={() => setSaleSuccess(null)}>Dismiss</button>
              </div>
            </div>
          )}
          {receiptData !== null && receiptData !== undefined && (
            <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)" }} aria-modal="true">
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h6 className="modal-title">Receipt</h6>
                    <button type="button" className="btn-close" onClick={() => { setReceiptData(null); }} aria-label="Close" />
                  </div>
                  <div className="modal-body">
                    {receiptData === false ? (
                      <p className="text-secondary-light mb-0">Receipt not available.</p>
                    ) : (
                      <div className="small">
                        <p className="fw-semibold">#{receiptData?.orderNumber ?? "—"}</p>
                        <p className="text-secondary-light">{receiptData?.date ? new Date(receiptData.date).toLocaleString() : ""}</p>
                        <p>Total: {Number(receiptData?.total ?? 0).toFixed(2)} · {receiptData?.paymentMethod ?? ""}</p>
                        <ul className="list-unstyled mb-0">
                          {(receiptData?.items || []).map((item, i) => (
                            <li key={i}>{item.product} × {item.quantity} @ {Number(item.price || 0).toFixed(2)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {saleError && (
            <div className="alert alert-danger d-flex align-items-center justify-content-between">
              <span>{saleError}</span>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setSaleError("")}>Dismiss</button>
            </div>
          )}

          <div className="row g-20">
            <div className="col-lg-7">
              <Card title="Products" subtitle="Search by name or SKU, then add to cart">
                <LkInput
                  type="search"
                  size="sm"
                  className="radius-12 mb-16"
                  placeholder="Search product / SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                {searchFiltered.length === 0 ? (
                  <p className="text-secondary-light mb-0">No products with stock found. Try another search.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Product / SKU</th>
                          <th>Stock</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchFiltered.slice(0, 15).map((item) => (
                          <tr key={`${item.productId}-${item.variantId ?? "b"}`}>
                            <td>
                              <span className="fw-semibold">{item.name}</span>
                              <span className="text-secondary-light text-sm d-block">{item.sku} {item.title ? `· ${item.title}` : ""}</span>
                            </td>
                            <td>{item.stock}</td>
                            <td>
                              <PermissionGate requiredPerm="pos.sell" mode="disable" permissions={permissions}>
                                <button type="button" className="btn btn-sm btn-primary" onClick={() => addToCart(item)}>
                                  Add
                                </button>
                              </PermissionGate>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <Card title="Cart" subtitle="Adjust qty and unit price; remove if needed">
                {cart.length === 0 ? (
                  <p className="text-secondary-light mb-0">Cart is empty. Add products above.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Unit price</th>
                          <th>Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((l) => (
                          <tr key={l.key}>
                            <td><span className="fw-semibold">{l.productName}</span>{l.variantName ? ` · ${l.variantName}` : ""}</td>
                            <td>
                              <LkInput
                                type="number"
                                min={1}
                                size="sm"
                                className="radius-12"
                                style={{ width: 70 }}
                                value={l.quantity}
                                onChange={(e) => updateCartLine(l.key, "quantity", e.target.value)}
                              />
                            </td>
                            <td>
                              <LkInput
                                type="number"
                                min={0}
                                step="0.01"
                                size="sm"
                                className="radius-12"
                                style={{ width: 90 }}
                                value={l.price}
                                onChange={(e) => updateCartLine(l.key, "price", e.target.value)}
                              />
                            </td>
                            <td>{((Number(l.price) || 0) * (Number(l.quantity) || 0)).toFixed(2)}</td>
                            <td>
                              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeCartLine(l.key)}>×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            <div className="col-lg-5">
              <Card title="Checkout" subtitle="Discount and payment">
                <form onSubmit={handleSaleSubmit}>
                  <LkFormGroup label="Customer (optional)" className="text-sm mb-16">
                    <LkInput
                      type="text"
                      size="sm"
                      className="radius-12"
                      placeholder="Customer ID or leave blank"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                    />
                  </LkFormGroup>
                  <div className="mb-16">
                    <label className="form-label text-sm">Discount</label>
                    <div className="d-flex flex-wrap gap-8 mb-8">
                      {DISCOUNT_PRESETS.map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          className={`btn btn-sm ${discountPreset === pct && !(canDiscountOverride && discountCustom !== "") ? "btn-primary" : "btn-outline-secondary"}`}
                          onClick={() => { setDiscountPreset(pct); setDiscountCustom(""); }}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                    {canDiscountOverride ? (
                      <LkInput
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        size="sm"
                        className="radius-12"
                        placeholder="Custom %"
                        value={discountCustom}
                        onChange={(e) => setDiscountCustom(e.target.value)}
                      />
                    ) : (
                      <p className="text-secondary-light small mb-0">Custom discount requires pos.discount.override.</p>
                    )}
                  </div>
                  <LkFormGroup label="Payment method" className="text-sm mb-16">
                    <LkSelect
                      size="sm"
                      className="radius-12"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </LkSelect>
                  </LkFormGroup>
                  <LkFormGroup label="Notes (optional)" className="text-sm mb-16">
                    <LkTextarea
                      size="sm"
                      className="radius-12"
                      rows={2}
                      placeholder="Notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </LkFormGroup>
                  <div className="border-top pt-16 mb-16">
                    <div className="d-flex justify-content-between text-sm"><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
                    <div className="d-flex justify-content-between text-sm"><span>Discount ({discountPercent}%)</span><span>-{discountAmount.toFixed(2)}</span></div>
                    {taxAmount > 0 && <div className="d-flex justify-content-between text-sm"><span>Tax</span><span>{taxAmount.toFixed(2)}</span></div>}
                    <div className="d-flex justify-content-between fw-semibold mt-8"><span>Grand total</span><span>{grandTotal.toFixed(2)}</span></div>
                  </div>
                  <PermissionGate requiredPerm="pos.sell" mode="disable" permissions={permissions}>
                    <button type="submit" className="btn btn-primary w-100" disabled={saleLoading || cart.length === 0}>
                      {saleLoading ? "Processing..." : "Complete sale"}
                    </button>
                  </PermissionGate>
                </form>
              </Card>
            </div>
          </div>
        </>
      )}

      {activeTab === "history" && (
        <Card title="Sales history" subtitle="Branch-scoped orders. View details or refund (if permitted).">
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
          {ordersError && (
            <div className="alert alert-danger d-flex align-items-center justify-content-between">
              <span>{ordersError}</span>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => { setOrdersError(""); const p = branchId; staffOrdersList(p, { limit: 100 }).then((r) => setOrders(r.items ?? [])).catch(() => {}); }}>Retry</button>
            </div>
          )}
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
                    {[1, 2, 3, 4].map((i) => (
                      <tr key={i}>
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
                  {filteredOrders.map((o) => (
                    <tr key={o.id}>
                      <td>{o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}</td>
                      <td>{o.orderNumber ?? o.id}</td>
                      <td>{o.customer?.profile?.displayName ?? "—"}</td>
                      <td>{Number(o.totalAmount ?? 0).toFixed(2)}</td>
                      <td>{o.paymentMethod ?? "—"}</td>
                      <td><span className={`badge bg-${(o.status || "").toUpperCase() === "CANCELLED" ? "secondary" : "success"}`}>{o.status}</span></td>
                      <td>
                        <button type="button" className="btn btn-sm btn-outline-primary me-8" onClick={() => openOrderDetail(o.id)}>View</button>
                        {canRefund && o.status !== "CANCELLED" && (
                          <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => { setActiveTab("refunds"); setRefundOrderId(o.id); setRefundReason(""); }}>Refund</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {orderDetail !== undefined && (
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
                        <p><strong>#{orderDetail.orderNumber}</strong> · {orderDetail.status} · {Number(orderDetail.totalAmount || 0).toFixed(2)}</p>
                        <ul className="list-unstyled mb-0">
                          {(orderDetail.items || []).map((item, i) => (
                            <li key={i}>{item.product?.name ?? item.productId} × {item.quantity} @ {Number(item.price || 0).toFixed(2)}</li>
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
          )}
        </Card>
      )}

      {activeTab === "refunds" && canRefund && (
        <Card title="Refunds" subtitle="Full order refund (cancel). Reason required. Partial refund not yet supported by backend.">
          {refundError && (
            <div className="alert alert-danger d-flex align-items-center justify-content-between">
              <span>{refundError}</span>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setRefundError("")}>Dismiss</button>
            </div>
          )}
          {refundOrderId ? (
            <div className="border rounded p-16 mb-16">
              <p className="mb-8">Refunding order <strong>#{refundOrderId}</strong></p>
              <LkFormGroup label="Reason (required)" className="text-sm">
                <LkTextarea
                  size="sm"
                  className="radius-12 mb-12"
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer request, wrong item"
                />
              </LkFormGroup>
              <div className="d-flex gap-8">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setRefundOrderId(null); setRefundReason(""); }}>Cancel</button>
                <button type="button" className="btn btn-warning btn-sm" disabled={refundSubmitting || !refundReason.trim()} onClick={handleRefundSubmit}>
                  {refundSubmitting ? "Processing..." : "Submit refund"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-secondary-light mb-0">Select an order from Sales History and click Refund, or choose a completed order below.</p>
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
                {(orders || []).filter((o) => o.status !== "CANCELLED").slice(0, 20).map((o) => (
                  <tr key={o.id}>
                    <td>{o.orderNumber ?? o.id}</td>
                    <td>{o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}</td>
                    <td>{Number(o.totalAmount ?? 0).toFixed(2)}</td>
                    <td><span className="badge bg-success">{o.status}</span></td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => { setRefundOrderId(o.id); setRefundReason(""); }}>Refund</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "drawer" && (
        <Card title="Cash drawer" subtitle="Open/close shift with starting and counted cash.">
          {!(canCashOpen || canCashClose) ? (
            <p className="text-secondary-light mb-0">You do not have cash drawer permissions (cashdrawer.open / cashdrawer.close).</p>
          ) : (
            <div className="alert alert-info">
              <p className="mb-0">Cash drawer endpoints are not implemented in the backend yet. When available, open drawer will record starting cash; close drawer will record counted cash and show any mismatch.</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
