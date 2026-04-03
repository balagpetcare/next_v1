"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { inboundDiscrepanciesList, inboundDiscrepancyResolve } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";

export default function InboundDiscrepanciesPage() {
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await ownerGet<{ organizations?: { id: number }[] }>("/api/v1/owner/me");
      const orgs = me?.organizations ?? (me as any)?.data?.organizations ?? [];
      if (orgs[0]?.id) setOrgId(orgs[0].id);
    })();
  }, []);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const res = await inboundDiscrepanciesList({ orgId: orgId ?? undefined, status: "OPEN", limit: 100 });
        if (!c) setItems(res.items || []);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [orgId]);

  async function resolve(id: number) {
    try {
      await inboundDiscrepancyResolve(id, { orgId, resolutionNote: window.prompt("Resolution note?") || undefined });
      toast.success("Resolved");
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  }

  return (
    <div className="container-fluid py-4">
      <PageHeader title="Inbound discrepancies" subtitle="Short, damage, and wrong-item cases tied to GRNs." />
      <Link href="/owner/inventory/receipts" className="btn btn-outline-secondary btn-sm mb-3">
        ← Receipts
      </Link>
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="table-responsive card border-0 shadow-sm">
          <table className="table mb-0">
            <thead className="table-light">
              <tr>
                <th>Type</th>
                <th>Qty</th>
                <th>Variant</th>
                <th>GRN</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>{row.discrepancyType}</td>
                  <td>{row.quantity}</td>
                  <td>{row.variant?.sku}</td>
                  <td>#{row.grn?.id}</td>
                  <td className="text-end">
                    <button type="button" className="btn btn-sm btn-outline-success" onClick={() => resolve(row.id)}>
                      Resolve
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No open discrepancies.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
