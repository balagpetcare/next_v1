"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { doctorListSurgeries } from "@/lib/api";

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DoctorSurgeriesPage() {
  const [data, setData] = useState<{ items: any[]; total: number }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(todayYMD());
  const [dateTo, setDateTo] = useState(todayYMD());
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    doctorListSurgeries({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: statusFilter || undefined,
      limit: 50,
    })
      .then((result) => {
        if (!cancelled) setData({ items: result?.items ?? [], total: result?.total ?? 0 });
      })
      .catch(() => {
        if (!cancelled) setData({ items: [], total: 0 });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, statusFilter]);

  const items = data.items ?? [];

  return (
    <div className="container-fluid py-24">
      <div className="d-flex align-items-center gap-12 mb-24 flex-wrap">
        <h5 className="mb-0">My Surgeries</h5>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <input
            type="date"
            className="form-control form-control-sm"
            style={{ width: "140px" }}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span className="text-muted">to</span>
          <input
            type="date"
            className="form-control form-control-sm"
            style={{ width: "140px" }}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <select
            className="form-select form-select-sm"
            style={{ width: "140px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PRE_OP">Pre-op</option>
            <option value="READY_FOR_OT">Ready for OT</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="POST_OP">Post-op</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-40">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Case no</th>
                <th>Pet</th>
                <th>Service</th>
                <th>Scheduled</th>
                <th>OT room</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-24">
                    No surgeries in this period.
                  </td>
                </tr>
              ) : (
                items.map((row: any) => (
                  <tr key={row.id}>
                    <td><code>{row.caseNumber}</code></td>
                    <td>{row.pet?.name ?? "—"}</td>
                    <td>{row.service?.name ?? "—"}</td>
                    <td>
                      {row.scheduledStartAt
                        ? new Date(row.scheduledStartAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
                        : "—"}
                    </td>
                    <td>{row.room?.name ?? row.room?.code ?? "—"}</td>
                    <td>
                      <span className={`badge ${row.status === "COMPLETED" ? "bg-success" : row.status === "IN_PROGRESS" ? "bg-primary" : "bg-light text-dark"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <Link href={`/doctor/surgeries/${row.id}`} className="btn btn-outline-primary btn-sm">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
