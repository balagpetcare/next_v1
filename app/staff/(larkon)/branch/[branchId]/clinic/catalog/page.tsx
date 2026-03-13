"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace, PageHeader, LoadingState, StatCard } from "@/src/components/dashboard";
import { getCatalogSummary } from "./_components/catalogApi";
import type { CatalogSummary } from "./_components/catalogTypes";
import CatalogOverviewTab from "./_components/CatalogOverviewTab";
import CatalogItemsTab from "./_components/CatalogItemsTab";
import ServicesTab from "./_components/ServicesTab";
import ProductsTab from "./_components/ProductsTab";
import ClinicalItemsTab from "./_components/ClinicalItemsTab";
import PackagesTab from "./_components/PackagesTab";
import PromotionsTab from "./_components/PromotionsTab";
import DoctorMappingTab from "./_components/DoctorMappingTab";
import ApprovalRequestsTab from "./_components/ApprovalRequestsTab";
import AuditHistoryTab from "./_components/AuditHistoryTab";
import PackageFormDrawer from "./_components/PackageFormDrawer";

const CATALOG_PERMS = ["clinic.catalog.view", "clinic.catalog.search", "clinic.catalog.branch_add"];
const TAB_KEYS = [
  "overview",
  "catalog-items",
  "services",
  "products",
  "clinical-items",
  "packages",
  "promotions",
  "doctor-mapping",
  "approval-requests",
  "audit-history",
] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  "catalog-items": "Catalog Items",
  services: "Services",
  products: "Products",
  "clinical-items": "Clinical Items",
  packages: "Packages",
  promotions: "Promotions & Discounts",
  "doctor-mapping": "Doctor Mapping",
  "approval-requests": "Approval Requests",
  "audit-history": "Audit History",
};

