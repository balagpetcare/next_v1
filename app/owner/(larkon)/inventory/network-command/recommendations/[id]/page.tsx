"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { getDecisionPackage, ownerGet } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { org?: { id: number } };

export default function DecisionPackageDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [pkg, setPkg] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    setError(null);
    try {
      const brRes = await ownerGet<{ data?: BranchRow[] }>("/api/v1/owner/branches");
      const list = (brRes as { data?: BranchRow[] })?.data;
      const oid = Array.isArray(list) && list[0]?.org?.id ? list[0].org.id : null;
      setOrgId(oid);
      if (!oid) return;
      const res = await getDecisionPackage(id, { orgId: oid });
      const data = (res as { data?: Record<string, unknown> })?.data ?? res;
      setPkg((data as Record<string, unknown>) ?? null);
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const items = (pkg?.items as Array<Record<string, unknown>>) ?? [];
  const events = (pkg?.approvalEvents as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <PageHeader title={`Decision package #${id}`} subtitle="Evidence and governance trail" />
      {error && <div className="alert alert-danger">{error}</div>}
      {pkg && (
        <>
          <p>
            <strong>Status:</strong> {String(pkg.status)} &nbsp;
            <strong>Policy:</strong> <code>{String(pkg.policyVersion)}</code>
          </p>
          <h6>Line items</h6>
          {items.map((it) => (
            <div key={String(it.id)} className="card mb-2 border-0 shadow-sm">
              <div className="card-body py-2">
                <div className="fw-semibold">{String(it.title)}</div>
                <div className="small text-muted">{String(it.actionType)} · score {String(it.score)}</div>
                <pre className="small bg-light p-2 rounded mt-2 mb-0 overflow-auto" style={{ maxHeight: 220 }}>
                  {JSON.stringify(it.evidenceJson ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          ))}
          <h6 className="mt-4">Audit trail</h6>
          <ul className="small">
            {events.map((ev) => (
              <li key={String(ev.id)}>
                {String(ev.eventType)} @ {String(ev.createdAt)}{" "}
                {ev.comment ? `— ${String(ev.comment)}` : ""}
              </li>
            ))}
          </ul>
        </>
      )}
      <Link href="/owner/inventory/network-command/recommendations" className="btn btn-link">
        ← Back
      </Link>
    </>
  );
}
