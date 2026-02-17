"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

function pickArray(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp.items)) return resp.items;
  if (Array.isArray(resp.data?.items)) return resp.data.items;
  return [];
}

export default function OrganizationBranchesPage() {
  const params = useParams();
  const orgId = useMemo(() => String(params?.id || ""), [params]);

  const [branches, setBranches] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        // Load organization and branches in parallel
        const [orgData, branchesData] = await Promise.all([
          ownerGet(`/api/v1/owner/organizations/${orgId}`),
          ownerGet(`/api/v1/owner/organizations/${orgId}/branches`),
        ]);

        const org = pickArray([orgData])[0] || orgData?.data || orgData;
        const branchesList = pickArray(branchesData);

        setOrganization(org);
        setBranches(branchesList);
      } catch (e) {
        setError(e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    if (orgId) {
      loadData();
    }
  }, [orgId]);

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={`Branches - ${organization?.name || "Organization"}`}
        subtitle="Manage branches for this organization"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Organizations", href: "/owner/organizations" },
          { label: organization?.name || "Organization", href: `/owner/organizations/${orgId}` },
          { label: "Branches", href: `/owner/organizations/${orgId}/branches` },
        ]}
        actions={[
          <Link
            key="new"
            href={`/owner/organizations/${orgId}/branches/new`}
            className="btn btn-primary radius-12"
          >
            <i className="ri-add-line me-1" />
            New Branch
          </Link>,
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      ) : branches.length === 0 ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <i className="ri-store-line fs-1 text-muted mb-3 d-block" />
            <h5 className="mb-3">No Branches Found</h5>
            <p className="text-muted mb-4">Create your first branch for this organization.</p>
            <Link href={`/owner/organizations/${orgId}/branches/new`} className="btn btn-primary radius-12">
              <i className="ri-add-line me-1" />
              Create Branch
            </Link>
          </div>
        </div>
      ) : (
        <div className="card radius-12">
          <div className="card-body p-24">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Branch Name</th>
                    <th>Types</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((branch) => (
                    <tr key={branch.id}>
                      <td>
                        <div className="fw-semibold">{branch.name || `Branch #${branch.id}`}</div>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-2">
                          {Array.isArray(branch.types) &&
                            branch.types.slice(0, 2).map((type, idx) => (
                              <span key={idx} className="badge bg-primary-light text-primary radius-8">
                                {type?.type?.nameEn || type?.code || "Unknown"}
                              </span>
                            ))}
                          {Array.isArray(branch.types) && branch.types.length > 2 && (
                            <span className="badge bg-secondary radius-8">
                              +{branch.types.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-success radius-8">
                          {branch.status || "ACTIVE"}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Link
                            href={`/owner/organizations/${orgId}/branches/${branch.id}`}
                            className="btn btn-sm btn-outline-primary radius-12"
                          >
                            <i className="ri-eye-line" />
                          </Link>
                          <Link
                            href={`/owner/organizations/${orgId}/branches/${branch.id}/edit`}
                            className="btn btn-sm btn-outline-secondary radius-12"
                          >
                            <i className="ri-edit-line" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
