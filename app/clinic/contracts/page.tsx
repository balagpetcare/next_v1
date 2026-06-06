"use client";

import { useState, useEffect } from "react";
import { PageHeader, SectionCard, DataTableWrapper } from "@/src/components/dashboard";
import { Button, Badge, Modal, Form, Accordion } from "react-bootstrap";

interface DoctorContract {
  id: number;
  doctorId: number;
  doctorName: string;
  contractType: "FIXED_FEE" | "PERCENTAGE" | "HYBRID" | "SALARY_INCENTIVE";
  startDate: string;
  endDate?: string;
  isActive: boolean;
  rules: ContractRule[];
}

interface ContractRule {
  id: number;
  serviceId?: number;
  serviceName?: string;
  category?: string;
  rateType: string;
  rateValue: number;
  floorFee?: number;
  sharePct?: number;
}

export default function ClinicContractsPage() {
  const [contracts, setContracts] = useState<DoctorContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState<DoctorContract | null>(null);
  const [formData, setFormData] = useState<Partial<DoctorContract>>({});

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await fetch("/api/v1/clinic/contracts", { credentials: "include" });
      const data = await response.json();
      setContracts(data);
    } catch (error) {
      console.error("Failed to fetch contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const url = editingContract 
        ? `/api/v1/clinic/contracts/${editingContract.id}`
        : "/api/v1/clinic/contracts";
      
      const method = editingContract ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchContracts();
        setShowModal(false);
        setEditingContract(null);
        setFormData({});
      }
    } catch (error) {
      console.error("Failed to save contract:", error);
    }
  };

  const openModal = (contract?: DoctorContract) => {
    setEditingContract(contract || null);
    setFormData(contract || {});
    setShowModal(true);
  };

  const columns = [
    {
      key: "doctorName",
      label: "Doctor",
      render: (contract: DoctorContract) => (
        <div className="fw-semibold">{contract.doctorName}</div>
      ),
    },
    {
      key: "contractType",
      label: "Contract Type",
      render: (contract: DoctorContract) => {
        const colors = {
          FIXED_FEE: "primary",
          PERCENTAGE: "info",
          HYBRID: "warning",
          SALARY_INCENTIVE: "success",
        };
        return (
          <Badge bg={colors[contract.contractType] as any}>
            {contract.contractType.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      key: "period",
      label: "Period",
      render: (contract: DoctorContract) => (
        <div>
          <div>{new Date(contract.startDate).toLocaleDateString()}</div>
          {contract.endDate && (
            <div className="text-muted small">
              to {new Date(contract.endDate).toLocaleDateString()}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "rules",
      label: "Rules",
      render: (contract: DoctorContract) => (
        <div>
          <div className="small">{contract.rules.length} rule(s)</div>
          <div className="text-muted">
            {contract.rules.map(r => r.serviceName || r.category).join(", ")}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (contract: DoctorContract) => (
        <Badge bg={contract.isActive ? "success" : "danger"}>
          {contract.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (contract: DoctorContract) => (
        <div className="btn-group">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => openModal(contract)}
          >
            Edit
          </Button>
          <Button
            variant="outline-info"
            size="sm"
            onClick={() => window.location.href = `/clinic/contracts/${contract.id}/rules`}
          >
            Rules
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Doctor Contracts"
        subtitle="Manage doctor compensation contracts and fee rules"
        actions={
          <Button onClick={() => openModal()}>
            <i className="bi bi-plus-circle me-2"></i>
            Add Contract
          </Button>
        }
      />

      <SectionCard>
        <DataTableWrapper
          columns={columns}
          data={contracts}
          loading={loading}
          searchPlaceholder="Search contracts..."
        />
      </SectionCard>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingContract ? "Edit Contract" : "Add New Contract"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Doctor</Form.Label>
                  <Form.Select
                    value={formData.doctorId || ""}
                    onChange={(e) => setFormData({ ...formData, doctorId: Number(e.target.value) })}
                    required
                  >
                    <option value="">Select doctor</option>
                    {/* Will be populated from API */}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Contract Type</Form.Label>
                  <Form.Select
                    value={formData.contractType || ""}
                    onChange={(e) => setFormData({ ...formData, contractType: e.target.value as any })}
                    required
                  >
                    <option value="">Select type</option>
                    <option value="FIXED_FEE">Fixed Fee</option>
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="HYBRID">Hybrid (Floor + %)</option>
                    <option value="SALARY_INCENTIVE">Salary + Incentive</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.startDate || ""}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>End Date (optional)</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.endDate || ""}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value || undefined })}
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Active Contract"
                checked={formData.isActive !== false}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
            </Form.Group>

            {/* Contract Type Specific Instructions */}
            {formData.contractType === "HYBRID" && (
              <div className="alert alert-info">
                <h6>Hybrid Contract Configuration</h6>
                <p className="mb-0">
                  Hybrid contracts pay a floor fee plus percentage of amount above floor. 
                  Configure specific rules for each service category after creating the contract.
                </p>
              </div>
            )}

            {formData.contractType === "PERCENTAGE" && (
              <div className="alert alert-info">
                <h6>Percentage Contract Configuration</h6>
                <p className="mb-0">
                  Configure percentage splits for different service categories after creating the contract.
                </p>
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {editingContract ? "Update" : "Create"} Contract
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Contract Rules Preview */}
      {editingContract && editingContract.rules.length > 0 && (
        <SectionCard title="Current Rules">
          <Accordion>
            {editingContract.rules.map((rule, index) => (
              <Accordion.Item eventKey={index.toString()} key={rule.id}>
                <Accordion.Header>
                  {rule.serviceName || rule.category || "General"} - {rule.rateType}
                </Accordion.Header>
                <Accordion.Body>
                  <div className="row">
                    <div className="col-md-4">
                      <strong>Rate Type:</strong> {rule.rateType}
                    </div>
                    <div className="col-md-4">
                      <strong>Rate Value:</strong> {rule.rateValue}
                    </div>
                    {rule.floorFee && (
                      <div className="col-md-4">
                        <strong>Floor Fee:</strong> {rule.floorFee}
                      </div>
                    )}
                    {rule.sharePct && (
                      <div className="col-md-4">
                        <strong>Share %:</strong> {rule.sharePct}%
                      </div>
                    )}
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </SectionCard>
      )}
    </div>
  );
}
