"use client";

import { useState, useMemo } from "react";
import { staffDoctorAuditLog } from "@/lib/api";
import AuditTimelinePanel from "../AuditTimelinePanel";

type Props = {
  branchId: string;
  memberId: number;
  auditLog: { items: any[]; total: number };
  loading?: boolean;
  permissions: string[];
};

const PAGE_SIZE = 50;

export default function AuditTab({
  branchId,
  memberId,
  auditLog,
  loading,
}: Props) {
  const [actionFilter, setActionFilter] = useState("");
  const [extraItems, setExtraItems] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const allItems = useMemo(() => [...(auditLog?.items ?? []), ...extraItems], [auditLog?.items, extraItems]);
  const actions = useMemo(() => Array.from(new Set(allItems.map((e: any) => e.action).filter(Boolean))), [allItems]);
  const filtered = actionFilter ? allItems.filter((e: any) => e.action === actionFilter) : allItems;
  const total = auditLog?.total ?? 0;
  const hasMore = allItems.length < total;

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await staffDoctorAuditLog(branchId, memberId, { limit: PAGE_SIZE, offset: allItems.length });
      const items = res?.items ?? [];
      setExtraItems((prev) => [...prev, ...items]);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="card radius-12">
      <div className="card-body">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <h6 className="mb-0">Audit log</h6>
          {actions.length > 0 && (
            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          )}
        </div>

        {loading && !allItems.length ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="text-muted mt-2 mb-0">Loading audit log...</p>
          </div>
        ) : (
          <>
            <AuditTimelinePanel items={filtered} />
            {hasMore && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <span className="text-muted small">Showing {filtered.length} of {total}</span>
                <button type="button" className="btn btn-outline-secondary btn-sm radius-8" disabled={loadingMore} onClick={loadMore}>
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
