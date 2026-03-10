"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ownerClinicBranches,
  ownerClinicDoctors,
  type ClinicDoctorListItem,
} from "@/app/owner/_lib/ownerApi";

type ClinicBranch = {
  id: number;
  name: string;
  orgId?: number;
  orgName?: string;
};

type AggregatedDoctorRow = {
  rowKey: string;
  branchId: number;
  branchName: string;
  orgName: string;
  memberId: number;
  displayName: string;
  contact: string;
  contractStatus: string;
  verificationStatus: string;
  onboardingStatus: string;
  memberStatus: string;
  roleInClinic: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickBranches(res: { data?: unknown[] } | null): ClinicBranch[] {
  if (!Array.isArray(res?.data)) return [];
  return res.data
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;
      const id = toNumber(row.id);
      if (id == null) return null;
      const org = asRecord(row.org);
      return {
        id,
        name: typeof row.name === "string" && row.name.trim() ? row.name : `Branch #${id}`,
        orgId: toNumber(row.orgId) ?? undefined,
        orgName:
          (org && typeof org.name === "string" && org.name.trim()
            ? org.name
            : undefined) ??
          "Unknown org",
      };
    })
    .filter((row): row is ClinicBranch => row != null);
}

function statusBadge(status: string, kind: "contract" | "verification" | "member"): string {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "ACTIVE" || normalized === "VERIFIED" || normalized === "COMPLETED") {
    return "bg-success-subtle text-success-emphasis";
  }
  if (normalized === "PENDING") {
    return "bg-warning-subtle text-warning-emphasis";
  }
  if (kind === "contract" && normalized === "ENDED") {
    return "bg-danger-subtle text-danger-emphasis";
  }
  return "bg-secondary-subtle text-secondary-emphasis";
}

function mapDoctorRows(branch: ClinicBranch, doctors: ClinicDoctorListItem[]): AggregatedDoctorRow[] {
  return doctors.map((doctor) => {
    const displayName =
      doctor.member.user?.profile?.displayName?.trim() || `Doctor #${doctor.member.id}`;
    const verificationStatus =
      doctor.verificationStatus ??
      doctor.member.user?.verificationStatus ??
      "UNVERIFIED";
    return {
      rowKey: `${branch.id}-${doctor.member.id}`,
      branchId: branch.id,
      branchName: branch.name,
      orgName: branch.orgName || "Unknown org",
      memberId: doctor.member.id,
      displayName,
      contact:
        doctor.member.user?.auth?.email ||
        doctor.member.user?.auth?.phone ||
        "—",
      contractStatus: doctor.profile.contractStatus || "PENDING",
      verificationStatus: String(verificationStatus || "UNVERIFIED"),
      onboardingStatus: doctor.profile.onboardingStatus || "PENDING",
      memberStatus: doctor.member.status || "ACTIVE",
      roleInClinic: doctor.profile.roleInClinic || "—",
    };
  });
}

export default function ClinicAllDoctors() {
  const [rows, setRows] = useState<AggregatedDoctorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [contractFilter, setContractFilter] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const branchesRes = await ownerClinicBranches();
        const branches = pickBranches(branchesRes as { data?: unknown[] } | null);
        if (branches.length === 0) {
          if (mounted) setRows([]);
          return;
        }

        const results = await Promise.allSettled(
          branches.map(async (branch) => {
            const doctorsData = await ownerClinicDoctors(branch.id);
            return {
              branch,
              doctors: Array.isArray(doctorsData?.doctors)
                ? doctorsData.doctors
                : [],
            };
          })
        );

        if (!mounted) return;

        const nextRows: AggregatedDoctorRow[] = [];
        let failedCount = 0;
        results.forEach((result) => {
          if (result.status === "fulfilled") {
            nextRows.push(...mapDoctorRows(result.value.branch, result.value.doctors));
          } else {
            failedCount += 1;
          }
        });

        if (failedCount > 0) {
          setError(
            `Could not load doctors from ${failedCount} branch${failedCount > 1 ? "es" : ""}.`
          );
        }

        setRows(nextRows);
      } catch (e) {
        if (!mounted) return;
        setError((e as Error)?.message || "Failed to load clinic doctors");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((row) =>
        contractFilter ? row.contractStatus.toUpperCase() === contractFilter : true
      )
      .filter((row) =>
        verificationFilter ? row.verificationStatus.toUpperCase() === verificationFilter : true
      )
      .filter((row) => {
        if (!needle) return true;
        return (
          row.displayName.toLowerCase().includes(needle) ||
          row.branchName.toLowerCase().includes(needle) ||
          row.orgName.toLowerCase().includes(needle) ||
          row.contact.toLowerCase().includes(needle)
        );
      });
  }, [rows, query, contractFilter, verificationFilter]);

  return (
    <>
      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <div className="card radius-12">
        <div className="card-body p-24">
          <div className="d-flex flex-wrap gap-2 align-items-end mb-3">
            <div className="flex-grow-1" style={{ minWidth: 240 }}>
              <label className="form-label">Search doctor</label>
              <input
                type="text"
                className="form-control radius-12"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Doctor name, branch, org, contact"
              />
            </div>
            <div style={{ minWidth: 180 }}>
              <label className="form-label">Contract</label>
              <select
                className="form-select radius-12"
                value={contractFilter}
                onChange={(e) => setContractFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="ENDED">Ended</option>
              </select>
            </div>
            <div style={{ minWidth: 180 }}>
              <label className="form-label">Verification</label>
              <select
                className="form-select radius-12"
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING">Pending</option>
                <option value="UNVERIFIED">Unverified</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Branch</th>
                  <th>Contract</th>
                  <th>Verification</th>
                  <th>Onboarding</th>
                  <th>Status</th>
                  <th>Contact</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5">
                      <div className="spinner-border text-primary" role="status" />
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      No doctors found for current filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.rowKey}>
                      <td>
                        <div className="fw-semibold">{row.displayName}</div>
                        <div className="small text-muted">{row.roleInClinic}</div>
                      </td>
                      <td>
                        <div className="fw-medium">{row.branchName}</div>
                        <div className="small text-muted">{row.orgName}</div>
                      </td>
                      <td>
                        <span
                          className={`badge radius-8 ${statusBadge(
                            row.contractStatus,
                            "contract"
                          )}`}
                        >
                          {row.contractStatus}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge radius-8 ${statusBadge(
                            row.verificationStatus,
                            "verification"
                          )}`}
                        >
                          {row.verificationStatus}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-info-subtle text-info-emphasis radius-8">
                          {row.onboardingStatus}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge radius-8 ${statusBadge(
                            row.memberStatus,
                            "member"
                          )}`}
                        >
                          {row.memberStatus}
                        </span>
                      </td>
                      <td className="small text-muted">{row.contact}</td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2">
                          <Link
                            href={`/owner/clinic/${row.branchId}/doctors/${row.memberId}`}
                            className="btn btn-sm btn-outline-primary radius-12"
                          >
                            View
                          </Link>
                          <Link
                            href={`/owner/clinic/${row.branchId}/doctors`}
                            className="btn btn-sm btn-outline-secondary radius-12"
                          >
                            Branch list
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

