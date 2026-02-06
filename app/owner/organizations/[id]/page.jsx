"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import StatusTimeline from "@/app/owner/_components/StatusTimeline";
import VerificationCasePanel from "@/app/owner/_components/verification/VerificationCasePanel";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

function normalize(s) {
  return String(s || "").toUpperCase();
}

function fmtDate(dt) {
  if (!dt) return "-";
  try {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return String(dt);
    return d.toLocaleString();
  } catch {
    return String(dt);
  }
}

function Badge({ text }) {
  const t = normalize(text);
  const cls =
    t === "VERIFIED" || t === "APPROVED"
      ? "bg-success-focus text-success-main"
      : t === "REJECTED" || t === "BLOCKED"
      ? "bg-danger-focus text-danger-main"
      : t === "REQUEST_CHANGES"
      ? "bg-warning-focus text-warning-main"
      : t === "PENDING_REVIEW" || t === "SUBMITTED"
      ? "bg-primary-50 text-primary-600"
      : t === "NOT_APPLIED" || t === "UNSUBMITTED" || t === "DRAFT"
      ? "bg-gray-200 text-gray-800"
      : "bg-dark text-white";

  return (
    <span className={`badge ${cls} radius-16 px-12 py-6 fw-semibold`}>
      {t || "—"}
    </span>
  );
}

