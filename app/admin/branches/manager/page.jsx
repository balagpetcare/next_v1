"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import StatCard from "@/src/bpa/admin/components/StatCard";
import StatusChip from "@/src/bpa/admin/components/StatusChip";
import { branchManagerApi } from "@/lib/adminApi";

export default function BranchManagerDashboardEntry() {
  const router = useRouter();
  const [managed, setManaged] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await branchManagerApi.managedBranches();
        const rows = res?.data ?? [];
        if (!cancelled) {
          setManaged(rows);
          // Auto-redirect if only one managed branch
          if (rows.length === 1) {
            router.replace(`/admin/branches/${rows[0].branchId}`);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Failed to load managed branches");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const primaryTypes = useMemo(
    () =>
      new Map(
        managed.map((b) => {
          const t = Array.isArray(b.types) && b.types.length > 0 ? b.types[0] : null;
          return [b.branchId, t];
        }),
      ),
    [managed],
  );

  const handleOpen = (branchId) => {
    router.push(`/admin/branches/${branchId}`);
  };

  return (
    <div className="container-fluid">
      <PageHeader
        title="Branch Manager Dashboard"
        subtitle="Select a branch to view manager controls, KPIs, and staff overview"
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <SectionCard
        title="Managed Branches"
        subtitle="Branches where you are assigned as Branch Manager or Organization Owner"
        right={
          <button
            type="button"
            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
            onClick={() => window.location.reload()}
            disabled={loading}
          >
            <Icon icon="solar:refresh-outline" />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        }
      >
        {loading && managed.length === 0 ? (
          <div className="text-muted small">Loading managed branches...</div>
        ) : null}

        {!loading && managed.length === 0 ? (
          <div className="alert alert-info mb-0">
            You are not assigned as a Branch Manager for any branch yet, or your branch access is
            still pending approval.
          </div>
        ) : null}

        <div className="row g-3">
          {managed.map((b) => {
            const t = primaryTypes.get(b.branchId);
            const typeLabel = t?.nameEn || t?.code || "Branch";
            return (
              <div className="col-12 col-md-6 col-xl-4" key={b.branchId}>
                <StatCard
                  title={b.name}
                  subtitle={typeLabel}
                  value={b.features?.pos || b.features?.appointments ? "Active" : ""}
                  icon={<Icon icon="solar:shop-2-bold" />}
                  tone="primary"
                  href={undefined}
                  onClick={() => handleOpen(b.branchId)}
                  footer={
                    <div className="d-flex align-items-center justify-content-between">
                      <StatusChip
                        size="sm"
                        tone="info"
                        label={`Org #${b.orgId}`}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                        onClick={() => handleOpen(b.branchId)}
                      >
                        <Icon icon="solar:arrow-right-up-bold" />
                        Open
                      </button>
                    </div>
                  }
                />
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