export default function StaffClinicCatalogPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const tabParam = searchParams.get("tab");
  const actionParam = searchParams.get("action");

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [summary, setSummary] = useState<CatalogSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = CATALOG_PERMS.some((p) => permissions.includes(p));
  const canBranchAdd = permissions.includes("clinic.catalog.branch_add");
  const canManagePackages = permissions.includes("clinic.packages.write") || permissions.includes("clinic.packages.read");
  const canEditPackages = permissions.includes("clinic.packages.write");
  const canManageServices = permissions.includes("clinic.appointments.manage");
  const canManageDiscount = permissions.includes("clinic.discount.approve");
  const canViewApprovals = permissions.includes("approvals.view");
  const canManageApprovals = permissions.includes("approvals.manage");

  const loadSummary = useCallback(async () => {
    if (!branchId || !hasAccess) return;
    setSummaryLoading(true);
    try {
      const data = await getCatalogSummary(branchId);
      setSummary(data ?? null);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [branchId, hasAccess]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (tabParam && TAB_KEYS.includes(tabParam as TabKey)) setActiveTab(tabParam as TabKey);
  }, [tabParam]);

  useEffect(() => {
    if (actionParam === "add-master") setActiveTab("catalog-items");
    if (actionParam === "create-package") setActiveTab("packages");
  }, [actionParam]);

  const createPackageOpen = actionParam === "create-package";

  if (ctxLoading) {
    return (
      <PageWorkspace>
        <LoadingState message="Loading..." />
      </PageWorkspace>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        missingPerm="clinic.catalog.view"
        onBack={() => router.push(`/staff/branch/${branchId}/clinic`)}
      />
    );
  }

  const clinicName = branch?.name ?? "Clinic";

  return (
    <PageWorkspace>
      <div className="row g-0">
        <div className="col-12">
          <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
          <PageHeader
            title="Branch Clinic Catalog & Package Management"
            subtitle={clinicName}
            breadcrumbs={[
              { label: "Clinic", href: `/staff/branch/${branchId}/clinic` },
              { label: "Catalog" },
            ]}
            actions={
              <>
                {canBranchAdd && (
                  <Link
                    href={`/staff/branch/${branchId}/clinic/catalog?tab=catalog-items&action=add-master`}
                    className="btn btn-primary btn-sm radius-8"
                  >
                    Add from Master Catalog
                  </Link>
                )}
                {canManagePackages && (
                  <Link
                    href={`/staff/branch/${branchId}/clinic/catalog?tab=packages&action=create-package`}
                    className="btn btn-outline-primary btn-sm radius-8"
                  >
                    Create Package
                  </Link>
                )}
                {canViewApprovals && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm radius-8"
                    onClick={() => setActiveTab("approval-requests")}
                  >
                    View Pending Approvals
                  </button>
                )}
              </>
            }
          />

          <div className="card radius-12 mb-3">
            <div className="card-body p-24">
              <div className="row align-items-center g-3">
                <div className="col-12 col-md">
                  <small className="text-muted">Branch ID: {branchId}</small>
                </div>
                <div className="col-12 col-md-4">
                  <input
                    type="search"
                    className="form-control form-control-sm radius-8"
                    placeholder="Quick search..."
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    aria-label="Quick search"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-6 col-md-4 col-lg">
              <StatCard
                label="Branch Catalog Items"
                value={summaryLoading ? "—" : String(summary?.totalCatalogItems ?? "—")}
                variant="primary"
                onClick={() => setActiveTab("catalog-items")}
              />
            </div>
            <div className="col-6 col-md-4 col-lg">
              <StatCard
                label="Active Services"
                value={summaryLoading ? "—" : String(summary?.activeServices ?? "—")}
                variant="info"
                onClick={() => setActiveTab("services")}
              />
            </div>
            <div className="col-6 col-md-4 col-lg">
              <StatCard
                label="Active Packages"
                value={summaryLoading ? "—" : String(summary?.totalPackages ?? "—")}
                variant="success"
                onClick={() => setActiveTab("packages")}
              />
            </div>
            <div className="col-6 col-md-4 col-lg">
              <StatCard
                label="Pending Approvals"
                value={summaryLoading ? "—" : String(summary?.pendingApprovalRequests ?? "—")}
                variant="warning"
                onClick={() => setActiveTab("approval-requests")}
              />
            </div>
            <div className="col-6 col-md-4 col-lg">
              <StatCard
                label="Draft Packages"
                value={summaryLoading ? "—" : String(summary?.draftPackages ?? "—")}
                variant="secondary"
                onClick={() => setActiveTab("packages")}
              />
            </div>
            <div className="col-6 col-md-4 col-lg">
              <StatCard
                label="Active Promotions"
                value={summaryLoading ? "—" : String(summary?.discountCampaignsRunning ?? "—")}
                variant="info"
                onClick={() => setActiveTab("promotions")}
              />
            </div>
            <div className="col-6 col-md-4 col-lg">
              <StatCard
                label="Mapped Doctors"
                value={summaryLoading ? "—" : String(summary?.mappedDoctors ?? "—")}
                variant="secondary"
                onClick={() => setActiveTab("doctor-mapping")}
              />
            </div>
          </div>

          <ul className="nav nav-tabs nav-tabs-card mb-3" role="tablist">
            {TAB_KEYS.map((key) => (
              <li key={key} className="nav-item" role="presentation">
                <button
                  type="button"
                  className={`nav-link radius-12 me-1 ${activeTab === key ? "active" : ""}`}
                  onClick={() => setActiveTab(key)}
                  role="tab"
                  aria-selected={activeTab === key}
                >
                  {TAB_LABELS[key]}
                </button>
              </li>
            ))}
          </ul>

          {activeTab === "overview" && (
            <CatalogOverviewTab
              branchId={branchId}
              summary={summary}
              summaryLoading={summaryLoading}
              onNavigateTab={(tab) => setActiveTab(tab as TabKey)}
            />
          )}
          {activeTab === "catalog-items" && (
            <CatalogItemsTab branchId={branchId} search={quickSearch} canBranchAdd={canBranchAdd} />
          )}
          {activeTab === "services" && (
            <ServicesTab branchId={branchId} canManage={canManageServices} />
          )}
          {activeTab === "products" && (
            <ProductsTab branchId={branchId} search={quickSearch} canBranchAdd={canBranchAdd} />
          )}
          {activeTab === "clinical-items" && (
            <ClinicalItemsTab branchId={branchId} search={quickSearch} canBranchAdd={canBranchAdd} />
          )}
          {activeTab === "packages" && (
            <PackagesTab
              branchId={branchId}
              canManage={!!canManagePackages}
              canEdit={!!canEditPackages}
            />
          )}
          {canManagePackages && (
            <PackageFormDrawer
              branchId={branchId}
              open={createPackageOpen}
              onClose={() => router.push(`/staff/branch/${branchId}/clinic/catalog?tab=packages`)}
              onSaved={(pkg) => router.push(`/staff/branch/${branchId}/clinic/catalog/packages/${pkg.id}`)}
            />
          )}
          {activeTab === "promotions" && (
            <PromotionsTab branchId={branchId} canManage={canManageDiscount} />
          )}
          {activeTab === "doctor-mapping" && <DoctorMappingTab branchId={branchId} />}
          {activeTab === "approval-requests" && (
            <ApprovalRequestsTab branchId={branchId} canManage={canManageApprovals} />
          )}
          {activeTab === "audit-history" && <AuditHistoryTab branchId={branchId} />}
        </div>
      </div>
    </PageWorkspace>
  );
}
