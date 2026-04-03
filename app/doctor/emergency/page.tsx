"use client";

import { useState, useEffect } from "react";
import { PageHeader, SectionCard, DataTableWrapper } from "@/src/components/dashboard";
import { Button, Badge, Modal, Form } from "react-bootstrap";

interface EmergencyAvailability {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  status: "AVAILABLE" | "UNAVAILABLE" | "ON_CALL";
  notes?: string;
  customFee?: number;
}

interface CustomQuote {
  id: number;
  patientName: string;
  petName: string;
  serviceName: string;
  description: string;
  quotedFee: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  requestedAt: string;
  expiresAt?: string;
  notes?: string;
}

export default function DoctorEmergencyPage() {
  const [activeTab, setActiveTab] = useState<"availability" | "quotes">("availability");
  const [availability, setAvailability] = useState<EmergencyAvailability[]>([]);
  const [quotes, setQuotes] = useState<CustomQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<EmergencyAvailability | null>(null);
  const [availabilityFormData, setAvailabilityFormData] = useState<Partial<EmergencyAvailability>>({});
  const [quoteFormData, setQuoteFormData] = useState<Partial<CustomQuote>>({});

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "availability") {
        const response = await fetch("/api/doctor/emergency-availability");
        const data = await response.json();
        setAvailability(data);
      } else {
        const response = await fetch("/api/doctor/custom-quotes");
        const data = await response.json();
        setQuotes(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAvailability = async () => {
    try {
      const url = editingAvailability 
        ? `/api/doctor/emergency-availability/${editingAvailability.id}`
        : "/api/doctor/emergency-availability";
      
      const method = editingAvailability ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(availabilityFormData),
      });

      if (response.ok) {
        await fetchData();
        setShowAvailabilityModal(false);
        setEditingAvailability(null);
        setAvailabilityFormData({});
      }
    } catch (error) {
      console.error("Failed to save availability:", error);
    }
  };

  const handleSubmitQuote = async () => {
    try {
      const response = await fetch("/api/doctor/custom-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quoteFormData),
      });

      if (response.ok) {
        await fetchData();
        setShowQuoteModal(false);
        setQuoteFormData({});
      }
    } catch (error) {
      console.error("Failed to submit quote:", error);
    }
  };

  const openAvailabilityModal = (availability?: EmergencyAvailability) => {
    setEditingAvailability(availability || null);
    setAvailabilityFormData(availability || {});
    setShowAvailabilityModal(true);
  };

  const openQuoteModal = () => {
    setQuoteFormData({});
    setShowQuoteModal(true);
  };

  const availabilityColumns = [
    {
      key: "date",
      label: "Date",
      render: (avail: EmergencyAvailability) => new Date(avail.date).toLocaleDateString(),
    },
    {
      key: "time",
      label: "Time",
      render: (avail: EmergencyAvailability) => `${avail.startTime} - ${avail.endTime}`,
    },
    {
      key: "status",
      label: "Status",
      render: (avail: EmergencyAvailability) => {
        const colors = {
          AVAILABLE: "success",
          UNAVAILABLE: "danger",
          ON_CALL: "warning",
        };
        return <Badge bg={colors[avail.status] as any}>{avail.status}</Badge>;
      },
    },
    {
      key: "customFee",
      label: "Emergency Fee",
      render: (avail: EmergencyAvailability) => (
        avail.customFee ? <span className="fw-semibold">৳{avail.customFee}</span> : <span className="text-muted">Standard</span>
      ),
    },
    {
      key: "notes",
      label: "Notes",
      render: (avail: EmergencyAvailability) => (
        <div className="small" style={{ maxWidth: "200px" }}>
          {avail.notes || "-"}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (avail: EmergencyAvailability) => (
        <div className="btn-group">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => openAvailabilityModal(avail)}
          >
            Edit
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => handleDeleteAvailability(avail.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const quoteColumns = [
    {
      key: "patient",
      label: "Patient",
      render: (quote: CustomQuote) => (
        <div>
          <div className="fw-semibold">{quote.patientName}</div>
          <div className="text-muted small">Pet: {quote.petName}</div>
        </div>
      ),
    },
    {
      key: "service",
      label: "Service",
      render: (quote: CustomQuote) => (
        <div>
          <div className="fw-semibold">{quote.serviceName}</div>
          <div className="text-muted small">{quote.description}</div>
        </div>
      ),
    },
    {
      key: "quotedFee",
      label: "Quoted Fee",
      render: (quote: CustomQuote) => (
        <span className="fw-semibold">৳{quote.quotedFee}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (quote: CustomQuote) => {
        const colors = {
          PENDING: "warning",
          APPROVED: "success",
          REJECTED: "danger",
          COMPLETED: "info",
        };
        return <Badge bg={colors[quote.status] as any}>{quote.status}</Badge>;
      },
    },
    {
      key: "requestedAt",
      label: "Requested",
      render: (quote: CustomQuote) => new Date(quote.requestedAt).toLocaleDateString(),
    },
    {
      key: "expiresAt",
      label: "Expires",
      render: (quote: CustomQuote) => (
        quote.expiresAt ? new Date(quote.expiresAt).toLocaleDateString() : <span className="text-muted">Never</span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (quote: CustomQuote) => (
        <div className="btn-group">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => window.location.href = `/doctor/emergency/quotes/${quote.id}`}
          >
            View
          </Button>
          {quote.status === "PENDING" && (
            <Button
              variant="outline-warning"
              size="sm"
              onClick={() => handleEditQuote(quote)}
            >
              Edit
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleDeleteAvailability = async (id: number) => {
    if (confirm("Are you sure you want to delete this availability?")) {
      try {
        await fetch(`/api/doctor/emergency-availability/${id}`, { method: "DELETE" });
        await fetchData();
      } catch (error) {
        console.error("Failed to delete availability:", error);
      }
    }
  };

  const handleEditQuote = (quote: CustomQuote) => {
    setQuoteFormData(quote);
    setShowQuoteModal(true);
  };

  return (
    <div>
      <PageHeader
        title="Emergency Services"
        subtitle="Manage emergency availability and custom procedure quotes"
      />

      {/* Tab Navigation */}
      <div className="mb-4">
        <div className="btn-group">
          <Button
            variant={activeTab === "availability" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("availability")}
          >
            Availability
          </Button>
          <Button
            variant={activeTab === "quotes" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("quotes")}
          >
            Custom Quotes
          </Button>
        </div>
      </div>

      {/* Availability Tab */}
      {activeTab === "availability" && (
        <SectionCard>
          <div className="mb-3">
            <Button onClick={() => openAvailabilityModal()}>
              <i className="bi bi-plus-circle me-2"></i>
              Add Availability
            </Button>
          </div>
          <DataTableWrapper
            columns={availabilityColumns}
            data={availability}
            loading={loading}
            searchPlaceholder="Search availability..."
          />
        </SectionCard>
      )}

      {/* Quotes Tab */}
      {activeTab === "quotes" && (
        <SectionCard>
          <div className="mb-3">
            <Button onClick={openQuoteModal}>
              <i className="bi bi-plus-circle me-2"></i>
              Create Quote
            </Button>
          </div>
          <DataTableWrapper
            columns={quoteColumns}
            data={quotes}
            loading={loading}
            searchPlaceholder="Search quotes..."
          />
        </SectionCard>
      )}

      {/* Availability Modal */}
      <Modal show={showAvailabilityModal} onHide={() => setShowAvailabilityModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingAvailability ? "Edit Availability" : "Add Emergency Availability"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <div className="row">
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={availabilityFormData.date || ""}
                    onChange={(e) => setAvailabilityFormData({ ...availabilityFormData, date: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Start Time</Form.Label>
                  <Form.Control
                    type="time"
                    value={availabilityFormData.startTime || ""}
                    onChange={(e) => setAvailabilityFormData({ ...availabilityFormData, startTime: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>End Time</Form.Label>
                  <Form.Control
                    type="time"
                    value={availabilityFormData.endTime || ""}
                    onChange={(e) => setAvailabilityFormData({ ...availabilityFormData, endTime: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={availabilityFormData.status || "AVAILABLE"}
                    onChange={(e) => setAvailabilityFormData({ ...availabilityFormData, status: e.target.value as any })}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="UNAVAILABLE">Unavailable</option>
                    <option value="ON_CALL">On Call</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Custom Emergency Fee (optional)</Form.Label>
                  <Form.Control
                    type="number"
                    value={availabilityFormData.customFee || ""}
                    onChange={(e) => setAvailabilityFormData({ ...availabilityFormData, customFee: Number(e.target.value) || undefined })}
                    placeholder="Leave blank for standard rate"
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Notes (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={availabilityFormData.notes || ""}
                onChange={(e) => setAvailabilityFormData({ ...availabilityFormData, notes: e.target.value })}
                placeholder="Any special instructions or notes..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAvailabilityModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveAvailability}>
            {editingAvailability ? "Update" : "Add"} Availability
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Quote Modal */}
      <Modal show={showQuoteModal} onHide={() => setShowQuoteModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {quoteFormData.id ? "Edit Quote" : "Create Custom Quote"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Patient Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={quoteFormData.patientName || ""}
                    onChange={(e) => setQuoteFormData({ ...quoteFormData, patientName: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Pet Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={quoteFormData.petName || ""}
                    onChange={(e) => setQuoteFormData({ ...quoteFormData, petName: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Service Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={quoteFormData.serviceName || ""}
                    onChange={(e) => setQuoteFormData({ ...quoteFormData, serviceName: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Quoted Fee (BDT)</Form.Label>
                  <Form.Control
                    type="number"
                    value={quoteFormData.quotedFee || ""}
                    onChange={(e) => setQuoteFormData({ ...quoteFormData, quotedFee: Number(e.target.value) })}
                    required
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Procedure Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={quoteFormData.description || ""}
                onChange={(e) => setQuoteFormData({ ...quoteFormData, description: e.target.value })}
                placeholder="Describe the procedure and what it includes..."
                required
              />
            </Form.Group>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={quoteFormData.status || "PENDING"}
                    onChange={(e) => setQuoteFormData({ ...quoteFormData, status: e.target.value as any })}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="COMPLETED">Completed</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Expires At (optional)</Form.Label>
                  <Form.Control
                    type="date"
                    value={quoteFormData.expiresAt || ""}
                    onChange={(e) => setQuoteFormData({ ...quoteFormData, expiresAt: e.target.value || undefined })}
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Notes (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={quoteFormData.notes || ""}
                onChange={(e) => setQuoteFormData({ ...quoteFormData, notes: e.target.value })}
                placeholder="Additional notes or conditions..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQuoteModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmitQuote}>
            {quoteFormData.id ? "Update" : "Create"} Quote
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
