"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { adminVerificationsApi } from "@/lib/adminApi";
import AdminPageShell from "@/src/bpa/admin/components/AdminPageShell";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import StatusChip from "@/src/bpa/admin/components/StatusChip";
import {
  VERIFICATION_ENTITY_CONFIG,
  VERIFICATION_ENTITY_KEYS,
  VerificationEntityKey,
  getVerificationDetailHref,
  getVerificationListHref,
  mapLogEntityTypeToKey,
  normalizeVerificationEntityKey,
} from "@/src/bpa/admin/components/verification-center/config";

type StatsResponse = {
  generatedAt: string;
  totals: {
    total: number;
    pending: number;
    approvedToday: number;
    rejectedToday: number;
  };
  entities: Record<
    string,
    {
      key: string;
      label: string;
      total: number;
      pending: number;
      approvedToday: number;
      rejectedToday: number;
    }
  >;
  recentActivity: Array<{
    id: number;
    entityType: string;
    entityId: number;
    action: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    note?: string | null;
    createdAt: string;
  }>;
};

function toDateText(value: unknown) {
  if (!value) return "—";
  try {
    return new Date(String(value)).toLocaleString();
  } catch {
    return String(value);
  }
}

function KpiCard({
  title,
  value,
  variant,
}: {
  title: string;
  value: unknown;
  variant?: "primary" | "success" | "danger" | "secondary";
}) {
  const colorClass =
    variant === "success"
      ? "text-success"
      : variant === "danger"
        ? "text-danger"
        : variant === "secondary"
          ? "text-secondary"
          : "text-primary";
  return (
    <div className="card radius-12">
      <div className="card-body">
        <div className="small text-secondary">{title}</div>
        <div className={`fs-4 fw-bold ${colorClass}`}>{String(value ?? 0)}</div>
      </div>
    </div>
  );
}

export default function VerificationOverviewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [quickEntity, setQuickEntity] = useState<VerificationEntityKey>("owners");
  const [quickSearch, setQuickSearch] = useState("");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (!tabParam) return;
    const entityKey = normalizeVerificationEntityKey(tabParam);
    if (!entityKey) return;

    const openId = Number(searchParams.get("open"));
    const status = searchParams.get("status");
    const q = searchParams.get("q") || searchParams.get("search");
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (q) sp.set("search", q);

    if (Number.isFinite(openId) && openId > 0) {
      router.replace(getVerificationDetailHref(entityKey, openId));
      return;
    }
    const query = sp.toString();
    router.replace(`${getVerificationListHref(entityKey)}${query ? `?${query}` : ""}`);
  }, [router, searchParams]);

  useEffect(() => {
    setLoading(true);
    setError("");
    adminVerificationsApi
      .stats()
      .then((response) => {
        setStats((response?.data || null) as StatsResponse | null);
      })
      .catch((e) => {
        setError((e as Error)?.message || "Failed to load verification stats");
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const entityCards = useMemo(() => {
    if (!stats?.entities) return [];
    return VERIFICATION_ENTITY_KEYS.map((key) => {
      const item = stats.entities[key];
      return {
        key,
        label: VERIFICATION_ENTITY_CONFIG[key].label,
        total: Number(item?.total || 0),
        pending: Number(item?.pending || 0),
        approvedToday: Number(item?.approvedToday || 0),
      };
    });
  }, [stats]);

  const handleQuickSearch = (event: FormEvent) => {
    event.preventDefault();
    const sp = new URLSearchParams();
    if (quickSearch.trim()) sp.set("search", quickSearch.trim());
    router.push(`${getVerificationListHref(quickEntity)}${sp.toString() ? `?${sp}` : ""}`);
  };

  return (
    <AdminPageShell
      title="Verification Center Overview"
      breadcrumbs={[{ label: "Governance" }, { label: "Verification Center" }]}
      actions={
        <Link href="/admin/verification-metrics" className="btn btn-sm btn-outline-primary">
          Metrics
        </Link>
      }
    >
      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="row g-3 mb-3">
        <div className="col-12 col-md-6 col-xl-3">
          <KpiCard title="Pending Verifications" value={stats?.totals?.pending ?? 0} variant="primary" />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <KpiCard title="Approved Today" value={stats?.totals?.approvedToday ?? 0} variant="success" />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <KpiCard title="Rejected Today" value={stats?.totals?.rejectedToday ?? 0} variant="danger" />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <KpiCard title="Total Cases" value={stats?.totals?.total ?? 0} variant="secondary" />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-4">
          <SectionCard title="Quick Search">
            <form onSubmit={handleQuickSearch} className="d-flex flex-column gap-2">
              <label className="small text-secondary">Entity</label>
              <select
                className="form-select form-select-sm"
                value={quickEntity}
                onChange={(e) =>
                  setQuickEntity(
                    normalizeVerificationEntityKey(e.target.value) || "owners"
                  )
                }
              >
                {VERIFICATION_ENTITY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {VERIFICATION_ENTITY_CONFIG[key].label}
                  </option>
                ))}
              </select>

              <label className="small text-secondary mt-2">Search</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Name, phone, email, ID, license..."
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
              />

              <button type="submit" className="btn btn-sm btn-primary mt-2">
                Open Queue
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Entity Queues" className="mt-3">
            <div className="d-flex flex-column gap-2">
              {entityCards.map((item) => (
                <Link
                  key={item.key}
                  href={getVerificationListHref(item.key)}
                  className="d-flex justify-content-between align-items-center border rounded p-2 text-decoration-none"
                >
                  <span>{item.label}</span>
                  <span className="badge bg-primary">{item.pending} pending</span>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="col-12 col-xl-8">
          <SectionCard
            title="Recent Verification Activity"
            right={
              <span className="small text-secondary">
                Updated: {toDateText(stats?.generatedAt)}
              </span>
            }
          >
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Entity</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.recentActivity || []).map((log) => {
                    const entityKey = mapLogEntityTypeToKey(log.entityType);
                    const href = entityKey
                      ? getVerificationDetailHref(entityKey, log.entityId)
                      : null;
                    return (
                      <tr key={log.id}>
                        <td className="small">{toDateText(log.createdAt)}</td>
                        <td>
                          <div className="fw-semibold">{log.entityType}</div>
                          <div className="text-secondary small">#{log.entityId}</div>
                        </td>
                        <td>
                          <StatusChip status={log.toStatus || log.fromStatus || ""} />
                        </td>
                        <td>
                          {href ? (
                            <Link href={href} className="btn btn-sm btn-outline-secondary">
                              Review
                            </Link>
                          ) : (
                            <span className="text-secondary small">N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!stats?.recentActivity?.length && !loading ? (
                    <tr>
                      <td colSpan={4} className="text-center text-secondary py-4">
                        No recent activity found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {loading ? <div className="text-center text-secondary py-3">Loading...</div> : null}
          </SectionCard>
        </div>
      </div>
    </AdminPageShell>
  );
}
