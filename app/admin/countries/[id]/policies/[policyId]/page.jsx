"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import PageHeader from "@/src/bpa/components/PageHeader";
import SectionCard from "@/src/bpa/admin/components/SectionCard";
import { apiGet } from "@/lib/api";

export default function CountryPolicyDetailPage() {
  const params = useParams();
  const countryId = useMemo(() => Number(params?.id), [params]);
  const policyId = useMemo(() => Number(params?.policyId), [params]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!countryId || !policyId) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiGet(`/api/v1/admin/country/countries/${countryId}/policies`);
      const list = res?.data ?? [];
      const found = list.find((p) => Number(p.id) === policyId);
      setPolicy(found || null);
      if (!found) setError("Policy not found for this country.");
    } catch (e) {
      setError(e?.message ?? "Failed to load policy");
    } finally {
      setLoading(false);
    }
  }, [countryId, policyId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page-wrapper">
      <PageHeader
        title="Policy Viewer"
        subtitle={`Country ID: ${countryId || "-"} • Policy ID: ${policyId || "-"}`}
        icon={<Icon icon="solar:document-text-outline" />}
      />

      <SectionCard title="Policy Overview">
        {loading ? <div>Loading...</div> : null}
        {error ? <div className="text-danger">{error}</div> : null}
        {policy ? (
          <div className="row g-3">
            <div className="col-md-4">
              <div className="text-muted">Name</div>
              <div className="fw-semibold">{policy.name || "-"}</div>
            </div>
            <div className="col-md-4">
              <div className="text-muted">Status</div>
              <div className="fw-semibold">{policy.status || "-"}</div>
            </div>
            <div className="col-md-4">
              <div className="text-muted">Effective From</div>
              <div className="fw-semibold">
                {policy.effectiveFrom ? new Date(policy.effectiveFrom).toLocaleString() : "-"}
              </div>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Feature Toggles" className="mt-4">
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Enabled</th>
              </tr>
            </thead>
            <tbody>
              {(policy?.features || []).map((row) => (
                <tr key={row.featureCode}>
                  <td>{row.featureCode}</td>
                  <td>{row.enabled ? "Yes" : "No"}</td>
                </tr>
              ))}
              {!policy?.features?.length ? (
                <tr>
                  <td colSpan={2} className="text-muted">
                    No features configured.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Donation Rules" className="mt-4">
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead>
              <tr>
                <th>Rule Type</th>
                <th>Enabled</th>
                <th>Max Single</th>
                <th>Max Daily</th>
              </tr>
            </thead>
            <tbody>
              {(policy?.donationRules || []).map((row) => (
                <tr key={row.id}>
                  <td>{row.ruleType}</td>
                  <td>{row.enabled ? "Yes" : "No"}</td>
                  <td>{row.maxAmountSingle ?? "-"}</td>
                  <td>{row.maxAmountDaily ?? "-"}</td>
                </tr>
              ))}
              {!policy?.donationRules?.length ? (
                <tr>
                  <td colSpan={4} className="text-muted">
                    No donation rules configured.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Payment Methods" className="mt-4">
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Enabled</th>
                <th>Sort</th>
              </tr>
            </thead>
            <tbody>
              {(policy?.paymentMethods || []).map((row) => (
                <tr key={row.id}>
                  <td>{row.providerCode}</td>
                  <td>{row.enabled ? "Yes" : "No"}</td>
                  <td>{row.sortOrder ?? "-"}</td>
                </tr>
              ))}
              {!policy?.paymentMethods?.length ? (
                <tr>
                  <td colSpan={3} className="text-muted">
                    No payment methods configured.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Policy Rules" className="mt-4">
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead>
              <tr>
                <th>Rule Key</th>
                <th>Enabled</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {(policy?.rules || []).map((row) => (
                <tr key={row.id}>
                  <td>{row.ruleKey}</td>
                  <td>{row.enabled ? "Yes" : "No"}</td>
                  <td>
                    <pre className="mb-0">{row.valueJson ? JSON.stringify(row.valueJson, null, 2) : "-"}</pre>
                  </td>
                </tr>
              ))}
              {!policy?.rules?.length ? (
                <tr>
                  <td colSpan={3} className="text-muted">
                    No policy rules configured.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

