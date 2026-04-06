"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Offcanvas } from "react-bootstrap";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { PaginationBar } from "@/src/components/common/PaginationBar";

type Location = { id: number; name: string; branch?: { id: number; name: string } };

type GrnRow = {
  id: number;
  status: string;
  createdAt: string;
  invoiceNo?: string | null;
  invoiceDate?: string | null;
  notes?: string | null;
  vendor?: { id: number; name: string } | null;
  purchaseOrder?: { id: number; poNumber: string; status: string } | null;
  location?: { id: number; name: string } | null;
  vendorReceiveSession?: { id: number; status: string; submittedAt?: string | null; confirmedAt?: string | null } | null;
  lines?: Array<{ id: number; quantity: number; variant?: { id: number; sku: string; title: string } }>;
};

type GrnDetail = GrnRow & {
  location?: { id: number; name: string; branch?: { id: number; name: string } } | null;
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_CONFIRMATION", label: "Pending Confirmation" },
  { value: "RECEIVED", label: "Received" },
  { value: "VOIDED", label: "Voided" },
];

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
}

function deriveDisplayStatus(grn: GrnRow): string {
  const grnStatus = (grn.status || "").toUpperCase();
  if (grnStatus === "VOIDED") return "VOIDED";
  if (grnStatus === "RECEIVED") return "RECEIVED";
  if (grnStatus === "DRAFT" && grn.vendorReceiveSession?.status === "AWAITING_CONFIRMATION") return "PENDING_CONFIRMATION";
  return grnStatus || "DRAFT";
}

function statusClass(s: string) {
  const u = (s || "").toUpperCase();
  if (u === "DRAFT") return "bg-secondary";
  if (u === "PENDING_CONFIRMATION") return "bg-warning text-dark";
  if (u === "RECEIVED") return "bg-success";
  if (u === "VOIDED") return "bg-danger";
  return "bg-light text-dark";
}

function statusLabel(s: string) {
  const u = (s || "").toUpperCase();
  if (u === "PENDING_CONFIRMATION") return "Pending Confirmation";
  if (u === "VOIDED") return "Voided";
  return s;
}

function pickArray(resp: any): unknown[] {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp.items)) return resp.items;
  return [];
}

