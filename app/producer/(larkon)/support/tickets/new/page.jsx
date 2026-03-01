"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { producerTicketCreate } from "../../../../_lib/producerApi";
import { getProducerErrorMessage } from "../../../../_lib/producerApi";
import ProducerPageShell from "../../../../_components/ProducerPageShell";
import ProducerSectionCard from "../../../../_components/ProducerSectionCard";

const CATEGORY_OPTIONS = [
  { value: "BATCH_CODE", label: "Batch / Code" },
  { value: "PRODUCT_GOVERNANCE", label: "Product / Governance" },
  { value: "ACCOUNT_KYC", label: "Account / KYC" },
  { value: "PAYMENT", label: "Payment" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "FRAUD_ABUSE", label: "Fraud / Abuse report" },
  { value: "OTHER", label: "Other" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export default function ProducerSupportTicketNewPage() {
  const router = useRouter();
  const [category, setCategory] = useState("OTHER");
  const [priority, setPriority] = useState("MEDIUM");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [consentToViewData, setConsentToViewData] = useState(false);
  const [relatedEntityType, setRelatedEntityType] = useState("");
  const [relatedEntityId, setRelatedEntityId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const ticket = await producerTicketCreate({
        category,
        priority,
        subject: subject.trim(),
        description: description.trim(),
        consentToViewData,
        relatedEntityType: relatedEntityType || undefined,
        relatedEntityId: relatedEntityId.trim() || undefined,
      });
      router.push(`/producer/support/tickets/${ticket?.id ?? ""}`);
    } catch (e) {
      setError(getProducerErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProducerPageShell
      title="New ticket"
      breadcrumbs={[
        { label: "Support", href: "/producer/support/tickets" },
        { label: "Tickets", href: "/producer/support/tickets" },
        { label: "New" },
      ]}
      actions={
        <Link href="/producer/support/tickets" className="btn btn-outline-secondary btn-sm">
          <Icon icon="solar:arrow-left-outline" className="me-1" aria-hidden />
          Back to tickets
        </Link>
      }
    >
      <ProducerSectionCard title="Describe your issue">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-danger py-2 mb-3" role="alert">
              {error}
            </div>
          )}
          <div className="mb-3">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Priority</label>
            <select
              className="form-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Subject <span className="text-danger">*</span></label>
            <input
              type="text"
              className="form-control"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short summary"
              maxLength={512}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Related entity (optional)</label>
            <div className="d-flex flex-wrap gap-2">
              <select
                className="form-select"
                style={{ width: "auto" }}
                value={relatedEntityType}
                onChange={(e) => setRelatedEntityType(e.target.value)}
              >
                <option value="">—</option>
                <option value="PRODUCT">Product</option>
                <option value="BATCH">Batch</option>
                <option value="CODE">Code</option>
              </select>
              <input
                type="text"
                className="form-control"
                style={{ maxWidth: 200 }}
                value={relatedEntityId}
                onChange={(e) => setRelatedEntityId(e.target.value)}
                placeholder="ID or code"
              />
            </div>
            <small className="text-muted">Helps support trace the issue quickly.</small>
          </div>
          <div className="mb-4 form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="consent"
              checked={consentToViewData}
              onChange={(e) => setConsentToViewData(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="consent">
              Allow support to view related data to diagnose
            </label>
          </div>
          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit ticket"}
            </button>
            <Link href="/producer/support/tickets" className="btn btn-outline-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </ProducerSectionCard>
    </ProducerPageShell>
  );
}
