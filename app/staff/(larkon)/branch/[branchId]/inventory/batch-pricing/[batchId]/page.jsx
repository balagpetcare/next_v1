"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Alert, Badge, Button, Form, Spinner } from "react-bootstrap";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffShopBatchDetail, staffShopBatchUpdate } from "@/lib/api";

const REQUIRED_PERM = "inventory.batch.pricing";

function toDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function money(value) {
  if (value == null || value === "") return "-";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "-";
}

function text(value) {
  return value == null || value === "" ? "-" : String(value);
}

function statusBadge(status) {
  if (status === "EXPIRED") return <Badge bg="danger">Expired</Badge>;
  if (status === "OUT_OF_STOCK") return <Badge bg="secondary">Blocked</Badge>;
  if (status === "NEAR") return <Badge bg="warning" text="dark">Near expiry</Badge>;
  return <Badge bg="success">OK</Badge>;
}

function SummaryItem({ label, value, mono = false }) {
  return (
    <div className="d-flex justify-content-between gap-3 border-bottom py-2">
      <span className="text-muted small">{label}</span>
      <span className={`small text-end ${mono ? "font-monospace" : "fw-semibold"}`}>{value}</span>
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div className="card radius-12 h-100">
      <div className="card-header py-2">
        <span className="small fw-semibold">{title}</span>
      </div>
      <div className="card-body py-2">{children}</div>
    </div>
  );
}

