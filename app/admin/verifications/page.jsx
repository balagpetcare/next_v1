"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import { apiGet, apiPost } from "@/lib/api";
import FilterPanel from "@/src/bpa/admin/components/FilterPanel";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import StatusChip from "@/src/bpa/admin/components/StatusChip";
import DetailDrawer from "@/src/bpa/admin/components/DetailDrawer";
import DecisionPanel from "@/src/bpa/admin/components/DecisionPanel";
import DocGrid from "@/src/bpa/admin/components/DocGrid";
import TimelineView from "@/src/bpa/admin/components/TimelineView";
import CommentThread from "@/src/bpa/admin/components/CommentThread";

const TABS = [
  { key: "owners", label: "Owner", apiList: "/api/v1/admin/verifications/owners", apiDetail: (id) => `/api/v1/admin/verifications/owners/${id}`, apiComment: (id) => `/api/v1/admin/verifications/owners/${id}/comment` },
  { key: "organizations", label: "Organization", apiList: "/api/v1/admin/verifications/organizations", apiDetail: (id) => `/api/v1/admin/verifications/organizations/${id}`, apiComment: (id) => `/api/v1/admin/verifications/organizations/${id}/comment` },
  { key: "branches", label: "Branch", apiList: "/api/v1/admin/verifications/branches", apiDetail: (id) => `/api/v1/admin/verifications/branches/${id}`, apiComment: (id) => `/api/v1/admin/verifications/branches/${id}/comment` },
  { key: "staff", label: "Staff", apiList: "/api/v1/admin/verifications/staff", apiDetail: (id) => `/api/v1/admin/verifications/staff/${id}`, apiComment: (id) => `/api/v1/admin/verifications/staff/${id}/comment` },
  { key: "producer_orgs", label: "Producer Org", apiList: "/api/v1/admin/verifications/producer-orgs", apiDetail: (id) => `/api/v1/admin/verifications/producer-orgs/${id}`, apiComment: (id) => `/api/v1/admin/verifications/producer-orgs/${id}/comment` },
];

const STATUS_OPTIONS = ["", "PENDING", "SUBMITTED", "REQUEST_CHANGES", "VERIFIED", "REJECTED", "SUSPENDED", "UNSUBMITTED"];

function Field({ label, value }) {
  return (
    <div className="d-flex justify-content-between gap-3 py-1" style={{ fontSize: 13 }}>
      <span className="text-secondary" style={{ minWidth: 140 }}>{label}</span>
      <span className="text-end fw-semibold">{String(value ?? "—")}</span>
    </div>
  );
}

function OverviewOwner({ row }) {
  return (
    <div className="d-flex flex-column gap-2">
      <Field label="Full name" value={row.fullName} />
      <Field label="Mobile" value={row.mobile || row.user?.auth?.phone} />
      <Field label="Email" value={row.email || row.user?.auth?.email} />
      <Field label="NID" value={row.nidNumber} />
      <Field label="Submitted" value={row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "—"} />
    </div>
  );
}

function OverviewOrg({ row }) {
  return (
    <div className="d-flex flex-column gap-2">
      <Field label="Organization" value={row.organizationName || row.organization?.name} />
      <Field label="Trade License" value={row.tradeLicenseNumber} />
      <Field label="TIN / BIN" value={[row.tinNumber, row.binNumber].filter(Boolean).join(" / ") || "—"} />
      <Field label="Owner User ID" value={row.organization?.ownerUserId} />
      <Field label="Submitted" value={row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "—"} />
    </div>
  );
}

function OverviewBranch({ row }) {
  return (
    <div className="d-flex flex-column gap-2">
      <Field label="Branch" value={row.branch?.name} />
      <Field label="Org ID" value={row.branch?.orgId} />
      <Field label="Manager" value={row.managerName} />
      <Field label="Submitted" value={row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "—"} />
    </div>
  );
}

function OverviewStaff({ row }) {
  return (
    <div className="d-flex flex-column gap-2">
      <Field label="Full Name" value={row.fullName} />
      <Field label="Phone" value={row.phone || row.user?.auth?.phone} />
      <Field label="Email" value={row.user?.auth?.email} />
      <Field label="Title" value={row.title} />
      <Field label="User ID" value={row.userId} />
    </div>
  );
}

