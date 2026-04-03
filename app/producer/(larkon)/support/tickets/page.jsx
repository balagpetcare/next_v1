"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { producerTicketsList } from "../../../_lib/producerApi";
import { getProducerErrorMessage } from "../../../_lib/producerApi";
import ProducerPageShell from "../../../_components/ProducerPageShell";
import ProducerSectionCard from "../../../_components/ProducerSectionCard";
import { PaginationBar } from "@/src/components/common/PaginationBar";

const TICKETS_PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "WAITING_ON_PRODUCER", label: "Waiting on you" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
  { value: "ESCALATED", label: "Escalated" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

function StatusBadge({ status }) {
  const s = String(status || "").toUpperCase();
  const cls =
    s === "OPEN" ? "bg-primary" :
    s === "IN_PROGRESS" ? "bg-info" :
    s === "WAITING_ON_PRODUCER" ? "bg-warning text-dark" :
    s === "RESOLVED" || s === "CLOSED" ? "bg-success" :
    s === "ESCALATED" ? "bg-secondary" : "bg-secondary";
  return <span className={`badge ${cls}`}>{s.replace(/_/g, " ") || "—"}</span>;
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function ProducerSupportTicketsPage() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await producerTicketsList({ status: status || undefined, priority: priority || undefined, page, pageSize: TICKETS_PAGE_SIZE });
      setData(res || { items: [], total: 0, page: 1, pageSize: 20 });
    } catch (e) {
      setError(getProducerErrorMessage(e));
      setData({ items: [], total: 0, page: 1, pageSize: 20 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status, priority, page]);

  const items = data.items || [];
  const total = data.total || 0;

  return (
    <ProducerPageShell
      title="Support tickets"
      breadcrumbs={[{ label: "Support", href: "/producer/support/tickets" }, { label: "Tickets" }]}
      actions={
        <Link href="/producer/support/tickets/new" className="btn btn-primary btn-sm">
          <Icon icon="solar:add-circle-outline" className="me-1" aria-hidden />
          New ticket
        </Link>
      }
    >
      <ProducerSectionCard title="Your tickets">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <select
            className="form-select form-select-sm"
            style={{ width: "auto" }}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            className="form-select form-select-sm"
            style={{ width: "auto" }}
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            aria-label="Filter by priority"
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {error && (
          <div className="alert alert-danger py-2 mb-3" role="alert">
            {error}
          </div>
        )}
        {loading ? (
          <div className="placeholder-glow">
            <div className="d-flex gap-3 py-3"><span className="placeholder col-2" /><span className="placeholder col-4" /><span className="placeholder col-2" /></div>
            <div className="d-flex gap-3 py-3"><span className="placeholder col-2" /><span className="placeholder col-4" /><span className="placeholder col-2" /></div>
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted mb-0">
            No tickets yet.{" "}
            <Link href="/producer/support/tickets/new">Create a ticket</Link> to get help.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Updated</th>
                  <th aria-hidden />
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id}>
                    <td><code>{t.ticketNo}</code></td>
                    <td>{t.subject?.slice(0, 60)}{(t.subject?.length > 60) ? "…" : ""}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td><span className="badge bg-secondary">{t.priority}</span></td>
                    <td>{formatDate(t.updatedAt)}</td>
                    <td>
                      <Link href={`/producer/support/tickets/${t.id}`} className="btn btn-outline-primary btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 0 && (
          <PaginationBar
            page={page}
            pageSize={TICKETS_PAGE_SIZE}
            total={total}
            totalPages={Math.max(1, Math.ceil(total / TICKETS_PAGE_SIZE))}
            disabled={loading}
            onPageChange={setPage}
            className="mt-3 pt-3 border-top"
            ariaLabel="Support tickets pages"
          />
        )}
      </ProducerSectionCard>
    </ProducerPageShell>
  );
}