function parsePositiveInt(raw: string | null | undefined): number | null {
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number.parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeGrnListPayload(res: any): { rows: GrnRow[]; pagination: { page: number; limit: number; total: number; totalPages: number } } {
  if (res == null) {
    return { rows: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };
  }
  const raw = res?.data;
  const rows = Array.isArray(raw) ? raw : Array.isArray(res?.items) ? res.items : [];
  const pag = res?.pagination;
  const page = Number.isFinite(Number(pag?.page)) ? Number(pag.page) : 1;
  const limit = Number.isFinite(Number(pag?.limit)) ? Number(pag.limit) : 20;
  const total = Number.isFinite(Number(pag?.total)) ? Number(pag.total) : rows.length;
  const totalPages = Number.isFinite(Number(pag?.totalPages)) ? Number(pag.totalPages) : Math.max(1, Math.ceil(total / limit));
  return { rows: rows as GrnRow[], pagination: { page, limit, total, totalPages } };
}

export default function OwnerInventoryReceiptsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [poFilter, setPoFilter] = useState("");
  const [items, setItems] = useState<GrnRow[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orgId, setOrgId] = useState<number | null>(null);
  const [orgLoaded, setOrgLoaded] = useState(false);
  const [filters, setFilters] = useState({ locationId: "", status: "", dateFrom: "", dateTo: "" });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [drawerGrnId, setDrawerGrnId] = useState<number | null>(null);
  const [drawerData, setDrawerData] = useState<GrnDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const printAfterLoad = useRef(false);
  const printRef = useRef<HTMLDivElement>(null);
  const listRequestId = useRef(0);

  const loadOrgContext = useCallback(async (): Promise<number | null> => {
    type MeRes = { organizations?: { id: number }[]; data?: { organizations?: { id: number }[] } };
    const [me, locRes] = await Promise.all([
      ownerGet<MeRes>("/api/v1/owner/me").catch((): MeRes => ({})),
      ownerGet<{ data?: Location[] }>("/api/v1/inventory/locations").catch(() => ({ data: [] })),
    ]);
    let orgs = me?.organizations ?? (me as any)?.data?.organizations ?? [];
    let oid: number | null = orgs[0]?.id != null ? Number(orgs[0].id) : null;
    if (oid == null || !Number.isFinite(oid) || oid <= 0) {
      const orgsRes = await ownerGet("/api/v1/owner/organizations").catch(() => null);
      const orgRows = pickArray(orgsRes) as { id?: number }[];
      const fallback = orgRows[0]?.id != null ? Number(orgRows[0].id) : null;
      oid = fallback != null && Number.isFinite(fallback) && fallback > 0 ? fallback : null;
    }
    setOrgId(oid);
    setLocations(pickArray(locRes) as Location[]);
    return oid;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadOrgContext();
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load");
      } finally {
        if (!cancelled) setOrgLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadOrgContext]);

  useEffect(() => {
    const w = searchParams.get("warehouseId");
    setWarehouseFilter(w ? String(w) : "");
    const po = searchParams.get("purchaseOrderId");
    setPoFilter(po ? String(po) : "");
  }, [searchParams]);

  const loadList = useCallback(
    async (orgIdOverride?: number | null) => {
      const resolvedOrgId = orgIdOverride !== undefined ? orgIdOverride : orgId;
      if (!orgLoaded) return;
      if (!resolvedOrgId) {
        setItems([]);
        setLoading(false);
        return;
      }
      const reqId = ++listRequestId.current;
      const poIdForApi = parsePositiveInt(poFilter);
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          orgId: String(resolvedOrgId),
          page: String(pagination.page),
          limit: String(pagination.limit),
        });
        if (filters.locationId) params.set("locationId", filters.locationId);
        if (filters.status === "PENDING_CONFIRMATION") {
          params.set("status", "DRAFT");
          params.set("sessionStatus", "AWAITING_CONFIRMATION");
        } else if (filters.status) {
          params.set("status", filters.status);
        }
        if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.set("dateTo", filters.dateTo);
        if (warehouseFilter) params.set("warehouseId", warehouseFilter);
        if (poIdForApi != null) params.set("purchaseOrderId", String(poIdForApi));
        const res: any = await ownerGet(`/api/v1/grn?${params.toString()}`);
        if (reqId !== listRequestId.current) return;
        if (res == null) {
          setItems([]);
          setError("Unable to load receipts (access denied or session issue).");
          return;
        }
        const { rows, pagination: pag } = normalizeGrnListPayload(res);
        setItems(rows);
        setPagination((prev) => ({ ...prev, ...pag }));
      } catch (e: any) {
        if (reqId !== listRequestId.current) return;
        setItems([]);
        setError(e?.message ?? "Failed to load receipts");
      } finally {
        if (reqId === listRequestId.current) setLoading(false);
      }
    },
    [orgLoaded, orgId, filters, pagination.page, pagination.limit, warehouseFilter, poFilter]
  );

  useEffect(() => {
    if (!orgLoaded) return;
    loadList();
  }, [orgLoaded, loadList]);

  const openDrawer = useCallback(async (id: number, triggerPrint = false) => {
    printAfterLoad.current = triggerPrint;
    setDrawerGrnId(id);
    setDrawerData(null);
    setDrawerLoading(true);
    try {
      const res: any = await ownerGet(`/api/v1/grn/${id}`);
      setDrawerData(res?.data ?? null);
    } catch {
      setDrawerData(null);
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (drawerLoading || !drawerData || !printAfterLoad.current) return;
    printAfterLoad.current = false;
    const id = drawerData.id;
    const t = setTimeout(() => {
      if (!printRef.current) return;
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(
        `<!DOCTYPE html><html><head><title>GRN #${id}</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3/dist/css/bootstrap.min.css" rel="stylesheet"/>
        </head><body class="p-4">${printRef.current.innerHTML}</body></html>`
      );
      win.document.close();
      win.print();
      win.close();
    }, 100);
    return () => clearTimeout(t);
  }, [drawerLoading, drawerData]);

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head><title>GRN #${drawerGrnId}</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3/dist/css/bootstrap.min.css" rel="stylesheet"/>
      </head><body class="p-4">${printRef.current.innerHTML}</body></html>`);
    win.document.close();
    win.print();
    win.close();
  }, [drawerGrnId]);

  const hasFilters = !!(filters.locationId || filters.status || filters.dateFrom || filters.dateTo || warehouseFilter);
  const poIdParsed = parsePositiveInt(poFilter);
  const poFilterInvalid = poFilter.trim() !== "" && poIdParsed == null;
  const orgMissing = orgLoaded && orgId == null;

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Receipts"
        subtitle="Goods received notes (GRN). View, print, or create bulk receive."
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Inventory", href: "/owner/inventory" },
          { label: "Receipts", href: "/owner/inventory/receipts" },
        ]}
        actions={[
          <Link key="bulk" href="/owner/inventory/receipts/bulk" className="btn btn-primary btn-sm">
            Bulk receive
          </Link>,
        ]}
      />

      {warehouseFilter ? (
        <div className="alert alert-info d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <span>
            Filtered to GRNs at locations linked to warehouse <strong>#{warehouseFilter}</strong> (from operations / receipts link).
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setWarehouseFilter("");
              router.replace("/owner/inventory/receipts");
            }}
          >
            Clear warehouse filter
          </button>
        </div>
      ) : null}

      {poFilterInvalid ? (
        <div className="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <span>
            The URL contains an invalid <code className="small">purchaseOrderId</code> (<strong>{poFilter}</strong>). Receipts are shown without a PO filter until you clear or fix the link.
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setPoFilter("");
              router.replace("/owner/inventory/receipts");
            }}
          >
            Clear PO filter
          </button>
        </div>
      ) : poIdParsed != null ? (
        <div className="alert alert-info d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <span>
            Showing GRNs for purchase order <strong>#{poIdParsed}</strong>.{" "}
            <Link href={`/owner/inventory/purchase-orders/${poIdParsed}`} className="fw-semibold">
              Back to PO
            </Link>
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setPoFilter("");
              router.replace("/owner/inventory/receipts");
            }}
          >
            Clear PO filter
          </button>
        </div>
      ) : null}

      <div className="card radius-12 mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-sm-6 col-md-3">
              <label className="form-label small">Location</label>
              <select
                className="form-select form-select-sm"
                value={filters.locationId}
                onChange={(e) => setFilters((f) => ({ ...f, locationId: e.target.value }))}
              >
                <option value="">All locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.branch ? `(${loc.branch.name})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-6 col-md-2">
              <label className="form-label small">Status</label>
              <select
                className="form-select form-select-sm"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-6 col-md-2">
              <label className="form-label small">Date from</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              />
            </div>
            <div className="col-sm-6 col-md-2">
              <label className="form-label small">Date to</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              />
            </div>
            <div className="col-12 col-md-3 d-flex gap-2">
              {hasFilters && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setFilters({ locationId: "", status: "", dateFrom: "", dateTo: "" })}
                >
                  Clear
                </button>
              )}
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => loadList()}>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger radius-12 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger shrink-0" onClick={() => loadList()}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-2 text-muted small mb-0">Loading receipts…</p>
          </div>
        </div>
      ) : orgMissing ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <i className="ri-building-line d-block mb-2" style={{ fontSize: "2.5rem", opacity: 0.4 }} />
            <h6 className="fw-semibold mb-1">No organization available</h6>
            <p className="text-muted small mb-3">
              We could not resolve an organization for your account. Check owner access or complete onboarding, then refresh.
            </p>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={async () => {
                setError("");
                try {
                  const oid = await loadOrgContext();
                  await loadList(oid);
                } catch (e: any) {
                  setError(e?.message ?? "Failed to reload organization");
                }
              }}
            >
              Retry
            </button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <i className="ri-inbox-line d-block mb-2" style={{ fontSize: "2.5rem", opacity: 0.4 }} />
            {poFilterInvalid ? (
              <>
                <h6 className="fw-semibold mb-1">No receipts to show under this link</h6>
                <p className="text-muted small mb-3">Fix or clear the invalid purchase order filter above to see receipts.</p>
              </>
            ) : poIdParsed != null ? (
              <>
                <h6 className="fw-semibold mb-1">No receipts for this purchase order yet</h6>
                <p className="text-muted small mb-3">
                  Goods haven&apos;t been received against PO <strong>#{poIdParsed}</strong> yet. Use the warehouse receiving flow to create a GRN.
                </p>
                <Link href={`/owner/inventory/purchase-orders/${poIdParsed}`} className="btn btn-outline-primary btn-sm me-2">
                  Back to PO #{poIdParsed}
                </Link>
              </>
            ) : (
              <>
                <h6 className="fw-semibold mb-1">No receipts found</h6>
                <p className="text-muted small mb-3">
                  Receive goods from the warehouse to create GRN entries here.
                </p>
              </>
            )}
            <div className="mt-2">
              <Link href="/owner/inventory/receipts/bulk" className="btn btn-primary btn-sm me-2">
                Bulk receive
              </Link>
              <Link href="/owner/inventory/purchase-orders" className="btn btn-outline-secondary btn-sm">
                Purchase orders
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="card radius-12">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Vendor</th>
                    <th>PO</th>
                    <th>Status</th>
                    <th>Lines</th>
                    <th style={{ width: 140 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => {
                    const displayStatus = deriveDisplayStatus(r);
                    return (
                      <tr key={r.id}>
                        <td className="fw-semibold">
                          <Link href={`/owner/inventory/grn/${r.id}`} className="text-decoration-none">
                            #{r.id}
                          </Link>
                        </td>
                        <td className="text-muted small">{formatDate(r.createdAt)}</td>
                        <td>{r.location?.name ?? "—"}</td>
                        <td>{r.vendor?.name ?? "—"}</td>
                        <td className="small">
                          {r.purchaseOrder ? (
                            <Link href={`/owner/inventory/purchase-orders/${r.purchaseOrder.id}`} className="text-decoration-none">
                              {r.purchaseOrder.poNumber}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <span className={`badge ${statusClass(displayStatus)}`}>{statusLabel(displayStatus)}</span>
                        </td>
                        <td>{r.lines?.length ?? 0}</td>
                        <td className="text-end">
                          <Link
                            href={`/owner/inventory/grn/${r.id}`}
                            className="btn btn-outline-primary btn-sm me-1"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => openDrawer(r.id, true)}
                          >
                            Print
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pagination.total > 0 && (
              <div className="p-3 border-top">
                <PaginationBar
                  page={pagination.page}
                  pageSize={pagination.limit}
                  total={pagination.total}
                  totalPages={pagination.totalPages}
                  disabled={false}
                  onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
                  className="mt-0 pt-0 border-0"
                  ariaLabel="Receipts pages"
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-3">
        <Link href="/owner/inventory/receipts/bulk" className="btn btn-outline-primary btn-sm me-2">
          Bulk receive
        </Link>
        <Link href="/owner/inventory/purchase-orders" className="btn btn-outline-secondary btn-sm">
          Purchase orders
        </Link>
      </div>

      <Offcanvas show={drawerGrnId != null} onHide={() => setDrawerGrnId(null)} placement="end" className="border-0 shadow-lg" style={{ width: "min(100%, 480px)" }}>
        <Offcanvas.Header closeButton className="border-bottom">
          <Offcanvas.Title>GRN #{drawerGrnId ?? ""}</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {drawerLoading && <p className="text-muted small">Loading…</p>}
          {!drawerLoading && drawerData && (
            <>
              <div ref={printRef} className="small">
                <h6 className="mb-2">Goods Received Note #{drawerData.id}</h6>
                <p className="mb-1"><strong>Date:</strong> {formatDate(drawerData.createdAt)}</p>
                <p className="mb-1"><strong>Location:</strong> {drawerData.location?.name ?? "—"}</p>
                <p className="mb-1"><strong>Vendor:</strong> {drawerData.vendor?.name ?? "—"}</p>
                {drawerData.purchaseOrder && (
                  <p className="mb-1">
                    <strong>PO:</strong>{" "}
                    <Link href={`/owner/inventory/purchase-orders/${drawerData.purchaseOrder.id}`}>
                      {drawerData.purchaseOrder.poNumber}
                    </Link>{" "}
                    <span className="text-muted">({drawerData.purchaseOrder.status})</span>
                  </p>
                )}
                {drawerData.invoiceNo && <p className="mb-1"><strong>Invoice:</strong> {drawerData.invoiceNo}</p>}
                {drawerData.notes && <p className="mb-2 text-muted">{drawerData.notes}</p>}
                <table className="table table-sm table-bordered mb-0">
                  <thead><tr><th>Variant</th><th>Qty</th></tr></thead>
                  <tbody>
                    {(drawerData.lines ?? []).map((line) => (
                      <tr key={line.id}>
                        <td>{line.variant ? `${line.variant.sku} ${line.variant.title}` : `#${line.id}`}</td>
                        <td>{line.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handlePrint}>
                  Print
                </button>
              </div>
            </>
          )}
          {!drawerLoading && !drawerData && drawerGrnId != null && <p className="text-muted small">GRN not found.</p>}
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}
