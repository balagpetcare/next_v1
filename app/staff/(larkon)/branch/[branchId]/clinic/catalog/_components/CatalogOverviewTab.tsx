"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/src/components/dashboard";
import { getAuditHistory } from "./catalogApi";
import { formatAuditChangeLines } from "@/src/lib/displayFormatters";
import { humanizeEnum } from "@/src/lib/displayFormatters";
import type { CatalogSummary } from "./catalogTypes";
import type { AuditEntry } from "./catalogTypes";

export default function CatalogOverviewTab({
  branchId,
  summary,
  summaryLoading,
  onNavigateTab,
}: {
  branchId: string;
  summary: CatalogSummary | null;
  summaryLoading: boolean;
  onNavigateTab?: (tab: string) => void;
}) {
  const [recent, setRecent] = useState<AuditEntry[]>([]);

  const loadRecent = useCallback(() => {
    getAuditHistory(branchId, { limit: 5 })
      .then((r) => setRecent(r.entries))
      .catch(() => setRecent([]));
  }, [branchId]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const describeEntry = (e: AuditEntry): string => {
    if (e.meta && typeof e.meta === "object") {
      const meta = e.meta as Record<string, unknown>;
      const lines = formatAuditChangeLines(meta.oldValue, meta.newValue, { field: meta.field as string });
      if (lines.length) return lines[0];
    }
    return humanizeEnum(e.action) || e.action || "—";
  };

  return (
    <div className="row g-3">
      <div className="col-12">
        <div className="row g-3">
          <div className="col-6 col-md-4 col-lg">
            <StatCard
              label="Branch catalog items"
              value={summaryLoading ? "—" : String(summary?.totalCatalogItems ?? 0)}
              variant="primary"
              onClick={onNavigateTab ? () => onNavigateTab("catalog-items") : undefined}
            />
          </div>
          <div className="col-6 col-md-4 col-lg">
            <StatCard
              label="Active services"
              value={summaryLoading ? "—" : String(summary?.activeServices ?? 0)}
              variant="info"
              onClick={onNavigateTab ? () => onNavigateTab("services") : undefined}
            />
          </div>
          <div className="col-6 col-md-4 col-lg">
            <StatCard
              label="Active packages"
              value={summaryLoading ? "—" : String(summary?.totalPackages ?? 0)}
              variant="success"
              onClick={onNavigateTab ? () => onNavigateTab("packages") : undefined}
            />
          </div>
          <div className="col-6 col-md-4 col-lg">
            <StatCard
              label="Pending approvals"
              value={summaryLoading ? "—" : String(summary?.pendingApprovalRequests ?? 0)}
              variant="warning"
              onClick={onNavigateTab ? () => onNavigateTab("approval-requests") : undefined}
            />
          </div>
          <div className="col-6 col-md-4 col-lg">
            <StatCard label="Draft packages" value={summaryLoading ? "—" : String(summary?.draftPackages ?? 0)} variant="secondary" />
          </div>
          <div className="col-6 col-md-4 col-lg">
            <StatCard
              label="Active promotions"
              value={summaryLoading ? "—" : String(summary?.discountCampaignsRunning ?? 0)}
              variant="info"
              onClick={onNavigateTab ? () => onNavigateTab("promotions") : undefined}
            />
          </div>
          <div className="col-6 col-md-4 col-lg">
            <StatCard
              label="Mapped doctors"
              value={summaryLoading ? "—" : String(summary?.mappedDoctors ?? 0)}
              variant="secondary"
              onClick={onNavigateTab ? () => onNavigateTab("doctor-mapping") : undefined}
            />
          </div>
        </div>
      </div>
      <div className="col-12 col-lg-6">
        <div className="card radius-12 h-100">
          <div className="card-header bg-transparent border-0 pt-3">
            <h6 className="mb-0">Recent activity</h6>
          </div>
          <div className="card-body pt-0">
            {recent.length === 0 ? (
              <p className="text-muted small mb-0">No recent activity.</p>
            ) : (
              <ul className="list-unstyled mb-0 small">
                {recent.map((e) => (
                  <li key={e.id} className="d-flex justify-content-between gap-2 py-2 border-bottom border-light">
                    <span>{describeEntry(e)}</span>
                    <span className="text-muted">{e.createdAt ? new Date(e.createdAt).toLocaleString() : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <div className="col-12 col-lg-6">
        <div className="card radius-12 h-100">
          <div className="card-header bg-transparent border-0 pt-3">
            <h6 className="mb-0">Quick actions</h6>
          </div>
          <div className="card-body pt-0 d-flex flex-wrap gap-2">
            <Link href={`/staff/branch/${branchId}/clinic/catalog?tab=catalog-items&action=add-master`} className="btn btn-outline-primary btn-sm radius-8">
              Add from Master Catalog
            </Link>
            <Link href={`/staff/branch/${branchId}/clinic/catalog?tab=packages&action=create-package`} className="btn btn-outline-success btn-sm radius-8">
              Create Package
            </Link>
            <Link href={`/staff/branch/${branchId}/clinic/catalog?tab=services`} className="btn btn-outline-secondary btn-sm radius-8">
              Manage Services
            </Link>
            <Link href={`/staff/branch/${branchId}/clinic/catalog?tab=approval-requests`} className="btn btn-outline-warning btn-sm radius-8">
              View Approvals
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
