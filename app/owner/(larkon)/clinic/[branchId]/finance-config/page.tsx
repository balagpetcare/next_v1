"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ownerClinicFinanceConfig, ownerClinicFinanceConfigUpdate } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const SETTLEMENT_CYCLES = ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"] as const;

export default function ClinicFinanceConfigPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [settlementCycle, setSettlementCycle] = useState("MONTHLY");
  const [vialReturnDays, setVialReturnDays] = useState(7);

  const load = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const data = await ownerClinicFinanceConfig(branchId);
      setConfig(data ?? null);
      if (data && typeof data === "object") {
        setSettlementCycle(String((data as Record<string, unknown>).settlementCycle ?? "MONTHLY"));
        setVialReturnDays(Number((data as Record<string, unknown>).vialReturnDays ?? 7));
      }
    } catch (e) {
      setError((e as Error)?.message || "Failed to load finance config");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [branchId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) return;
    try {
      setSaving(true);
      setError("");
      await ownerClinicFinanceConfigUpdate(branchId, {
        settlementCycle,
        vialReturnDays,
      });
      await load();
    } catch (e) {
      setError((e as Error)?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Finance config"
        subtitle={`Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Finance config", href: `/owner/clinic/${branchId}/finance-config` },
        ]}
      />

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="card radius-12">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      ) : (
        <div className="card radius-12">
          <div className="card-body">
            <form onSubmit={handleSave}>
              <div className="mb-3">
                <label className="form-label">Settlement cycle</label>
                <select className="form-select radius-12" value={settlementCycle} onChange={(e) => setSettlementCycle(e.target.value)}>
                  {SETTLEMENT_CYCLES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <small className="text-muted">How often doctor settlement batches are generated (e.g. monthly payout).</small>
              </div>
              <div className="mb-4">
                <label className="form-label">Vial return due (days)</label>
                <input type="number" min={1} max={30} className="form-control radius-12" value={vialReturnDays} onChange={(e) => setVialReturnDays(parseInt(e.target.value, 10) || 7)} />
                <small className="text-muted">Days allowed for vial return before audit alert.</small>
              </div>
              <button type="submit" className="btn btn-primary radius-12" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </form>
            {config && (
              <div className="mt-4 pt-4 border-top">
                <h6 className="text-muted mb-2">Current config (raw)</h6>
                <pre className="bg-light p-2 radius-8 small mb-0" style={{ maxHeight: 200 }}>{JSON.stringify(config, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4">
        <Link href={`/owner/clinic/${branchId}`} className="btn btn-outline-secondary radius-12">
          <i className="ri-arrow-left-line me-1" />
          Back to clinic
        </Link>
      </div>
    </div>
  );
}
