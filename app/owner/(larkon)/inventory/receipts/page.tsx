"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Offcanvas } from "react-bootstrap";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { Pagination } from "@/src/components/common/Pagination";

type Location = { id: number; name: string; branch?: { id: number; name: string } };

type GrnRow = {
  id: number;
  status: string;
  createdAt: string;
  invoiceNo?: string | null;
  invoiceDate?: string | null;
  notes?: string | null;
  vendor?: { id: number; name: string } | null;
  location?: { id: number; name: string } | null;
  lines?: Array<{ id: number; quantity: number; variant?: { id: number; sku: string; title: string } }>;
};

type GrnDetail = GrnRow & {
  location?: { id: number; name: string; branch?: { id: number; name: string } } | null;
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "RECEIVED", label: "Received" },
];

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
}

function statusClass(s: string) {
  const u = (s || "").toUpperCase();
  if (u === "DRAFT") return "bg-secondary";
  if (u === "RECEIVED") return "bg-success";
  return "bg-light text-dark";
}

function pickArray(resp: any): unknown[] {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.data)) return resp.data;
  return [];
}

export default function OwnerInventoryReceiptsPage() {
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        type MeRes = { organizations?: { id: number }[]; data?: { organizations?: { id: number }[] } };
        const [me, locRes] = await Promise.all([
          ownerGet<MeRes>("/api/v1/owner/me").catch((): MeRes => ({})),
          ownerGet<{ data?: Location[] }>("/api/v1/inventory/locations").catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const orgs = me?.organizations ?? (me as any)?.data?.organizations ?? [];
        setOrgId(orgs[0]?.id ?? null);
        setLocations(pickArray(locRes) as Location[]);
        setOrgLoaded(true);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadList = useCallback(async () => {
    if (!orgId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ orgId: String(orgId), page: String(pagination.page), limit: String(pagination.limit) });
      if (filters.locationId) params.set("locationId", filters.locationId);
      if (filters.status) params.set("status", filters.status);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      const res: any = await ownerGet(`/api/v1/grn?${params.toString()}`);
      const data = res?.data ?? [];
      const pag = res?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 };
      setItems(Array.isArray(data) ? data : []);
      setPagination((prev) => ({ ...prev, ...pag }));
    } catch (e: any) {
      setItems([]);
      setError(e?.message ?? "Failed to load receipts");
    } finally {
      setLoading(false);
    }
  }, [orgId, filters, pagination.page, pagination.limit]);

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

  const hasFilters = !!(filters.locationId || filters.status || filters.dateFrom || filters.dateTo);

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

      {error && <div className="alert alert-danger radius-12">{error}</div>}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-4 text-secondary">Loading receipts…</div>
        </div>
      ) : items.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-4 text-secondary">
            No receipts found. Create one via <Link href="/owner/inventory/receipts/bulk">Bulk receive</Link>.
            <div className="mt-3">
              <Link href="/owner/inventory/receipts/bulk" className="btn btn-primary btn-sm me-2">
                Bulk receive
              </Link>
              <Link href="/owner/inventory/warehouse" className="btn btn-outline-secondary btn-sm">
                Warehouse
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
                    <th>Status</th>
                    <th>Lines</th>
                    <th style={{ width: 140 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td className="fw-semibold">#{r.id}</td>
                      <td className="text-muted small">{formatDate(r.createdAt)}</td>
                      <td>{r.location?.name ?? "—"}</td>
                      <td>{r.vendor?.name ?? "—"}</td>
                      <td>
                        <span className={`badge ${statusClass(r.status)}`}>{r.status ?? "—"}</span>
                      </td>
                      <td>{r.lines?.length ?? 0}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm me-1"
                          onClick={() => openDrawer(r.id)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => openDrawer(r.id, true)}
                        >
                          Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="p-3 border-top">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
                  align="end"
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
        <Link href="/owner/inventory/warehouse" className="btn btn-outline-secondary btn-sm">
          Warehouse
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
