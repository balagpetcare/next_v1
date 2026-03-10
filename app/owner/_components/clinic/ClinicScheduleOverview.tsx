"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ownerClinicBranches,
  ownerClinicHolidays,
  ownerClinicScheduleTemplates,
  type BranchHolidayRow,
  type DoctorScheduleTemplateRow,
} from "@/app/owner/_lib/ownerApi";

type ClinicBranch = {
  id: number;
  name: string;
  orgName: string;
};

type ScheduleBranchRow = {
  branchId: number;
  branchName: string;
  orgName: string;
  doctorTemplates: number;
  doctorCoverageDays: number;
  doctorsWithTemplate: number;
  roomTemplates: number;
  holidays: number;
  nextHolidayDate: string | null;
  nextHolidayName: string;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function parseDateOnly(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const parsed = parseDateOnly(dateStr);
  if (!parsed) return dateStr;
  return parsed.toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function nextHoliday(holidays: BranchHolidayRow[]): { date: string | null; name: string } {
  if (holidays.length === 0) return { date: null, name: "—" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = holidays
    .map((holiday) => ({
      ...holiday,
      parsedDate: parseDateOnly(typeof holiday.date === "string" ? holiday.date : String(holiday.date)),
    }))
    .filter((holiday) => holiday.parsedDate != null && holiday.parsedDate >= today)
    .sort((a, b) => (a.parsedDate!.getTime() - b.parsedDate!.getTime()));

  if (upcoming.length === 0) return { date: null, name: "—" };
  const first = upcoming[0];
  return {
    date: typeof first.date === "string" ? first.date : String(first.date),
    name: first.name || "Holiday",
  };
}

function summarizeBranch(
  branch: ClinicBranch,
  doctorTemplates: DoctorScheduleTemplateRow[],
  roomTemplates: Array<{ dayOfWeek: number }>,
  holidays: BranchHolidayRow[]
): ScheduleBranchRow {
  const coverageDays = new Set(
    doctorTemplates
      .map((template) => template.dayOfWeek)
      .filter((day) => day >= 0 && day <= 6)
  );
  const doctorMembers = new Set(
    doctorTemplates
      .map((template) => template.branchMemberId)
      .filter((id) => Number.isFinite(id))
  );
  const next = nextHoliday(holidays);

  return {
    branchId: branch.id,
    branchName: branch.name,
    orgName: branch.orgName,
    doctorTemplates: doctorTemplates.length,
    doctorCoverageDays: coverageDays.size,
    doctorsWithTemplate: doctorMembers.size,
    roomTemplates: roomTemplates.length,
    holidays: holidays.length,
    nextHolidayDate: next.date,
    nextHolidayName: next.name,
  };
}

export default function ClinicScheduleOverview() {
  const [rows, setRows] = useState<ScheduleBranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

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
            const [templates, holidays] = await Promise.all([
              ownerClinicScheduleTemplates(branch.id),
              ownerClinicHolidays(branch.id),
            ]);
            const doctorTemplates = Array.isArray(templates?.doctorTemplates)
              ? templates.doctorTemplates
              : [];
            const roomTemplates = Array.isArray(templates?.roomTemplates)
              ? templates.roomTemplates
              : [];
            const holidayRows = Array.isArray(holidays) ? holidays : [];
            return summarizeBranch(branch, doctorTemplates, roomTemplates, holidayRows);
          })
        );

        if (!mounted) return;

        const nextRows: ScheduleBranchRow[] = [];
        let failedCount = 0;
        results.forEach((result) => {
          if (result.status === "fulfilled") {
            nextRows.push(result.value);
          } else {
            failedCount += 1;
          }
        });

        if (failedCount > 0) {
          setError(
            `Could not load schedule overview from ${failedCount} branch${failedCount > 1 ? "es" : ""}.`
          );
        }

        nextRows.sort((a, b) => a.branchName.localeCompare(b.branchName));
        setRows(nextRows);
      } catch (e) {
        if (!mounted) return;
        setError((e as Error)?.message || "Failed to load clinic schedule overview");
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
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        row.branchName.toLowerCase().includes(needle) ||
        row.orgName.toLowerCase().includes(needle)
    );
  }, [rows, query]);

  const totals = useMemo(
    () => ({
      doctorTemplates: rows.reduce((sum, row) => sum + row.doctorTemplates, 0),
      roomTemplates: rows.reduce((sum, row) => sum + row.roomTemplates, 0),
      holidays: rows.reduce((sum, row) => sum + row.holidays, 0),
      coveredWeekDays: Array.from(
        new Set(
          rows.flatMap((row) =>
            row.doctorCoverageDays > 0
              ? DAY_NAMES.slice(0, row.doctorCoverageDays)
              : []
          )
        )
      ).length,
    }),
    [rows]
  );

  return (
    <>
      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-6 col-xl-3">
          <div className="card radius-12 h-100">
            <div className="card-body">
              <div className="text-secondary-light small">Doctor template rows</div>
              <h5 className="mb-0 mt-1">{totals.doctorTemplates}</h5>
            </div>
          </div>
        </div>
        <div className="col-6 col-xl-3">
          <div className="card radius-12 h-100">
            <div className="card-body">
              <div className="text-secondary-light small">Room template rows</div>
              <h5 className="mb-0 mt-1">{totals.roomTemplates}</h5>
            </div>
          </div>
        </div>
        <div className="col-6 col-xl-3">
          <div className="card radius-12 h-100">
            <div className="card-body">
              <div className="text-secondary-light small">Configured holidays</div>
              <h5 className="mb-0 mt-1">{totals.holidays}</h5>
            </div>
          </div>
        </div>
        <div className="col-6 col-xl-3">
          <div className="card radius-12 h-100">
            <div className="card-body">
              <div className="text-secondary-light small">Branches loaded</div>
              <h5 className="mb-0 mt-1">{rows.length}</h5>
            </div>
          </div>
        </div>
      </div>

      <div className="card radius-12">
        <div className="card-body p-24">
          <div className="mb-3" style={{ maxWidth: 320 }}>
            <label className="form-label">Search branch</label>
            <input
              type="text"
              className="form-control radius-12"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Branch or organization"
            />
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Doctors with template</th>
                  <th>Doctor rows</th>
                  <th>Room rows</th>
                  <th>Holidays</th>
                  <th>Next holiday</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <div className="spinner-border text-primary" role="status" />
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      No schedule data found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.branchId}>
                      <td>
                        <div className="fw-semibold">{row.branchName}</div>
                        <div className="small text-muted">{row.orgName}</div>
                      </td>
                      <td>{row.doctorsWithTemplate}</td>
                      <td>
                        {row.doctorTemplates}
                        <span className="small text-muted ms-1">
                          ({row.doctorCoverageDays} day pattern)
                        </span>
                      </td>
                      <td>{row.roomTemplates}</td>
                      <td>{row.holidays}</td>
                      <td>
                        <div>{formatDate(row.nextHolidayDate)}</div>
                        <div className="small text-muted">{row.nextHolidayName}</div>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2">
                          <Link
                            href={`/owner/clinic/${row.branchId}/schedule`}
                            className="btn btn-sm btn-outline-primary radius-12"
                          >
                            Manage
                          </Link>
                          <Link
                            href={`/owner/clinic/${row.branchId}/schedule/exceptions`}
                            className="btn btn-sm btn-outline-secondary radius-12"
                          >
                            Exceptions
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

