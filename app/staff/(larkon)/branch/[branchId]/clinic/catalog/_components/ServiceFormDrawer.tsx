"use client";

import { useEffect, useState } from "react";
import { DetailDrawer } from "@/src/components/dashboard";
import { createService, updateService } from "./catalogApi";
import { formatServiceCategory } from "./catalogFormatters";
import type { ClinicService } from "./catalogTypes";

const SERVICE_CATEGORIES = [
  "CONSULTATION", "VACCINATION", "SURGERY", "GROOMING", "BOARDING",
  "DIAGNOSTICS", "EMERGENCY", "TEST", "PROCEDURE", "PHARMACY", "OTHER",
];

export default function ServiceFormDrawer({
  branchId,
  open,
  onClose,
  onSaved,
  serviceId,
  initialService,
}: {
  branchId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  serviceId?: number;
  initialService?: ClinicService;
}) {
  const [name, setName] = useState("");
  const [serviceCode, setServiceCode] = useState("");
  const [category, setCategory] = useState("CONSULTATION");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (initialService) {
        setName(initialService.name);
        setServiceCode(initialService.serviceCode ?? "");
        setCategory(initialService.category);
        setPrice(String(initialService.price ?? ""));
        setDuration(initialService.duration != null ? String(initialService.duration) : "");
        setDescription(initialService.description ?? "");
        setStatus(initialService.status ?? "ACTIVE");
      } else {
        setName("");
        setServiceCode("");
        setCategory("CONSULTATION");
        setPrice("");
        setDuration("");
        setDescription("");
        setStatus("ACTIVE");
      }
      setError("");
    }
  }, [open, initialService]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const priceNum = parseFloat(price);
    if (!name.trim()) { setError("Name is required"); return; }
    if (Number.isNaN(priceNum) || priceNum < 0) { setError("Valid price is required"); return; }
    setSaving(true);
    const payload = {
      name: name.trim(),
      serviceCode: serviceCode.trim() || undefined,
      category,
      price: priceNum,
      duration: duration.trim() ? parseInt(duration, 10) : undefined,
      description: description.trim() || undefined,
      status,
    };
    (serviceId
      ? updateService(branchId, serviceId, payload)
      : createService(branchId, payload as any))
      .then(() => { onSaved(); onClose(); })
      .catch((err) => setError((err as Error)?.message ?? "Failed to save"))
      .finally(() => setSaving(false));
  };

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={serviceId ? "Edit service" : "Add service"}
      subtitle={serviceId ? initialService?.name : "Create a new branch service."}
    >
      <form onSubmit={handleSubmit} className="p-3">
        {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
        <div className="mb-3">
          <label className="form-label">Name</label>
          <input
            type="text"
            className="form-control radius-8"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Service code</label>
          <input
            type="text"
            className="form-control radius-8"
            value={serviceCode}
            onChange={(e) => setServiceCode(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Category</label>
          <select
            className="form-select radius-8"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{formatServiceCategory(c)}</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Price (৳)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="form-control radius-8"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Duration (minutes)</label>
          <input
            type="number"
            min="0"
            className="form-control radius-8"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Description</label>
          <textarea
            className="form-control radius-8"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {serviceId && (
          <div className="mb-3">
            <label className="form-label">Status</label>
            <select
              className="form-select radius-8"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        )}
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary radius-8" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" className="btn btn-outline-secondary radius-8" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </DetailDrawer>
  );
}
