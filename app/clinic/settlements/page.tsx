"use client";

import { useState, useEffect } from "react";
import { PageHeader, SectionCard, DataTableWrapper, StatCard } from "@/src/components/dashboard";
import { Button, Badge, Modal, Form } from "react-bootstrap";

interface SettlementSummary {
  totalSettlements: number;
  pendingAmount: number;
  processedAmount: number;
  averageProcessingDays: number;
  currentMonthSettlements: number;
  previousMonthSettlements: number;
  monthOverMonthGrowth: number;
}

interface SettlementRecord {
  id: number;
  doctorId: number;
  doctorName: string;
  period: string;
  grossAmount: number;
  doctorShare: number;
  clinicShare: number;
  adjustments: number;
  netAmount: number;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED";
  processedAt?: string;
  paidAt?: string;
  paymentMethod?: string;
  notes?: string;
}

interface AdjustmentRecord {
  id: number;
  settlementId: number;
  type: "REFUND_REVERSAL" | "CORRECTION" | "BONUS" | "PENALTY";
  amount: number;
  doctorShare: number;
  clinicShare: number;
  reason: string;
  createdAt: string;
  adjustedBy: string;
}

export default function ClinicSettlementsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "records" | "adjustments">("overview");
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year">("month");
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  const [records, setRecords] = useState<SettlementRecord[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SettlementRecord | null>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentFormData, setAdjustmentFormData] = useState({
    type: "CORRECTION",
    amount: 0,
    doctorShare: 0,
    clinicShare: 0,
    reason: "",
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "overview") {
        const response = await fetch(`/api/clinic/settlements/summary?period=${period}`);
        const data = await response.json();
        setSummary(data);
      } else if (activeTab === "records") {
        const response = await fetch(`/api/clinic/settlements/records?period=${period}`);
        const data = await response.json();
        setRecords(data);
      } else {
        const response = await fetch("/api/clinic/settlements/adjustments");
        const data = await response.json();
        setAdjustments(data);
      }
    } catch (error) {
      console.error("Failed to fetch settlement data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessSettlement = async () => {
    if (!selectedRecord) return;

    try {
      const response = await fetch(`/api/clinic/settlements/${selectedRecord.id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: "BANK_TRANSFER",
        }),
      });

      if (response.ok) {
        await fetchData();
        setShowProcessModal(false);
        setSelectedRecord(null);
      }
    } catch (error) {
      console.error("Failed to process settlement:", error);
    }
  };

  const handleCreateAdjustment = async () => {
    if (!selectedRecord) return;

    try {
      const response = await fetch(`/api/clinic/settlements/${selectedRecord.id}/adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adjustmentFormData),
      });

      if (response.ok) {
        await fetchData();
        setShowAdjustmentModal(false);
        setAdjustmentFormData({
          type: "CORRECTION",
          amount: 0,
          doctorShare: 0,
          clinicShare: 0,
          reason: "",
        });
      }
    } catch (error) {
      console.error("Failed to create adjustment:", error);
    }
  };

  const openProcessModal = (record: SettlementRecord) => {
    setSelectedRecord(record);
    setShowProcessModal(true);
  };

  const openAdjustmentModal = (record: SettlementRecord) => {
    setSelectedRecord(record);
    setShowAdjustmentModal(true);
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
      PROCESSING: "info",
      PAID: "success",
      FAILED: "danger",
    };
    return colors[status as keyof typeof colors] || "secondary";
  };

  const getAdjustmentTypeColor = (type: string) => {
    const colors = {
      REFUND_REVERSAL: "warning",
      CORRECTION: "info",
      BONUS: "success",
      PENALTY: "danger",
    };
    return colors[type as keyof typeof colors] || "secondary";
  };

  if (loading && !summary) {
    return <div className="text-center py-5">Loading settlement data...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Settlement Summary"
        subtitle="Manage doctor settlements and adjustments"
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
            variant={activeTab === "records" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("records")}
          >
            Settlement Records
          </Button>
          <Button
            variant={activeTab === "adjustments" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("adjustments")}
          >
            Adjustments
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
                label="Total Settlements"
                value={formatCurrency(summary.totalSettlements)}
                icon="bi-cash-stack"
                variant="primary"
              />
            </div>
            <div className="col-md-3">
              <StatCard
                label="Pending Amount"
                value={formatCurrency(summary.pendingAmount)}
                icon="bi-clock-history"
                variant="warning"
              />
            </div>
            <div className="col-md-3">
              <StatCard
                label="Processed Amount"
                value={formatCurrency(summary.processedAmount)}
                icon="bi-check-circle"
                variant="success"
              />
            </div>
            <div className="col-md-3">
              <StatCard
                label="Avg Processing Days"
                value={`${summary.averageProcessingDays.toFixed(1)} days`}
                icon="bi-calendar-week"
                variant="info"
              />
            </div>
          </div>

          {/* Monthly Comparison */}
          <SectionCard title="Monthly Comparison">
            <div className="row">
              <div className="col-md-6">
                <h6>Current Month</h6>
                <h4 className="text-primary">{formatCurrency(summary.currentMonthSettlements)}</h4>
              </div>
              <div className="col-md-6">
                <h6>Previous Month</h6>
                <h4 className="text-muted">{formatCurrency(summary.previousMonthSettlements)}</h4>
              </div>
              <div className="col-12 mt-3">
                <h6>Growth</h6>
                <h4 className={summary.monthOverMonthGrowth >= 0 ? "text-success" : "text-danger"}>
                  {formatPercent(summary.monthOverMonthGrowth)}
                </h4>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Records Tab */}
      {activeTab === "records" && (
        <SectionCard>
          <DataTableWrapper
            columns={[
              {
                key: "doctor",
                label: "Doctor",
                render: (record: SettlementRecord) => (
                  <div className="fw-semibold">{record.doctorName}</div>
                ),
              },
              {
                key: "period",
                label: "Period",
                render: (record: SettlementRecord) => record.period,
              },
              {
                key: "amounts",
                label: "Amounts",
                render: (record: SettlementRecord) => (
                  <div className="text-end">
                    <div>Gross: {formatCurrency(record.grossAmount)}</div>
                    <div className="text-success small">Doctor: {formatCurrency(record.doctorShare)}</div>
                    <div className="text-info small">Clinic: {formatCurrency(record.clinicShare)}</div>
                    {record.adjustments !== 0 && (
                      <div className="text-warning small">Adj: {formatCurrency(record.adjustments)}</div>
                    )}
                    <div className="fw-semibold">Net: {formatCurrency(record.netAmount)}</div>
                  </div>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (record: SettlementRecord) => (
                  <div>
                    <Badge bg={getStatusColor(record.status)}>
                      {record.status}
                    </Badge>
                    {record.paidAt && (
                      <div className="text-muted small mt-1">
                        Paid {new Date(record.paidAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: "actions",
                label: "Actions",
                render: (record: SettlementRecord) => (
                  <div className="btn-group">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => window.location.href = `/clinic/settlements/${record.id}`}
                    >
                      View
                    </Button>
                    {record.status === "PENDING" && (
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => openProcessModal(record)}
                      >
                        Process
                      </Button>
                    )}
                    <Button
                      variant="outline-warning"
                      size="sm"
                      onClick={() => openAdjustmentModal(record)}
                    >
                      Adjust
                    </Button>
                  </div>
                ),
              },
            ]}
            data={records}
            loading={loading}
            searchPlaceholder="Search settlements..."
          />
        </SectionCard>
      )}

      {/* Adjustments Tab */}
      {activeTab === "adjustments" && (
        <SectionCard>
          <DataTableWrapper
            columns={[
              {
                key: "settlement",
                label: "Settlement",
                render: (adj: AdjustmentRecord) => (
                  <div>
                    <div className="fw-semibold">Settlement ID: {adj.settlementId}</div>
                    <div className="text-muted small">
                      {new Date(adj.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ),
              },
              {
                key: "type",
                label: "Type",
                render: (adj: AdjustmentRecord) => (
                  <Badge bg={getAdjustmentTypeColor(adj.type)}>
                    {adj.type.replace("_", " ")}
                  </Badge>
                ),
              },
              {
                key: "amounts",
                label: "Amounts",
                render: (adj: AdjustmentRecord) => (
                  <div className="text-end">
                    <div>Total: {formatCurrency(adj.amount)}</div>
                    <div className="text-success small">Doctor: {formatCurrency(adj.doctorShare)}</div>
                    <div className="text-info small">Clinic: {formatCurrency(adj.clinicShare)}</div>
                  </div>
                ),
              },
              {
                key: "reason",
                label: "Reason",
                render: (adj: AdjustmentRecord) => (
                  <div className="small" style={{ maxWidth: "300px" }}>
                    {adj.reason}
                  </div>
                ),
              },
              {
                key: "adjustedBy",
                label: "Adjusted By",
                render: (adj: AdjustmentRecord) => adj.adjustedBy,
              },
            ]}
            data={adjustments}
            loading={loading}
            searchPlaceholder="Search adjustments..."
          />
        </SectionCard>
      )}

      {/* Process Settlement Modal */}
      <Modal show={showProcessModal} onHide={() => setShowProcessModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Process Settlement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRecord && (
            <div>
              <div className="alert alert-info">
                <h6>Settlement Details</h6>
                <div className="row">
                  <div className="col-md-6">
                    <div>Doctor: {selectedRecord.doctorName}</div>
                    <div>Period: {selectedRecord.period}</div>
                    <div>Net Amount: {formatCurrency(selectedRecord.netAmount)}</div>
                  </div>
                  <div className="col-md-6">
                    <div>Gross Amount: {formatCurrency(selectedRecord.grossAmount)}</div>
                    <div>Doctor Share: {formatCurrency(selectedRecord.doctorShare)}</div>
                    <div>Clinic Share: {formatCurrency(selectedRecord.clinicShare)}</div>
                  </div>
                </div>
              </div>
              <p>Are you sure you want to process this settlement for payment?</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowProcessModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleProcessSettlement}>
            Process Payment
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Adjustment Modal */}
      <Modal show={showAdjustmentModal} onHide={() => setShowAdjustmentModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create Adjustment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRecord && (
            <div>
              <div className="alert alert-info">
                <h6>Settlement: {selectedRecord.doctorName} - {selectedRecord.period}</h6>
                <div>Current Net Amount: {formatCurrency(selectedRecord.netAmount)}</div>
              </div>

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Adjustment Type</Form.Label>
                  <Form.Select
                    value={adjustmentFormData.type}
                    onChange={(e) => setAdjustmentFormData({ 
                      ...adjustmentFormData, 
                      type: e.target.value as any 
                    })}
                  >
                    <option value="CORRECTION">Correction</option>
                    <option value="BONUS">Bonus</option>
                    <option value="PENALTY">Penalty</option>
                    <option value="REFUND_REVERSAL">Refund Reversal</option>
                  </Form.Select>
                </Form.Group>

                <div className="row">
                  <div className="col-md-4">
                    <Form.Group className="mb-3">
                      <Form.Label>Total Amount</Form.Label>
                      <Form.Control
                        type="number"
                        value={adjustmentFormData.amount}
                        onChange={(e) => {
                          const total = Number(e.target.value);
                          setAdjustmentFormData({ 
                            ...adjustmentFormData, 
                            amount: total,
                            doctorShare: total * 0.7, // Default split
                            clinicShare: total * 0.3,
                          });
                        }}
                        required
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-4">
                    <Form.Group className="mb-3">
                      <Form.Label>Doctor Share</Form.Label>
                      <Form.Control
                        type="number"
                        value={adjustmentFormData.doctorShare}
                        onChange={(e) => setAdjustmentFormData({ 
                          ...adjustmentFormData, 
                          doctorShare: Number(e.target.value) 
                        })}
                        required
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-4">
                    <Form.Group className="mb-3">
                      <Form.Label>Clinic Share</Form.Label>
                      <Form.Control
                        type="number"
                        value={adjustmentFormData.clinicShare}
                        onChange={(e) => setAdjustmentFormData({ 
                          ...adjustmentFormData, 
                          clinicShare: Number(e.target.value) 
                        })}
                        required
                      />
                    </Form.Group>
                  </div>
                </div>

                <Form.Group className="mb-3">
                  <Form.Label>Reason</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={adjustmentFormData.reason}
                    onChange={(e) => setAdjustmentFormData({ 
                      ...adjustmentFormData, 
                      reason: e.target.value 
                    })}
                    placeholder="Please provide a reason for this adjustment..."
                    required
                  />
                </Form.Group>
              </Form>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAdjustmentModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateAdjustment}>
            Create Adjustment
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
