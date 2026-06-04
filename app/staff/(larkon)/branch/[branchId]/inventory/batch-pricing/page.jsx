"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Alert, Badge, Button, Spinner, Table } from "react-bootstrap";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffShopBatchesList } from "@/lib/api";
import BarcodePrintButton from "@/app/_components/barcode/BarcodePrintButton";
import { saveStaffBulkLabelSession } from "@/lib/barcodeLabelsApi";

const REQUIRED_PERM = "inventory.batch.pricing";

function statusBadge(st) {
  if (st === "EXPIRED") return <Badge bg="danger" className="text-white">Expired</Badge>;
  if (st === "NEAR") return <Badge bg="warning" className="text-dark">Near expiry</Badge>;
  if (st === "OUT_OF_STOCK") return <Badge bg="secondary">Depleted</Badge>;
  return <Badge bg="success" className="text-white">OK</Badge>;
}

function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

function fmtMoney(n) {
  const x = Number(n);
  if (n == null || !Number.isFinite(x)) return "\u2014";
  return x.toFixed(2);
}

function getRowSellPrice(row) {
  const candidates = [
    row?.batchSellPrice,
    row?.resolvedSellPrice,
    row?.effectiveSellPrice,
    row?.sellPrice,
    row?.catalogSellPrice,
    row?.mrp,
  ];
  for (const candidate of candidates) {
    const n = Number(candidate);
    if (candidate != null && Number.isFinite(n)) return n;
  }
  return null;
}

function priceSourceLabel(source) {
  if (source === "BATCH") return "Batch";
  if (source === "ENTERPRISE") return "Enterprise";
  if (source === "CATALOG") return "Catalog";
  if (source === "MRP") return "MRP";
  return "";
}

