"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import { apiGet, apiPut } from "@/lib/api";

export default function StateRulesPage() {
  const params = useParams();
  const stateId = useMemo(() => Number(params?.id), [params]);
  const [policies, setPolicies] = useState([]);
  const [policyId, setPolicyId] = useState(null);
  const [jsonText, setJsonText] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!stateId) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiGet(`/api/v1/admin/state/states/${stateId}/policies`);
      const list = res?.data ?? [];
      setPolicies(list);
      const active = list.find((p) => p.status === "ACTIVE") || list[0];
      if (active) {
        setPolicyId(active.id);
        const map = {};
        (active.rules || []).forEach((r) => {
          map[r.ruleKey] = r.valueJson ?? {};
        });
        setJsonText(JSON.stringify(map, null, 2));
      }
    } catch (e) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [stateId]);

  useEffect(() => {
    load();
  }, [load]);

  const onSelectPolicy = (id) => {
    const p = policies.find((x) => x.id === Number(id));
    setPolicyId(p?.id ?? null);
    const map = {};
    (p?.rules || []).forEach((r) => {
      map[r.ruleKey] = r.valueJson ?? {};
    });
    setJsonText(JSON.stringify(map, null, 2));
  };

  const onSave = async () => {
    if (!policyId) return;
    setLoading(true);
    setError("");
    try {
      const parsed = JSON.parse(jsonText || "{}");
      await apiPut(`/api/v1/admin/state/policies/${policyId}/rules`, { rules: parsed });
      await load();
    } catch (e) {
      setError(e?.message ?? "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <PageHeader
        title="State Policy Rules"
        subtitle={`State ID: ${stateId || "-"}`}
        icon={<Icon icon="solar:code-circle-outline" />}
      />

      <SectionCard title="Rules JSON">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Policy</label>
            <select
              className="form-select"
              value={policyId || ""}
              onChange={(e) => onSelectPolicy(e.target.value)}
            >
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status})
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-8 d-flex align-items-end justify-content-end">
            <button className="btn btn-primary" onClick={onSave} disabled={loading || !policyId}>
              Save Rules
            </button>
          </div>
        </div>

        <div className="mt-3">
          <textarea
            className="form-control"
            rows={12}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          />
        </div>

        {error ? <div className="text-danger mt-2">{error}</div> : null}
      </SectionCard>
    </div>
  );
}

