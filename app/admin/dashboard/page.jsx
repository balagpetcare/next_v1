"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import { apiGet } from "@/lib/api";
import StatCard from "@/src/bpa/admin/components/StatCard";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import StatusChip from "@/src/bpa/admin/components/StatusChip";
import TrendChart from "@/src/bpa/admin/components/charts/TrendChart";
import UsersOwnersBarChart from "@/src/bpa/admin/components/charts/UsersOwnersBarChart";

export default function Page() {
  const [summary, setSummary] = useState(null);
  const [queues, setQueues] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [activity, setActivity] = useState(null);
  const [liveFeed, setLiveFeed] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [sla, setSla] = useState(null);
  const [trends, setTrends] = useState(null);
  const [trendPeriod, setTrendPeriod] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, q, a, r, act, lf, al, sl, tr] = await Promise.all([
        apiGet("/api/v1/admin/dashboard/summary"),
        apiGet("/api/v1/admin/dashboard/queues"),
        apiGet("/api/v1/admin/dashboard/analytics"),
        apiGet("/api/v1/admin/dashboard/revenue?period=month"),
        apiGet("/api/v1/admin/dashboard/activity?limit=10"),
        apiGet("/api/v1/admin/dashboard/live-feed?limit=20"),
        apiGet("/api/v1/admin/dashboard/alerts"),
        apiGet("/api/v1/admin/dashboard/sla"),
        apiGet(`/api/v1/admin/dashboard/trends?period=${trendPeriod}`),
      ]);
      setSummary(s?.data ?? null);
      setQueues(q?.data ?? null);
      setAnalytics(a?.data ?? null);
      setRevenue(r?.data ?? null);
      setActivity(act?.data ?? null);
      setLiveFeed(lf?.data ?? null);
      setAlerts(al?.data ?? null);
      setSla(sl?.data ?? null);
      setTrends(tr?.data ?? null);
    } catch (e) {
      setError(e?.message ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [trendPeriod]);

  useEffect(() => {
    load();
  }, [load]);

  const kpi = useMemo(() => {
    const owners = summary?.owners ?? {};
    const orgs = summary?.organizations ?? {};
    const branches = summary?.branches ?? {};
    return {
      ownerPending: owners.SUBMITTED ?? 0,
      branchPending: branches.SUBMITTED ?? 0,
      orgPending: orgs.SUBMITTED ?? 0,
      ownerNeedFix: owners.REQUEST_CHANGES ?? 0,
      walletWithdraw: summary?.wallet?.withdrawSubmitted ?? 0,
    };
  }, [summary]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", minimumFractionDigits: 0 }).format(
      amount ?? 0
    );

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-BD", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const trendSeries = useMemo(() => trends?.series ?? [], [trends]);

  return (
    <div className="container-fluid">
      <PageHeader
        title="Admin Dashboard"
        subtitle="System overview, analytics, and review queues"
        right={
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="d-flex btn-group btn-group-sm">
              <button
                type="button"
                className={`btn ${trendPeriod === 7 ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setTrendPeriod(7)}
              >
                7d
              </button>
              <button
                type="button"
                className={`btn ${trendPeriod === 30 ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setTrendPeriod(30)}
              >
                30d
              </button>
            </div>
            <a className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1" href="/admin/analytics">
              <Icon icon="solar:export-outline" />
              Export
            </a>
            <button
              type="button"
              className="btn btn-outline-primary d-flex align-items-center gap-2"
              onClick={load}
              disabled={loading}
            >
              <Icon icon="solar:refresh-outline" />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {/* Verification KPIs */}
      <div className="row g-3 mb-3">
        <div className="col-12">
          <h6 className="text-secondary mb-2">Verification Queue</h6>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard
            title="Owner KYC Pending"
            value={kpi.ownerPending}
            href="/admin/verifications/owners?status=SUBMITTED"
            icon={<Icon icon="solar:user-id-bold" />}
            tone="warning"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard
            title="Branch Pending"
            value={kpi.branchPending}
            href="/admin/verifications/branches?status=SUBMITTED"
            icon={<Icon icon="solar:shop-2-bold" />}
            tone="warning"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard
            title="Org Pending"
            value={kpi.orgPending}
            href="/admin/verifications/organizations?status=SUBMITTED"
            icon={<Icon icon="solar:buildings-bold" />}
            tone="primary"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard
            title="Withdraw Requests"
            value={kpi.walletWithdraw}
            subtitle="Submitted"
            href="/admin/wallet"
            icon={<Icon icon="solar:wallet-money-bold" />}
            tone="info"
          />
        </div>
      </div>

      {/* SLA cards */}
      {sla && (
        <div className="row g-3 mb-3">
          <div className="col-12">
            <h6 className="text-secondary mb-2">SLA</h6>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="Avg verification time"
              value={sla.avgVerificationHours != null ? `${sla.avgVerificationHours}h` : "—"}
              icon={<Icon icon="solar:clock-circle-bold" />}
              tone="info"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="Verification pending"
              value={sla.verificationPendingCount ?? 0}
              href="/admin/verifications"
              icon={<Icon icon="solar:user-id-bold" />}
              tone="warning"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="Ticket avg response"
              value={sla.ticketAvgResponseHours != null ? `${sla.ticketAvgResponseHours}h` : "—"}
              icon={<Icon icon="solar:chat-round-dots-bold" />}
              tone="primary"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="Delivery on-time %"
              value={sla.deliveryOnTimePercent != null ? `${sla.deliveryOnTimePercent}%` : "—"}
              icon={<Icon icon="solar:delivery-bold" />}
              tone="success"
            />
          </div>
        </div>
      )}

      {/* System Totals */}
      {analytics?.totals && (
        <div className="row g-3 mb-3">
          <div className="col-12">
            <h6 className="text-secondary mb-2">System Overview</h6>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Total Owners" value={analytics.totals.owners} icon={<Icon icon="solar:user-bold" />} tone="primary" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="Total Organizations"
              value={analytics.totals.organizations}
              icon={<Icon icon="solar:buildings-bold" />}
              tone="primary"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="Total Branches"
              value={analytics.totals.branches}
              icon={<Icon icon="solar:shop-2-bold" />}
              tone="primary"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="Total Users"
              value={analytics.totals.users}
              icon={<Icon icon="solar:users-group-rounded-bold" />}
              tone="primary"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Total Products" value={analytics.totals.products} icon={<Icon icon="solar:box-bold" />} tone="success" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Total Orders" value={analytics.totals.orders} icon={<Icon icon="solar:cart-bold" />} tone="success" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard title="Total Staff" value={analytics.totals.staff} icon={<Icon icon="solar:user-id-bold" />} tone="info" />
          </div>
        </div>
      )}

      {/* Revenue Analytics */}
      {analytics?.revenue && (
        <div className="row g-3 mb-3">
          <div className="col-12">
            <h6 className="text-secondary mb-2">Revenue Analytics</h6>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="Today's Revenue"
              value={formatCurrency(analytics.revenue.today)}
              icon={<Icon icon="solar:wallet-money-bold" />}
              tone="success"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="This Week"
              value={formatCurrency(analytics.revenue.week)}
              icon={<Icon icon="solar:chart-bold" />}
              tone="success"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="This Month"
              value={formatCurrency(analytics.revenue.month)}
              icon={<Icon icon="solar:chart-2-bold" />}
              tone="success"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard
              title="Last Month"
              value={formatCurrency(analytics.revenue.lastMonth)}
              icon={<Icon icon="solar:calendar-bold" />}
              tone="info"
            />
          </div>
        </div>
      )}

      {/* Operational Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="row g-3 mb-3">
          <div className="col-12">
            <SectionCard title="Operational Alerts">
              <div className="d-flex flex-column gap-2">
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    className={`d-flex align-items-center justify-content-between p-2 rounded ${a.severity === "high" ? "bg-danger bg-opacity-10" : a.severity === "medium" ? "bg-warning bg-opacity-10" : "bg-primary bg-opacity-10"}`}
                  >
                    <div>
                      <span className="fw-semibold">{a.title}</span>
                      <span className="text-secondary ms-2" style={{ fontSize: 13 }}>
                        {a.description}
                      </span>
                    </div>
                    {a.actionHref ? (
                      <a className="btn btn-sm btn-outline-secondary" href={a.actionHref}>
                        View
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Trend charts + Live Monitor */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-8">
          <TrendChart data={trendSeries} period={trendPeriod} loading={loading} />
        </div>
        <div className="col-12 col-lg-4">
          <SectionCard title="Live Operations Monitor" right={<a href="/admin/live-monitor" className="btn btn-sm btn-outline-secondary">Open</a>}>
            <div className="d-flex flex-column gap-2" style={{ maxHeight: 320, overflowY: "auto" }}>
              {liveFeed && liveFeed.length > 0 ? (
                liveFeed.slice(0, 15).map((e) => (
                  <div key={e.id} className="d-flex align-items-start gap-2 p-2 border-bottom">
                    <div className="flex-shrink-0">
                      {e.eventType === "order" && <Icon icon="solar:cart-bold" className="text-success" />}
                      {e.eventType === "verification" && <Icon icon="solar:user-id-bold" className="text-warning" />}
                      {e.eventType === "withdraw" && <Icon icon="solar:wallet-money-bold" className="text-info" />}
                      {e.eventType === "user" && <Icon icon="solar:user-bold" className="text-primary" />}
                    </div>
                    <div className="flex-grow-1" style={{ fontSize: 13 }}>
                      <div className="fw-semibold">{e.title}</div>
                      <div className="text-secondary" style={{ fontSize: 12 }}>
                        {e.description}
                      </div>
                      <div className="text-secondary" style={{ fontSize: 11 }}>
                        {formatDate(e.date)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-secondary mb-0 small">No live events.</p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-6">
          <UsersOwnersBarChart data={trendSeries} period={trendPeriod} loading={loading} />
        </div>
        <div className="col-12 col-lg-6">
          <SectionCard title="Quick Actions">
            <div className="d-grid gap-2">
              <a className="btn btn-outline-primary" href="/admin/verifications">
                <Icon icon="solar:inbox-bold" className="me-2" />
                Open Verification Inbox
              </a>
              <a className="btn btn-outline-secondary" href="/admin/audit">
                <Icon icon="solar:clipboard-list-bold" className="me-2" />
                Open Tickets / Audit
              </a>
              <a className="btn btn-outline-secondary" href="/admin/analytics">
                <Icon icon="solar:export-outline" className="me-2" />
                Export Daily Report
              </a>
              <a className="btn btn-outline-secondary" href="/admin/verifications/owners">
                Owner KYC Queue
              </a>
              <a className="btn btn-outline-secondary" href="/admin/verifications/branches">
                Branch Verification Queue
              </a>
              <a className="btn btn-outline-secondary" href="/admin/verifications/organizations">
                Organization Queue
              </a>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-8">
          <SectionCard
            title="My Review Queue"
            right={
              <a href="/admin/verifications" className="btn btn-sm btn-outline-secondary">
                Open Verifications
              </a>
            }
          >
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {buildQueueRows(queues).map((r) => (
                    <tr key={r.key}>
                      <td style={{ width: 120 }}>
                        <span className="text-secondary" style={{ fontSize: 13 }}>
                          {r.type}
                        </span>
                      </td>
                      <td>
                        <div className="fw-semibold" style={{ fontSize: 14 }}>
                          {r.title}
                        </div>
                        {r.meta ? (
                          <div className="text-secondary" style={{ fontSize: 12 }}>
                            {r.meta}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <StatusChip status={r.status} />
                      </td>
                      <td className="text-end">
                        <a className="btn btn-sm btn-primary" href={r.href}>
                          Review
                        </a>
                      </td>
                    </tr>
                  ))}
                  {!buildQueueRows(queues).length ? (
                    <tr>
                      <td colSpan={4} className="text-secondary" style={{ fontSize: 13 }}>
                        No pending items.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div className="col-12 col-xl-4">
          <SectionCard title="Recent Activity">
            <div className="d-flex flex-column gap-2">
              {activity && activity.length > 0 ? (
                activity.map((act, idx) => (
                  <div key={idx} className="d-flex align-items-start gap-2 p-2 border-bottom">
                    <div className="flex-shrink-0">
                      {act.type === "verification" && <Icon icon="solar:user-id-bold" className="text-warning" />}
                      {act.type === "order" && <Icon icon="solar:cart-bold" className="text-success" />}
                      {act.type === "user" && <Icon icon="solar:user-bold" className="text-primary" />}
                    </div>
                    <div className="flex-grow-1" style={{ fontSize: 13 }}>
                      <div className="fw-semibold">{act.title}</div>
                      <div className="text-secondary">{act.description}</div>
                      <div className="text-secondary-light" style={{ fontSize: 11 }}>
                        {formatDate(act.date)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-secondary text-center py-3" style={{ fontSize: 13 }}>
                  No recent activity
                </div>
              )}
            </div>
            <div className="mt-2">
              <a href="/admin/analytics" className="btn btn-sm btn-outline-secondary w-100">
                View All Activity
              </a>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function buildQueueRows(queues) {
  const out = [];
  const owner = queues?.ownerQueue ?? [];
  const org = queues?.orgQueue ?? [];
  const branch = queues?.branchQueue ?? [];

  for (const o of owner) {
    out.push({
      key: `OWNER-${o.id}`,
      type: "Owner",
      title: o.fullName ?? `Owner KYC #${o.id}`,
      meta: `${o.user?.auth?.phone ?? "—"} • User #${o.userId}`,
      status: o.verificationStatus,
      href: `/admin/verifications/owners/${o.id}`,
    });
  }
  for (const o of org) {
    out.push({
      key: `ORG-${o.id}`,
      type: "Org",
      title: o.organization?.name ?? `Organization #${o.orgId ?? o.id}`,
      meta: `Owner #${o.organization?.ownerUserId ?? "—"}`,
      status: o.verificationStatus,
      href: `/admin/verifications/organizations/${o.id}`,
    });
  }
  for (const b of branch) {
    out.push({
      key: `BRANCH-${b.id}`,
      type: "Branch",
      title: b.branch?.name ?? `Branch #${b.branchId ?? b.id}`,
      meta: `Org #${b.branch?.orgId ?? "—"}`,
      status: b.verificationStatus,
      href: `/admin/verifications/branches/${b.id}`,
    });
  }

  return out.slice(0, 20);
}
