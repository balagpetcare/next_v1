"use client";
// Print Batches list. See backend-api docs/producer/PRINT_SYSTEM_STATUS.md.

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { Button } from "react-bootstrap";
import ProducerPageShell from "../../../_components/ProducerPageShell";
import ProducerSectionCard from "../../../_components/ProducerSectionCard";
import { producerPrintBatchesList } from "../../../_lib/producerApi";
import { normalizeApiError, useApiErrorPopup } from "../../../_lib/apiErrorPopup";

export default function ProducerPrintBatchesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);
  const { showApiErrorPopup, ApiErrorModal } = useApiErrorPopup();

  const load = useCallback(async () => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const data = await producerPrintBatchesList();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      const status = e?.status;
      setErrorStatus(status);
      // For 404 show only the inline banner; avoid double modal
      if (status !== 404) showApiErrorPopup(normalizeApiError(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [showApiErrorPopup]);

  useEffect(() => {
    load();
  }, [load]);

  const is404 = errorStatus === 404;
  const totalBatches = items.length;
  const totalCodes = items.reduce((s, r) => s + (r.totalCodes ?? 0), 0);
  const totalRemaining = items.reduce((s, r) => s + (r.remainingCount ?? 0), 0);

  return (
    <>
      <ApiErrorModal />
      <ProducerPageShell
        title="Print Batches"
        breadcrumbs={[
          { label: "Producer", href: "/producer" },
          { label: "Print", href: "/producer/print/batches" },
          { label: "Batches" },
        ]}
        actions={
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm radius-12"
              onClick={load}
              disabled={loading}
              aria-label="Refresh"
            >
              <Icon icon="solar:refresh-outline" className="me-1" aria-hidden />
              {loading ? "Loading…" : "Refresh"}
            </button>
            <Link href="/producer/batches" className="btn btn-outline-primary btn-sm radius-12">
              <Icon icon="solar:box-outline" className="me-1" aria-hidden />
              All Batches
            </Link>
          </div>
        }
      >
        {!loading && is404 && (
          <div className="alert alert-info radius-12 mb-4">
            <strong>Print batches service is not available.</strong>
            <p className="mb-0 mt-2 small">
              Make sure the API server is running (run <code>npm run dev:api</code> in the backend-api folder). Then click Refresh.
            </p>
          </div>
        )}

        {!loading && !is404 && items.length > 0 && (
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <div className="card border-0 bg-light radius-12 h-100">
                <div className="card-body py-3">
                  <div className="small text-muted">Batches</div>
                  <div className="h4 mb-0">{totalBatches}</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card border-0 bg-light radius-12 h-100">
                <div className="card-body py-3">
                  <div className="small text-muted">Total codes</div>
                  <div className="h4 mb-0">{totalCodes}</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card border-0 bg-light radius-12 h-100">
                <div className="card-body py-3">
                  <div className="small text-muted">Remaining</div>
                  <div className="h4 mb-0">{totalRemaining}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <ProducerSectionCard title="Batches for print &amp; issuance">
          <p className="text-muted small mb-3">
            Open a batch to view issuance state, allocation history, and to allocate serials (print, download CSV, or email CSV).
          </p>

          {loading ? (
            <div className="placeholder-glow">
              <table className="table table-bordered table-sm align-middle">
                <thead>
                  <tr>
                    <th><span className="placeholder col-8" /></th>
                    <th><span className="placeholder col-6" /></th>
                    <th><span className="placeholder col-4" /></th>
                    <th><span className="placeholder col-4" /></th>
                    <th><span className="placeholder col-4" /></th>
                    <th><span className="placeholder col-6" /></th>
                    <th><span className="placeholder col-4" /></th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      <td colSpan={7}><span className="placeholder col-12" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-sm align-middle radius-12">
                <thead className="table-light">
                  <tr>
                    <th>Product</th>
                    <th>Batch No</th>
                    <th>Total</th>
                    <th>Issued</th>
                    <th>Remaining</th>
                    <th>Next serial</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5">
                        <div className="text-muted">
                          <Icon icon="solar:box-minimalistic-outline" width={32} height={32} className="mb-2 opacity-50" />
                          <p className="mb-1">No batches yet</p>
                          <p className="small mb-0">Create and generate codes from the Batches page, then they will appear here.</p>
                          <Link href="/producer/batches" className="btn btn-outline-primary btn-sm radius-12 mt-3">
                            Go to Batches
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr key={row.id}>
                        <td className="fw-medium">{row.productName ?? "—"}</td>
                        <td><code className="small">{row.batchNo ?? "—"}</code></td>
                        <td>{row.totalCodes ?? 0}</td>
                        <td>{row.allocatedCount ?? 0}</td>
                        <td>{row.remainingCount ?? 0}</td>
                        <td>{row.nextAvailableSerial != null ? String(row.nextAvailableSerial) : "—"}</td>
                        <td className="text-end">
                          <Button
                            as={Link}
                            href={`/producer/print/batches/${row.id}`}
                            variant="outline-primary"
                            size="sm"
                            className="radius-12"
                          >
                            <Icon icon="solar:login-2-outline" className="me-1" aria-hidden />
                            Open
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </ProducerSectionCard>
      </ProducerPageShell>
    </>
  );
}
