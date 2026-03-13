"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAuditHistory } from "./catalogApi";
import { formatAuditDetails, formatAuditChangeLines } from "@/src/lib/displayFormatters";
import { humanizeEnum } from "@/src/lib/displayFormatters";
import { DataTableWrapper, EmptyState, ErrorState, LoadingState } from "@/src/components/dashboard";
import type { AuditEntry } from "./catalogTypes";

export default function AuditHistoryTab({
  branchId,
  entityTypeFilter,
}: {
  branchId: string;
  entityTypeFilter?: string;
}) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    getAuditHistory(branchId, { limit: 50, entityType: entityTypeFilter })
      .then((r) => setEntries(r.entries))
      .catch((e) => setError((e as Error)?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [branchId, entityTypeFilter]);

  useEffect(() => {
    reload();
  }, [reload]);

  const describeChange = (e: AuditEntry): string => {
    if (e.meta && typeof e.meta === "object") {
      const meta = e.meta as Record<string, unknown>;
      const lines = formatAuditChangeLines(meta.oldValue, meta.newValue, { field: meta.field as string });
      if (lines.length) return lines.join("; ");
    }
    if (e.oldValue != null || e.newValue != null) {
      const lines = formatAuditDetails({
        action: e.action,
        field: e.field,
        oldValue: e.oldValue,
        newValue: e.newValue,
      });
      if (lines.length) return lines.join("; ");
    }
    return humanizeEnum(e.action) || e.action || "—";
  };

  if (loading && entries.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <LoadingState message="Loading audit history…" />
        </div>
      </div>
    );
  }

  if (error && entries.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <ErrorState message={error} onRetry={reload} />
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="card radius-12">
        <div className="card-body">
          <EmptyState
            title="No audit entries"
            description="Changes to packages, services, and approval requests will appear here."
            icon="ri:file-list-3-line"
            action={
              <Link href={`/staff/branch/${branchId}/clinic/catalog`} className="btn btn-outline-primary btn-sm radius-8">
                Open catalog
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <DataTableWrapper emptyState={null}>
      <div className="table-responsive">
        <table className="table table-hover mb-0">
          <thead className="table-light">
            <tr>
              <th>Type</th>
              <th>What changed</th>
              <th>Target</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{humanizeEnum(e.type?.replace(/_/g, " "))}</td>
                <td>{describeChange(e)}</td>
                <td>
                  {(e as AuditEntry & { package?: { packageCode?: string; packageName?: string } }).package
                    ? `${(e as any).package?.packageCode ?? ""} ${(e as any).package?.packageName ?? ""}`.trim() || e.entityType + (e.entityId != null ? ` #${e.entityId}` : "")
                    : `${e.entityType ?? ""}${e.entityId != null ? ` #${e.entityId}` : ""}`.trim() || "—"}
                </td>
                <td>{e.createdAt ? new Date(e.createdAt).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DataTableWrapper>
  );
}
