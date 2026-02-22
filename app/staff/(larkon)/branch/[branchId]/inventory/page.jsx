"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Dropdown } from "react-bootstrap";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffInventoryList,
  staffInventoryAlerts,
  staffInventoryDashboard,
  staffInventoryLedger,
  staffInventoryLocations,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { Pagination } from "@/src/components/common/Pagination";

const REQUIRED_PERM = "inventory.read";
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "low", label: "Low" },
  { value: "out", label: "Out" },
  { value: "negative", label: "Negative" },
  { value: "expiring", label: "Expiring" },
];
const SORT_OPTIONS = [
  { value: "qty_asc", label: "Qty low→high" },
  { value: "qty_desc", label: "Qty high→low" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
];

function getStatus(row, minQ) {
  const qty = row.quantity ?? row.onHandQty ?? 0;
  if (qty < 0) return { label: "Negative", class: "bg-danger text-white" };
  if (qty === 0) return { label: "Out", class: "bg-danger text-white" };
  if (minQ > 0 && qty <= minQ) return { label: "Low", class: "bg-warning text-dark" };
  return { label: "OK", class: "bg-success text-white" };
}

export default function StaffBranchInventorySummaryPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const [items, setItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("qty_asc");
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [drawerRow, setDrawerRow] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const permissions = myAccess?.permissions ?? [];
  const canRead = permissions.includes(REQUIRED_PERM);
  const canReceive = permissions.includes("inventory.receive");
  const canAdjust = permissions.includes("inventory.adjust");
  const canTransfer = permissions.includes("inventory.transfer");

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  const loadData = useCallback(() => {
    if (!branchId || !canRead) return;
    setLoading(true);
    setError("");
    const lowStockOnly = statusFilter === "low";
    Promise.all([
      staffInventoryList(branchId, { search: search || undefined, lowStockOnly, page: pagination.page, limit: pagination.limit }),
      staffInventoryAlerts(branchId),
      staffInventoryDashboard(branchId).catch(() => null),
      staffInventoryLocations().catch(() => []),
    ])
      .then(([listRes, alertsList, dash, locs]) => {
        let list = listRes.items ?? [];
        const pag = listRes.pagination ?? { page: 1, limit: pagination.limit, total: list.length, totalPages: 1 };
        if (statusFilter === "out") list = list.filter((r) => (r.quantity ?? r.onHandQty ?? 0) === 0);
        else if (statusFilter === "negative") list = list.filter((r) => (r.quantity ?? r.onHandQty ?? 0) < 0);
        else if (statusFilter === "expiring") list = list.filter((r) => r.expiringSoon);
        setItems(list);
        setAlerts(Array.isArray(alertsList) ? alertsList : []);
        setDashboard(dash ?? null);
        setLocations(Array.isArray(locs) ? locs : []);
        setPagination({
          page: pag.page,
          limit: pag.limit,
          total: statusFilter ? list.length : (pag.total ?? list.length),
          totalPages: statusFilter ? 1 : Math.max(1, pag.totalPages ?? 1),
        });
      })
      .catch((e) => setError(e?.message ?? "Failed to load inventory"))
      .finally(() => setLoading(false));
  }, [branchId, canRead, search, statusFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const applyCardFilter = (filter) => {
    setStatusFilter(filter);
  };

  const sortedItems = useMemo(() => {
    const list = [...items];
    const minQ = (r) => r.minStock ?? 10;
    const qty = (r) => r.quantity ?? r.onHandQty ?? 0;
    const name = (r) => r.variant?.product?.name ?? r.productName ?? r.variant?.title ?? "";
    if (sort === "qty_asc") list.sort((a, b) => qty(a) - qty(b));
    else if (sort === "qty_desc") list.sort((a, b) => qty(b) - qty(a));
    else if (sort === "name_asc") list.sort((a, b) => name(a).localeCompare(name(b)));
    else if (sort === "name_desc") list.sort((a, b) => name(b).localeCompare(name(a)));
    return list;
  }, [items, sort]);

  const totalAvailable = useMemo(() => sortedItems.reduce((s, r) => s + (r.availableQty ?? r.quantity ?? r.onHandQty ?? 0), 0), [sortedItems]);
  const lowCount = useMemo(() => sortedItems.filter((r) => (r.quantity ?? r.onHandQty ?? 0) > 0 && (r.quantity ?? r.onHandQty ?? 0) <= (r.minStock ?? 10)).length, [sortedItems]);
  const outCount = useMemo(() => sortedItems.filter((r) => (r.quantity ?? r.onHandQty ?? 0) === 0).length, [sortedItems]);

  const openDrawer = useCallback((row) => {
    setDrawerRow(row);
    setLedgerEntries([]);
    const locId = row.locationId ?? row.location?.id;
    const varId = row.variantId ?? row.variant?.id;
    if (locId && varId) {
      setLedgerLoading(true);
      staffInventoryLedger({ locationId: locId, variantId: varId, limit: 10 })
        .then((res) => setLedgerEntries(res.items ?? []))
        .catch(() => setLedgerEntries([]))
        .finally(() => setLedgerLoading(false));
    }
  }, []);

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary">Loading...</p>
      </div>
    );
  }
  if (errorCode === "forbidden" || !hasViewPermission || !canRead) {
    return (
      <AccessDenied
        missingPerm={REQUIRED_PERM}
        onBack={() => router.push(`/staff/branch/${branchId}`)}
      />
    );
  }

  const branchName = branch?.name ?? `Branch #${branchId}`;

  return (
    <div className="container py-24">
      {/* Branch context bar */}
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      {/* Page title + breadcrumb + chips */}
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
        <div>
          <nav aria-label="breadcrumb" className="mb-2">
            <ol className="breadcrumb mb-0 small">
              <li className="breadcrumb-item"><Link href="/staff">Staff</Link></li>
              <li className="breadcrumb-item"><Link href="/staff/branch">Branches</Link></li>
              <li className="breadcrumb-item"><Link href={`/staff/branch/${branchId}`}>Branch #{branchId}</Link></li>
              <li className="breadcrumb-item active">Inventory</li>
            </ol>
          </nav>
          <h5 className="mb-1 fw-semibold">Branch Inventory</h5>
          <p className="text-muted small mb-0">Ledger-based stock • Adjust via request</p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <span className="badge bg-light text-dark border">{branchName} (ID: {branchId})</span>
          <span className="badge bg-warning text-dark">Low: {dashboard?.lowStockCount ?? lowCount}</span>
          <span className="badge bg-danger">Out: {dashboard?.outOfStockCount ?? outCount}</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        {canReceive && (
          <Link href={`/staff/branch/${branchId}/inventory/receive`} className="btn btn-primary btn-sm radius-12">
            <i className="ri-download-cloud-2-line me-1" aria-hidden /> Receive Stock
          </Link>
        )}
        {canAdjust && (
          <Link href={`/staff/branch/${branchId}/inventory/adjustments`} className="btn btn-outline-primary btn-sm radius-12">
            <i className="ri-scales-3-line me-1" aria-hidden /> Adjustments
          </Link>
        )}
        {canTransfer && (
          <Link href={`/staff/branch/${branchId}/inventory/transfers`} className="btn btn-outline-primary btn-sm radius-12">
            <i className="ri-swap-line me-1" aria-hidden /> Transfers
          </Link>
        )}
        <Link href={`/staff/branch/${branchId}/inventory/stock-requests`} className="btn btn-outline-secondary btn-sm radius-12">
          <i className="ri-file-list-3-line me-1" aria-hidden /> Stock Requests
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger radius-12 d-flex align-items-center justify-content-between">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      {/* Filters card */}
      <Card className="mb-3">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-auto">
              <label className="form-label small mb-0">Search</label>
              <input
                type="search"
                className="form-control form-control-sm radius-12"
                style={{ minWidth: 180 }}
                placeholder="Name / SKU / barcode"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <label className="form-label small mb-0">Status</label>
              <select
                className="form-select form-select-sm radius-12"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="col-auto">
              <label className="form-label small mb-0">Sort</label>
              <select
                className="form-select form-select-sm radius-12"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="col-auto">
              <button type="button" className="btn btn-outline-secondary btn-sm radius-12" onClick={() => { setSearch(""); setStatusFilter(""); }}>
                Reset
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary cards (clickable) */}
      <div className="row g-2 g-md-3 mb-3">
        <div className="col-6 col-md-3">
          <div
            className="card radius-12 h-100 cursor-pointer"
            style={{ cursor: statusFilter === "" ? "default" : "pointer" }}
            onClick={() => statusFilter && applyCardFilter("")}
            role={statusFilter ? "button" : null}
          >
            <div className="card-body d-flex align-items-center justify-content-between py-3">
              <div>
                <div className="small text-muted">Total Items</div>
                <div className="fw-bold">{loading ? "—" : (dashboard?.totalSkus ?? sortedItems.length)}</div>
              </div>
              <i className="ri-box-3-line text-primary" style={{ fontSize: "1.5rem" }} aria-hidden />
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card radius-12 h-100">
            <div className="card-body d-flex align-items-center justify-content-between py-3">
              <div>
                <div className="small text-muted">Available Qty</div>
                <div className="fw-bold">{loading ? "—" : totalAvailable}</div>
              </div>
              <i className="ri-stack-line text-success" style={{ fontSize: "1.5rem" }} aria-hidden />
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div
            className="card radius-12 h-100 cursor-pointer"
            style={{ cursor: "pointer" }}
            onClick={() => applyCardFilter("low")}
            role="button"
          >
            <div className="card-body d-flex align-items-center justify-content-between py-3">
              <div>
                <div className="small text-muted">Low Stock</div>
                <div className="fw-bold">{loading ? "—" : (dashboard?.lowStockCount ?? lowCount)}</div>
              </div>
              <i className="ri-error-warning-line text-warning" style={{ fontSize: "1.5rem" }} aria-hidden />
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div
            className="card radius-12 h-100 cursor-pointer"
            style={{ cursor: "pointer" }}
            onClick={() => applyCardFilter("out")}
            role="button"
          >
            <div className="card-body d-flex align-items-center justify-content-between py-3">
              <div>
                <div className="small text-muted">Out of Stock</div>
                <div className="fw-bold">{loading ? "—" : (dashboard?.outOfStockCount ?? outCount)}</div>
              </div>
              <i className="ri-close-circle-line text-danger" style={{ fontSize: "1.5rem" }} aria-hidden />
            </div>
          </div>
        </div>
      </div>

      {/* Today's Tasks (compact) */}
      <div className="row">
        <div className="col-lg-9">
          <Card title="Inventory" subtitle="Click row for ledger details. Adjust via request only.">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status" />
                <p className="mt-2 text-muted small">Loading...</p>
              </div>
            ) : sortedItems.length === 0 ? (
              <div className="text-center py-5 px-3">
                <div className="mb-3 text-muted">
                  <i className="ri-box-3-line display-4" aria-hidden />
                </div>
                <h6 className="fw-semibold mb-2">No stock movements yet for this branch.</h6>
                <p className="text-muted small mb-4">Inventory is calculated from ledger entries.</p>
                <div className="d-flex flex-wrap justify-content-center gap-2">
                  <Link href={`/staff/branch/${branchId}/inventory/stock-requests/new`} className="btn btn-primary btn-sm radius-12">
                    <i className="ri-add-line me-1" aria-hidden /> Create Stock Request
                  </Link>
                  <Link href={`/staff/branch/${branchId}/inventory/stock-requests`} className="btn btn-outline-secondary btn-sm radius-12">
                    Go to Stock Requests (Pending)
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th className="text-end">Available</th>
                        <th className="text-end">Reorder</th>
                        <th>Status</th>
                        <th>Last Move</th>
                        <th style={{ width: 70 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedItems.map((row) => {
                        const qty = row.quantity ?? row.onHandQty ?? 0;
                        const minQ = row.minStock ?? 10;
                        const status = getStatus(row, minQ);
                        const name = row.variant?.product?.name ?? row.productName ?? row.variant?.title ?? "—";
                        const sku = row.variant?.sku ?? row.sku ?? "—";
                        const available = row.availableQty ?? qty;
                        return (
                          <tr
                            key={row.id ?? `${row.locationId}-${row.variantId}`}
                            className="table-row-clickable"
                            onClick={() => openDrawer(row)}
                            style={{ cursor: "pointer" }}
                          >
                            <td>
                              <span className="fw-semibold">{name}</span>
                              {row.variant?.title && name !== row.variant?.title && (
                                <span className="text-muted small d-block">{row.variant.title}</span>
                              )}
                            </td>
                            <td><span className="text-muted small">{sku}</span></td>
                            <td className="text-end">{Number(available)}</td>
                            <td className="text-end">{Number(minQ)}</td>
                            <td>
                              <span className={`badge radius-12 ${status.class}`}>{status.label}</span>
                              {qty < 0 && (
                                <span className="ms-1 small text-danger" title="View ledger for details">⚠</span>
                              )}
                            </td>
                            <td className="small text-muted">—</td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <Dropdown align="end">
                                <Dropdown.Toggle variant="light" size="sm" className="btn-icon-more" id={`inv-${row.id ?? row.locationId}-${row.variantId}`}>
                                  <i className="ri-more-2-fill" aria-hidden />
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                  <Dropdown.Item onClick={() => openDrawer(row)}>
                                    <i className="ri-history-line me-2" aria-hidden /> View Ledger
                                  </Dropdown.Item>
                                  <Dropdown.Divider />
                                  <Dropdown.Item as={Link} href={`/staff/branch/${branchId}/inventory/stock-requests/new`}>
                                    <i className="ri-file-add-line me-2" aria-hidden /> Create Stock Request
                                  </Dropdown.Item>
                                  {canTransfer && (
                                    <Dropdown.Item as={Link} href={`/staff/branch/${branchId}/inventory/transfers`}>
                                      <i className="ri-swap-line me-2" aria-hidden /> Request Transfer
                                    </Dropdown.Item>
                                  )}
                                  {canAdjust && (
                                    <Dropdown.Item as={Link} href={`/staff/branch/${branchId}/inventory/adjustments`}>
                                      <i className="ri-scales-3-line me-2" aria-hidden /> Adjustments
                                    </Dropdown.Item>
                                  )}
                                  {(row.productId ?? row.variant?.product?.id) && (
                                    <Dropdown.Item as={Link} href={`/owner/products/${row.productId ?? row.variant?.product?.id}`} target="_blank" rel="noopener">
                                      <i className="ri-external-link-line me-2" aria-hidden /> Open Product
                                    </Dropdown.Item>
                                  )}
                                </Dropdown.Menu>
                              </Dropdown>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {pagination.totalPages > 1 && (
                  <div className="d-flex justify-content-end p-3 border-top">
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
                      align="end"
                      ariaLabel="Inventory pagination"
                    />
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
        <div className="col-lg-3 mt-3 mt-lg-0">
          <Card title="Today's Tasks" subtitle="Quick links">
            <div className="d-flex flex-column gap-2">
              <Link href={`/staff/branch/${branchId}/inventory/stock-requests`} className="btn btn-outline-primary btn-sm radius-12 text-start">
                <i className="ri-file-list-3-line me-2" aria-hidden /> Stock Requests
              </Link>
              <Link href={`/staff/branch/${branchId}/inventory/transfers`} className="btn btn-outline-primary btn-sm radius-12 text-start">
                <i className="ri-swap-line me-2" aria-hidden /> Transfers
              </Link>
              <button type="button" className="btn btn-outline-warning btn-sm radius-12 text-start" onClick={() => applyCardFilter("low")}>
                <i className="ri-error-warning-line me-2" aria-hidden /> Low stock ({lowCount})
              </button>
              <Link href={`/staff/branch/${branchId}/inventory/receive`} className="btn btn-outline-success btn-sm radius-12 text-start">
                <i className="ri-download-cloud-2-line me-2" aria-hidden /> Receive
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Drawer: Ledger + breakdown */}
      {drawerRow && (
        <div
          className="offcanvas offcanvas-end show"
          tabIndex={-1}
          style={{ visibility: "visible", width: "400px" }}
          aria-modal="true"
        >
          <div className="offcanvas-header border-bottom">
            <h6 className="offcanvas-title">
              {drawerRow.variant?.product?.name ?? drawerRow.productName ?? "—"} · {drawerRow.variant?.sku ?? "—"}
            </h6>
            <button type="button" className="btn-close" onClick={() => setDrawerRow(null)} aria-label="Close" />
          </div>
          <div className="offcanvas-body">
            <div className="mb-3">
              <div className="small text-muted mb-2">Stock</div>
              <div className="d-flex gap-3">
                <span><strong>Available:</strong> {drawerRow.availableQty ?? drawerRow.quantity ?? drawerRow.onHandQty ?? 0}</span>
                <span><strong>Reserved:</strong> {drawerRow.reservedQty ?? 0}</span>
                <span className="text-muted">In transit: —</span>
              </div>
            </div>
            <div className="mb-3">
              <div className="small text-muted mb-2">Last 10 ledger entries</div>
              {ledgerLoading ? (
                <p className="small text-muted">Loading...</p>
              ) : ledgerEntries.length === 0 ? (
                <p className="small text-muted">No ledger entries.</p>
              ) : (
                <ul className="list-unstyled small">
                  {ledgerEntries.map((entry, i) => (
                    <li key={entry.id ?? i} className="py-1 border-bottom border-light">
                      {entry.type ?? "—"} · {entry.quantityDelta != null ? (entry.quantityDelta >= 0 ? "+" : "") + entry.quantityDelta : ""} · {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="d-flex flex-wrap gap-2">
              <Link href={`/staff/branch/${branchId}/inventory/stock-requests/new`} className="btn btn-primary btn-sm radius-12">Create Stock Request</Link>
              {canTransfer && <Link href={`/staff/branch/${branchId}/inventory/transfers`} className="btn btn-outline-primary btn-sm radius-12">Transfers</Link>}
              {canAdjust && <Link href={`/staff/branch/${branchId}/inventory/adjustments`} className="btn btn-outline-secondary btn-sm radius-12">Adjustments</Link>}
            </div>
          </div>
        </div>
      )}
      {drawerRow && <div className="offcanvas-backdrop show" onClick={() => setDrawerRow(null)} aria-hidden />}
    </div>
  );
}
