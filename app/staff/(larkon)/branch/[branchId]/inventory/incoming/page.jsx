"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffGetIncomingInboundUnified } from "@/lib/api";
import {
  staffBranchInventoryPath,
  staffBranchPickerPath,
  staffDispatchReceiveWorkspacePath,
  staffInboundTransfersPath,
  staffReceiveCenterPath,
  staffReceiveCenterWithTransferPath,
} from "@/lib/staffInventoryRoutes";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { isWarehouseHubBranch } from "@/src/lib/branchSidebarConfig";
import {
  canReceiveStockAtBranch,
  canViewReceiveCenterPage,
  dispatchStatusBadgeClass,
} from "@/lib/inboundTransfersUi";

export default function StaffIncomingDispatchesPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const [inboundRows, setInboundRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const permissions = myAccess?.permissions ?? [];
  const isHub = useMemo(() => isWarehouseHubBranch(branch), [branch]);
  const canViewShell = useMemo(() => canViewReceiveCenterPage(permissions, isHub), [permissions, isHub]);
  const canReceive = useMemo(() => canReceiveStockAtBranch(permissions), [permissions]);
  const readOnly = canViewShell && !canReceive;

  const enterpriseRows = useMemo(() => inboundRows.filter((r) => r.kind === "DISPATCH"), [inboundRows]);
  const legacyRows = useMemo(() => inboundRows.filter((r) => r.kind === "TRANSFER"), [inboundRows]);

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    if (!branchId || !canViewShell) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    staffGetIncomingInboundUnified(branchId)
      .then((list) => {
        if (!cancelled) setInboundRows(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load incoming shipments");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, canViewShell]);

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (errorCode === "forbidden" || !hasViewPermission) {
    return (
      <AccessDenied
        title="Branch access required"
        message="You cannot open this branch, or your membership is not active. Pick another branch or contact an administrator."
        onBack={() => router.push(staffBranchPickerPath())}
      />
    );
  }

  if (!canViewShell) {
    return (
      <AccessDenied
        title="Incoming shipments unavailable"
        message="Your role does not include inbound visibility for this branch. Typical grants: inventory read, inbound read, dispatch view, or warehouse access at a hub branch."
        onBack={() => router.push(staffBranchInventoryPath(branchId))}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      {readOnly ? (
        <div className="alert alert-light border small mb-16" role="status">
          <strong>Read-only.</strong> You can review this queue and open dispatch workspaces in view mode. Receiving requires{" "}
          <span className="text-body">Receive stock</span> on your role.
        </div>
      ) : null}

      <div className="alert alert-light border small mb-16" role="status">
        <strong className="me-1">Vaccine stock:</strong>
        Receiving a dispatch with vaccine SKUs updates branch retail lots; clinical vaccine batches follow your backend bridge after receive is posted. Then map under{" "}
        <Link href={`/staff/branch/${branchId}/clinic/vaccine-mappings`}>Vaccine mapping</Link>
        {" "}before patient administration.
      </div>

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-16 mb-24">
        <h5 className="mb-0">Incoming shipments</h5>
        <div className="d-flex flex-wrap gap-8">
          <Link href={staffReceiveCenterPath(branchId)} className="btn btn-outline-primary btn-sm">
            Receive Center
          </Link>
          <Link href={staffInboundTransfersPath(branchId)} className="btn btn-outline-secondary btn-sm">
            Inbound transfers
          </Link>
          <Link href={staffBranchInventoryPath(branchId)} className="btn btn-outline-secondary btn-sm">
            Back to Inventory
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      <Card
        title="Incoming dispatches (enterprise)"
        subtitle="Primary queue: StockDispatch from warehouse. Opens the canonical receive workspace."
      >
        {loading ? (
          <p className="text-secondary-light">Loading...</p>
        ) : enterpriseRows.length === 0 ? (
          <p className="text-secondary-light mb-0 small">No enterprise dispatches.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Request</th>
                  <th>Source</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {enterpriseRows.map((row) => {
                  const itemCount = (row.items ?? []).length;
                  const totalQty = (row.items ?? []).reduce((s, i) => {
                    const q = i.quantity ?? i.quantityDispatched ?? 0;
                    return s + (typeof q === "number" ? q : 0);
                  }, 0);
                  const key = `DISPATCH-${row.id}`;
                  const workspaceHref = staffDispatchReceiveWorkspacePath(branchId, row.id, { from: "incoming" });
                  return (
                    <tr key={key}>
                      <td>#{row.id}</td>
                      <td className="small">{row.requestRef ?? "—"}</td>
                      <td className="small">{row.sourceLabel ?? row.fromLocation?.name ?? "—"}</td>
                      <td className="small">
                        <div>{row.destinationBranchName ?? "—"}</div>
                        <div className="text-muted">{row.toLocation?.name ?? ""}</div>
                      </td>
                      <td>
                        <span className={`badge ${dispatchStatusBadgeClass(row.status)}`}>{row.status}</span>
                      </td>
                      <td>
                        {itemCount} line(s), {totalQty} unit(s)
                      </td>
                      <td>
                        <Link href={workspaceHref} className="btn btn-outline-primary btn-sm me-1">
                          View
                        </Link>
                        {canReceive && row.receivable ? (
                          <Link href={workspaceHref} className="btn btn-primary btn-sm">
                            Receive
                          </Link>
                        ) : canReceive && !row.receivable ? (
                          <Link href={staffReceiveCenterPath(branchId)} className="btn btn-outline-secondary btn-sm" title="Shipment not ready to receive at destination yet">
                            Receive center
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mb-24" />

      <Card title="Legacy transfers" subtitle="StockTransfer path (older fulfillment).">
        {loading ? (
          <p className="text-secondary-light">Loading...</p>
        ) : legacyRows.length === 0 ? (
          <p className="text-secondary-light mb-0 small">No legacy transfers.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Request</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {legacyRows.map((row) => {
                  const itemCount = (row.items ?? []).length;
                  const totalQty = (row.items ?? []).reduce((s, i) => {
                    const q = i.quantity ?? i.quantityDispatched ?? 0;
                    return s + (typeof q === "number" ? q : 0);
                  }, 0);
                  const key = `TRANSFER-${row.id}`;
                  const transferHref = staffReceiveCenterWithTransferPath(branchId, row.id);
                  return (
                    <tr key={key}>
                      <td>#{row.id}</td>
                      <td className="small">{row.requestRef ?? "—"}</td>
                      <td className="small">{row.sourceLabel ?? row.fromLocation?.name ?? "—"}</td>
                      <td className="small">
                        <div>{row.destinationBranchName ?? "—"}</div>
                        <div className="text-muted">{row.toLocation?.name ?? ""}</div>
                      </td>
                      <td>
                        <span className={`badge ${dispatchStatusBadgeClass(row.status)}`}>{row.status}</span>
                      </td>
                      <td>
                        {itemCount} line(s), {totalQty} unit(s)
                      </td>
                      <td>
                        <Link href={transferHref} className="btn btn-outline-primary btn-sm me-1">
                          View
                        </Link>
                        {canReceive && row.receivable ? (
                          <Link href={transferHref} className="btn btn-primary btn-sm">
                            Receive
                          </Link>
                        ) : canReceive && !row.receivable ? (
                          <Link href={staffReceiveCenterPath(branchId)} className="btn btn-outline-secondary btn-sm" title="Transfer not ready to receive yet">
                            Receive center
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
