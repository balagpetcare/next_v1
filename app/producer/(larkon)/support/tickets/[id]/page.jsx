"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import {
  producerTicketGet,
  producerTicketReply,
  producerTicketClose,
  producerTicketReopen,
} from "../../../../_lib/producerApi";
import { getProducerErrorMessage } from "../../../../_lib/producerApi";
import ProducerPageShell from "../../../../_components/ProducerPageShell";
import ProducerSectionCard from "../../../../_components/ProducerSectionCard";

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

function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function ProducerSupportTicketDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await producerTicketGet(id);
      setTicket(data);
    } catch (e) {
      setError(getProducerErrorMessage(e));
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !id) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await producerTicketReply(id, { message: replyText.trim() });
      setReplyText("");
      await load();
    } catch (e) {
      setActionError(getProducerErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!id) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await producerTicketClose(id);
      await load();
    } catch (e) {
      setActionError(getProducerErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async () => {
    if (!id) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await producerTicketReopen(id);
      await load();
    } catch (e) {
      setActionError(getProducerErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const canClose = ticket && ticket.status !== "CLOSED" && ticket.status !== "RESOLVED" && ticket.status !== "ESCALATED";
  const canReopen = ticket && (ticket.status === "RESOLVED" || ticket.status === "CLOSED");

  if (loading && !ticket) {
    return (
      <ProducerPageShell title="Ticket" breadcrumbs={[{ label: "Support", href: "/producer/support/tickets" }, { label: "…" }]}>
        <div className="placeholder-glow"><span className="placeholder col-6" /></div>
      </ProducerPageShell>
    );
  }

  if (error && !ticket) {
    return (
      <ProducerPageShell title="Ticket" breadcrumbs={[{ label: "Support", href: "/producer/support/tickets" }, { label: "Error" }]}>
        <div className="alert alert-danger">{error}</div>
        <Link href="/producer/support/tickets">Back to tickets</Link>
      </ProducerPageShell>
    );
  }

  const messages = ticket?.messages ?? [];

  return (
    <ProducerPageShell
      title={ticket?.ticketNo ?? "Ticket"}
      breadcrumbs={[
        { label: "Support", href: "/producer/support/tickets" },
        { label: "Tickets", href: "/producer/support/tickets" },
        { label: ticket?.ticketNo ?? id },
      ]}
      actions={
        <Link href="/producer/support/tickets" className="btn btn-outline-secondary btn-sm">
          <Icon icon="solar:arrow-left-outline" className="me-1" aria-hidden />
          Back to tickets
        </Link>
      }
    >
      <ProducerSectionCard title="Ticket details">
        <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
          <StatusBadge status={ticket?.status} />
          <span className="badge bg-secondary">{ticket?.priority}</span>
          <span className="text-muted small">{ticket?.category?.replace(/_/g, " ")}</span>
          {ticket?.assignedTo && (
            <span className="small text-muted">Assigned to {ticket.assignedTo.profile?.displayName ?? "Support"}</span>
          )}
          <span className="small text-muted ms-auto">
            Created {formatDateTime(ticket?.createdAt)} · Updated {formatDateTime(ticket?.updatedAt)}
          </span>
        </div>
        <h5 className="mb-2">{ticket?.subject}</h5>
        <p className="text-muted mb-0 whitespace-pre-wrap">{ticket?.description}</p>
      </ProducerSectionCard>

      <ProducerSectionCard title="Conversation" className="mt-3">
        {messages.length === 0 ? (
          <p className="text-muted mb-0">No messages yet. Add a reply below.</p>
        ) : (
          <div className="d-flex flex-column gap-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded ${m.senderType === "PRODUCER" ? "bg-light align-self-start" : "bg-primary bg-opacity-10 align-self-end"}`}
                style={{ maxWidth: "85%" }}
              >
                <div className="small text-muted mb-1">
                  {m.senderType === "PRODUCER" ? "You" : "Support"}
                  {" · "}
                  {formatDateTime(m.createdAt)}
                </div>
                <div className="whitespace-pre-wrap">{m.message}</div>
              </div>
            ))}
          </div>
        )}
      </ProducerSectionCard>

      {actionError && (
        <div className="alert alert-danger py-2 mt-3" role="alert">
          {actionError}
        </div>
      )}

      {canClose && (
        <div className="mt-3">
          <button
            type="button"
            className="btn btn-outline-success btn-sm"
            disabled={submitting}
            onClick={handleClose}
          >
            Mark as resolved
          </button>
        </div>
      )}
      {canReopen && (
        <div className="mt-3">
          <button
            type="button"
            className="btn btn-outline-warning btn-sm"
            disabled={submitting}
            onClick={handleReopen}
          >
            Reopen ticket
          </button>
        </div>
      )}

      {ticket && ticket.status !== "CLOSED" && ticket.status !== "ESCALATED" && (
        <ProducerSectionCard title="Reply" className="mt-3">
          <form onSubmit={handleReply}>
            <textarea
              className="form-control mb-2"
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              disabled={submitting}
            />
            <button type="submit" className="btn btn-primary" disabled={submitting || !replyText.trim()}>
              {submitting ? "Sending…" : "Send reply"}
            </button>
          </form>
        </ProducerSectionCard>
      )}
    </ProducerPageShell>
  );
}
