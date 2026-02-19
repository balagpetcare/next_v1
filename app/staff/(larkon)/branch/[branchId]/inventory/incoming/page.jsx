"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffGetIncomingDispatches } from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const REQUIRED_PERM = "inventory.receive";

function statusBadge(status) {
  const map = {
    IN_TRANSIT: "bg-info",
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

  const [dispatches, setDispatches] = useState([]);
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
    staffGetIncomingDispatches(branchId)
      .then((list) => {
        if (!cancelled) setDispatches(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load incoming dispatches");
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
        <h5 className="mb-0">Incoming Dispatches</h5>
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

      <Card title="Incoming" subtitle="Dispatches in transit to this branch">
        {loading ? (
          <p className="text-secondary-light">Loading...</p>
        ) : dispatches.length === 0 ? (
          <p className="text-secondary-light mb-0">No incoming dispatches.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Dispatch</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {dispatches.map((d) => {
                  const fromName = d.fromLocation?.name ?? "—";
                  const toName = d.toLocation?.name ?? "—";
                  const itemCount = (d.items ?? []).length;
                  const totalQty = (d.items ?? []).reduce((s, i) => s + (i.quantityDispatched ?? 0), 0);
                  return (
                    <tr key={d.id}>
                      <td>#{d.id}</td>
                      <td>{fromName}</td>
                      <td>{toName}</td>
                      <td>
                        <span className={`badge ${statusBadge(d.status)}`}>{d.status}</span>
                      </td>
                      <td>{itemCount} line(s), {totalQty} unit(s)</td>
                      <td>
                        <Link href={`/staff/branch/${branchId}/inventory/incoming/${d.id}`} className="btn btn-primary btn-sm">
                          Receive
                        </Link>
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
