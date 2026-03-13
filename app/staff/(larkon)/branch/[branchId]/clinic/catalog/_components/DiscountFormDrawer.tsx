"use client";

import { useEffect, useState } from "react";
import { DetailDrawer } from "@/src/components/dashboard";
import { createDiscountPolicy, updateDiscountPolicy } from "./catalogApi";
import { formatDiscountType, formatDiscountScope, formatDiscountCalcType } from "./catalogFormatters";
import type { DiscountPolicy } from "./catalogTypes";

const DISCOUNT_TYPES = ["CAMPAIGN", "MANAGER", "DOCTOR_DISCRETION", "OWNER", "PACKAGE", "LOYALTY", "WELFARE_RESCUE", "PROMOTIONAL", "BRANCH_EVENT"];
const SCOPES = ["WHOLE_INVOICE", "SERVICE_LEVEL", "PACKAGE_LEVEL"];
const CALC_TYPES = ["PERCENTAGE", "FLAT_AMOUNT", "CAPPED_AMOUNT"];

export default function DiscountFormDrawer({
  branchId,
  open,
  onClose,
  onSaved,
  policyId,
  initialPolicy,
}: {
  branchId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  policyId?: number;
  initialPolicy?: DiscountPolicy;
}) {
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState("PROMOTIONAL");
  const [scope, setScope] = useState("SERVICE_LEVEL");
  const [calcType, setCalcType] = useState("PERCENTAGE");
  const [maxPercent, setMaxPercent] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && initialPolicy) {
      setName(initialPolicy.name);
      setDiscountType(initialPolicy.discountType);
      setScope(initialPolicy.scope);
      setCalcType(initialPolicy.calcType);
      setMaxPercent(initialPolicy.maxPercent != null ? String(initialPolicy.maxPercent) : "");
      setMaxAmount(initialPolicy.maxAmount != null ? String(initialPolicy.maxAmount) : "");
      setValidFrom(initialPolicy.validFrom ? new Date(initialPolicy.validFrom).toISOString().slice(0, 10) : "");
      setValidTo(initialPolicy.validTo ? new Date(initialPolicy.validTo).toISOString().slice(0, 10) : "");
      setStatus(initialPolicy.status ?? "ACTIVE");
    } else if (open) {
      setName("");
      setDiscountType("PROMOTIONAL");
      setScope("SERVICE_LEVEL");
      setCalcType("PERCENTAGE");
      setMaxPercent("");
      setMaxAmount("");
      setValidFrom("");
      setValidTo("");
      setStatus("ACTIVE");
    }
    setError("");
  }, [open, initialPolicy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    const payload = {
      name: name.trim(),
      discountType,
      scope,
      calcType,
      maxPercent: maxPercent.trim() ? parseFloat(maxPercent) : undefined,
      maxAmount: maxAmount.trim() ? parseFloat(maxAmount) : undefined,
      validFrom: validFrom ? new Date(validFrom).toISOString() : undefined,
      validTo: validTo ? new Date(validTo).toISOString() : undefined,
      status,
    };
    (policyId
      ? updateDiscountPolicy(branchId, policyId, payload)
      : createDiscountPolicy(branchId, payload as any))
      .then(() => { onSaved(); onClose(); })
      .catch((err) => setError((err as Error)?.message ?? "Failed to save"))
      .finally(() => setSaving(false));
  };

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={policyId ? "Edit discount policy" : "Add promotion / discount"}
      subtitle={policyId ? initialPolicy?.name : "Create a new discount policy."}
    >
      <form onSubmit={handleSubmit} className="p-3">
        {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
        <div className="mb-3">
          <label className="form-label">Name</label>
          <input type="text" className="form-control radius-8" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Discount type</label>
          <select className="form-select radius-8" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
            {DISCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>{formatDiscountType(t)}</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Scope</label>
          <select className="form-select radius-8" value={scope} onChange={(e) => setScope(e.target.value)}>
            {SCOPES.map((s) => (
              <option key={s} value={s}>{formatDiscountScope(s)}</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Calculation</label>
          <select className="form-select radius-8" value={calcType} onChange={(e) => setCalcType(e.target.value)}>
            {CALC_TYPES.map((c) => (
              <option key={c} value={c}>{formatDiscountCalcType(c)}</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Max percent</label>
          <input type="number" step="0.01" min="0" max="100" className="form-control radius-8" value={maxPercent} onChange={(e) => setMaxPercent(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">Max amount (৳)</label>
          <input type="number" step="0.01" min="0" className="form-control radius-8" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">Valid from</label>
          <input type="date" className="form-control radius-8" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">Valid to</label>
          <input type="date" className="form-control radius-8" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
        </div>
        {policyId && (
          <div className="mb-3">
            <label className="form-label">Status</label>
            <select className="form-select radius-8" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        )}
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary radius-8" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          <button type="button" className="btn btn-outline-secondary radius-8" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </DetailDrawer>
  );
}
