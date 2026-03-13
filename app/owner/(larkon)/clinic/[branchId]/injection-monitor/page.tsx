"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerClinicInjectionMonitor } from "@/app/owner/_lib/ownerApi";

export default function OwnerClinicInjectionMonitorPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const row = await ownerClinicInjectionMonitor(branchId, { date });
      setData(row ?? null);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load injection monitor");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [branchId, date]);

  useEffect(() => {
    load();
  }, [load]);

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  const tokens = data?.tokens ?? {};
  const administrations = data?.administrations ?? {};
  const pendingTokens = Array.isArray(data?.pendingTokens) ? data.pendingTokens : [];
  const activeVials = Array.isArray(data?.activeVials) ? data.activeVials : [];

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Injection Monitor"
        subtitle={`Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Injection Monitor", href: `/owner/clinic/${branchId}/injection-monitor` },
        ]}
        actions={[
          <Link key="recon" href={`/owner/clinic/${branchId}/reconciliation`} className="btn btn-outline-primary radius-12">
            Reconciliation
          </Link>,
        ]}
      />

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Link href={`/owner/clinic/${branchId}`} className="btn btn-sm btn-outline-secondary radius-12">
          ← Branch Overview
        </Link>
        <input
          type="date"
          className="form-control form-control-sm radius-8"
          style={{ width: 180 }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button type="button" className="btn btn-sm btn-outline-primary radius-12" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger radius-12 mb-3">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3">
          <div className="card radius-12 border-0 bg-light">
            <div className="card-body py-3">
              <div className="text-muted small">Tokens pending</div>
              <div className="fw-semibold fs-5">{Number(tokens.PENDING ?? 0)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card radius-12 border-0 bg-light">
            <div className="card-body py-3">
              <div className="text-muted small">Tokens used</div>
              <div className="fw-semibold fs-5 text-success">{Number(tokens.USED ?? 0)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card radius-12 border-0 bg-light">
            <div className="card-body py-3">
              <div className="text-muted small">Injections</div>
              <div className="fw-semibold fs-5">{Number(administrations.count ?? 0)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card radius-12 border-0 bg-light">
            <div className="card-body py-3">
              <div className="text-muted small">Total mL used</div>
              <div className="fw-semibold fs-5">{Number(administrations.totalMlUsed ?? 0)}</div>
            </div>
          </div>
        </div>
      </div>

      {data?.reconciliation?.hasMismatch ? (
        <div className="alert alert-warning radius-12 mb-3">
          <i className="ri-alert-line me-2" />
          Latest reconciliation is flagged for mismatch.
        </div>
      ) : null}

      <div className="row g-3">
        <div className="col-12 col-xl-7">
          <div className="card radius-12 h-100">
            <div className="card-body p-24">
              <h6 className="mb-3">Pending tokens</h6>
              {loading ? (
                <div className="text-muted">Loading...</div>
              ) : pendingTokens.length === 0 ? (
                <div className="text-muted">No pending tokens.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Token</th>
                        <th>Visit</th>
                        <th>Variant</th>
                        <th>Dose</th>
                        <th>Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTokens.map((t: any) => (
                        <tr key={t.id}>
                          <td className="fw-semibold">{t.tokenCode}</td>
                          <td>{t.visitId ?? "—"}</td>
                          <td>{t.variant?.title ?? t.variantId ?? "—"}</td>
                          <td>{String(t.expectedDose ?? "—")} {t.unit ?? ""}</td>
                          <td>{t.expiresAt ? new Date(t.expiresAt).toLocaleString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-5">
          <div className="card radius-12 h-100">
            <div className="card-body p-24">
              <h6 className="mb-3">Active vials</h6>
              {loading ? (
                <div className="text-muted">Loading...</div>
              ) : activeVials.length === 0 ? (
                <div className="text-muted">No active vial sessions.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Variant</th>
                        <th>Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeVials.map((v: any) => (
                        <tr key={v.id}>
                          <td>{v.id}</td>
                          <td>{v.variant?.title ?? v.variantId ?? "—"}</td>
                          <td>{v.remainingQty ?? "—"} / {v.initialQty ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

