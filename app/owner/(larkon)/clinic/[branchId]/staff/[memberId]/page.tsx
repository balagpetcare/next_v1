"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicStaffProfileGet,
  ownerClinicStaffProfilePut,
  ownerClinicAssignTemplate,
  CLINIC_ROLE_TEMPLATE_KEYS,
  type ClinicStaffProfileData,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const STAFF_TYPES = ["DOCTOR", "NURSE", "RECEPTION", "LAB", "GROOMER", "MANAGER"];

export default function ClinicStaffProfilePage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const memberId = params?.memberId as string | undefined;
  const [profile, setProfile] = useState<ClinicStaffProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [assigningTemplate, setAssigningTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [form, setForm] = useState({
    staffType: "DOCTOR",
    licenseNumber: "",
    specializationTags: "" as string,
    defaultConsultationFee: "" as string,
    visiting: false,
    status: "ACTIVE",
  });

  useEffect(() => {
    if (!branchId || !memberId) return;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await ownerClinicStaffProfileGet(branchId, memberId);
        setProfile(data ?? null);
        if (data) {
          setForm({
            staffType: data.staffType ?? "DOCTOR",
            licenseNumber: data.licenseNumber ?? "",
            specializationTags: Array.isArray(data.specializationTags)
              ? data.specializationTags.join(", ")
              : "",
            defaultConsultationFee:
              data.defaultConsultationFee != null ? String(data.defaultConsultationFee) : "",
            visiting: data.visiting ?? false,
            status: data.status ?? "ACTIVE",
          });
        }
      } catch (e) {
        setError((e as Error)?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [branchId, memberId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !memberId) return;
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const tags = form.specializationTags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const fee =
        form.defaultConsultationFee.trim() === ""
          ? null
          : parseFloat(form.defaultConsultationFee);
      if (fee != null && (Number.isNaN(fee) || fee < 0)) {
        setError("Default consultation fee must be a non-negative number.");
        setSaving(false);
        return;
      }
      await ownerClinicStaffProfilePut(branchId, memberId, {
        staffType: form.staffType,
        licenseNumber: form.licenseNumber.trim() || null,
        specializationTags: tags.length ? tags : null,
        defaultConsultationFee: fee,
        visiting: form.visiting,
        status: form.status,
      });
      setSuccess("Profile saved.");
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              staffType: form.staffType,
              licenseNumber: form.licenseNumber.trim() || null,
              specializationTags: tags,
              defaultConsultationFee: fee,
              visiting: form.visiting,
              status: form.status,
            }
          : null
      );
    } catch (e) {
      setError((e as Error)?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignTemplate = async () => {
    if (!branchId || !memberId || !selectedTemplate) return;
    try {
      setAssigningTemplate(true);
      setError("");
      await ownerClinicAssignTemplate(branchId, memberId, selectedTemplate);
      setSuccess("Role template assigned.");
      const data = await ownerClinicStaffProfileGet(branchId, memberId);
      if (data) {
        setProfile(data);
        setForm((f) => ({ ...f, staffType: data.staffType ?? f.staffType }));
      }
    } catch (e) {
      setError((e as Error)?.message || "Failed to assign template");
    } finally {
      setAssigningTemplate(false);
    }
  };

  if (!branchId || !memberId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch or member.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title={profile?.displayName ? `Profile: ${profile.displayName}` : "Clinic staff profile"}
        subtitle={`Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Staff", href: `/owner/clinic/${branchId}/staff` },
          { label: "Profile", href: `/owner/clinic/${branchId}/staff/${memberId}` },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success radius-12 mb-24">
          <i className="ri-check-line me-2" />
          {success}
        </div>
      )}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      ) : !profile ? (
        <div className="card radius-12">
          <div className="card-body">
            <div className="alert alert-warning radius-12 mb-0">
              Staff member not found or you don’t have access.
            </div>
            <Link
              href={`/owner/clinic/${branchId}/staff`}
              className="btn btn-outline-primary mt-3 radius-12"
            >
              Back to staff
            </Link>
          </div>
        </div>
      ) : (
        <div className="card radius-12">
          <div className="card-body p-24">
            <h6 className="mb-3">Clinic profile</h6>
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Staff type</label>
                  <select
                    className="form-select radius-12"
                    value={form.staffType}
                    onChange={(e) => setForm((f) => ({ ...f, staffType: e.target.value }))}
                  >
                    {STAFF_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">License number</label>
                  <input
                    type="text"
                    className="form-control radius-12"
                    value={form.licenseNumber}
                    onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))}
                    placeholder="Optional"
                    maxLength={64}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Default consultation fee</label>
                  <input
                    type="number"
                    className="form-control radius-12"
                    value={form.defaultConsultationFee}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, defaultConsultationFee: e.target.value }))
                    }
                    min={0}
                    step="0.01"
                    placeholder="Optional"
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Specialization tags (comma-separated)</label>
                  <input
                    type="text"
                    className="form-control radius-12"
                    value={form.specializationTags}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, specializationTags: e.target.value }))
                    }
                    placeholder="e.g. General, Surgery, Dermatology"
                  />
                </div>
                <div className="col-md-4">
                  <div className="form-check form-switch mt-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={form.visiting}
                      onChange={(e) => setForm((f) => ({ ...f, visiting: e.target.checked }))}
                    />
                    <label className="form-check-label">Visiting</label>
                  </div>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select radius-12"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 d-flex gap-2">
                <button type="submit" className="btn btn-primary radius-12" disabled={saving}>
                  {saving ? "Saving..." : "Save profile"}
                </button>
                <Link
                  href={`/owner/clinic/${branchId}/staff`}
                  className="btn btn-outline-secondary radius-12"
                >
                  Back to staff
                </Link>
              </div>
            </form>
            <hr className="my-4" />
            <h6 className="mb-2">Assign role template</h6>
            <p className="text-muted small mb-3">
              Apply a clinic role template to set permissions for this staff member at this branch.
            </p>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <select
                className="form-select radius-12"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                style={{ maxWidth: 220 }}
              >
                <option value="">Select template</option>
                {CLINIC_ROLE_TEMPLATE_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k.replace("CLINIC_", "")}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-outline-primary radius-12"
                onClick={handleAssignTemplate}
                disabled={!selectedTemplate || assigningTemplate}
              >
                {assigningTemplate ? "Assigning..." : "Assign template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
