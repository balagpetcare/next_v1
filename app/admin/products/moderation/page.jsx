"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import { apiGet, apiPost } from "@/lib/api";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import FilterPanel from "@/src/bpa/admin/components/FilterPanel";
import DetailDrawer from "@/src/bpa/admin/components/DetailDrawer";
import { RejectReasonModal } from "@/src/bpa/admin/components/DecisionModal";
import StatusChip from "@/src/bpa/admin/components/StatusChip";

const TABS = [
  { key: "PENDING_APPROVAL", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

export default function ProductModerationPage() {
  const [tab, setTab] = useState("PENDING_APPROVAL");
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drawer, setDrawer] = useState({ open: false, id: null });
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("approvalStatus", tab);
      const r = await apiGet(`/api/v1/products?${params.toString()}`);
      const items = Array.isArray(r?.data) ? r.data : r?.data?.items ?? [];
      setRows(items);
    } catch (e) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const name = (r.name ?? "").toLowerCase();
      const slug = (r.slug ?? "").toLowerCase();
      const id = String(r.id ?? "");
      return name.includes(q) || slug.includes(q) || id.includes(q);
    });
  }, [rows, search]);

  const openDrawer = useCallback(async (id) => {
    setDrawer({ open: true, id });
    setDetail(null);
    setDetailLoading(true);
    try {
      const r = await apiGet(`/api/v1/products/${id}`);
      setDetail(r?.data ?? null);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer({ open: false, id: null });
    setDetail(null);
    load();
  }, [load]);

  const handleApprove = async () => {
    if (!drawer.id) return;
    setActionLoading(true);
    try {
      await apiPost(`/api/v1/products/${drawer.id}/approve`, {});
      const r = await apiGet(`/api/v1/products/${drawer.id}`);
      setDetail(r?.data ?? null);
      load();
    } catch (e) {
      alert(e?.message ?? "Approve failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason) => {
    if (!drawer.id) return;
    setRejectOpen(false);
    setActionLoading(true);
    try {
      await apiPost(`/api/v1/products/${drawer.id}/reject`, { reason: reason || undefined });
      closeDrawer();
    } catch (e) {
      alert(e?.message ?? "Reject failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <PageHeader
        title="Product Moderation Queue"
        subtitle="Review and approve or reject products"
        right={
          <div className="d-flex gap-2">
            <a href="/admin/products" className="btn btn-outline-secondary btn-sm">All products</a>
            <a href="/admin/products/master-catalog" className="btn btn-outline-primary btn-sm">Master catalog</a>
          </div>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="d-flex flex-wrap gap-2 mb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn btn-sm ${tab === t.key ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-4 col-lg-3">
          <FilterPanel title="Filters">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search name, slug, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </FilterPanel>
        </div>
        <div className="col-12 col-md-8 col-lg-9">
          <SectionCard title={`${TABS.find((t) => t.key === tab)?.label ?? tab} products`} right={<span className="text-secondary small">{filtered.length} item(s)</span>}>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Variants</th>
                    <th>Approval</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => openDrawer(r.id)}>
                      <td>
                        <div className="fw-semibold">{r.name ?? "—"}</div>
                        <div className="text-secondary" style={{ fontSize: 12 }}>#{r.id} · {r.slug ?? "—"}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>{r.category?.name ?? "—"}</td>
                      <td>{r.variants?.length ?? 0}</td>
                      <td><StatusChip status={r.approvalStatus} /></td>
                      <td className="text-end" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => openDrawer(r.id)}>Review</button>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && !loading ? (
                    <tr><td colSpan={5} className="text-secondary text-center py-4">No products.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      </div>

      <DetailDrawer
        open={drawer.open}
        onClose={closeDrawer}
        title={detail ? detail.name ?? `Product #${drawer.id}` : "Product"}
        subtitle={detail && <StatusChip status={detail.approvalStatus} />}
        tabs={[
          {
            key: "overview",
            label: "Overview",
            children: detail ? (
              <div>
                <div className="mb-2"><strong>Slug:</strong> {detail.slug ?? "—"}</div>
                <div className="mb-2"><strong>Category:</strong> {detail.category?.name ?? "—"}</div>
                <div className="mb-2"><strong>Variants:</strong> {detail.variants?.length ?? 0}</div>
                {detail.description ? <p className="small text-secondary">{detail.description}</p> : null}
              </div>
            ) : null,
          },
        ]}
        loading={detailLoading}
        actionBar={
          drawer.id && detail?.approvalStatus === "PENDING_APPROVAL" ? (
            <div className="d-flex gap-2 flex-wrap">
              <button type="button" className="btn btn-success btn-sm" onClick={handleApprove} disabled={actionLoading}>Approve</button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setRejectOpen(true)} disabled={actionLoading}>
                Reject
              </button>
            </div>
          ) : null
        }
      />
      <RejectReasonModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
        loading={actionLoading}
        entityLabel="product"
        requiredReason={false}
      />
    </div>
  );
}
