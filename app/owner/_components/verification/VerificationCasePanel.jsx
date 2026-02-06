"use client";

import { useEffect, useMemo, useState } from "react";

import StatusBadge from "@/app/owner/_components/StatusBadge";
import { ownerGet, ownerPut, ownerPost, ownerDelete, ownerUpload } from "@/app/owner/_lib/ownerApi";

function norm(s) {
  return String(s || "").toUpperCase();
}

const DOC_TYPE_OPTIONS = [
  { value: "TRADE_LICENSE", label: "Trade License" },
  { value: "NID", label: "NID" },
  { value: "TIN", label: "TIN" },
  { value: "BIN", label: "BIN/VAT" },
  { value: "BANK_STATEMENT", label: "Bank Statement" },
  { value: "OTHER", label: "Other" },
];

function docLabel(v) {
  return DOC_TYPE_OPTIONS.find((x) => x.value === v)?.label || v;
}

function SoftAlert({ type = "info", children }) {
  const cls =
    type === "danger"
      ? "alert alert-danger"
      : type === "success"
      ? "alert alert-success"
      : type === "warning"
      ? "alert alert-warning"
      : "alert alert-info";
  return <div className={`${cls} mb-0`}>{children}</div>;
}

export default function VerificationCasePanel({
  entityType = "ORGANIZATION",
  entityId,
  title = "Verification (V2)",
  showDraftSnapshot = false,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [caseData, setCaseData] = useState(null);
  const [payloadJson, setPayloadJson] = useState({});
  const [docType, setDocType] = useState("TRADE_LICENSE");
  const [jsonText, setJsonText] = useState("");

  async function load() {
    if (!entityType) return;
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      q.set("entityType", entityType);
      if (entityId) q.set("entityId", String(entityId));
      const j = await ownerGet(`/api/v1/owner/verification-case?${q.toString()}`);
      const d = j?.data ?? j;

      setCaseData(d);
      const pj = d?.payloadJson || {};
      setPayloadJson(pj);
      setJsonText(JSON.stringify(pj || {}, null, 2));
      setNotice("");
    } catch (e) {
      setError(e?.message || "Failed to load verification case");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const status = useMemo(() => norm(caseData?.status), [caseData?.status]);

  /**
   * ✅ NEW RULE:
   * Approved না হওয়া পর্যন্ত edit ON থাকবে।
   * তাই locked হবে শুধুমাত্র APPROVED হলে।
   */
  const locked = status === "APPROVED";
  const canRequestChange = status === "APPROVED";

  const docs = useMemo(() => {
    const list = Array.isArray(caseData?.documents) ? caseData.documents : [];
    return list
      .slice()
      .sort(
        (a, b) =>
          Number(b?.version || 0) - Number(a?.version || 0) ||
          String(a?.id || "").localeCompare(String(b?.id || ""))
      );
  }, [caseData?.documents]);

  const disableActions = saving || loading || locked;

  async function saveDraft(nextPayload) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const body = {
        entityType,
        ...(entityId ? { entityId: Number(entityId) } : {}),
        payloadJson: nextPayload || payloadJson || {},
      };
      const j = await ownerPut(`/api/v1/owner/verification-case/draft`, body);

      if (j?.verificationBlocked) {
        // just in case API blocks something
        setError(j?.message || "Verification blocked by server.");
      } else {
        setNotice("Draft saved successfully.");
      }
      await load();
    } catch (e) {
      setError(e?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await ownerPost(`/api/v1/owner/verification-case/submit`, {
        entityType,
        ...(entityId ? { entityId: Number(entityId) } : {}),
      });
      setNotice("Submitted. Admin will review. You can still edit until it is approved.");
      await load();
      window?.scrollTo?.({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e?.message || "Submit failed");
    } finally {
      setSaving(false);
    }
  }

  async function requestChange() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await ownerPost(`/api/v1/owner/verification-case/request-change`, {
        entityType,
        ...(entityId ? { entityId: Number(entityId) } : {}),
      });
      setNotice("Change request created. Update your draft and submit again.");
      await load();
      window?.scrollTo?.({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e?.message || "Request change failed");
    } finally {
      setSaving(false);
    }
  }

  async function uploadDoc(file) {
    if (!file) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("docType", docType);
      fd.append("entityType", entityType);
      if (entityId) fd.append("entityId", String(entityId));

      await ownerUpload(`/api/v1/owner/verification-case/documents`, fd);
      setNotice("Document uploaded successfully.");
      await load();
    } catch (e) {
      setError(e?.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeDoc(docId) {
    if (!docId) return;
    if (!window.confirm("Remove this document?")) return;

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const j = await ownerDelete(`/api/v1/owner/verification-case/documents/${docId}`);
      if (j?.verificationBlocked) {
        setError(j?.message || "Delete blocked by server.");
      } else {
        setNotice("Document removed.");
      }
      await load();
    } catch (e) {
      setError(e?.message || "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card radius-12 mb-3">
      <div className="card-body p-24">
        {/* Header */}
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-2">
          <div>
            <h6 className="mb-1">{title}</h6>
            <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.4 }}>
              Upload documents, save your draft, then submit for admin review.
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <StatusBadge status={status || "DRAFT"} />
            <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={saving || loading}>
              Refresh
            </button>
          </div>
        </div>

        {/* Alerts */}
        <div className="mt-3 d-flex flex-column gap-2">
          {error ? <SoftAlert type="danger">{error}</SoftAlert> : null}
          {notice ? <SoftAlert type="success">{notice}</SoftAlert> : null}
        </div>

        {loading ? (
          <div className="mt-3">Loading...</div>
        ) : (
          <>
            {/* Status callouts */}
            <div className="mt-3">
              {status === "APPROVED" ? (
                <SoftAlert type="info">
                  <b>Approved:</b> Editing is locked now. To change anything, create a change request and re-submit.
                  {canRequestChange ? (
                    <div className="mt-2">
                      <button className="btn btn-outline-primary btn-sm" onClick={requestChange} disabled={saving}>
                        {saving ? "Working..." : "Request change"}
                      </button>
                    </div>
                  ) : null}
                </SoftAlert>
              ) : status === "SUBMITTED" ? (
                <SoftAlert type="info">
                  <b>Submitted:</b> You can still edit and re-upload documents until it is approved. If you update anything, submit again.
                </SoftAlert>
              ) : null}
            </div>

            {/* Upload + actions */}
            <div className="mt-3">
              <div className="row g-3 align-items-end">
                <div className="col-md-4">
                  <label className="form-label mb-1">Document type</label>
                  <select
                    className="form-select"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    disabled={saving || locked}
                  >
                    {DOC_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-5">
                  <label className="form-label mb-1">Upload file</label>
                  <input
                    type="file"
                    className="form-control"
                    disabled={saving || locked}
                    onChange={(e) => uploadDoc(e.target.files?.[0])}
                  />
                  <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                    Choose correct file for the selected document type.
                  </div>
                </div>

                <div className="col-md-3 d-flex gap-2 justify-content-md-end">
                  <button className="btn btn-outline-primary w-100" disabled={disableActions} onClick={() => saveDraft(payloadJson)}>
                    {saving ? "Saving..." : "Save draft"}
                  </button>
                  <button className="btn btn-primary w-100" disabled={disableActions} onClick={submit}>
                    Submit
                  </button>
                </div>
              </div>
            </div>

            <hr className="my-16" />

            {/* Documents */}
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-10">
              <h6 className="mb-0">Documents</h6>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Remove disabled only after approval.
              </div>
            </div>

            {docs.length ? (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 150 }}>Type</th>
                      <th style={{ width: 140 }}>Status</th>
                      <th style={{ width: 90 }}>Version</th>
                      <th>Notes</th>
                      <th className="text-end" style={{ width: 120 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((d) => (
                      <tr key={d.id}>
                        <td className="fw-semibold">{docLabel(d.docType)}</td>
                        <td>
                          <StatusBadge status={norm(d.status) || "PENDING"} />
                        </td>
                        <td>v{d.version || 1}</td>
                        <td style={{ fontSize: 13 }}>
                          {d.instruction ? (
                            <div className="mb-1">
                              <span className="fw-semibold">Instruction:</span> {d.instruction}
                            </div>
                          ) : null}
                          {d.rejectReason ? (
                            <div className="text-danger">
                              <span className="fw-semibold">Reason:</span> {d.rejectReason}
                            </div>
                          ) : null}
                          {!d.instruction && !d.rejectReason ? <span className="text-muted">—</span> : null}
                        </td>
                        <td className="text-end">
                          <button className="btn btn-outline-danger btn-sm" onClick={() => removeDoc(d.id)} disabled={disableActions}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border radius-12 p-16">
                <div className="fw-semibold">No documents uploaded yet</div>
                <div className="text-muted mt-1" style={{ fontSize: 13 }}>
                  Select a document type and upload a file.
                </div>
              </div>
            )}

            {/* Draft snapshot */}
            {showDraftSnapshot ? (
              <>
                <hr className="my-16" />

                <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-10">
                  <div>
                    <h6 className="mb-1">Draft snapshot (optional)</h6>
                    <div className="text-muted" style={{ fontSize: 13 }}>
                      Store extra draft fields here (non-breaking). Used for change requests in v3.
                    </div>
                  </div>

                  <button className="btn btn-outline-primary btn-sm" onClick={() => saveDraft(payloadJson)} disabled={disableActions}>
                    Save draft
                  </button>
                </div>

                <textarea
                  className="form-control"
                  rows={7}
                  value={jsonText}
                  disabled={disableActions}
                  onChange={(e) => {
                    const t = e.target.value;
                    setJsonText(t);
                    try {
                      const next = JSON.parse(t || "{}");
                      setPayloadJson(next);
                    } catch {
                      // allow typing invalid JSON
                    }
                  }}
                  placeholder='{"organizationName":"..."}'
                />

                <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                  Tip: JSON must be valid to save.
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
