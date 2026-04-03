"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { getScenarioTemplates, ownerGet, postScenarioRun } from "@/app/owner/_lib/ownerApi";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";

type BranchRow = { org?: { id: number } };
type Template = { templateKey: string; label: string; defaults?: Record<string, number>; description?: string };

export default function NewScenarioPage() {
  const router = useRouter();
  const [orgId, setOrgId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateKey, setTemplateKey] = useState("COMBINED_STRESS");
  const [demandPct, setDemandPct] = useState(10);
  const [leadDays, setLeadDays] = useState(2);
  const [horizon, setHorizon] = useState(28);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const brRes = await ownerGet<{ data?: BranchRow[] }>("/api/v1/owner/branches");
        const list = (brRes as { data?: BranchRow[] })?.data;
        const oid = Array.isArray(list) && list[0]?.org?.id ? list[0].org.id : null;
        setOrgId(oid);
        const tr = await getScenarioTemplates();
        const data = (tr as { data?: Template[] })?.data;
        if (Array.isArray(data) && data.length) {
          setTemplates(data);
          setTemplateKey(data[0].templateKey);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const applyTemplateDefaults = useCallback(
    (key: string) => {
      const t = templates.find((x) => x.templateKey === key);
      if (t?.defaults) {
        if (t.defaults.demandPct != null) setDemandPct(t.defaults.demandPct);
        if (t.defaults.leadTimeAddDays != null) setLeadDays(t.defaults.leadTimeAddDays);
      }
    },
    [templates]
  );

  useEffect(() => {
    applyTemplateDefaults(templateKey);
  }, [templateKey, applyTemplateDefaults]);

  const onRun = async () => {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await postScenarioRun({
        orgId,
        templateKey,
        horizonDays: horizon,
        parametersJson: { demandPct, leadTimeAddDays: leadDays },
      });
      const payload = (res as { data?: { runId?: number } })?.data;
      const runId = payload?.runId;
      if (runId) router.push(`/owner/inventory/network-command/scenarios/${runId}`);
      else setError("No run id returned");
    } catch (e) {
      setError(getMessageFromApiError(e as Error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="New scenario run" subtitle="Deterministic sandbox stress test over current replenishment suggestions." />
      <div className="alert alert-info small mb-3" role="status">
        <strong>Sandbox only.</strong> Results are stored as scenario snapshots and labeled{" "}
        <code>SIMULATION_SANDBOX</code>. They do not change inventory, ledgers, or purchase orders. Use decision packages if you
        need an auditable approval trail before operational work.
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {orgId == null && <p className="text-muted">No org context.</p>}
      {orgId != null && (
        <div className="card border-0 shadow-sm" style={{ maxWidth: 480 }}>
          <div className="card-body">
            <div className="mb-2">
              <label className="form-label">Template</label>
              <select
                className="form-select form-select-sm"
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.templateKey} value={t.templateKey}>
                    {t.label}
                  </option>
                ))}
              </select>
              <div className="small text-muted mt-1">{templates.find((x) => x.templateKey === templateKey)?.description}</div>
            </div>
            <div className="mb-2">
              <label className="form-label">Demand % adjustment</label>
              <input
                type="number"
                className="form-control form-control-sm"
                value={demandPct}
                onChange={(e) => setDemandPct(Number(e.target.value))}
              />
            </div>
            <div className="mb-2">
              <label className="form-label">Lead time +days</label>
              <input
                type="number"
                className="form-control form-control-sm"
                value={leadDays}
                onChange={(e) => setLeadDays(Number(e.target.value))}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Horizon (days)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
              />
            </div>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={onRun}>
              Run simulation
            </button>
          </div>
        </div>
      )}
      <Link href="/owner/inventory/network-command/scenarios" className="btn btn-link">
        ← Back to list
      </Link>
    </>
  );
}
