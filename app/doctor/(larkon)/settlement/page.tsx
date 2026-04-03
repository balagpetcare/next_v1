"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  doctorGetMe,
  doctorGetMySettlementLedger,
  doctorGetMySettlementSummary,
  doctorGetMySettlementBatches,
  doctorGetMyContract,
} from "@/lib/api";
import { PaginationBar } from "@/src/components/common/PaginationBar";

const SETTLEMENT_BATCH_PAGE_SIZE = 20;

type LedgerRow = {
  id: number;
  visitId: number | null;
  orderId: number | null;
  type: string;
  grossAmount: number;
  clinicShare: number;
  doctorShare: number;
  settlementStatus: string;
  settledAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  notes: string | null;
  createdAt: string;
};

type BatchRow = {
  id: number;
  periodEnd: string;
  periodStart?: string;
  status: string;
  totalAccrued?: number;
  totalDeductions?: number;
  totalAdjustments?: number;
  netPayable?: number;
  approvedAt?: string | null;
  paidAt?: string | null;
};

export default function DoctorSettlementPage() {
  const [profile, setProfile] = useState<{ branches: { branchId: number; branchName: string }[] } | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [summary, setSummary] = useState<{
    pendingAmount: number;
    pendingCount: number;
    recentBatches: BatchRow[];
  } | null>(null);
  const [batches, setBatches] = useState<{ items: BatchRow[]; pagination: { page: number; total: number; totalPages: number } } | null>(null);
  const [contract, setContract] = useState<{
    id: number;
    contractType: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    status: string;
    rules?: Array<{ service?: { name: string }; rateType?: string; rateValue?: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");
  const [batchPage, setBatchPage] = useState(1);

  const loadProfile = useCallback(async () => {
    try {
      const me = await doctorGetMe();
      setProfile(me ?? null);
      const branches = me?.branches ?? [];
      if (branches.length > 0 && selectedBranchId === null) {
        setSelectedBranchId(branches[0].branchId);
      }
    } catch (e) {
      setError((e as Error)?.message || "Failed to load profile");
      setProfile(null);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadLedger = useCallback(async () => {
    if (!selectedBranchId) {
      setRows([]);
      return;
    }
    setListLoading(true);
    setError("");
    try {
      const list = await doctorGetMySettlementLedger(selectedBranchId, {
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load ledger");
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, [selectedBranchId, status, from, to]);

  const loadSummaryContractAndBatches = useCallback(async () => {
    if (!selectedBranchId) {
      setSummary(null);
      setContract(null);
      setBatches(null);
      return;
    }
    try {
      const [sum, bat, cont] = await Promise.all([
        doctorGetMySettlementSummary(selectedBranchId, { from: from || undefined, to: to || undefined }),
        doctorGetMySettlementBatches(selectedBranchId, {
          status: status || undefined,
          from: from || undefined,
          to: to || undefined,
          page: batchPage,
          limit: SETTLEMENT_BATCH_PAGE_SIZE,
        }),
        doctorGetMyContract(selectedBranchId),
      ]);
      setSummary(sum ?? null);
      setBatches(bat ?? null);
      setContract(cont ?? null);
    } catch {
      setSummary(null);
      setBatches(null);
      setContract(null);
    }
  }, [selectedBranchId, status, from, to, batchPage]);

  useEffect(() => {
    setBatchPage(1);
  }, [selectedBranchId, status, from, to]);

  useEffect(() => {
    setLoading(false);
    if (selectedBranchId != null) {
      loadLedger();
      loadSummaryContractAndBatches();
    }
  }, [selectedBranchId, loadLedger, loadSummaryContractAndBatches]);

  return (
    <div className="dashboard-main-body">
      <div className="card radius-12 mb-3">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0">Settlement ledger</h6>
          <Link href="/doctor" className="btn btn-sm btn-outline-primary radius-12">
            Back to dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger radius-12" role="alert">
          {error}
        </div>
      )}

      {profile?.branches && profile.branches.length > 0 && selectedBranchId && (
        <>
          <div className="row g-3 mb-4">
            {summary != null && (
              <div className="col-md-4">
                <div className="card radius-12 h-100">
                  <div className="card-body">
                    <h6 className="text-muted mb-2">Settlement summary</h6>
                    <p className="mb-0 fs-5">
                      <strong>Pending:</strong> {summary.pendingCount} entries, {Number(summary.pendingAmount).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {contract != null && (
              <div className="col-md-4">
                <div className="card radius-12 h-100">
                  <div className="card-body">
                    <h6 className="text-muted mb-2">Contract</h6>
                    <p className="mb-0">
                      <span className="badge bg-primary radius-8 me-1">{contract.contractType}</span>
                      {contract.effectiveFrom && new Date(contract.effectiveFrom).toLocaleDateString()}
                      {contract.effectiveTo ? ` – ${new Date(contract.effectiveTo).toLocaleDateString()}` : " – ongoing"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="col-md-4">
              <div className="card radius-12 h-100">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <h6 className="text-muted mb-0">Dispute</h6>
                  <span className="text-muted small">Contact clinic admin to raise a dispute on a batch.</span>
                </div>
              </div>
            </div>
          </div>

          {batches != null && batches.items.length > 0 && (
            <div className="card radius-12 mb-4">
              <div className="card-header">
                <h6 className="mb-0">Batch history</h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Period end</th>
                        <th>Status</th>
                        <th>Accrued</th>
                        <th>Net payable</th>
                        <th>Approved</th>
                        <th>Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.items.map((b) => (
                        <tr key={b.id}>
                          <td>{b.periodEnd ? new Date(b.periodEnd).toLocaleDateString() : "—"}</td>
                          <td>
                            <span className={`badge radius-8 ${b.status === "PAID" ? "bg-success" : b.status === "APPROVED" ? "bg-info" : "bg-secondary"}`}>
                              {b.status}
                            </span>
                          </td>
                          <td>{b.totalAccrued != null ? Number(b.totalAccrued).toFixed(2) : "—"}</td>
                          <td>{b.netPayable != null ? Number(b.netPayable).toFixed(2) : "—"}</td>
                          <td>{b.approvedAt ? new Date(b.approvedAt).toLocaleDateString() : "—"}</td>
                          <td>{b.paidAt ? new Date(b.paidAt).toLocaleDateString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {batches.pagination.total > 0 && (
                  <div className="px-3 pb-3">
                    <PaginationBar
                      page={batchPage}
                      pageSize={SETTLEMENT_BATCH_PAGE_SIZE}
                      total={batches.pagination.total}
                      totalPages={Math.max(1, batches.pagination.totalPages)}
                      disabled={false}
                      onPageChange={setBatchPage}
                      className="mt-0 pt-3 border-top"
                      ariaLabel="Settlement batches pages"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="card radius-12 mb-4">
          <div className="card-body">
            <div className="row g-2 mb-3">
              <div className="col-auto">
                <label className="form-label small mb-0">Branch</label>
                <select
                  className="form-select form-select-sm radius-12"
                  value={selectedBranchId ?? ""}
                  onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : null)}
                >
                  {profile.branches.map((b) => (
                    <option key={b.branchId} value={b.branchId}>
                      {b.branchName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-auto">
                <label className="form-label small mb-0">Status</label>
                <select className="form-select form-select-sm radius-12" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="SETTLED">Settled</option>
                </select>
              </div>
              <div className="col-auto">
                <label className="form-label small mb-0">From</label>
                <input type="date" className="form-control form-control-sm radius-12" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="col-auto">
                <label className="form-label small mb-0">To</label>
                <input type="date" className="form-control form-control-sm radius-12" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div className="col-auto d-flex align-items-end">
                <button
                  type="button"
                  className="btn btn-sm btn-primary radius-12"
                  onClick={() => {
                    loadLedger();
                    loadSummaryContractAndBatches();
                  }}
                  disabled={listLoading}
                >
                  {listLoading ? "Loading…" : "Apply"}
                </button>
              </div>
            </div>
            {listLoading ? (
              <div className="text-center py-4">
                <span className="spinner-border spinner-border-sm text-primary" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-muted mb-0">No settlement entries. Use filters and click Apply.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Visit / Order</th>
                      <th>Gross</th>
                      <th>Clinic share</th>
                      <th>My share</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.type}</td>
                        <td>{row.visitId ?? row.orderId ?? "—"}</td>
                        <td>{row.grossAmount}</td>
                        <td>{row.clinicShare}</td>
                        <td>{row.doctorShare}</td>
                        <td>
                          <span className={`badge radius-8 ${row.settlementStatus === "SETTLED" ? "bg-success" : "bg-warning"}`}>{row.settlementStatus}</span>
                        </td>
                        <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {!loading && profile?.branches?.length === 0 && (
        <div className="card radius-12">
          <div className="card-body text-center text-muted py-5">
            <p className="mb-0">No clinic branches linked. Settlement ledger will appear when you are assigned to a clinic.</p>
          </div>
        </div>
      )}
    </div>
  );
}
