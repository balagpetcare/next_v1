"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import {
  attachRecallToCampaign,
  createRecallCampaign,
  listRecallCampaigns,
} from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type CampaignRow = {
  id: number;
  title: string;
  externalRef?: string | null;
  severity: string;
  status?: string;
  createdAt: string;
  _count?: { recalls?: number };
  createdBy?: { profile?: { displayName?: string | null } | null };
};

function unwrapCampaigns(res: unknown): CampaignRow[] {
  if (!res || typeof res !== "object") return [];
  const r = res as { data?: CampaignRow[]; success?: boolean };
  if (Array.isArray(r.data)) return r.data;
  return [];
}

export default function RecallCampaignsPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [severity, setSeverity] = useState<"STANDARD" | "URGENT" | "CRITICAL">("STANDARD");
  const [saving, setSaving] = useState(false);
  const [attachCampaignId, setAttachCampaignId] = useState("");
  const [attachRecallId, setAttachRecallId] = useState("");
  const [attachBusy, setAttachBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const br = await fetch("/api/v1/owner/branches", { credentials: "include" }).then((r) => r.json());
      const rowsBr = (br?.data ?? []) as { org?: { id: number } }[];
      setOrgId(rowsBr[0]?.org?.id ?? null);
    })();
  }, []);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listRecallCampaigns(orgId);
      setRows(unwrapCampaigns(res));
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId) load();
  }, [orgId, load]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createRecallCampaign({
        orgId,
        title: title.trim(),
        externalRef: externalRef.trim() || undefined,
        severity,
      });
      setTitle("");
      setExternalRef("");
      setSeverity("STANDARD");
      await load();
    } catch (err) {
      setError(getMessageFromApiError(err as Error));
    } finally {
      setSaving(false);
    }
  };

  const onAttach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    const cid = parseInt(attachCampaignId, 10);
    const rid = parseInt(attachRecallId, 10);
    if (!Number.isFinite(cid) || !Number.isFinite(rid)) {
      setError("Enter numeric campaign and recall IDs.");
      return;
    }
    setAttachBusy(true);
    setError(null);
    try {
      await attachRecallToCampaign(cid, rid, orgId);
      setAttachRecallId("");
      await load();
    } catch (err) {
      setError(getMessageFromApiError(err as Error));
    } finally {
      setAttachBusy(false);
    }
  };

  return (
    <div className="container-fluid py-4">
      <PageHeader
        title="Recall campaigns"
        subtitle="Group batch recalls under a traceable campaign (supplier notice, audit ID). Attaching recalls links lot-level actions to the campaign."
      />
      <div className="mb-3">
        <Link href="/owner/inventory/recalls" className="btn btn-outline-secondary btn-sm">
          ← Batch recalls
        </Link>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-muted">Loading…</p>}

      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="mb-3">Create campaign</h6>
              <form onSubmit={onCreate}>
                <div className="mb-2">
                  <label className="form-label small">Title</label>
                  <input className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="mb-2">
                  <label className="form-label small">External ref (optional)</label>
                  <input
                    className="form-control"
                    value={externalRef}
                    onChange={(e) => setExternalRef(e.target.value)}
                    placeholder="Supplier / regulator reference"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small">Severity</label>
                  <select className="form-select" value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
                    <option value="STANDARD">STANDARD</option>
                    <option value="URGENT">URGENT</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !orgId}>
                  {saving ? "Creating…" : "Create campaign"}
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="mb-3">Attach existing recall</h6>
              <p className="small text-muted">
                Use recall IDs from the batch recall list. One recall can belong to one campaign at a time.
              </p>
              <form onSubmit={onAttach}>
                <div className="mb-2">
                  <label className="form-label small">Campaign ID</label>
                  <input
                    className="form-control"
                    inputMode="numeric"
                    value={attachCampaignId}
                    onChange={(e) => setAttachCampaignId(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small">Recall ID</label>
                  <input
                    className="form-control"
                    inputMode="numeric"
                    value={attachRecallId}
                    onChange={(e) => setAttachRecallId(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-outline-primary btn-sm" disabled={attachBusy || !orgId}>
                  {attachBusy ? "Attaching…" : "Attach recall to campaign"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white fw-semibold">Campaigns</div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Recalls</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    No campaigns yet.
                  </td>
                </tr>
              )}
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>
                    <strong>{c.title}</strong>
                    {c.externalRef && <div className="small text-muted">Ref: {c.externalRef}</div>}
                  </td>
                  <td>{c.severity}</td>
                  <td>{c.status ?? "—"}</td>
                  <td>{c._count?.recalls ?? "—"}</td>
                  <td className="small text-muted">{new Date(c.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
