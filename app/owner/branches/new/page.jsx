"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BranchForm from "@/src/components/branch/BranchForm";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

// Helper to extract array from API response
function pickArray(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp.items)) return resp.items;
  if (Array.isArray(resp.data?.items)) return resp.data.items;
  return [];
}

export default function NewBranchPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrganizations() {
      try {
        setLoading(true);
        setError("");
        const data = await ownerGet("/api/v1/owner/organizations");
        const items = pickArray(data);
        setOrganizations(items);
        // Auto-select if only one organization exists
        if (items.length === 1) {
          setSelectedOrgId(String(items[0].id));
        }
      } catch (e) {
        setError(e?.message || "Failed to load organizations");
      } finally {
        setLoading(false);
      }
    }
    loadOrganizations();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="text-muted mt-3">Loading organizations...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Create New Branch"
          subtitle="Register a new branch"
          breadcrumbs={[
            { label: "Home", href: "/owner" },
            { label: "Branches", href: "/owner/branches" },
            { label: "New Branch", href: "/owner/branches/new" },
          ]}
        />
        <div className="alert alert-danger radius-12">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="dashboard-main-body">
        <PageHeader
          title="Create New Branch"
          subtitle="Register a new branch"
          breadcrumbs={[
            { label: "Home", href: "/owner" },
            { label: "Branches", href: "/owner/branches" },
            { label: "New Branch", href: "/owner/branches/new" },
          ]}
        />
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <i className="ri-building-line fs-1 text-muted mb-3 d-block" />
            <h5 className="mb-3">No Organization Found</h5>
            <p className="text-muted mb-4">
              You need to create an organization first before creating a branch.
            </p>
            <Link href="/owner/organizations/new" className="btn btn-primary radius-12">
              <i className="ri-add-line me-1" />
              Create Organization
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Create New Branch"
        subtitle="Register a new branch for your organization. Complete all steps to submit for verification."
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Branches", href: "/owner/branches" },
          { label: "New Branch", href: "/owner/branches/new" },
        ]}
        actions={[
          <Link
            key="back"
            href="/owner/branches"
            className="btn btn-outline-secondary radius-12"
          >
            <i className="ri-arrow-left-line me-1" />
            Back to Branches
          </Link>,
        ]}
      />

      {/* Organization Selection */}
      {organizations.length > 0 && (
        <div className="card radius-12 mb-24 shadow-sm">
          <div className="card-body p-24">
            <div className="d-flex align-items-center justify-content-between mb-16 flex-wrap gap-12">
              <div>
                <label className="form-label fw-semibold mb-8 d-flex align-items-center gap-8">
                  <i className="ri-building-line text-primary" style={{ fontSize: "18px" }}></i>
                  Select Organization <span className="text-danger">*</span>
                </label>
                <small className="text-muted d-block">
                  {organizations.length} {organizations.length === 1 ? "organization" : "organizations"} available
                </small>
              </div>
              {selectedOrgId && (
                <span className="badge bg-success radius-16 px-12 py-6">
                  <i className="ri-checkbox-circle-line me-1"></i>
                  Selected
                </span>
              )}
            </div>
            <select
              className="form-select radius-12"
              style={{
                padding: "12px 16px",
                fontSize: "15px",
                border: selectedOrgId ? "2px solid var(--primary)" : "1px solid #e0e0e0",
              }}
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
            >
              <option value="">Choose an organization...</option>
              {organizations.map((org) => (
                <option key={org.id} value={String(org.id)}>
                  {org.name || `Organization #${org.id}`}
                </option>
              ))}
            </select>
            {selectedOrgId && (
              <div className="mt-16 p-12 bg-light radius-8">
                <div className="fw-semibold">
                  Selected: {organizations.find((o) => String(o.id) === selectedOrgId)?.name || `Organization #${selectedOrgId}`}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Branch Form */}
      {selectedOrgId ? (
        <BranchForm
          mode="create"
          organizationId={selectedOrgId}
          onDone={() => {
            router.push("/owner/branches");
            router.refresh();
          }}
        />
      ) : (
        <div className="alert alert-info radius-12">
          <i className="ri-information-line me-2" />
          Please select an organization from the dropdown above to continue creating a branch.
        </div>
      )}
    </div>
  );
}
