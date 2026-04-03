"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ownerGetInvitation, ownerUpdateInvitation } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function InvitationEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    phone: "",
    role: "",
    inviteAsDoctor: false,
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await ownerGetInvitation(id);
      if (!data) throw new Error("Invitation not found");
      
      if (data.status === "ACCEPTED") {
        setError("Cannot edit accepted invitation");
        return;
      }
      if (data.status === "REVOKED") {
        setError("Cannot edit revoked invitation");
        return;
      }

      setFormData({
        displayName: data.displayName || "",
        email: data.email || "",
        phone: data.phone || "",
        role: data.role || "",
        inviteAsDoctor: data.inviteAsDoctor || false,
      });
    } catch (e) {
      setError(e?.message || "Failed to load invitation");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formData.email && !formData.phone) {
      setError("Email or phone is required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await ownerUpdateInvitation(id, formData);
      router.push(`/owner/invitations/${id}`);
    } catch (e) {
      setError(e?.message || "Failed to update invitation");
      setSaving(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <div className="dashboard-main-body">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !formData.email && !formData.phone) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-danger">{error}</div>
        <Link href={`/owner/invitations/${id}`} className="btn btn-secondary">
          Back to Invitation
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Edit Invitation"
        subtitle="Update staff invitation details"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Staffs", href: "/owner/staffs" },
          { label: "Invitation", href: `/owner/invitations/${id}` },
          { label: "Edit" },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <div className="row">
        <div className="col-12 col-lg-8">
          <div className="card radius-12 border-0 shadow-sm">
            <div className="card-body p-24">
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">
                      Display Name
                      <span className="text-muted ms-1">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="form-control radius-12"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="e.g., Dr. John Smith"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Email
                      <span className="text-danger ms-1">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control radius-12"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                      required={!formData.phone}
                    />
                    <small className="text-muted">Email or phone is required</small>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Phone
                      <span className="text-danger ms-1">*</span>
                    </label>
                    <input
                      type="tel"
                      className="form-control radius-12"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1234567890"
                      required={!formData.email}
                    />
                    <small className="text-muted">Email or phone is required</small>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Role
                      <span className="text-danger ms-1">*</span>
                    </label>
                    <select
                      className="form-select radius-12"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      required
                    >
                      <option value="">Select role...</option>
                      <option value="ORG_ADMIN">ORG_ADMIN</option>
                      <option value="BRANCH_MANAGER">BRANCH_MANAGER</option>
                      <option value="BRANCH_STAFF">BRANCH_STAFF</option>
                      <option value="SELLER">SELLER</option>
                      <option value="DELIVERY_MANAGER">DELIVERY_MANAGER</option>
                      <option value="DELIVERY_STAFF">DELIVERY_STAFF</option>
                    </select>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Invite as Doctor</label>
                    <div className="form-check form-switch mt-2">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="inviteAsDoctor"
                        checked={formData.inviteAsDoctor}
                        onChange={(e) => setFormData({ ...formData, inviteAsDoctor: e.target.checked })}
                      />
                      <label className="form-check-label" htmlFor="inviteAsDoctor">
                        {formData.inviteAsDoctor ? "Yes" : "No"}
                      </label>
                    </div>
                    <small className="text-muted">Enable if this staff member will provide medical services</small>
                  </div>

                  <div className="col-12">
                    <hr className="my-3" />
                  </div>

                  <div className="col-12">
                    <div className="d-flex gap-2">
                      <button
                        type="submit"
                        className="btn btn-primary radius-12"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <i className="ri-save-line me-1" />
                            Save Changes
                          </>
                        )}
                      </button>
                      <Link
                        href={`/owner/invitations/${id}`}
                        className="btn btn-outline-secondary radius-12"
                      >
                        Cancel
                      </Link>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card radius-12 border-0 shadow-sm bg-light">
            <div className="card-body p-24">
              <h6 className="mb-3">
                <i className="ri-information-line me-1" />
                Information
              </h6>
              <ul className="small text-muted mb-0" style={{ paddingLeft: "20px" }}>
                <li className="mb-2">You can update the invitation details before it's accepted</li>
                <li className="mb-2">At least one contact method (email or phone) is required</li>
                <li className="mb-2">The invitation link will remain valid after editing</li>
                <li className="mb-2">Changes will be reflected immediately</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