function getRowLotId(row) {
  const n = Number(row?.lotId ?? row?.stockLotId ?? row?.stockLot?.id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function StaffBatchPricingPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const [rows, setRows] = useState([]);
  const [selectedLotIds, setSelectedLotIds] = useState(() => new Set());
  const [batchPricingEnabled, setBatchPricingEnabled] = useState(true);
  const [shopLocationId, setShopLocationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canEdit = useMemo(() => {
    const p = myAccess?.permissions ?? [];
    const role = String(myAccess?.role || "").toUpperCase();
    return role === "BRANCH_MANAGER" && Array.isArray(p) && p.includes(REQUIRED_PERM);
  }, [myAccess]);

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  const load = useCallback(async () => {
    if (!branchId || !canEdit) return;
    setLoading(true);
    setError("");
    try {
      const res = await staffShopBatchesList(branchId);
      const d = res?.data;
      setBatchPricingEnabled(d?.batchPricingEnabled !== false);
      setShopLocationId(d?.shopLocationId ?? null);
      setRows(Array.isArray(d?.items) ? d.items : []);
      setSelectedLotIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load batches");
    } finally {
      setLoading(false);
    }
  }, [branchId, canEdit]);

  useEffect(() => {
    if (ctxLoading) return;
    if (canEdit) void load();
    else setLoading(false);
  }, [ctxLoading, canEdit, load]);

  const selectableLotIds = useMemo(
    () => rows.map((row) => getRowLotId(row)).filter((lotId) => lotId != null),
    [rows]
  );

  if (ctxLoading) return <p className="text-muted small p-3">Loading...</p>;
  if (errorCode === "forbidden" || !branch) return <AccessDenied />;
  if (!hasViewPermission) return <AccessDenied />;
  if (!canEdit) {
    return (
      <AccessDenied message="Only the branch manager (role BRANCH_MANAGER) with inventory batch pricing permission can use this page." />
    );
  }

  return (
    <div className="dashboard-main-body">
      <BranchHeader branch={branch} title="Batch pricing & expiry" />
      <nav aria-label="breadcrumb" className="mb-2 small">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link href={`/staff/branch/${branchId}/inventory`}>Inventory</Link>
          </li>
          <li className="breadcrumb-item active">Batch pricing</li>
        </ol>
      </nav>

      {!batchPricingEnabled && (
        <Alert variant="warning" className="py-2 small">
          Organization policy has batch pricing features disabled. Enable <strong>batch pricing</strong> in owner pricing
          settings so point-of-sale can apply these batch sell rules.
        </Alert>
      )}

      {error && <Alert variant="danger" className="py-2">{error}</Alert>}

      {shopLocationId != null && (
        <p className="text-muted small mb-2">
          Showing SHOP location stock (location #{shopLocationId}). Prices are resolved with enterprise rules when
          enabled; expired lots cannot be sold until expiry is set to a future date.
        </p>
      )}

      <div className="card radius-12">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <span className="small fw-semibold">Batches on shop floor</span>
          <div className="d-flex align-items-center gap-2">
            {selectedLotIds.size > 0 ? (
              <Button
                type="button"
                variant="outline-secondary"
                size="sm"
                onClick={() => {
                  const bid = Number(branchId);
                  saveStaffBulkLabelSession(bid, {
                    branchId: bid,
                    items: [...selectedLotIds].map((lotId) => ({ type: "BATCH", lotId: Number(lotId), copies: 1 })),
                  });
                  window.location.assign(`/staff/branch/${branchId}/inventory/labels/bulk`);
                }}
              >
                Print selected ({selectedLotIds.size})
              </Button>
            ) : null}
            {loading && <Spinner animation="border" size="sm" className="ms-2" aria-label="Loading" />}
          </div>
        </div>
        <div className="table-responsive">
          <Table hover size="sm" className="mb-0 align-middle">
            <thead className="bg-light small">
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    aria-label="Select all"
                    checked={selectableLotIds.length > 0 && selectableLotIds.every((lotId) => selectedLotIds.has(lotId))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLotIds(new Set(selectableLotIds));
                      } else {
                        setSelectedLotIds(new Set());
                      }
                    }}
                  />
                </th>
                <th>Product</th>
                <th>Pack / size</th>
                <th>SKU</th>
                <th>Batch</th>
                <th>Expiry</th>
                <th className="text-end">Qty (SHOP)</th>
                <th className="text-end">Sell price</th>
                <th>Status</th>
                <th />
                <th className="text-nowrap">Print</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-muted p-3 small">
                    No batch rows at the branch SHOP location.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const lotId = getRowLotId(r);
                  return (
                    <tr key={lotId ?? r.id ?? r.lotCode}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          disabled={lotId == null}
                          checked={lotId != null && selectedLotIds.has(lotId)}
                          onChange={(e) => {
                            if (lotId == null) return;
                            setSelectedLotIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(lotId);
                              else next.delete(lotId);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="small">{r.productName}</td>
                      <td className="small text-muted">{r.packDisplay || "-"}</td>
                      <td className="small font-monospace">{r.sku}</td>
                      <td className="small font-monospace">{r.lotCode || (lotId ? `#${lotId}` : "-")}</td>
                      <td className="small">{fmtDate(r.expDate)}</td>
                      <td className="text-end small">{r.availableQty}</td>
                      <td className="text-end small">
                        <div>{fmtMoney(getRowSellPrice(r))}</div>
                        {priceSourceLabel(r.priceSource) ? (
                          <div className="text-muted" style={{ fontSize: 11 }}>
                            {priceSourceLabel(r.priceSource)}
                          </div>
                        ) : null}
                      </td>
                      <td>{statusBadge(r.status)}</td>
                      <td className="text-end">
                        {lotId ? (
                          <Button
                            as={Link}
                            href={`/staff/branch/${branchId}/inventory/batch-pricing/${lotId}`}
                            variant="outline-primary"
                            size="sm"
                          >
                            Edit batch price
                          </Button>
                        ) : null}
                      </td>
                      <td className="text-end">
                        {lotId ? (
                          <BarcodePrintButton
                            href={`/staff/branch/${branchId}/inventory/labels/batch/${lotId}/print`}
                            className="btn btn-sm btn-outline-secondary"
                          >
                            Print Batch Barcode
                          </BarcodePrintButton>
                        ) : (
                          <span className="text-muted small">No lot</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}
