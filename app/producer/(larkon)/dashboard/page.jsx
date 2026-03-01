"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useLanguage } from "@/app/(public)/_lib/LanguageContext";
import { apiGet } from "@/lib/api";
import LkInput from "@larkon-ui/components/LkInput";
import LkButton from "@larkon-ui/components/LkButton";
import { useNotifications } from "@/lib/useNotifications";
import { formatDistanceToNow, subDays, format } from "date-fns";
import { getProducerViewHref, getProducerNotificationPriority, getPriorityBadgeClass } from "../../_lib/producerNotificationHelpers";
import { normalizeApiError, useApiErrorPopup } from "../../_lib/apiErrorPopup";
import EnforcementHoldBanner from "../../_components/EnforcementHoldBanner";
import {
  producerDashboardSummary,
  producerDashboardTrends,
  producerDashboardTopProducts,
  producerDashboardAlerts,
  getProducerErrorMessage,
} from "../../_lib/producerApi";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const PRESETS = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
];

function toYYYYMMDD(d) {
  return format(d, "yyyy-MM-dd");
}

export default function ProducerDashboardPage() {
  const { t } = useLanguage();
  const { showApiErrorPopup, ApiErrorModal } = useApiErrorPopup();
  const [stats, setStats] = useState({ products: 0, batches: 0, codes: 0 });
  const [loading, setLoading] = useState(true);
  const [kyc, setKyc] = useState(null);
  const [gateMessage, setGateMessage] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [datePreset, setDatePreset] = useState("30");
  const [dateFrom, setDateFrom] = useState(() => toYYYYMMDD(subDays(new Date(), 30)));
  const [dateTo, setDateTo] = useState(() => toYYYYMMDD(new Date()));
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const { count: unreadCount, items: notificationItems, fetchList } = useNotifications({
    enabled: true,
    panel: "producer",
  });
  const latestNotifications = useMemo(() => {
    const list = [...(notificationItems || [])];
    list.sort((a, b) => {
      const aUnread = !a.readAt ? 1 : 0;
      const bUnread = !b.readAt ? 1 : 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    return list.slice(0, 5);
  }, [notificationItems]);

  useEffect(() => {
    fetchList(5, undefined, "dropdown");
  }, [fetchList]);

  const getGateMeta = (status) => {
    if (!status) return { tone: "warning", message: t("producer.kycNotSubmitted") };
    if (status === "PENDING") return { tone: "warning", message: t("producer.kycPending") };
    if (status === "REJECTED") return { tone: "danger", message: t("producer.kycRejected") };
    if (status === "SUSPENDED") return { tone: "danger", message: t("producer.kycSuspended") };
    return null;
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const kycRes = await apiGet("/api/v1/producer/kyc/status");
        const org = kycRes?.data || null;
        if (!cancelled) setKyc(org);
        const gateMeta = getGateMeta(org?.status);
        if (gateMeta) {
          if (!cancelled) {
            setGateMessage(gateMeta.message);
            setStats({ products: 0, batches: 0, codes: 0 });
          }
          return;
        }
        if (!cancelled) setGateMessage("");
        const [productsRes, batchesRes] = await Promise.all([
          apiGet("/api/v1/producer/products"),
          apiGet("/api/v1/producer/batches?limit=1"),
        ]);
        const productsTotal = productsRes?.data?.length || 0;
        const batchesTotal = batchesRes?.data?.pagination?.total || 0;
        if (!cancelled) setStats({ products: productsTotal, batches: batchesTotal, codes: 0 });
      } catch (e) {
        if (!cancelled) {
          setStats({ products: 0, batches: 0, codes: 0 });
          showApiErrorPopup(normalizeApiError(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (gateMessage) return;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const [summaryRes, trendsRes, topRes, alertsRes] = await Promise.all([
        producerDashboardSummary(dateFrom, dateTo),
        producerDashboardTrends(dateFrom, dateTo),
        producerDashboardTopProducts(dateFrom, dateTo, 10),
        producerDashboardAlerts(),
      ]);
      setSummary(summaryRes ?? null);
      setTrends(Array.isArray(trendsRes) ? trendsRes : []);
      setTopProducts(Array.isArray(topRes) ? topRes : []);
      setAlerts(Array.isArray(alertsRes) ? alertsRes : []);
    } catch (e) {
      setSummary(null);
      setTrends([]);
      setTopProducts([]);
      setAlerts([]);
      const status = e?.status ?? e?.statusCode;
      const code = e?.data?.code;
      setAnalyticsError({
        status,
        message: getProducerErrorMessage(e),
        code,
        requiredPermissions: e?.data?.requiredPermissions ?? e?.data?.required ?? ["producer.analytics.read", "producer.verification.read"],
      });
    } finally {
      setAnalyticsLoading(false);
    }
  }, [dateFrom, dateTo, gateMessage]);

  useEffect(() => {
    if (gateMessage) return;
    loadAnalytics();
  }, [loadAnalytics, gateMessage]);

  const setPreset = (key) => {
    setDatePreset(key);
    const end = new Date();
    const start = subDays(end, parseInt(key, 10) || 30);
    setDateFrom(toYYYYMMDD(start));
    setDateTo(toYYYYMMDD(end));
  };

  const showAnalytics = !gateMessage;
  const is403 = analyticsError?.status === 403;

  return (
    <>
      <ApiErrorModal />
      <div className="p-4">
        <h2 className="h4 mb-3">{t("producer.dashboardTitle")}</h2>
        <EnforcementHoldBanner />
        {gateMessage ? (
          <div className={`alert alert-${getGateMeta(kyc?.status)?.tone || "warning"} d-flex flex-wrap gap-3 align-items-center justify-content-between`}>
            <div>
              <div className="fw-semibold">KYC Status: {kyc?.status || "NOT_SUBMITTED"}</div>
              <div className="small text-secondary">{gateMessage}</div>
            </div>
            <Link href="/producer/kyc" className="btn btn-sm btn-outline-primary">Update KYC</Link>
          </div>
        ) : null}
        <div className="card mb-4">
          <div className="card-body">
            <h6 className="mb-2">Code Search</h6>
            <div className="d-flex gap-2 flex-wrap">
              <LkInput
                className="flex-grow-0"
                style={{ maxWidth: 300 }}
                placeholder="Enter code (A-Z, 0-9)"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              />
              <LkButton
                variant="outline-primary"
                size="sm"
                disabled={searchLoading || !searchCode.trim()}
                onClick={async () => {
                  setSearchLoading(true);
                  setSearchResult(null);
                  try {
                    const res = await apiGet(`/api/v1/producer/codes/search?code=${encodeURIComponent(searchCode.trim())}`);
                    setSearchResult(res?.data || null);
                  } catch (e) {
                    showApiErrorPopup(normalizeApiError(e));
                  } finally {
                    setSearchLoading(false);
                  }
                }}
              >
                {searchLoading ? "Searching..." : "Search"}
              </LkButton>
            </div>
            <div className="text-secondary small mt-2">Length 8-15, uppercase alphanumeric only.</div>
            {searchResult ? (
              <div className="mt-3 border rounded p-3">
                <div className="fw-semibold">Code: {searchResult.code}</div>
                <div className="text-secondary small">
                  Status: {searchResult.status}
                  {searchResult.isSold ? " • SOLD" : ""}
                  {!searchResult.isSold && searchResult.isVerified ? " • VERIFIED" : ""}
                </div>
                <div className="mt-2">
                  <div className="small"><strong>Product:</strong> {searchResult.product?.brandName} • {searchResult.product?.productName}</div>
                  <div className="small"><strong>Batch:</strong> {searchResult.batch?.batchNo}</div>
                  <div className="small"><strong>Verified:</strong> {searchResult.firstVerifiedAt ? new Date(searchResult.firstVerifiedAt).toLocaleString() : "—"}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="card mb-4">
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
              <h6 className="mb-0">Notifications</h6>
              <Link href="/producer/notifications" className="btn btn-sm btn-outline-primary">View all</Link>
            </div>
            {unreadCount > 0 && <p className="text-muted small mb-2"><strong>{unreadCount}</strong> unread</p>}
            {latestNotifications.length === 0 ? (
              <p className="text-muted small mb-0">No recent notifications</p>
            ) : (
              <ul className="list-unstyled mb-0 small">
                {latestNotifications.map((item) => {
                  const href = getProducerViewHref(item, { pathname: "/producer" }) || "/producer/notifications";
                  const isUnread = !item.readAt;
                  const priority = item.displayPriority ?? getProducerNotificationPriority(item.type);
                  const badgeClass = getPriorityBadgeClass(priority);
                  return (
                    <li key={item.id} className="py-2 border-bottom border-light">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <Link href={href} className={`text-decoration-none flex-grow-1 ${isUnread ? "fw-semibold text-dark" : "text-body"}`}>
                          <span className="d-block">{item.title || "Notification"}</span>
                          <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                            {item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : ""}
                          </span>
                        </Link>
                        <span className={`badge ${badgeClass} rounded-pill`} style={{ fontSize: 9 }}>{priority}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-secondary">Loading…</p>
        ) : (
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-1">Products</h6>
                  <div className="h4 mb-0">{stats.products}</div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-1">Batches</h6>
                  <div className="h4 mb-0">{stats.batches}</div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-1">Codes (MVP)</h6>
                  <div className="h4 mb-0">{stats.codes}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAnalytics && (
          <>
            <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
              <span className="text-muted small">Date range:</span>
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`btn btn-sm ${datePreset === p.key ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => setPreset(p.key)}
                >
                  {p.label}
                </button>
              ))}
              <LkInput
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value || dateFrom); setDatePreset("custom"); }}
                className="form-control form-control-sm"
                style={{ width: "auto" }}
              />
              <span className="text-muted">to</span>
              <LkInput
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value || dateTo); setDatePreset("custom"); }}
                className="form-control form-control-sm"
                style={{ width: "auto" }}
              />
              <LkButton variant="outline-primary" size="sm" onClick={loadAnalytics} disabled={analyticsLoading}>
                Refresh
              </LkButton>
            </div>

            {is403 && (
              <div className="alert alert-warning mb-4">
                <div className="fw-semibold">Analytics not available</div>
                <p className="mb-1 small">{analyticsError.message}</p>
                <p className="mb-0 small text-muted">
                  Required permission: <code>producer.analytics.read</code> or <code>producer.verification.read</code>. Ask your producer owner to grant access.
                </p>
              </div>
            )}

            {!is403 && analyticsLoading && (
              <div className="card mb-4">
                <div className="card-body">
                  <div className="placeholder-glow">
                    <div className="placeholder col-6 mb-2" style={{ height: 24 }} />
                    <div className="placeholder col-4" style={{ height: 200 }} />
                  </div>
                </div>
              </div>
            )}

            {!is403 && !analyticsLoading && analyticsError && !summary && (
              <div className="alert alert-danger mb-4">
                <div className="fw-semibold">Failed to load analytics</div>
                <p className="mb-0 small">{analyticsError.message}</p>
              </div>
            )}

            {!is403 && !analyticsLoading && summary != null && (
              <>
                <div className="row g-3 mb-4">
                  {[
                    { label: "Products", value: summary.totalProducts },
                    { label: "Active products", value: summary.activeProducts },
                    { label: "Brands", value: summary.totalBrands },
                    { label: "Batches", value: summary.totalBatches },
                    { label: "Printed codes", value: summary.printedCodes },
                    { label: "Verified codes", value: summary.verifiedCodes },
                    { label: "Pending approvals", value: summary.pendingApprovals },
                  ].map(({ label, value }) => (
                    <div key={label} className="col-6 col-md-4 col-lg">
                      <div className="card h-100">
                        <div className="card-body py-3">
                          <h6 className="mb-1 text-muted small">{label}</h6>
                          <div className="h4 mb-0">{value}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-lg-8">
                    <div className="card h-100">
                      <div className="card-body">
                        <h6 className="mb-3">Verifications over time</h6>
                        {trends.length === 0 ? (
                          <p className="text-muted small mb-0">No verification data in this range.</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={trends} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="verified" name="Verified" stroke="var(--bs-primary)" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-4">
                    <div className="card h-100">
                      <div className="card-body">
                        <h6 className="mb-3">Top products (printed vs verified)</h6>
                        {topProducts.length === 0 ? (
                          <p className="text-muted small mb-0">No product data in this range.</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart
                              data={topProducts.map((p) => ({ name: p.sku || p.name?.slice(0, 12) || "—", printed: p.printed, verified: p.verified }))}
                              layout="vertical"
                              margin={{ top: 5, right: 20, left: 50, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" tick={{ fontSize: 10 }} />
                              <YAxis type="category" dataKey="name" width={48} tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="printed" name="Printed" fill="var(--bs-secondary)" radius={[0, 2, 2, 0]} />
                              <Bar dataKey="verified" name="Verified" fill="var(--bs-primary)" radius={[0, 2, 2, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card mb-4">
                  <div className="card-body">
                    <h6 className="mb-3">Alerts</h6>
                    {alerts.length === 0 ? (
                      <p className="text-muted small mb-0">No alerts.</p>
                    ) : (
                      <ul className="list-unstyled mb-0">
                        {alerts.map((a, i) => (
                          <li key={i} className="py-2 border-bottom border-light d-flex flex-wrap align-items-center gap-2">
                            <span className={`badge bg-${a.severity === "danger" ? "danger" : a.severity === "warning" ? "warning" : "info"} text-dark`}>
                              {a.type.replace(/_/g, " ")}
                            </span>
                            <span className="fw-semibold">{a.title}</span>
                            <span className="text-muted small">{a.message}</span>
                            {a.actionUrl ? (
                              <Link href={a.actionUrl} className="btn btn-sm btn-outline-primary ms-auto">
                                View
                              </Link>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
