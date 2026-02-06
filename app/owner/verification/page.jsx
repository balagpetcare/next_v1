"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import StatusBadge from "@/app/owner/_components/StatusBadge";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

function pickArray(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp.items)) return resp.items;
  if (Array.isArray(resp.data?.items)) return resp.data.items;
  return [];
}

async function safeGetVerificationCase(entityType, entityId) {
  const q = new URLSearchParams();
  q.set("entityType", entityType);
  if (entityId != null) q.set("entityId", String(entityId));
  const j = await ownerGet(`/api/v1/owner/verification-case?${q.toString()}`);
  return j?.data ?? j;
}

function entityLink(c) {
  if (c.entityType === "ORGANIZATION") return `/owner/organizations/${c.entityId}`;
  if (c.__orgId) return `/owner/organizations/${c.__orgId}/branches/${c.entityId}`;
  return `/owner/branches/${c.entityId}`;
}

export default function VerificationCenterPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orgs, setOrgs] = useState([]);
  const [branches, setBranches] = useState([]);
  const [cases, setCases] = useState([]);
  const [filterV, setFilterV] = useState("ALL");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const orgList = pickArray(await ownerGet("/api/v1/owner/organizations"));
      setOrgs(orgList);

      // branches: aggregate under orgs
      const branchRows = [];
      for (const org of orgList) {
        if (!org?.id) continue;
        try {
          const b = pickArray(await ownerGet(`/api/v1/owner/organizations/${org.id}/branches`));
          for (const x of b) branchRows.push({ ...x, __orgId: org.id, __orgName: org.name });
        } catch {
          // ignore per-org failures
        }
      }
      setBranches(branchRows);

      // cases
      const tasks = [];
      for (const o of orgList) {
        tasks.push(async () => {
          const c = await safeGetVerificationCase("ORGANIZATION", o.id);
          return { entityType: "ORGANIZATION", entityId: o.id, name: o.name, status: c?.status, documents: c?.documents || [] };
        });
      }
      for (const b of branchRows) {
        tasks.push(async () => {
          const c = await safeGetVerificationCase("BRANCH", b.id);
          return {
            entityType: "BRANCH",
            entityId: b.id,
            __orgId: b.__orgId,
            name: `${b.name}${b.__orgName ? ` (${b.__orgName})` : ""}`,
            status: c?.status,
            documents: c?.documents || [],
          };
        });
      }

      const out = [];
      const chunkSize = 8;
      for (let i = 0; i < tasks.length; i += chunkSize) {
        const chunk = tasks.slice(i, i + chunkSize);
        const res = await Promise.all(chunk.map((fn) => fn().catch(() => null)));
        for (const r of res) if (r) out.push(r);
      }

      setCases(out);
    } catch (e) {
      setError(e?.message || "Failed to load verification center");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const list = Array.isArray(cases) ? cases : [];
    return list
      .map((c) => {
        const st = String(c?.status || "DRAFT").toUpperCase();
        const rejectedDocs = (c.documents || []).filter((d) => String(d?.status || "").toUpperCase() === "REJECTED");
        return { ...c, __status: st, __rejectedDocs: rejectedDocs };
      })
      .filter((c) => (filterV === "ALL" ? true : c.__status === filterV))
      .sort((a, b) => {
        // show REJECTED first, then SUBMITTED, then DRAFT, then APPROVED
        const p = (st) => (st === "REJECTED" ? 0 : st === "SUBMITTED" ? 1 : st === "DRAFT" ? 2 : 3);
        return p(a.__status) - p(b.__status);
      });
  }, [cases, filterV]);

  const stats = useMemo(() => {
    const s = { organizations: orgs.length, branches: branches.length, rejectedDocs: 0 };
    for (const c of cases) {
      for (const d of c?.documents || []) {
        if (String(d?.status || "").toUpperCase() === "REJECTED") s.rejectedDocs++;
      }
    }
    return s;
  }, [orgs, branches, cases]);

  return (
    <div className="container py-3">
      <div className="d-flex align-items-start justify-content-between gap-2 flex-wrap mb-3">
        <div>
          <h2 className="mb-0">Verification Center</h2>
          <div className="text-secondary">
            One place to track verification for all your organizations and branches. Fix rejected docs, then re-submit.
          </div>
          <div className="text-secondary" style={{ fontSize: 13 }}>
            Organizations: <b>{stats.organizations}</b> • Branches: <b>{stats.branches}</b> • Rejected docs: <b>{stats.rejectedDocs}</b>
          </div>
        </div>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-secondary" href="/owner/dashboard">
            Back to dashboard
          </Link>
          <button className="btn btn-primary" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="card radius-12">
        <div className="card-body p-24">
          <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
            <div className="text-secondary" style={{ fontSize: 13 }}>
              Filter and open any entity to upload documents, request changes, or submit for review.
            </div>
            <div className="ms-auto d-flex align-items-center gap-2">
              <label className="form-label mb-0" style={{ fontSize: 13 }}>
                Status
              </label>
              <select className="form-select form-select-sm" value={filterV} onChange={(e) => setFilterV(e.target.value)}>
                <option value="ALL">All Types</option>
                <option value="DRAFT">DRAFT</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="APPROVED">APPROVED</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-secondary">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="alert alert-success mb-0">No items found for this filter.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Entity</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Rejected docs</th>
                    <th>Next action</th>
                    <th style={{ width: 110 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const rejectedCount = c.__rejectedDocs?.length || 0;
                    const nextAction =
                      c.__status === "REJECTED" || rejectedCount
                        ? "Fix rejected documents and re-submit"
                        : c.__status === "SUBMITTED"
                        ? "Wait for admin review"
                        : c.__status === "APPROVED"
                        ? "Request change if you need edits"
                        : "Upload documents and submit";
                    return (
                      <tr key={`${c.entityType}-${c.entityId}`}>
                        <td className="fw-semibold">{c.name}</td>
                        <td>{c.entityType}</td>
                        <td>
                          <StatusBadge status={c.__status} />
                        </td>
                        <td>
                          {rejectedCount ? <span className="badge text-bg-danger">{rejectedCount}</span> : <span className="text-secondary">—</span>}
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {nextAction}
                          {rejectedCount ? (
                            <div className="mt-1">
                              <details>
                                <summary className="text-danger" style={{ cursor: "pointer" }}>
                                  View rejected doc instructions
                                </summary>
                                <ul className="mb-0 mt-2" style={{ fontSize: 13 }}>
                                  {c.__rejectedDocs.map((d) => (
                                    <li key={d.id}>
                                      <b>{d.docType}</b> — {d.instruction || d.rejectReason || "Needs update"}
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            </div>
                          ) : null}
                        </td>
                        <td className="text-end">
                          <Link className="btn btn-outline-primary btn-sm" href={entityLink(c)}>
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
