"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { purchaseRequisitionAction, purchaseRequisitionGet } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";

export default function PurchaseRequisitionDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const toast = useToast();
  const [orgId, setOrgId] = useState<number | null>(null);
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!id || Number.isNaN(id)) return;
    setLoading(true);
    try {
      const data = await purchaseRequisitionGet(id, orgId ?? undefined);
      setRow(data);
    } catch (e: any) {
      setRow(null);
      if (e?.message) toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, orgId, toast]);

  useEffect(() => {
    (async () => {
      const me = await ownerGet<{ organizations?: { id: number }[] }>("/api/v1/owner/me");
      const orgs = me?.organizations ?? (me as any)?.data?.organizations ?? [];
      if (orgs[0]?.id) setOrgId(orgs[0].id);
    })();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: "submit" | "approve" | "reject" | "convert-to-po") {
    if (acting) return;
    setActing(true);
    try {
      const body =
        action === "reject" ? { reason: window.prompt("Reason?") || "Rejected" } : action === "convert-to-po" ? {} : {};
      await purchaseRequisitionAction(id, action, { ...body, orgId });
      toast.success("Updated");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="container-fluid py-4">
      <PageHeader title={row?.prNumber ? `Requisition ${row.prNumber}` : "Requisition"} subtitle="Workflow and PO conversion." />
      <div className="d-flex flex-wrap gap-2 mb-3">
        <Link href="/owner/inventory/purchase-requisitions" className="btn btn-outline-secondary btn-sm">
          ← All requisitions
        </Link>
        {row?.status === "DRAFT" ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={acting}
            onClick={() => act("submit")}
          >
            Submit
          </button>
        ) : null}
        {row?.status === "SUBMITTED" ? (
          <>
            <button type="button" className="btn btn-success btn-sm" disabled={acting} onClick={() => act("approve")}>
              Approve
            </button>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              disabled={acting}
              onClick={() => act("reject")}
            >
              Reject
            </button>
          </>
        ) : null}
        {row?.status === "APPROVED" ? (
          <button
            type="button"
            className="btn btn-warning btn-sm text-dark"
            disabled={acting}
            onClick={() => act("convert-to-po")}
          >
            Convert to PO
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : !row ? (
        <p className="text-danger">Not found.</p>
      ) : (
        <div className="row g-3">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white fw-semibold">Lines</div>
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Requested</th>
                      <th>Converted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(row.lines || []).map((l: any) => (
                      <tr key={l.id}>
                        <td>{l.variant?.sku}</td>
                        <td>{l.requestedQty}</td>
                        <td>{l.convertedQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body small">
                <div className="mb-2">
                  <span className="text-muted">Status</span>
                  <div className="fw-semibold">{row.status}</div>
                </div>
                <div className="mb-2">
                  <span className="text-muted">Vendor</span>
                  <div>{row.vendor?.name ?? "—"}</div>
                </div>
                {row.notes ? (
                  <div>
                    <span className="text-muted">Notes</span>
                    <div>{row.notes}</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
