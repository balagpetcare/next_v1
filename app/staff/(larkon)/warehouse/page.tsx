"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMeBranchAccess } from "@/lib/api";
import { getAuthMeBase } from "@/lib/authRedirect";
import { useToast } from "@/src/hooks/useToast";

type BranchCandidate = {
  branchId: number;
  branchName: string;
  branchType: string;
  role: string;
  status: string;
};

const WAREHOUSE_BRANCH_TYPES = new Set([
  "WAREHOUSE",
  "CENTRAL_WAREHOUSE",
  "WAREHOUSE_DC",
  "DISTRIBUTION_CENTER",
  "DELIVERY_HUB",
  "HUB",
  "DELIVERY",
]);

const WAREHOUSE_ROLES = new Set([
  "WAREHOUSE_MANAGER",
  "SUPERVISOR",
  "INVENTORY_CONTROLLER",
  "RECEIVING_STAFF",
  "PICKING_STAFF",
  "PACKING_STAFF",
  "DISPATCH_STAFF",
  "RETURNS_STAFF",
]);

function normalize(v: string | null | undefined): string {
  return String(v || "").trim().toUpperCase();
}

async function fetchAuthMePermissions(): Promise<string[]> {
  const res = await fetch(`${getAuthMeBase()}/api/v1/auth/me`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const payload = await res.json().catch(() => ({}));
  const perms = payload?.permissions ?? payload?.data?.permissions ?? [];
  return Array.isArray(perms) ? perms.map((p: unknown) => String(p)) : [];
}

export default function StaffWarehouseLandingPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<BranchCandidate[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [{ branches }, permissions] = await Promise.all([getMeBranchAccess(), fetchAuthMePermissions()]);
        if (cancelled) return;

        const permSet = new Set(permissions);
        const hasWarehousePerm =
          permSet.has("warehouse.view") ||
          permSet.has("warehouse.dashboard.view") ||
          permSet.has("dispatch.view") ||
          permSet.has("delivery.view");

        const approved = (Array.isArray(branches) ? branches : []).filter((b) => normalize(b.status) === "APPROVED");
        const warehouseCandidates = approved.filter((b) => {
          const branchType = normalize(b.branchType);
          const role = normalize(b.role);
          return WAREHOUSE_BRANCH_TYPES.has(branchType) || WAREHOUSE_ROLES.has(role) || hasWarehousePerm;
        });

        setCandidates(warehouseCandidates);
        if (warehouseCandidates.length === 1) {
          router.replace(`/staff/branch/${warehouseCandidates[0].branchId}/warehouse`);
          return;
        }
        if (warehouseCandidates.length === 0) {
          router.replace("/staff/branch");
          return;
        }
      } catch (e: any) {
        if (cancelled) return;
        const message = e?.message || "Failed to resolve warehouse landing";
        setError(message);
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, toast]);

  const sortedCandidates = useMemo(
    () => [...candidates].sort((a, b) => a.branchName.localeCompare(b.branchName)),
    [candidates]
  );

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">Loading warehouse access…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="card border">
          <div className="card-body">
            <div className="alert alert-danger mb-0">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (sortedCandidates.length === 0) return null;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">Select Warehouse Branch</h4>
        <Link href="/staff/branch" className="btn btn-sm btn-outline-secondary">
          All Branches
        </Link>
      </div>
      <div className="row g-3">
        {sortedCandidates.map((item) => (
          <div key={item.branchId} className="col-12 col-md-6 col-xl-4">
            <div className="card border h-100">
              <div className="card-body">
                <h6 className="mb-1">{item.branchName}</h6>
                <div className="small text-muted mb-3">
                  {item.branchType || "WAREHOUSE"} • {item.role}
                </div>
                <Link href={`/staff/branch/${item.branchId}/warehouse`} className="btn btn-primary btn-sm">
                  Open Dashboard
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
