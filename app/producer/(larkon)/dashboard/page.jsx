"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useLanguage } from "@/app/(public)/_lib/LanguageContext";
import { apiGet } from "@/lib/api";
import LkInput from "@larkon-ui/components/LkInput";
import LkButton from "@larkon-ui/components/LkButton";
import { useNotifications } from "@/lib/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { getProducerViewHref, getProducerNotificationPriority, getPriorityBadgeClass } from "../../_lib/producerNotificationHelpers";
import { normalizeApiError, useApiErrorPopup } from "../../_lib/apiErrorPopup";

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
    if (!status) {
      return { tone: "warning", message: t("producer.kycNotSubmitted") };
    }
    if (status === "PENDING") {
      return { tone: "warning", message: t("producer.kycPending") };
    }
    if (status === "REJECTED") {
      return { tone: "danger", message: t("producer.kycRejected") };
    }
    if (status === "SUSPENDED") {
      return { tone: "danger", message: t("producer.kycSuspended") };
    }
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
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <ApiErrorModal />
      <div className="p-4">
        <h2 className="h4 mb-3">{t("producer.dashboardTitle")}</h2>
      {gateMessage ? (
        <div className={`alert alert-${getGateMeta(kyc?.status)?.tone || "warning"} d-flex flex-wrap gap-3 align-items-center justify-content-between`}>
          <div>
            <div className="fw-semibold">KYC Status: {kyc?.status || "NOT_SUBMITTED"}</div>
            <div className="small text-secondary">{gateMessage}</div>
          </div>
          <Link href="/producer/kyc" className="btn btn-sm btn-outline-primary">
            Update KYC
          </Link>
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
            <Link href="/producer/notifications" className="btn btn-sm btn-outline-primary">
              View all
            </Link>
          </div>
          {unreadCount > 0 && (
            <p className="text-muted small mb-2">
              <strong>{unreadCount}</strong> unread
            </p>
          )}
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
                      <span className={`badge ${badgeClass} rounded-pill`} style={{ fontSize: 9 }}>
                        {priority}
                      </span>
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
        <div className="row g-3">
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
      </div>
    </>
  );
}
