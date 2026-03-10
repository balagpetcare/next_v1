"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ownerGet, ownerPut } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

type BranchPolicyData = {
  id?: number;
  branchId: number;
  orgId: number;
  maxDiscountPercent: number;
  maxRefundAmount: number;
  maxPurchaseAmount: number;
  requireOwnerApproval: string[];
  autoApproveStockBelow: number;
  allowManagerPricing: boolean;
  allowManagerRefund: boolean;
  shiftManagement: boolean;
  leaveApproval: boolean;
};

const DEFAULT_POLICY: BranchPolicyData = {
  branchId: 0,
  orgId: 0,
  maxDiscountPercent: 30,
  maxRefundAmount: 5000,
  maxPurchaseAmount: 50000,
  requireOwnerApproval: [],
  autoApproveStockBelow: 10000,
  allowManagerPricing: false,
  allowManagerRefund: true,
  shiftManagement: true,
  leaveApproval: true,
};

const APPROVAL_OPTIONS = [
  { value: "STAFF_HIRE", label: "Staff hire" },
  { value: "LARGE_PURCHASE", label: "Large purchase" },
  { value: "PRICE_CHANGE", label: "Price change" },
  { value: "HIGH_DISCOUNT", label: "High discount" },
  { value: "SERVICE_TOGGLE", label: "Service toggle" },
];

export default function BranchPoliciesPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [policy, setPolicy] = useState<BranchPolicyData>(DEFAULT_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!branchId) return;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await ownerGet<{ success?: boolean; data?: BranchPolicyData }>(
          `/api/v1/owner/branch-policy/${branchId}`
        );
        if (res?.data) setPolicy({ ...DEFAULT_POLICY, ...res.data });
      } catch (e) {
        setError((e as Error)?.message || "Failed to load policy");
      } finally {
        setLoading(false);
      }
    })();
  }, [branchId]);

  const handleSave = async () => {
    if (!branchId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await ownerPut(`/api/v1/owner/branch-policy/${branchId}`, {
        maxDiscountPercent: policy.maxDiscountPercent,
        maxRefundAmount: policy.maxRefundAmount,
        maxPurchaseAmount: policy.maxPurchaseAmount,
        requireOwnerApproval: policy.requireOwnerApproval,
        autoApproveStockBelow: policy.autoApproveStockBelow,
        allowManagerPricing: policy.allowManagerPricing,
        allowManagerRefund: policy.allowManagerRefund,
        shiftManagement: policy.shiftManagement,
        leaveApproval: policy.leaveApproval,
      });
      setSuccess("Policy saved.");
    } catch (e) {
      setError((e as Error)?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleApproval = (key: string) => {
    const list = policy.requireOwnerApproval || [];
    const next = list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
    setPolicy((p) => ({ ...p, requireOwnerApproval: next }));
  };

  if (!branchId) return null;

  return (
    <div className="container-fluid">
      <PageHeader
        title="Branch policies"
        breadcrumbs={[
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Policies", href: `/owner/clinic/${branchId}/policies` },
        ]}
      />
      {loading ? (
        <div className="card"><div className="card-body placeholder-glow"><span className="placeholder col-6"></span></div></div>
      ) : (
        <>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <div className="card mb-4">
            <div className="card-header"><h6 className="mb-0">Discount limits</h6></div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Max discount %</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    max={100}
                    value={policy.maxDiscountPercent}
                    onChange={(e) => setPolicy((p) => ({ ...p, maxDiscountPercent: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="card mb-4">
            <div className="card-header"><h6 className="mb-0">Financial controls</h6></div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Max refund amount</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    value={policy.maxRefundAmount}
                    onChange={(e) => setPolicy((p) => ({ ...p, maxRefundAmount: Number(e.target.value) || 0 }))}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Max purchase order</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    value={policy.maxPurchaseAmount}
                    onChange={(e) => setPolicy((p) => ({ ...p, maxPurchaseAmount: Number(e.target.value) || 0 }))}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Auto-approve stock below</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    value={policy.autoApproveStockBelow}
                    onChange={(e) => setPolicy((p) => ({ ...p, autoApproveStockBelow: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="card mb-4">
            <div className="card-header"><h6 className="mb-0">Manager permissions</h6></div>
            <div className="card-body">
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={policy.allowManagerRefund}
                  onChange={(e) => setPolicy((p) => ({ ...p, allowManagerRefund: e.target.checked }))}
                />
                <label className="form-check-label">Allow manager refunds</label>
              </div>
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={policy.shiftManagement}
                  onChange={(e) => setPolicy((p) => ({ ...p, shiftManagement: e.target.checked }))}
                />
                <label className="form-check-label">Allow shift management</label>
              </div>
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={policy.leaveApproval}
                  onChange={(e) => setPolicy((p) => ({ ...p, leaveApproval: e.target.checked }))}
                />
                <label className="form-check-label">Allow leave approval</label>
              </div>
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={policy.allowManagerPricing}
                  onChange={(e) => setPolicy((p) => ({ ...p, allowManagerPricing: e.target.checked }))}
                />
                <label className="form-check-label">Allow price changes</label>
              </div>
            </div>
          </div>
          <div className="card mb-4">
            <div className="card-header"><h6 className="mb-0">Actions requiring owner approval</h6></div>
            <div className="card-body">
              {APPROVAL_OPTIONS.map((opt) => (
                <div className="form-check form-switch mb-2" key={opt.value}>
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={(policy.requireOwnerApproval || []).includes(opt.value)}
                    onChange={() => toggleApproval(opt.value)}
                  />
                  <label className="form-check-label">{opt.label}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save policy"}
            </button>
            <Link href={`/owner/clinic/${branchId}`} className="btn btn-outline-secondary">Back to branch</Link>
          </div>
        </>
      )}
    </div>
  );
}
