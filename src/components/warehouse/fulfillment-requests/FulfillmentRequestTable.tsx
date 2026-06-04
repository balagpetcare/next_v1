"use client";

import Link from "next/link";
import { Dropdown } from "react-bootstrap";
import type { FulfillmentRequestQueueRow, RowQuickAction } from "@/src/lib/staffFulfillmentRequestsUi";
import {
  buildFulfillmentRowQuickActions,
  formatShortRelative,
  fulfillmentRequestNextStepBadgeClass,
  fulfillmentRequestStatusBadgeClass,
  fulfillmentRequestStatusLabel,
  sumRequestedQty,
} from "@/src/lib/staffFulfillmentRequestsUi";

function DispatchHint({ row }: { row: FulfillmentRequestQueueRow }) {
  const st = String(row.status || "").toUpperCase();
  if (["PARTIALLY_DISPATCHED", "FULFILLED_PARTIAL"].includes(st)) {
    return <span className="text-warning small d-block mt-1">Follow up partial fulfillment</span>;
  }
  return null;
}

export function FulfillmentRequestTable(props: {
  branchId: string;
  items: FulfillmentRequestQueueRow[];
  loading: boolean;
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (p: number) => void;
  onCopyRequest: (id: number) => void;
}) {
  const { branchId, items, loading, page, limit, totalPages, totalCount, onPageChange, onCopyRequest } = props;

  if (loading) {
    return (
      <div className="card radius-12 border">
        <div className="table-responsive" style={{ minHeight: 320 }}>
          <table className="table table-sm align-middle mb-0">
            <tbody className="placeholder-glow">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td>
                    <span className="placeholder col-2 rounded" />
                  </td>
                  <td>
                    <span className="placeholder col-10 rounded" />
                  </td>
                  <td>
                    <span className="placeholder col-8 rounded" />
                  </td>
                  <td>
                    <span className="placeholder col-6 rounded" />
                  </td>
                  <td>
                    <span className="placeholder col-5 rounded" />
                  </td>
                  <td>
                    <span className="placeholder col-6 rounded" />
                  </td>
                  <td>
                    <span className="placeholder col-4 rounded" />
                  </td>
                  <td>
                    <span className="placeholder col-6 rounded" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="card radius-12 border">
      <div className="table-responsive">
        <table className="table table-hover table-sm align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th className="px-3 text-muted" style={{ width: 48 }}>
                SL
              </th>
              <th className="px-3">Request</th>
              <th className="px-3">Branch / destination</th>
              <th className="px-3">Created</th>
              <th className="px-3">Status</th>
              <th className="px-3">Next step</th>
              <th className="text-end px-3">Lines / qty</th>
              <th className="text-end px-3" style={{ minWidth: 200 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted py-5">
                  No rows on this page.
                </td>
              </tr>
            ) : (
              items.map((row, idx) => {
                const sl = (page - 1) * limit + idx + 1;
                const created = row.createdAt ? new Date(row.createdAt).toLocaleString() : "—";
                const rel = formatShortRelative(row.createdAt);
                const lines = row._meta?.lineCount ?? row.items?.length ?? 0;
                const qty = sumRequestedQty(row);
                const nextLabel = row.warehouseAction?.nextActionLabel ?? "—";
                const primary = buildFulfillmentRowQuickActions(row, branchId)[0];

                return (
                  <tr key={row.id}>
                    <td className="text-muted small px-3">{sl}</td>
                    <td className="px-3">
                      <div className="fw-semibold">Request #{row.id}</div>
                      <div className="small text-muted">
                        {created}
                        {rel ? <span className="ms-1">· {rel}</span> : null}
                      </div>
                      {row.procurementNote ? (
                        <div className="small text-muted text-truncate" style={{ maxWidth: 280 }} title={row.procurementNote}>
                          {row.procurementNote}
                        </div>
                      ) : null}
                      <div className="small text-muted">ID #{row.id}</div>
                    </td>
                    <td className="px-3">
                      <div className="fw-medium">{row.branch?.name ?? "—"}</div>
                      <div className="small text-muted">
                        {(row._meta?.dispatchCount ?? 0) > 0
                          ? `${row._meta?.dispatchCount} dispatch(es)`
                          : "No dispatch yet"}
                      </div>
                    </td>
                    <td className="small px-3">
                      <div>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}</div>
                      <div className="text-muted">{row.requester?.profile?.displayName ?? ""}</div>
                    </td>
                    <td className="px-3">
                      <span className={`badge ${fulfillmentRequestStatusBadgeClass(row.status)}`}>
                        {fulfillmentRequestStatusLabel(row.status)}
                      </span>
                      {row.urgency ? (
                        <span className="badge bg-light text-dark border ms-1">{String(row.urgency)}</span>
                      ) : null}
                    </td>
                    <td className="px-3">
                      <span className={`badge ${fulfillmentRequestNextStepBadgeClass(nextLabel)}`}>{nextLabel}</span>
                      <DispatchHint row={row} />
                    </td>
                    <td className="text-end small px-3">
                      <div className="fw-medium">{lines} lines</div>
                      <div className="text-muted">{qty} units</div>
                    </td>
                    <td className="text-end px-3">
                      <div className="d-flex flex-wrap gap-1 justify-content-end">
                        {primary?.href ? (
                          <Link href={primary.href} className="btn btn-sm btn-primary">
                            {primary.label}
                          </Link>
                        ) : null}
                        <Link
                          href={`/staff/branch/${branchId}/warehouse/requests/${row.id}`}
                          className="btn btn-sm btn-outline-secondary"
                        >
                          Hub
                        </Link>
                        <Dropdown align="end">
                          <Dropdown.Toggle variant="outline-secondary" size="sm" id={`fr-act-${row.id}`}>
                            More
                          </Dropdown.Toggle>
                          <Dropdown.Menu>
                            {buildFulfillmentRowQuickActions(row, branchId).map((a: RowQuickAction) => {
                              if (a.copyId) {
                                return (
                                  <Dropdown.Item
                                    key={a.key}
                                    as="button"
                                    type="button"
                                    onClick={() => onCopyRequest(row.id)}
                                  >
                                    {a.label}
                                  </Dropdown.Item>
                                );
                              }
                              if (!a.href) return null;
                              return (
                                <Dropdown.Item key={a.key} href={a.href}>
                                  {a.label}
                                </Dropdown.Item>
                              );
                            })}
                            <Dropdown.Item
                              href={`/staff/branch/${branchId}/warehouse/requests/${row.id}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open hub in new tab
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="card-footer py-2 px-3 d-flex align-items-center justify-content-between border-top">
        {totalPages > 1 ? (
          <>
            <span className="small text-muted">
              Page {page} of {totalPages}
              {totalCount > 0 ? ` · ${totalCount} total` : ""}
            </span>
            <div className="btn-group btn-group-sm">
              <button type="button" className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                Prev
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <span className="small text-muted">{totalCount > 0 ? `${totalCount} result${totalCount === 1 ? "" : "s"}` : ""}</span>
        )}
      </div>
    </div>
  );
}
