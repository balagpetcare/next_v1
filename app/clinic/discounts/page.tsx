"use client";

import { useState, useEffect } from "react";
import { PageHeader, SectionCard, DataTableWrapper } from "@/src/components/dashboard";
import { Button, Badge, Modal, Form } from "react-bootstrap";

interface DiscountPolicy {
  id: number;
  name: string;
  description?: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  maxDiscountAmount?: number;
  absorptionMode: string;
  applicableServices: string[];
  isActive: boolean;
  validFrom: string;
  validTo?: string;
  usageLimit?: number;
  usedCount: number;
}

interface OwnerDiscountCard {
  id: number;
  cardNumber: string;
  userId: number;
  userName: string;
  orgId: number;
  branchId?: number;
  discountPercent: number;
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  issuedAt: string;
  expiresAt?: string;
  issuedBy: string;
}

export default function ClinicDiscountsPage() {
  const [activeTab, setActiveTab] = useState<"policies" | "cards">("policies");
  const [policies, setPolicies] = useState<DiscountPolicy[]>([]);
  const [cards, setCards] = useState<OwnerDiscountCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<DiscountPolicy | null>(null);
  const [editingCard, setEditingCard] = useState<OwnerDiscountCard | null>(null);
  const [policyFormData, setPolicyFormData] = useState<Partial<DiscountPolicy>>({});
  const [cardFormData, setCardFormData] = useState<Partial<OwnerDiscountCard>>({});

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "policies") {
        const response = await fetch("/api/v1/clinic/discounts/policies", { credentials: "include" });
        const data = await response.json();
        setPolicies(data);
      } else {
        const response = await fetch("/api/v1/clinic/discounts/cards", { credentials: "include" });
        const data = await response.json();
        setCards(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async () => {
    try {
      const url = editingPolicy 
        ? `/api/v1/clinic/discounts/policies/${editingPolicy.id}`
        : "/api/v1/clinic/discounts/policies";
      
      const method = editingPolicy ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policyFormData),
      });

      if (response.ok) {
        await fetchData();
        setShowPolicyModal(false);
        setEditingPolicy(null);
        setPolicyFormData({});
      }
    } catch (error) {
      console.error("Failed to save policy:", error);
    }
  };

  const handleSaveCard = async () => {
    try {
      const url = editingCard 
        ? `/api/v1/clinic/discounts/cards/${editingCard.id}`
        : "/api/v1/clinic/discounts/cards";
      
      const method = editingCard ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cardFormData),
      });

      if (response.ok) {
        await fetchData();
        setShowCardModal(false);
        setEditingCard(null);
        setCardFormData({});
      }
    } catch (error) {
      console.error("Failed to save card:", error);
    }
  };

  const openPolicyModal = (policy?: DiscountPolicy) => {
    setEditingPolicy(policy || null);
    setPolicyFormData(policy || {});
    setShowPolicyModal(true);
  };

  const openCardModal = (card?: OwnerDiscountCard) => {
    setEditingCard(card || null);
    setCardFormData(card || {});
    setShowCardModal(true);
  };

  const policyColumns = [
    {
      key: "name",
      label: "Policy Name",
      render: (policy: DiscountPolicy) => (
        <div>
          <div className="fw-semibold">{policy.name}</div>
          {policy.description && (
            <div className="text-muted small">{policy.description}</div>
          )}
        </div>
      ),
    },
    {
      key: "discount",
      label: "Discount",
      render: (policy: DiscountPolicy) => (
        <div>
          <div className="fw-semibold">
            {policy.discountType === "PERCENTAGE" 
              ? `${policy.discountValue}%`
              : `৳${policy.discountValue}`
            }
          </div>
          {policy.maxDiscountAmount && (
            <div className="text-muted small">Max: ৳{policy.maxDiscountAmount}</div>
          )}
        </div>
      ),
    },
    {
      key: "absorptionMode",
      label: "Absorption Mode",
      render: (policy: DiscountPolicy) => (
        <Badge bg="secondary">
          {policy.absorptionMode.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "applicableServices",
      label: "Services",
      render: (policy: DiscountPolicy) => (
        <div className="small">
          {policy.applicableServices.length === 0 
            ? "All services" 
            : `${policy.applicableServices.length} services`
          }
        </div>
      ),
    },
    {
      key: "usage",
      label: "Usage",
      render: (policy: DiscountPolicy) => (
        <div>
          <div>{policy.usedCount}</div>
          {policy.usageLimit && (
            <div className="text-muted small">/ {policy.usageLimit}</div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (policy: DiscountPolicy) => (
        <Badge bg={policy.isActive ? "success" : "danger"}>
          {policy.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (policy: DiscountPolicy) => (
        <div className="btn-group">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => openPolicyModal(policy)}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  const cardColumns = [
    {
      key: "cardNumber",
      label: "Card Number",
      render: (card: OwnerDiscountCard) => (
        <div className="fw-semibold">{card.cardNumber}</div>
      ),
    },
    {
      key: "userName",
      label: "Owner",
      render: (card: OwnerDiscountCard) => card.userName,
    },
    {
      key: "discountPercent",
      label: "Discount",
      render: (card: OwnerDiscountCard) => (
        <span className="fw-semibold">{card.discountPercent}%</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (card: OwnerDiscountCard) => {
        const colors = {
          ACTIVE: "success",
          SUSPENDED: "warning",
          EXPIRED: "danger",
        };
        return <Badge bg={colors[card.status] as any}>{card.status}</Badge>;
      },
    },
    {
      key: "issuedAt",
      label: "Issued",
      render: (card: OwnerDiscountCard) => (
        <div>
          <div>{new Date(card.issuedAt).toLocaleDateString()}</div>
          <div className="text-muted small">by {card.issuedBy}</div>
        </div>
      ),
    },
    {
      key: "expiresAt",
      label: "Expires",
      render: (card: OwnerDiscountCard) => (
        card.expiresAt ? new Date(card.expiresAt).toLocaleDateString() : "Never"
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (card: OwnerDiscountCard) => (
        <div className="btn-group">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => openCardModal(card)}
          >
            Edit
          </Button>
          <Button
            variant="outline-warning"
            size="sm"
            onClick={() => handleSuspendCard(card.id)}
            disabled={card.status !== "ACTIVE"}
          >
            Suspend
          </Button>
        </div>
      ),
    },
  ];

  const handleSuspendCard = async (cardId: number) => {
    if (confirm("Are you sure you want to suspend this card?")) {
      try {
        await fetch(`/api/v1/clinic/discounts/cards/${cardId}/suspend`, {
          method: "POST",
          credentials: "include",
        });
        await fetchData();
      } catch (error) {
        console.error("Failed to suspend card:", error);
      }
    }
  };

  return (
    <div>
      <PageHeader
        title="Discount Management"
        subtitle="Manage discount policies and owner discount cards"
      />

      {/* Tab Navigation */}
      <div className="mb-4">
        <div className="btn-group">
          <Button
            variant={activeTab === "policies" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("policies")}
          >
            Discount Policies
          </Button>
          <Button
            variant={activeTab === "cards" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("cards")}
          >
            Owner Cards
          </Button>
        </div>
      </div>

      {/* Policies Tab */}
      {activeTab === "policies" && (
        <SectionCard>
          <div className="mb-3">
            <Button onClick={() => openPolicyModal()}>
              <i className="bi bi-plus-circle me-2"></i>
              Add Policy
            </Button>
          </div>
          <DataTableWrapper
            columns={policyColumns}
            data={policies}
            loading={loading}
            searchPlaceholder="Search policies..."
          />
        </SectionCard>
      )}

      {/* Cards Tab */}
      {activeTab === "cards" && (
        <SectionCard>
          <div className="mb-3">
            <Button onClick={() => openCardModal()}>
              <i className="bi bi-plus-circle me-2"></i>
              Issue Card
            </Button>
          </div>
          <DataTableWrapper
            columns={cardColumns}
            data={cards}
            loading={loading}
            searchPlaceholder="Search cards..."
          />
        </SectionCard>
      )}

      {/* Policy Modal */}
      <Modal show={showPolicyModal} onHide={() => setShowPolicyModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingPolicy ? "Edit Policy" : "Add Discount Policy"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Policy Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={policyFormData.name || ""}
                    onChange={(e) => setPolicyFormData({ ...policyFormData, name: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Discount Type</Form.Label>
                  <Form.Select
                    value={policyFormData.discountType || ""}
                    onChange={(e) => setPolicyFormData({ ...policyFormData, discountType: e.target.value as any })}
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED_AMOUNT">Fixed Amount</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Discount Value</Form.Label>
                  <Form.Control
                    type="number"
                    value={policyFormData.discountValue || ""}
                    onChange={(e) => setPolicyFormData({ ...policyFormData, discountValue: Number(e.target.value) })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Max Discount (optional)</Form.Label>
                  <Form.Control
                    type="number"
                    value={policyFormData.maxDiscountAmount || ""}
                    onChange={(e) => setPolicyFormData({ ...policyFormData, maxDiscountAmount: Number(e.target.value) || undefined })}
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Absorption Mode</Form.Label>
                  <Form.Select
                    value={policyFormData.absorptionMode || ""}
                    onChange={(e) => setPolicyFormData({ ...policyFormData, absorptionMode: e.target.value })}
                  >
                    <option value="CLINIC_ABSORBS">Clinic Absorbs</option>
                    <option value="DOCTOR_PROTECTED">Doctor Protected</option>
                    <option value="PROPORTIONAL">Proportional</option>
                    <option value="EQUAL_SPLIT">Equal Split</option>
                    <option value="DOCTOR_ONLY">Doctor Only</option>
                    <option value="CLINIC_ONLY">Clinic Only</option>
                    <option value="MANUAL_SPLIT">Manual Split</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={policyFormData.description || ""}
                onChange={(e) => setPolicyFormData({ ...policyFormData, description: e.target.value })}
              />
            </Form.Group>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Valid From</Form.Label>
                  <Form.Control
                    type="date"
                    value={policyFormData.validFrom || ""}
                    onChange={(e) => setPolicyFormData({ ...policyFormData, validFrom: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Valid To (optional)</Form.Label>
                  <Form.Control
                    type="date"
                    value={policyFormData.validTo || ""}
                    onChange={(e) => setPolicyFormData({ ...policyFormData, validTo: e.target.value || undefined })}
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Active Policy"
                checked={policyFormData.isActive !== false}
                onChange={(e) => setPolicyFormData({ ...policyFormData, isActive: e.target.checked })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPolicyModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSavePolicy}>
            {editingPolicy ? "Update" : "Create"} Policy
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Card Modal */}
      <Modal show={showCardModal} onHide={() => setShowCardModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingCard ? "Edit Card" : "Issue Owner Discount Card"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Owner</Form.Label>
                  <Form.Select
                    value={cardFormData.userId || ""}
                    onChange={(e) => setCardFormData({ ...cardFormData, userId: Number(e.target.value) })}
                    required
                  >
                    <option value="">Select owner</option>
                    {/* Will be populated from API */}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Discount Percentage</Form.Label>
                  <Form.Control
                    type="number"
                    min="15"
                    max="30"
                    value={cardFormData.discountPercent || ""}
                    onChange={(e) => setCardFormData({ ...cardFormData, discountPercent: Number(e.target.value) })}
                    required
                  />
                  <Form.Text className="text-muted">
                    Must be between 15% and 30%
                  </Form.Text>
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Branch (optional)</Form.Label>
                  <Form.Select
                    value={cardFormData.branchId || ""}
                    onChange={(e) => setCardFormData({ ...cardFormData, branchId: Number(e.target.value) || undefined })}
                  >
                    <option value="">All branches</option>
                    {/* Will be populated from API */}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Expires At (optional)</Form.Label>
                  <Form.Control
                    type="date"
                    value={cardFormData.expiresAt || ""}
                    onChange={(e) => setCardFormData({ ...cardFormData, expiresAt: e.target.value || undefined })}
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={cardFormData.status || "ACTIVE"}
                onChange={(e) => setCardFormData({ ...cardFormData, status: e.target.value as any })}
              >
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="EXPIRED">Expired</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCardModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveCard}>
            {editingCard ? "Update" : "Issue"} Card
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
