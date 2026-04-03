"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Modal, Button } from "react-bootstrap";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import { grnVoid } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";

export default function OwnerGrnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = Number(params?.id);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await ownerGet<{ success?: boolean; data?: unknown }>(`/api/v1/grn/${id}`);
        const g = (res as { data?: unknown })?.data ?? res;
        if (!cancelled) setData(g);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load GRN");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function doVoid() {
    if (!id) return;
    setVoiding(true);
    try {
      await grnVoid(id, { reason: voidReason.trim() || undefined });
      toast.success("GRN voided");
      setVoidOpen(false);
      router.push("/owner/inventory/receipts");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Void failed");
    } finally {
      setVoiding(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="container-fluid py-4">
        {err && <div className="alert alert-danger">{err}</div>}
        {!err && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" />
          </div>
        )}
      </div>
    );
  }

  const po = data.purchaseOrder;
  const lines = Array.isArray(data.lines) ? data.lines : [];

  return (
    <div className="container-fluid py-4">
      <PageHeader title={`GRN #${data.id}`} subtitle={data.vendor?.name || "Receipt"} />
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link href="/owner/inventory">Inventory</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/owner/inventory/receipts">Receipts</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            GRN #{data.id}
          </li>
        </ol>
      </nav>

      <div className="row g-3 mb-3">
        <div className="col-lg-4">
          <div className="card border radius-12 h-100">
            <div className="card-body p-24">
              <div className="text-muted small">Status</div>
              <div className="mt-1 d-flex flex-wrap align-items-center gap-2">
                <span className="badge bg-primary">{data.status}</span>
                {String(data.status).toUpperCase() === "DRAFT" && (
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setVoidOpen(true)}>
                    Void draft
                  </button>
                )}
              </div>
              <hr />
              <dl className="small mb-0">
                <dt className="text-muted">Invoice</dt>
                <dd className="mb-2">{data.invoiceNo || "—"}</dd>
                <dt className="text-muted">Received</dt>
                <dd className="mb-2">
                  {data.receivedAt ? new Date(data.receivedAt).toLocaleString() : "—"}
                </dd>
                {po && (
                  <>
                    <dt className="text-muted">Purchase order</dt>
                    <dd className="mb-0">
                      <Link href={`/owner/inventory/purchase-orders/${po.id}`} className="text-decoration-none">
                        {po.poNumber}
                      </Link>
                    </dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="card border radius-12 h-100">
            <div className="card-body p-24 small">
              {data.notes && (
                <div>
                  <div className="text-muted">Notes</div>
                  <div className="border rounded p-2 bg-light mt-1">{data.notes}</div>
                </div>
              )}
              {Array.isArray(data.qcInspections) && data.qcInspections.length > 0 && (
                <div className="mt-3">
                  <div className="text-muted mb-1">QC</div>
                  <ul className="list-unstyled mb-0">
                    {data.qcInspections.map((q: any) => (
                      <li key={q.id}>
                        #{q.id} · {q.status}
                        {q.expectedQty != null ? ` · expected ${q.expectedQty}` : ""}
                      </li>
                    ))}
                  </ul>
                  <Link href="/owner/inventory/qc-queue" className="btn btn-sm btn-outline-secondary mt-2">
                    QC queue
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card border radius-12">
        <div className="card-header py-2">
          <h6 className="mb-0 fw-semibold">Lines</h6>
        </div>
        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>SKU</th>
                <th className="text-end">Qty</th>
                <th>Lot</th>
                <th>Expiry</th>
                <th>Barcode</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l: any) => (
                <tr key={l.id}>
                  <td>
                    <span className="small text-muted d-block">{l.variant?.sku}</span>
                    {l.variant?.title}
                  </td>
                  <td className="text-end">{l.quantity}</td>
                  <td className="small">{l.lot?.lotCode || l.lotCode || "—"}</td>
                  <td className="small">
                    {l.lot?.expDate || l.expDate
                      ? new Date(l.lot?.expDate || l.expDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="small">{l.supplierBarcode || l.receiveBarcode || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal show={voidOpen} onHide={() => !voiding && setVoidOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Void draft GRN</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-muted">This only applies to draft GRNs that have not been received.</p>
          <label className="form-label">Reason (optional)</label>
          <textarea
            className="form-control"
            rows={2}
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setVoidOpen(false)} disabled={voiding}>
            Cancel
          </Button>
          <Button variant="danger" onClick={doVoid} disabled={voiding}>
            {voiding ? "…" : "Void GRN"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