export default function StaffBatchPricingEditPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const batchId = useMemo(() => String(params?.batchId ?? ""), [params]);
  const lotId = Number(batchId);
  const listHref = `/staff/branch/${branchId}/inventory/batch-pricing`;
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [sellsAtRulePrice, setSellsAtRulePrice] = useState(true);
  const [reason, setReason] = useState("");
  const [initial, setInitial] = useState({ expiryDate: "", sellPrice: "", sellsAtRulePrice: true });

  const canEdit = useMemo(() => {
    const p = myAccess?.permissions ?? [];
    const role = String(myAccess?.role || "").toUpperCase();
    return role === "BRANCH_MANAGER" && Array.isArray(p) && p.includes(REQUIRED_PERM);
  }, [myAccess]);

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  const load = useCallback(async () => {
    if (!branchId || !Number.isFinite(lotId) || lotId <= 0 || !canEdit) return;
    setLoading(true);
    setError("");
    try {
      const res = await staffShopBatchDetail(branchId, lotId);
      const d = res?.data ?? null;
      setDetail(d);
      const nextExpiry = toDateInput(d?.lot?.expDate);
      const nextPrice =
        d?.pricing?.batchSellPrice != null
          ? String(d.pricing.batchSellPrice)
          : d?.pricing?.currentSellingPrice != null
            ? String(d.pricing.currentSellingPrice)
            : "";
      const nextSellsAt = d?.pricing?.sellsAtRulePrice !== false;
      setExpiryDate(nextExpiry);
      setSellPrice(nextPrice);
      setSellsAtRulePrice(nextSellsAt);
      setInitial({ expiryDate: nextExpiry, sellPrice: nextPrice, sellsAtRulePrice: nextSellsAt });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load batch detail");
    } finally {
      setLoading(false);
    }
  }, [branchId, canEdit, lotId]);

  useEffect(() => {
    if (ctxLoading) return;
    if (canEdit) void load();
    else setLoading(false);
  }, [ctxLoading, canEdit, load]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      setError("Reason is required (at least 3 characters).");
      return;
    }

    const body = { reason: trimmedReason };
    const expiryChanged = expiryDate !== initial.expiryDate;
    const priceChanged = sellPrice.trim() !== initial.sellPrice || sellsAtRulePrice !== initial.sellsAtRulePrice;

    if (expiryChanged) body.expDate = expiryDate.trim() || null;
    if (priceChanged) {
      const parsed = Number(String(sellPrice).replace(/,/g, ""));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError("Enter a valid batch sell price greater than 0.");
        return;
      }
      body.sellPrice = parsed;
      body.sellsAtRulePrice = sellsAtRulePrice;
    }
    if (!expiryChanged && !priceChanged) {
      setError("Change expiry date, batch sell price, or selling-price mode before saving.");
      return;
    }

    setSaving(true);
    try {
      const res = await staffShopBatchUpdate(branchId, lotId, body);
      const d = res?.data ?? null;
      setDetail(d);
      const nextExpiry = toDateInput(d?.lot?.expDate);
      const nextPrice = d?.pricing?.batchSellPrice != null ? String(d.pricing.batchSellPrice) : String(body.sellPrice ?? sellPrice);
      const nextSellsAt = d?.pricing?.sellsAtRulePrice !== false;
      setExpiryDate(nextExpiry);
      setSellPrice(nextPrice);
      setSellsAtRulePrice(nextSellsAt);
      setInitial({ expiryDate: nextExpiry, sellPrice: nextPrice, sellsAtRulePrice: nextSellsAt });
      setReason("");
      setSuccess("Batch pricing saved. POS and barcode pricing will use the updated rule on the next resolution.");
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (ctxLoading || loading) {
    return <p className="text-muted small p-3">Loading...</p>;
  }
  if (errorCode === "forbidden" || !branch) return <AccessDenied />;
  if (!hasViewPermission) return <AccessDenied />;
  if (!canEdit) {
    return (
      <AccessDenied message="Only the branch manager (role BRANCH_MANAGER) with inventory batch pricing permission can use this page." />
    );
  }

  const pricing = detail?.pricing ?? {};
  const product = detail?.product ?? {};
  const variant = detail?.variant ?? {};
  const lot = detail?.lot ?? {};
  const stock = detail?.stock ?? {};
  const location = detail?.location ?? {};

  return (
    <div className="dashboard-main-body">
      <BranchHeader branch={branch} title="Edit batch pricing" />
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <nav aria-label="breadcrumb" className="small">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <Link href={`/staff/branch/${branchId}/inventory`}>Inventory</Link>
            </li>
            <li className="breadcrumb-item">
              <Link href={listHref}>Batch pricing</Link>
            </li>
            <li className="breadcrumb-item active">Edit batch pricing</li>
          </ol>
        </nav>
        <Button as={Link} href={listHref} variant="outline-secondary" size="sm">
          Back to list
        </Button>
      </div>

      {error && <Alert variant="danger" className="py-2">{error}</Alert>}
      {success && <Alert variant="success" className="py-2">{success}</Alert>}
      {!detail?.batchPricingEnabled && (
        <Alert variant="warning" className="py-2 small">
          Batch pricing is disabled in owner pricing policy. This page can save the rule, but POS will only apply it
          when batch pricing resolution is enabled.
        </Alert>
      )}

      <div className="row g-3 mb-3">
        <div className="col-lg-4">
          <InfoCard title="Product summary">
            <SummaryItem label="Product" value={text(product.name)} />
            <SummaryItem label="Pack / size" value={text(variant.packDisplay || variant.title)} />
            <SummaryItem label="SKU" value={text(variant.sku)} mono />
            <SummaryItem label="Barcode" value={text(variant.barcode)} mono />
            <SummaryItem label="Brand" value={text(product.brand?.name)} />
            <SummaryItem label="Category" value={text(product.category?.name)} />
          </InfoCard>
        </div>
        <div className="col-lg-4">
          <InfoCard title="Batch / lot summary">
            <SummaryItem label="Batch / lot" value={text(lot.lotCode || lot.id)} mono />
            <SummaryItem label="Expiry date" value={expiryDate || "-"} />
            <SummaryItem label="Current SHOP qty" value={text(stock.availableQty)} />
            <SummaryItem label="Location" value={`${text(location.name)} (#${text(location.id)})`} />
            <SummaryItem label="Location type" value={text(location.type)} />
            <div className="d-flex justify-content-between gap-3 py-2">
              <span className="text-muted small">Status</span>
              <span>{statusBadge(lot.status)}</span>
            </div>
          </InfoCard>
        </div>
        <div className="col-lg-4">
          <InfoCard title="Pricing summary">
            <SummaryItem label="Catalog/base sell price" value={money(pricing.catalogBasePrice)} />
            <SummaryItem label="Current batch sell price" value={money(pricing.batchSellPrice)} />
            <SummaryItem label="Current resolved sell price" value={money(pricing.currentSellingPrice)} />
            <SummaryItem label="Min price" value={money(pricing.minPrice)} />
            <SummaryItem label="Max price" value={money(pricing.maxPrice)} />
            <SummaryItem label="MRP" value={money(pricing.mrp)} />
            <SummaryItem label="Enterprise pricing" value={pricing.enterpriseListResolutionEnabled ? "Enabled" : "Disabled"} />
          </InfoCard>
        </div>
      </div>

      <div className="card radius-12">
        <div className="card-header">
          <span className="small fw-semibold">Safe update</span>
        </div>
        <div className="card-body">
          <form onSubmit={onSubmit} className="row g-3">
            <div className="col-md-4">
              <Form.Group>
                <Form.Label className="small">Expiry date</Form.Label>
                <Form.Control type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </Form.Group>
            </div>
            <div className="col-md-4">
              <Form.Group>
                <Form.Label className="small">Batch sell price</Form.Label>
                <Form.Control
                  type="text"
                  inputMode="decimal"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="Example: 125.00"
                />
                <Form.Text className="text-muted">Validated and clamped by catalog min/max/MRP when configured.</Form.Text>
              </Form.Group>
            </div>
            <div className="col-md-4 d-flex align-items-center">
              <Form.Check
                type="checkbox"
                id="sellsAtRulePrice"
                label="Use this as the line selling price"
                checked={sellsAtRulePrice}
                onChange={(e) => setSellsAtRulePrice(e.target.checked)}
              />
            </div>
            <div className="col-12">
              <Form.Group>
                <Form.Label className="small">Reason / audit note</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this expiry date or batch price being changed?"
                />
              </Form.Group>
            </div>
            <div className="col-12 d-flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
              <Button as={Link} href={listHref} variant="outline-secondary">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