function OverviewProducerOrg({ row }) {
  return (
    <div className="d-flex flex-column gap-2">
      <Field label="Organization" value={row.name} />
      <Field label="Status" value={row.status} />
      <Field label="Owner User ID" value={row.owner?.id || row.ownerUserId} />
      <Field label="Owner Email" value={row.owner?.auth?.email} />
      <Field label="Owner Phone" value={row.owner?.auth?.phone} />
      <Field label="Country" value={row.countryCode || "—"} />
      <Field label="Created" value={row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"} />
    </div>
  );
}
function RiskSignalsWidget({ entityType, entityId, row }) {
  const signals = [];
  if (row?.riskScore != null && row.riskScore > 50) signals.push({ text: `Risk score: ${row.riskScore}`, severity: "high" });
  if (!signals.length) return <div className="text-secondary small">No risk signals.</div>;
  return (
    <div className="d-flex flex-column gap-1">
      {signals.map((s, i) => (
        <div key={i} className={`badge bg-${s.severity === "high" ? "danger" : "warning"} bg-opacity-25`}>{s.text}</div>
      ))}
    </div>
  );
}

export default function VerificationInboxPage() {
  const [tab, setTab] = useState("owners");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drawer, setDrawer] = useState({ open: false, type: null, id: null });
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const conf = useMemo(() => TABS.find((t) => t.key === tab) || TABS[0], [tab]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = status ? `?status=${encodeURIComponent(status)}` : "";
      const r = await apiGet(`${conf.apiList}${q}`);
      setRows(r?.data ?? []);
    } catch (e) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [conf.apiList, status]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openDrawer = useCallback(async (type, id) => {
    setDrawer({ open: true, type, id });
    setDetail(null);
    setDetailLoading(true);
    const c = TABS.find((t) => t.key === type) || TABS[0];
    try {
      const r = await apiGet(c.apiDetail(id));
      setDetail(r?.data ?? null);
    } catch (e) {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer({ open: false, type: null, id: null });
    setDetail(null);
    loadList();
  }, [loadList]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const name = (r.fullName || r.organizationName || r.organization?.name || r.branch?.name || r.name || "").toLowerCase();
      const phone = (r.mobile || r.phone || r.user?.auth?.phone || r.owner?.auth?.phone || "").toLowerCase();
      const email = (r.email || r.user?.auth?.email || r.owner?.auth?.email || "").toLowerCase();
      const nid = (r.nidNumber || "").toLowerCase();
      const id = String(r.id ?? r.userId ?? "").toLowerCase();
      return [name, phone, email, nid, id].some((s) => s.includes(q));
    });
  }, [rows, search]);

  const buildTableRows = () => {
    if (tab === "owners") return filtered.map((r) => ({ id: r.id, type: "owners", name: r.fullName, meta: `${r.user?.auth?.phone || "—"} • User #${r.userId}`, submitted: r.submittedAt, status: r.verificationStatus || r.status || "—" }));
    if (tab === "organizations") return filtered.map((r) => ({ id: r.id, type: "organizations", name: r.organization?.name || r.organizationName || `Org #${r.orgId || r.id}`, meta: `Owner #${r.organization?.ownerUserId || "—"}`, submitted: r.submittedAt, status: r.verificationStatus || r.status || "—" }));
    if (tab === "branches") return filtered.map((r) => ({ id: r.id, type: "branches", name: r.branch?.name || `Branch #${r.branchId || r.id}`, meta: `Org #${r.branch?.orgId || "—"}`, submitted: r.submittedAt, status: r.verificationStatus || r.status || "—" }));
    if (tab === "staff") return filtered.map((r) => ({ id: r.id, type: "staff", name: r.fullName || "—", meta: `${r.phone || r.user?.auth?.phone || "—"} • User #${r.userId || "—"}`, submitted: r.createdAt, status: r.status || "INVITED" }));
    if (tab === "producer_orgs") return filtered.map((r) => ({ id: r.id, type: "producer_orgs", name: r.name || `Producer Org #${r.id}`, meta: `${r.owner?.auth?.email || r.owner?.auth?.phone || "—"} • Owner #${r.owner?.id || r.ownerUserId || "—"}`, submitted: r.createdAt, status: r.status || "PENDING" }));
    return [];
  };

  const tableRows = buildTableRows();
  const tabConf = drawer.type ? TABS.find((t) => t.key === drawer.type) : null;
  // basePath should include the ID for action endpoints (e.g., /staff/7, not /staff)
  const basePath = detail && tabConf && drawer.id ? tabConf.apiDetail(drawer.id) : "";
  const commentApi = detail && tabConf && drawer.id ? tabConf.apiComment(drawer.id) : null;

  const overview = useMemo(() => {
    if (!detail || !drawer.type) return null;
    if (drawer.type === "owners") return <OverviewOwner row={detail} />;
    if (drawer.type === "organizations") return <OverviewOrg row={detail} />;
    if (drawer.type === "branches") return <OverviewBranch row={detail} />;
    if (drawer.type === "staff") return <OverviewStaff row={detail} />;
    if (drawer.type === "producer_orgs") return <OverviewProducerOrg row={detail} />;
    return null;
  }, [detail, drawer.type]);

  const tabs = useMemo(() => {
    const t = [
      { key: "overview", label: "Overview", children: overview },
      { key: "documents", label: "Documents", children: detail?.documents?.length ? <DocGrid documents={detail.documents} /> : <div className="text-secondary small">No documents.</div> },
      { key: "activity", label: "Activity", children: <TimelineView logs={detail?.logs ?? []} /> },
      {
        key: "notes",
        label: "Notes",
        children: (
          <CommentThread
            comments={(detail?.logs ?? [])
              .filter((l) => ["COMMENT", "INTERNAL_NOTE"].includes(l.action))
              .map((l) => ({ id: l.id, author: "Admin", createdAt: l.createdAt, text: l.note, comment: l.note }))}
            onSend={async (text) => {
              if (!commentApi || !tabConf || !drawer.id) return;
              try {
                await apiPost(commentApi, { comment: text });
                const r = await apiGet(tabConf.apiDetail(drawer.id));
                setDetail(r?.data ?? null);
              } catch (e) {
                alert(e?.message ?? "Failed to send");
              }
            }}
          />
        ),
      },
    ];
    return t;
  }, [detail, overview, commentApi, drawer.id, tabConf]);

  return (
    <div className="container-fluid">
      <PageHeader
        title="Verification Inbox"
        subtitle="Unified queue for Owner, Organization, Branch, Staff, and Producer Org verification"
        right={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <a href="/admin/verifications/owners" className="btn btn-sm btn-outline-secondary">Owner list</a>
            <a href="/admin/verifications/organizations" className="btn btn-sm btn-outline-secondary">Org list</a>
            <a href="/admin/verifications/branches" className="btn btn-sm btn-outline-secondary">Branch list</a>
            <a href="/admin/verifications/staff" className="btn btn-sm btn-outline-secondary">Staff list</a>
            <a href="/admin/verifications/producer-orgs" className="btn btn-sm btn-outline-secondary">Producer orgs</a>
            <a href="/admin/verification-metrics" className="btn btn-sm btn-outline-secondary">Metrics</a>
          </div>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="d-flex flex-wrap gap-2 mb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn ${tab === t.key ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-4 col-lg-3">
          <FilterPanel title="Filters" defaultCollapsed={false}>
            <div className="d-flex flex-column gap-2">
              <label className="small text-secondary">Status</label>
              <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s || "all"} value={s}>{s || "All"}</option>
                ))}
              </select>
              <label className="small text-secondary mt-2">Search</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Name, phone, email, NID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </FilterPanel>
          <div className="mt-3">
            <SectionCard title="Risk signals">
              <RiskSignalsWidget entityType={tab} entityId={drawer.id} row={detail} />
            </SectionCard>
          </div>
        </div>

        <div className="col-12 col-md-8 col-lg-9">
          <SectionCard
            title={`${conf.label} queue`}
            right={
              <span className="text-secondary small">
                {tableRows.length} item(s)
              </span>
            }
          >
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Entity</th>
                    <th>Meta</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r) => (
                    <tr key={`${r.type}-${r.id}`} style={{ cursor: "pointer" }} onClick={() => openDrawer(r.type, r.id)}>
                      <td>
                        <div className="fw-semibold">{r.name || "—"}</div>
                        <div className="text-secondary" style={{ fontSize: 12 }}>{r.type} #{r.id}</div>
                      </td>
                      <td className="text-secondary" style={{ fontSize: 13 }}>{r.meta || "—"}</td>
                      <td style={{ fontSize: 13 }}>{r.submitted ? new Date(r.submitted).toLocaleString() : "—"}</td>
                      <td><StatusChip status={r.status} /></td>
                      <td className="text-end">
                        <button type="button" className="btn btn-sm btn-primary" onClick={(ev) => { ev.stopPropagation(); openDrawer(r.type, r.id); }}>
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!tableRows.length && !loading ? (
                    <tr><td colSpan={5} className="text-secondary text-center py-4">No items found.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {loading ? <div className="text-center text-secondary py-3">Loading...</div> : null}
          </SectionCard>
        </div>
      </div>

      <DetailDrawer
        open={drawer.open}
        onClose={closeDrawer}
        title={detail ? (detail.fullName || detail.organization?.name || detail.organizationName || detail.branch?.name || detail.name || `#${drawer.id}`) : "Review"}
        subtitle={detail && <StatusChip status={detail.verificationStatus ?? detail.status} />}
        tabs={tabs}
        loading={detailLoading}
        actionBar={
          basePath && tabConf && drawer.id ? (
            <DecisionPanel
              basePath={basePath}
              onDone={async () => {
                const r = await apiGet(tabConf.apiDetail(drawer.id));
                setDetail(r?.data ?? null);
              }}
            />
          ) : null
        }
      />
    </div>
  );
}
