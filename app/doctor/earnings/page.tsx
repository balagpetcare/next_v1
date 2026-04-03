"use client";

import { useState, useEffect } from "react";
import { PageHeader, SectionCard, StatCard } from "@/src/components/dashboard";
import { Button, Badge, Form } from "react-bootstrap";

interface EarningsSummary {
  totalEarnings: number;
  totalAppointments: number;
  averagePerAppointment: number;
  currentMonthEarnings: number;
  previousMonthEarnings: number;
  monthOverMonthGrowth: number;
}

interface EarningsBreakdown {
  period: string;
  earnings: number;
  appointments: number;
  averageFee: number;
}

interface RecentEarning {
  id: number;
  appointmentId: number;
  patientName: string;
  petName: string;
  serviceName: string;
  date: string;
  amount: number;
  status: "PENDING" | "PAID" | "PROCESSING";
}

interface ContractDetails {
  contractType: string;
  currentRate?: number;
  baseSalary?: number;
  incentiveRate?: number;
  nextReviewDate?: string;
}

export default function DoctorEarningsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "breakdown" | "recent">("overview");
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year">("month");
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [breakdown, setBreakdown] = useState<EarningsBreakdown[]>([]);
  const [recentEarnings, setRecentEarnings] = useState<RecentEarning[]>([]);
  const [contract, setContract] = useState<ContractDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab, period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, breakdownRes, recentRes, contractRes] = await Promise.all([
        fetch(`/api/doctor/earnings/summary?period=${period}`),
        fetch(`/api/doctor/earnings/breakdown?period=${period}`),
        fetch("/api/doctor/earnings/recent"),
        fetch("/api/doctor/contract")
      ]);

      const summaryData = await summaryRes.json();
      const breakdownData = await breakdownRes.json();
      const recentData = await recentRes.json();
      const contractData = await contractRes.json();

      setSummary(summaryData);
      setBreakdown(breakdownData);
      setRecentEarnings(recentData);
      setContract(contractData);
    } catch (error) {
      console.error("Failed to fetch earnings data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, { 
      style: "currency", 
      currency: "BDT", 
      minimumFractionDigits: 0 
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      PENDING: "warning",
      PAID: "success",
      PROCESSING: "info",
    };
    return colors[status as keyof typeof colors] || "secondary";
  };

  if (loading && !summary) {
    return <div className="text-center py-5">Loading earnings data...</div>;
  }

  return (
    <div>
      <PageHeader
        title="My Earnings"
        subtitle="Track your earnings and payment history"
      />

      {/* Period Selector */}
      <div className="mb-4">
        <div className="d-flex align-items-center gap-3">
          <span className="fw-semibold">Period:</span>
          <div className="btn-group">
            {(["week", "month", "quarter", "year"] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? "primary" : "outline-primary"}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-4">
        <div className="btn-group">
          <Button
            variant={activeTab === "overview" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </Button>
          <Button
            variant={activeTab === "breakdown" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("breakdown")}
          >
            Breakdown
          </Button>
          <Button
            variant={activeTab === "recent" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("recent")}
          >
            Recent Earnings
          </Button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && summary && (
        <div>
          {/* Stats Cards */}
          <div className="row mb-4">
            <div className="col-md-3">
              <StatCard
                label="Total Earnings"
                value={formatCurrency(summary.totalEarnings)}
                icon="bi-currency-rupee"
                variant="primary"
              />
            </div>
            <div className="col-md-3">
              <StatCard
                label="Total Appointments"
                value={summary.totalAppointments.toString()}
                icon="bi-calendar-check"
                variant="info"
              />
            </div>
            <div className="col-md-3">
              <StatCard
                label="Avg per Appointment"
                value={formatCurrency(summary.averagePerAppointment)}
                icon="bi-graph-up"
                variant="success"
              />
            </div>
            <div className="col-md-3">
              <StatCard
                label="Month Growth"
                value={formatPercent(summary.monthOverMonthGrowth)}
                icon="bi-graph-up-arrow"
                variant={summary.monthOverMonthGrowth >= 0 ? "success" : "danger"}
              />
            </div>
          </div>

          {/* Contract Details */}
          {contract && (
            <SectionCard title="Contract Details">
              <div className="row">
                <div className="col-md-6">
                  <h6>Contract Type</h6>
                  <p className="text-muted">{contract.contractType.replace("_", " ")}</p>
                </div>
                <div className="col-md-6">
                  <h6>Current Rate</h6>
                  <p className="text-muted">
                    {contract.currentRate && formatCurrency(contract.currentRate)}
                    {contract.baseSalary && formatCurrency(contract.baseSalary)}
                    {contract.incentiveRate && `${contract.incentiveRate}%`}
                  </p>
                </div>
                {contract.nextReviewDate && (
                  <div className="col-md-6">
                    <h6>Next Review</h6>
                    <p className="text-muted">
                      {new Date(contract.nextReviewDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Monthly Comparison */}
          <SectionCard title="Monthly Comparison">
            <div className="row">
              <div className="col-md-6">
                <h6>Current Month</h6>
                <h4 className="text-primary">{formatCurrency(summary.currentMonthEarnings)}</h4>
              </div>
              <div className="col-md-6">
                <h6>Previous Month</h6>
                <h4 className="text-muted">{formatCurrency(summary.previousMonthEarnings)}</h4>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Breakdown Tab */}
      {activeTab === "breakdown" && (
        <SectionCard title="Earnings Breakdown">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Earnings</th>
                  <th>Appointments</th>
                  <th>Average Fee</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((item, index) => (
                  <tr key={index}>
                    <td>{item.period}</td>
                    <td className="fw-semibold">{formatCurrency(item.earnings)}</td>
                    <td>{item.appointments}</td>
                    <td>{formatCurrency(item.averageFee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Recent Earnings Tab */}
      {activeTab === "recent" && (
        <SectionCard title="Recent Earnings">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Pet</th>
                  <th>Service</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentEarnings.map((earning) => (
                  <tr key={earning.id}>
                    <td>{new Date(earning.date).toLocaleDateString()}</td>
                    <td>{earning.patientName}</td>
                    <td>{earning.petName}</td>
                    <td>{earning.serviceName}</td>
                    <td className="fw-semibold">{formatCurrency(earning.amount)}</td>
                    <td>
                      <Badge bg={getStatusColor(earning.status)}>
                        {earning.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Export Button */}
      <div className="mt-4">
        <Button variant="outline-primary">
          <i className="bi bi-download me-2"></i>
          Export Earnings Report
        </Button>
      </div>
    </div>
  );
}