function SectionCard({ title, subtitle, right, children }) {
  return (
    <div className="card radius-12 mb-3">
      <div className="card-body p-24">
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-12">
          <div>
            <h6 className="mb-0">{title}</h6>
            {subtitle ? (
              <div className="text-muted mt-6" style={{ fontSize: 12 }}>
                {subtitle}
              </div>
            ) : null}
          </div>
          {right ? <div>{right}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
}

function InfoGrid({ items = [] }) {
  return (
    <div className="row g-3">
      {items.map((it, idx) => (
        <div key={idx} className={it.col || "col-md-4"}>
          <div className="text-secondary">{it.label}</div>
          <div className="fw-semibold">{it.value ?? "-"}</div>
          {it.hint ? (
            <div className="text-muted mt-1" style={{ fontSize: 12 }}>
              {it.hint}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function EmptyBox({ title, note }) {
  return (
    <div className="alert alert-light mb-0">
      <div className="fw-semibold">{title}</div>
      {note ? <div className="text-muted mt-1">{note}</div> : null}
    </div>
  );
}

/**
 * Documents display (read-only):
 * - Supports doc.url OR doc.mediaId
 * - mediaId হলে:
 *    view:     /api/v1/media/:mediaId
 *    download: /api/v1/media/:mediaId/download
 */
function DocumentsSection({ docs = [] }) {
  const items = Array.isArray(docs) ? docs : [];

  function viewUrl(d) {
    if (d?.url) return d.url;
    if (d?.fileUrl) return d.fileUrl;
    if (d?.file?.url) return d.file.url;
    const id = d?.fileId ?? d?.mediaId ?? d?.media?.id;
    if (id) return `${API_BASE}/api/v1/media/${id}`;
    return null;
  }

  function downloadUrl(d) {
    if (d?.downloadUrl) return d.downloadUrl;
    if (d?.fileDownloadUrl) return d.fileDownloadUrl;
    const id = d?.fileId ?? d?.mediaId ?? d?.media?.id;
    if (id) return `${API_BASE}/api/v1/media/${id}/download`;
    return null;
  }

  // Optional: group by type for clean UI
  const grouped = useMemo(() => {
    const map = new Map();
    for (const d of items) {
      const key = normalize(d?.type || "OTHER");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(d);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  if (items.length === 0) {
    return (
      <EmptyBox
        title="No documents uploaded"
        note="Documents will be shown here after uploading from Registration (KYC) page."
      />
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      {grouped.map(([type, arr]) => (
        <div key={type} className="border radius-12 p-16">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-10">
            <div className="fw-semibold">{type}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              View only
            </div>
          </div>

          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Uploaded</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {arr.map((d, idx) => {
                  const v = viewUrl(d);
                  const dl = downloadUrl(d);
                  const name =
                    d?.fileName ||
                    d?.name ||
                    (d?.mimeType ? `File (${d.mimeType})` : `File ${idx + 1}`);
                  return (
                    <tr key={d?.id || d?.fileId || d?.mediaId || `${type}-${idx}`}>
                      <td>
                        <div className="fw-semibold">{name}</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                          {d?.mimeType || d?.contentType || ""}
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {fmtDate(d?.createdAt || d?.uploadedAt)}
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-2 justify-content-end flex-wrap">
                          {v ? (
                            <a
                              className="btn btn-sm btn-outline-primary"
                              href={v}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View
                            </a>
                          ) : (
                            <button className="btn btn-sm btn-outline-secondary" disabled>
                              View
                            </button>
                          )}
                          {dl ? (
                            <a
                              className="btn btn-sm btn-outline-secondary"
                              href={dl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Download
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OwnerOrganizationViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const j = await ownerGet(`/api/v1/owner/organizations/${id}`);
      setOrg(j?.data ?? j);
    } catch (e) {
      setError(e?.message || "Failed to load organization");
      setOrg(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const status = useMemo(() => normalize(org?.status), [org?.status]);
  const tradeStatus = useMemo(
    () => normalize(org?.legalProfile?.verificationStatus || "UNSUBMITTED"),
    [org?.legalProfile?.verificationStatus]
  );

  // Documents source: legalProfile.documents (and optional org.documents)
  const docs = useMemo(() => {
    const d1 = Array.isArray(org?.legalProfile?.documents)
      ? org.legalProfile.documents
      : [];
    const d2 = Array.isArray(org?.documents) ? org.documents : [];
    return [...d1, ...d2];
  }, [org]);

  async function refresh() {
    setBusy(true);
    try {
      await load();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-fluid">
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-16 mt-16">
        <div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h4 className="mb-0 fw-bold">Organization View</h4>
            <span className="text-muted" style={{ fontSize: 12 }}>
              ID: <span className="fw-semibold">{id}</span>
            </span>
          </div>
          <div className="text-muted mt-6" style={{ fontSize: 13 }}>
            <Link className="text-decoration-none" href="/owner">
              Owner
            </Link>{" "}
            <span className="mx-1">/</span>
            <Link className="text-decoration-none" href="/owner/organizations">
              Organizations
            </Link>{" "}
            <span className="mx-1">/</span>
            <span>View</span>
          </div>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <Link className="btn btn-outline-secondary" href="/owner/organizations">
            ← Back
          </Link>
          <Link className="btn btn-outline-primary" href={`/owner/organizations/${id}/branches`}>
            Branches
          </Link>
          <Link className="btn btn-primary" href={`/owner/organizations/${id}/edit`}>
            Edit
          </Link>
          <Link className="btn btn-outline-secondary" href={`/owner/organizations/${id}/registration`}>
            Registration (KYC)
          </Link>
          <button className="btn btn-outline-secondary" disabled={busy} onClick={refresh}>
            Refresh
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body p-24">Loading...</div>
        </div>
      ) : !org ? (
        <div className="card radius-12">
          <div className="card-body p-24">
            <div className="alert alert-warning mb-0">Organization not found.</div>
          </div>
        </div>
      ) : (
        <>
          {/* SECTION 1: Overview */}
          <SectionCard
            title="Section 1 — Overview"
            subtitle="View only. Update করতে হলে Edit / KYC page ব্যবহার করুন।"
            right={
              <div className="d-flex gap-2 flex-wrap">
                <Badge text={status} />
                <Badge text={tradeStatus} />
              </div>
            }
          >
            <div className="mb-16">
              <StatusTimeline status={status} />
            </div>

            <InfoGrid
              items={[
                { label: "Organization", value: org.name || "-", col: "col-md-4" },
                { label: "Support phone", value: org.supportPhone || "-", col: "col-md-4" },
                { label: "Email", value: org.email || "-", col: "col-md-4" },
              ]}
            />
          </SectionCard>

          {/* SECTION 2: Profile */}
          <SectionCard
            title="Section 2 — Profile"
            subtitle="Read only"
            right={
              <Link className="btn btn-sm btn-outline-secondary" href={`/owner/organizations/${id}/edit`}>
                Edit Profile
              </Link>
            }
          >
            <InfoGrid
              items={[
                { label: "Name", value: org.name || "-", col: "col-md-6" },
                { label: "Support phone", value: org.supportPhone || "-", col: "col-md-3" },
                { label: "Email", value: org.email || "-", col: "col-md-3" },
                { label: "Created", value: fmtDate(org.createdAt), col: "col-md-6" },
                { label: "Last updated", value: fmtDate(org.updatedAt), col: "col-md-6" },
              ]}
            />
          </SectionCard>

          {/* SECTION 3: Location */}
          <SectionCard title="Section 3 — Location" subtitle="Read only">
            <InfoGrid
              items={[
                {
                  label: "Full location",
                  value: org.addressJson?.fullPathText || org.addressJson?.locationText || "-",
                  col: "col-12",
                  hint: "Division > District > Upazila > Area, or DNCC/DSCC > Area",
                },
              ]}
            />
          </SectionCard>

          {/* SECTION 4: Verification */}
          <SectionCard
            title="Section 4 — Verification"
            subtitle="Current verification state and requirements"
            right={
              <Link className="btn btn-sm btn-outline-primary" href={`/owner/organizations/${id}/registration`}>
                Manage Documents (KYC)
              </Link>
            }
          >
            <InfoGrid
              items={[
                { label: "Org status", value: <Badge text={org?.status || "-"} />, col: "col-md-4" },
                { label: "Trade License status", value: <Badge text={tradeStatus} />, col: "col-md-4" },
                {
                  label: "Trade License document",
                  value: docs.some((d) => normalize(d?.type) === "TRADE_LICENSE") ? "Uploaded" : "Not uploaded",
                  col: "col-md-4",
                },
              ]}
            />
          </SectionCard>

          {/* SECTION 5: Documents */}
          <SectionCard
            title="Section 5 — Uploaded Documents"
            subtitle="এখান থেকে শুধু দেখা যাবে (View/Download)। Edit করা যাবে না।"
          >
            <DocumentsSection docs={docs} />
          </SectionCard>

        </>
      )}
    </div>
  );
}
