"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffGetIncomingInboundUnified } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const REQUIRED_PERM = "inventory.receive";

function statusBadge(status) {
  const map = {
    IN_TRANSIT: "bg-info",
    SENT: "bg-info",
    DELIVERED: "bg-success",
    CREATED: "bg-secondary",
    PACKED: "bg-warning text-dark",
  };
  return map[status] ?? "bg-secondary";
}

export default function StaffIncomingDispatchesPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);

  const [inboundRows, setInboundRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const permissions = myAccess?.permissions ?? [];
  const canReceive = permissions.includes(REQUIRED_PERM);

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    if (!branchId) return;
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
    return () => { cancelled = true; };
  }, [branchId]);

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }
  if (errorCode === "forbidden" || !hasViewPermission || !canReceive) {
    return (
      <AccessDenied
        missingPerm={REQUIRED_PERM}
        onBack={() => router.push(`/staff/branch/${branchId}/inventory`)}
      />
    );
  }

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-16 mb-24">
        <h5 className="mb-0">Incoming shipments</h5>
        <Link href={`/staff/branch/${branchId}/inventory`} className="btn btn-outline-primary btn-sm">
          Back to Inventory
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      <Card
        title="Incoming"
        subtitle="Dispatches and in-transit transfers. Full receive UI: Receive Center."
      >
        {loading ? (
          <p className="text-secondary-light">Loading...</p>
        ) : inboundRows.length === 0 ? (
          <p className="text-secondary-light mb-0">No incoming shipments.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>ID</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inboundRows.map((row) => {
                  const fromName = row.fromLocation?.name ?? "—";
                  const toName = row.toLocation?.name ?? "—";
                  const itemCount = (row.items ?? []).length;
                  const totalQty = (row.items ?? []).reduce((s, i) => {
                    const q = i.quantity ?? i.quantityDispatched ?? 0;
                    return s + (typeof q === "number" ? q : 0);
                  }, 0);
                  const isDispatch = row.kind === "DISPATCH";
                  const key = `${row.kind}-${row.id}`;
                  return (
                    <tr key={key}>
                      <td>{isDispatch ? "Dispatch" : "Transfer"}</td>
                      <td>#{row.id}</td>
                      <td>{fromName}</td>
                      <td>{toName}</td>
                      <td>
                        <span className={`badge ${statusBadge(row.status)}`}>{row.status}</span>
                      </td>
                      <td>{itemCount} line(s), {totalQty} unit(s)</td>
                      <td>
                        {isDispatch && row.receivable ? (
                          <Link href={`/staff/branch/${branchId}/inventory/incoming/${row.id}`} className="btn btn-primary btn-sm">
                            Receive
                          </Link>
                        ) : (
                          <Link href={`/staff/branch/${branchId}/inventory/receive`} className="btn btn-outline-primary btn-sm">
                            Receive Center
                          </Link>
                        )}
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
