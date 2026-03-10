"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ownerClinicBranches,
  ownerClinicModuleGet,
  ownerClinicSettings,
} from "@/app/owner/_lib/ownerApi";

type ClinicBranch = {
  id: number;
  name: string;
  orgName: string;
};

type BranchSettingsRow = {
  branchId: number;
  branchName: string;
  orgName: string;
  clinicEnabled: boolean | null;
  consultationSlotMinutes: number | null;
  maxDailyAppointments: number | null;
  walkInsAllowed: boolean | null;
  emergencyAvailable: boolean | null;
  allowScheduled: boolean | null;
  requirePaymentBeforeConsultation: boolean | null;
  loaded: boolean;
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

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
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
        name:
          typeof row.name === "string" && row.name.trim()
            ? row.name
            : `Branch #${id}`,
        orgName:
          (org && typeof org.name === "string" && org.name.trim()
            ? org.name
            : undefined) ?? "Unknown org",
      };
    })
    .filter((row): row is ClinicBranch => row != null);
}

function yesNoBadge(value: boolean | null) {
  if (value == null) {
    return <span className="badge bg-secondary-subtle text-secondary-emphasis radius-8">—</span>;
  }
  return (
    <span
      className={`badge radius-8 ${
        value
          ? "bg-success-subtle text-success-emphasis"
          : "bg-danger-subtle text-danger-emphasis"
      }`}
    >
      {value ? "Yes" : "No"}
    </span>
  );
}

export default function ClinicSettingsOverview() {
  const [rows, setRows] = useState<BranchSettingsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");

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
            const [moduleData, rawSettings] = await Promise.all([
              ownerClinicModuleGet(branch.id),
              ownerClinicSettings(branch.id),
            ]);
            const settings = asRecord(rawSettings);
            const appointment = asRecord(settings?.appointment);

            return {
              branchId: branch.id,
              branchName: branch.name,
              orgName: branch.orgName,
              clinicEnabled: toBoolean(moduleData?.clinicEnabled),
              consultationSlotMinutes: toNumber(settings?.consultationSlotMinutes),
              maxDailyAppointments: toNumber(settings?.maxDailyAppointments),
              walkInsAllowed: toBoolean(settings?.walkInsAllowed),
              emergencyAvailable: toBoolean(settings?.emergencyAvailable),
              allowScheduled: toBoolean(appointment?.allowScheduled),
              requirePaymentBeforeConsultation: toBoolean(
                appointment?.requirePaymentBeforeConsultation
              ),
              loaded: true,
            } satisfies BranchSettingsRow;
          })
        );

        if (!mounted) return;

        const nextRows: BranchSettingsRow[] = [];
        let failedCount = 0;
        results.forEach((result, idx) => {
          if (result.status === "fulfilled") {
            nextRows.push(result.value);
            return;
          }
          const fallback = branches[idx];
          if (!fallback) return;
          failedCount += 1;
          nextRows.push({
            branchId: fallback.id,
            branchName: fallback.name,
            orgName: fallback.orgName,
            clinicEnabled: null,
            consultationSlotMinutes: null,
            maxDailyAppointments: null,
            walkInsAllowed: null,
            emergencyAvailable: null,
            allowScheduled: null,
            requirePaymentBeforeConsultation: null,
            loaded: false,
          });
        });

        if (failedCount > 0) {
          setError(
            `Could not load settings from ${failedCount} branch${failedCount > 1 ? "es" : ""}.`
          );
        }

        nextRows.sort((a, b) => a.branchName.localeCompare(b.branchName));
        setRows(nextRows);
      } catch (e) {
        if (!mounted) return;
        setError((e as Error)?.message || "Failed to load clinic settings overview");
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
      .filter((row) => {
        if (!moduleFilter) return true;
        if (moduleFilter === "enabled") return row.clinicEnabled === true;
        if (moduleFilter === "disabled") return row.clinicEnabled === false;
        if (moduleFilter === "unknown") return row.clinicEnabled == null;
        return true;
      })
      .filter((row) => {
        if (!needle) return true;
        return (
          row.branchName.toLowerCase().includes(needle) ||
          row.orgName.toLowerCase().includes(needle)
        );
      });
  }, [rows, query, moduleFilter]);

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
          <div className="d-flex flex-wrap align-items-end gap-2 mb-3">
            <div className="flex-grow-1" style={{ minWidth: 240 }}>
              <label className="form-label">Search branch</label>
              <input
                type="text"
                className="form-control radius-12"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Branch or organization"
              />
            </div>
            <div style={{ minWidth: 180 }}>
              <label className="form-label">Clinic module</label>
              <select
                className="form-select radius-12"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Clinic module</th>
                  <th>Slot (min)</th>
                  <th>Max daily</th>
                  <th>Walk-ins</th>
                  <th>Emergency</th>
                  <th>Scheduled booking</th>
                  <th>Pre-payment required</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5">
                      <div className="spinner-border text-primary" role="status" />
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-muted">
                      No settings data found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.branchId}>
                      <td>
                        <div className="fw-semibold">{row.branchName}</div>
                        <div className="small text-muted">{row.orgName}</div>
                      </td>
                      <td>{yesNoBadge(row.clinicEnabled)}</td>
                      <td>{row.consultationSlotMinutes ?? "—"}</td>
                      <td>{row.maxDailyAppointments ?? "—"}</td>
                      <td>{yesNoBadge(row.walkInsAllowed)}</td>
                      <td>{yesNoBadge(row.emergencyAvailable)}</td>
                      <td>{yesNoBadge(row.allowScheduled)}</td>
                      <td>{yesNoBadge(row.requirePaymentBeforeConsultation)}</td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2">
                          <Link
                            href={`/owner/clinic/${row.branchId}/settings`}
                            className="btn btn-sm btn-outline-primary radius-12"
                          >
                            Configure
                          </Link>
                          <Link
                            href={`/owner/clinic/${row.branchId}`}
                            className="btn btn-sm btn-outline-secondary radius-12"
                          >
                            Open branch
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

