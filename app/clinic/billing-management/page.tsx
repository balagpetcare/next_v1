"use client";

import { useState, useEffect } from "react";
import { PageHeader, SectionCard, DataTableWrapper } from "@/src/components/dashboard";
import { Button, Badge, Modal, Form } from "react-bootstrap";

interface BillingRecord {
  id: number;
  appointmentId: number;
  patientName: string;
  petName: string;
  doctorName: string;
  serviceName: string;
  appointmentDate: string;
  totalAmount: number;
  doctorShare: number;
  clinicShare: number;
  discountAmount: number;
  discountPolicy?: string;
  absorptionMode?: string;
  status: "PENDING" | "PAID" | "PROCESSING" | "REFUNDED";
  paymentMethod?: string;
  createdAt: string;
}

interface RefundRecord {
  id: number;
  billingId: number;
  refundAmount: number;
  refundReason: string;
  doctorRefundAmount: number;
  clinicRefundAmount: number;
  processedAt: string;
  processedBy: string;
}

interface DiscountUsage {
  policyName: string;
  usageCount: number;
  totalDiscountAmount: number;
  averageDiscountAmount: number;
  period: string;
}

export default function ClinicBillingPage() {
  const [activeTab, setActiveTab] = useState<"records" | "refunds" | "discounts">("records");
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [discounts, setDiscounts] = useState<DiscountUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(null);
  const [refundFormData, setRefundFormData] = useState({
    refundAmount: 0,
    refundReason: "",
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "records") {
        const response = await fetch("/api/clinic/billing/records");
        const data = await response.json();
        setRecords(data);
      } else if (activeTab === "refunds") {
        const response = await fetch("/api/clinic/billing/refunds");
        const data = await response.json();
        setRefunds(data);
      } else {
        const response = await fetch("/api/clinic/billing/discounts");
        const data = await response.json();
        setDiscounts(data);
      }
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!selectedRecord) return;

    try {
      const response = await fetch(`/api/clinic/billing/${selectedRecord.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(refundFormData),
      });

      if (response.ok) {
        await fetchData();
        setShowRefundModal(false);
        setSelectedRecord(null);
        setRefundFormData({ refundAmount: 0, refundReason: "" });
      }
    } catch (error) {
      console.error("Failed to process refund:", error);
    }
  };

  const openRefundModal = (record: BillingRecord) => {
    setSelectedRecord(record);
    setRefundFormData({
      refundAmount: record.totalAmount,
      refundReason: "",
    });
    setShowRefundModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, { 
      style: "currency", 
      currency: "BDT", 
      minimumFractionDigits: 0 
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      PENDING: "warning",
      PAID: "success",
      PROCESSING: "info",
      REFUNDED: "danger",
    };
    return colors[status as keyof typeof colors] || "secondary";
  };

  const recordColumns = [
    {
      key: "appointment",
      label: "Appointment",
      render: (record: BillingRecord) => (
        <div>
          <div className="fw-semibold">{record.patientName}</div>
          <div className="text-muted small">{record.petName} · {record.doctorName}</div>
          <div className="text-muted small">{record.serviceName}</div>
        </div>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (record: BillingRecord) => new Date(record.appointmentDate).toLocaleDateString(),
    },
    {
      key: "amounts",
      label: "Amounts",
      render: (record: BillingRecord) => (
        <div className="text-end">
          <div>Total: {formatCurrency(record.totalAmount)}</div>
          <div className="text-success small">Doctor: {formatCurrency(record.doctorShare)}</div>
          <div className="text-info small">Clinic: {formatCurrency(record.clinicShare)}</div>
        </div>
      ),
    },
    {
      key: "discount",
      label: "Discount",
      render: (record: BillingRecord) => (
        record.discountAmount > 0 ? (
          <div>
            <div className="text-danger">{formatCurrency(record.discountAmount)}</div>
            {record.discountPolicy && (
              <div className="text-muted small">{record.discountPolicy}</div>
            )}
            {record.absorptionMode && (
              <Badge bg="secondary" className="mt-1">
                {record.absorptionMode.replace("_", " ")}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-muted">-</span>
        )
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (record: BillingRecord) => (
        <div>
          <Badge bg={getStatusColor(record.status)}>
            {record.status}
          </Badge>
          {record.paymentMethod && (
            <div className="text-muted small mt-1">{record.paymentMethod}</div>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (record: BillingRecord) => (
        <div className="btn-group">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => window.location.href = `/clinic/billing/${record.id}`}
          >
            View
          </Button>
          {record.status === "PAID" && (
            <Button
              variant="outline-warning"
              size="sm"
              onClick={() => openRefundModal(record)}
            >
              Refund
            </Button>
          )}
        </div>
      ),
    },
  ];

  const refundColumns = [
    {
      key: "billing",
      label: "Original Billing",
      render: (refund: RefundRecord) => (
        <div>
          <div className="fw-semibold">Billing ID: {refund.billingId}</div>
          <div className="text-muted small">
            Refunded on {new Date(refund.processedAt).toLocaleDateString()}
          </div>
          <div className="text-muted small">by {refund.processedBy}</div>
        </div>
      ),
    },
    {
      key: "amounts",
      label: "Refund Amounts",
      render: (refund: RefundRecord) => (
        <div className="text-end">
          <div>Total: {formatCurrency(refund.refundAmount)}</div>
          <div className="text-success small">Doctor: {formatCurrency(refund.doctorRefundAmount)}</div>
          <div className="text-info small">Clinic: {formatCurrency(refund.clinicRefundAmount)}</div>
        </div>
      ),
    },
    {
      key: "reason",
      label: "Reason",
      render: (refund: RefundRecord) => (
        <div className="small" style={{ maxWidth: "300px" }}>
          {refund.refundReason}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (refund: RefundRecord) => (
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => window.location.href = `/clinic/billing/refunds/${refund.id}`}
        >
          View Details
        </Button>
      ),
    },
  ];

  const discountColumns = [
    {
      key: "policy",
      label: "Discount Policy",
      render: (discount: DiscountUsage) => (
        <div>
          <div className="fw-semibold">{discount.policyName}</div>
          <div className="text-muted small">{discount.period}</div>
        </div>
      ),
    },
    {
      key: "usage",
      label: "Usage",
      render: (discount: DiscountUsage) => (
        <div>
          <div className="fw-semibold">{discount.usageCount} times</div>
        </div>
      ),
    },
    {
      key: "totalDiscount",
      label: "Total Discount",
      render: (discount: DiscountUsage) => (
        <span className="fw-semibold text-danger">
          {formatCurrency(discount.totalDiscountAmount)}
        </span>
      ),
    },
    {
      key: "averageDiscount",
      label: "Average Discount",
      render: (discount: DiscountUsage) => (
        <span className="text-muted">
          {formatCurrency(discount.averageDiscountAmount)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Billing Review"
        subtitle="Review billing records, refunds, and discount usage"
      />

      {/* Tab Navigation */}
      <div className="mb-4">
        <div className="btn-group">
          <Button
            variant={activeTab === "records" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("records")}
          >
            Billing Records
          </Button>
          <Button
            variant={activeTab === "refunds" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("refunds")}
          >
            Refunds
          </Button>
          <Button
            variant={activeTab === "discounts" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("discounts")}
          >
            Discount Usage
          </Button>
        </div>
      </div>

      {/* Records Tab */}
      {activeTab === "records" && (
        <SectionCard>
          <DataTableWrapper
            columns={recordColumns}
            data={records}
            loading={loading}
            searchPlaceholder="Search billing records..."
          />
        </SectionCard>
      )}

      {/* Refunds Tab */}
      {activeTab === "refunds" && (
        <SectionCard>
          <DataTableWrapper
            columns={refundColumns}
            data={refunds}
            loading={loading}
            searchPlaceholder="Search refunds..."
          />
        </SectionCard>
      )}

      {/* Discounts Tab */}
      {activeTab === "discounts" && (
        <SectionCard>
          <DataTableWrapper
            columns={discountColumns}
            data={discounts}
            loading={loading}
            searchPlaceholder="Search discount policies..."
          />
        </SectionCard>
      )}

      {/* Refund Modal */}
      <Modal show={showRefundModal} onHide={() => setShowRefundModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Process Refund</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRecord && (
            <div>
              <div className="alert alert-info">
                <h6>Original Billing Details</h6>
                <div className="row">
                  <div className="col-md-6">
                    <div>Patient: {selectedRecord.patientName}</div>
                    <div>Pet: {selectedRecord.petName}</div>
                    <div>Service: {selectedRecord.serviceName}</div>
                  </div>
                  <div className="col-md-6">
                    <div>Total Amount: {formatCurrency(selectedRecord.totalAmount)}</div>
                    <div>Doctor Share: {formatCurrency(selectedRecord.doctorShare)}</div>
                    <div>Clinic Share: {formatCurrency(selectedRecord.clinicShare)}</div>
                  </div>
                </div>
              </div>

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Refund Amount</Form.Label>
                  <Form.Control
                    type="number"
                    max={selectedRecord.totalAmount}
                    value={refundFormData.refundAmount}
                    onChange={(e) => setRefundFormData({ 
                      ...refundFormData, 
                      refundAmount: Number(e.target.value) 
                    })}
                    required
                  />
                  <Form.Text className="text-muted">
                    Maximum refundable: {formatCurrency(selectedRecord.totalAmount)}
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Refund Reason</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={refundFormData.refundReason}
                    onChange={(e) => setRefundFormData({ 
                      ...refundFormData, 
                      refundReason: e.target.value 
                    })}
                    placeholder="Please provide a reason for this refund..."
                    required
                  />
                </Form.Group>

                {selectedRecord.discountAmount > 0 && (
                  <div className="alert alert-warning">
                    <h6>Discount Absorption Notice</h6>
                    <p className="mb-0">
                      This billing record had a discount of {formatCurrency(selectedRecord.discountAmount)} 
                      with {selectedRecord.absorptionMode?.replace("_", " ")} absorption mode. 
                      The refund will be distributed according to the same absorption rules.
                    </p>
                  </div>
                )}
              </Form>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRefundModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleProcessRefund}>
            Process Refund
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
