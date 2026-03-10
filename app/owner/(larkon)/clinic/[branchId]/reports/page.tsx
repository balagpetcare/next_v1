"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicReportProfitability,
  ownerClinicReportSettlementSummary,
  ownerClinicReportDiscountAnalysis,
  ownerClinicReportDoctorContribution,
  ownerClinicReportInventoryVariance,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import ClinicConsoleTabs from "@/app/owner/_components/clinic/ClinicConsoleTabs";

type ReportType = "profitability" | "settlement" | "discount" | "doctor-contribution" | "inventory-variance";

export default function ClinicReportsPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [reportType, setReportType] = useState<ReportType>("profitability");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReport = async () => {
    if (!branchId || !from || !to) return;
    try {
      setLoading(true);
      setError("");
      let result: unknown = null;
      switch (reportType) {
        case "profitability":
          result = await ownerClinicReportProfitability(branchId, from, to);
          break;
        case "settlement":
          result = await ownerClinicReportSettlementSummary(branchId, from, to);
          break;
        case "discount":
          result = await ownerClinicReportDiscountAnalysis(branchId, from, to);
          break;
        case "doctor-contribution":
          result = await ownerClinicReportDoctorContribution(branchId, from, to);
          break;
        case "inventory-variance":
          result = await ownerClinicReportInventoryVariance(branchId, from, to);
          break;
        default:
          result = await ownerClinicReportProfitability(branchId, from, to);
      }
      setData(result);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchId && from && to) loadReport();
  }, [branchId, reportType, from, to]);

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
        title="Clinic reports"
        subtitle={`Branch #${branchId}`}
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Reports", href: `/owner/clinic/${branchId}/reports` },
        ]}
      />
      <ClinicConsoleTabs branchId={branchId} />

      <p className="text-muted small mb-3">Cost analysis and margin: use Profitability. Leakage and variance: use Inventory variance. Revenue: Settlement summary and Doctor contribution.</p>

      {error && (
        <div className="alert alert-danger radius-12 mb-24">
          <i className="ri-error-warning-line me-2" />
          {error}
        </div>
      )}

      <div className="card radius-12 mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-auto">
              <label className="form-label">Report</label>
              <select className="form-select radius-12" value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}>
                <option value="profitability">Profitability (cost / margin)</option>
                <option value="settlement">Settlement summary</option>
                <option value="discount">Discount analysis</option>
                <option value="doctor-contribution">Doctor contribution (revenue)</option>
                <option value="inventory-variance">Inventory variance (leakage)</option>
              </select>
            </div>
            <div className="col-auto">
              <label className="form-label">From</label>
              <input type="date" className="form-control radius-12" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="col-auto">
              <label className="form-label">To</label>
              <input type="date" className="form-control radius-12" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="card radius-12">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : data != null ? (
            <pre className="bg-light p-3 radius-12 overflow-auto mb-0" style={{ maxHeight: 400 }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          ) : (
            <p className="text-muted mb-0">Select report type and date range, then view data above.</p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <Link href={`/owner/clinic/${branchId}`} className="btn btn-outline-secondary radius-12">
          <i className="ri-arrow-left-line me-1" />
          Back to clinic
        </Link>
      </div>
    </div>
  );
}
