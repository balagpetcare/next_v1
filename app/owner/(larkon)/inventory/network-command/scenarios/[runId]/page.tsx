"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { getScenarioRun, ownerGet } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { org?: { id: number } };

export default function ScenarioRunDetailPage() {
  const params = useParams();
  const runId = Number(params?.runId);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(runId)) return;
    setError(null);
    try {
      const brRes = await ownerGet<{ data?: BranchRow[] }>("/api/v1/owner/branches");
      const list = (brRes as { data?: BranchRow[] })?.data;
      const oid = Array.isArray(list) && list[0]?.org?.id ? list[0].org.id : null;
      setOrgId(oid);
      if (!oid) return;
      const res = await getScenarioRun(runId, { orgId: oid });
      const data = (res as { data?: Record<string, unknown> })?.data ?? res;
      setRow((data as Record<string, unknown>) ?? null);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    }
  }, [runId]);

  useEffect(() => {
    load();
  }, [load]);

  const snap = row?.result as { outputsJson?: Record<string, unknown> } | undefined;
  const outputs = snap?.outputsJson;

  return (
    <>
      <PageHeader title={`Scenario run #${runId}`} subtitle="Immutable snapshot — compare baseline vs simulated stress." />
      {error && <div className="alert alert-danger">{error}</div>}
      {row && (
        <p className="small">
          Status: <strong>{String(row.status)}</strong> · Engine: <code>{String(row.engineVersion)}</code> · Hash:{" "}
          <code className="small">{String(row.inputsHash ?? "—")}</code>
        </p>
      )}
      {outputs && (
        <pre className="bg-light p-3 rounded small overflow-auto" style={{ maxHeight: 560 }}>
          {JSON.stringify(outputs, null, 2)}
        </pre>
      )}
      <p className="small text-muted">
        This output does not modify inventory. Create decision packages separately if you want an auditable approval trail.
      </p>
      <Link href="/owner/inventory/network-command/scenarios" className="btn btn-link">
        ← All runs
      </Link>
    </>
  );
}
