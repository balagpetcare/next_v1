"use client";

import { Suspense, useState, useEffect } from "react";
import { ownerDelete, ownerGet } from "@/app/owner/_lib/ownerApi";
import EntityListPage from "@/app/owner/_components/shared/EntityListPage";
import { useEntityList } from "@/app/owner/_hooks/useEntityList";
import { useEntityFilters } from "@/app/owner/_hooks/useEntityFilters";
import { getEntityConfig } from "@/app/owner/_lib/entityConfig";
import StatusBadge from "@/app/owner/_components/StatusBadge";

function OwnerOrganizationsContent() {
  const config = getEntityConfig("organization");
  const { filters, updateFilter } = useEntityFilters(config);
  const { data, loading, error, stats, refresh } = useEntityList(config, filters);
  const [verificationByOrgId, setVerificationByOrgId] = useState({});
  const [vLoading, setVLoading] = useState(false);

  // Load verification statuses for organizations
  useEffect(() => {
    if (!data || data.length === 0) {
      setVerificationByOrgId({});
      return;
    }

    let cancelled = false;
    setVLoading(true);

    (async () => {
      const next = {};
      await Promise.all(
        data.map(async (o) => {
          if (cancelled) return;
          try {
            const q = new URLSearchParams();
            q.set("entityType", "ORGANIZATION");
            q.set("entityId", String(o.id));
            const j = await ownerGet(
              `/api/v1/owner/verification-case?${q.toString()}`,
            );
            const d = j?.data ?? j;
            next[o.id] = String(d?.status || "DRAFT").toUpperCase();
          } catch {
            next[o.id] = "DRAFT";
          }
        }),
      );
      if (!cancelled) setVerificationByOrgId(next);
    })();

    setVLoading(false);
    return () => {
      cancelled = true;
    };
  }, [data]);

  // Enrich data with verification status
  const enrichedData = data.map((org) => ({
    ...org,
    verificationStatus: verificationByOrgId[org.id] || org.verificationStatus || "DRAFT",
  }));

  const handleDelete = async (id) => {
    const ok = window.confirm(
      "Archive this organization?\n\n(No hard delete. This will set status to SUSPENDED and deactivate branches.)"
    );
    if (!ok) return;
    try {
      await ownerDelete(`/api/v1/owner/organizations/${id}`);
      await refresh();
    } catch (e) {
      alert(e?.message || "Failed to archive");
    }
  };

  return (
    <EntityListPage
      title="Organizations"
      subtitle="Create an organization, then create branches under it."
      entityType="organizations"
      config={config}
      data={enrichedData}
      loading={loading || vLoading}
      error={error}
      stats={stats}
      onCreateHref="/owner/organizations/new"
      onCreateLabel="New Organization"
      onRefresh={refresh}
      filters={filters}
      onFilterChange={updateFilter}
      renderCustomActions={() => (
        <span className="text-secondary" style={{ fontSize: 12 }}>
          {vLoading ? "Syncing verification…" : ""}
        </span>
      )}
      tableProps={{
        actionItems: (item) => [
          {
            label: "View Details",
            href: `/owner/organizations/${item.id}`,
            icon: "solar:eye-outline",
          },
          {
            label: "View Branches",
            href: `/owner/organizations/${item.id}/branches`,
            icon: "solar:shop-2-outline",
          },
          {
            divider: true,
          },
          {
            label: "Edit",
            href: `/owner/organizations/${item.id}/edit`,
            icon: "solar:pen-outline",
          },
          {
            divider: true,
          },
          {
            label: "Archive",
            onClick: (e) => {
              e.stopPropagation();
              handleDelete(item.id);
            },
            icon: "solar:archive-outline",
            variant: "danger",
          },
        ],
        renderCustomCell: (item, column) => {
          if (column.key === "verificationStatus") {
            return (
              <StatusBadge
                status={item.verificationStatus || "DRAFT"}
              />
            );
          }
          return undefined;
        },
      }}
    />
  );
}

export default function OwnerOrganizationsPage() {
  return (
    <Suspense fallback={<div className="container py-4 text-secondary">Loading…</div>}>
      <OwnerOrganizationsContent />
    </Suspense>
  );
}
