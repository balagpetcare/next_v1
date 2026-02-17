"use client";

import { useState, type FormEvent } from "react";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function NewAdjustmentPage() {
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => setSaving(false), 400);
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="New Inventory Adjustment"
        subtitle="Draft adjustment entry (coming soon)"
        breadcrumbs={[
          { label: "Owner", href: "/owner/dashboard" },
          { label: "Adjustments", href: "/owner/inventory/adjustments" },
          { label: "New", href: "/owner/inventory/adjustments/new" },
        ]}
      />

      <div className="alert alert-info">
        This form is a placeholder. It will connect to inventory adjustment APIs in the next phase.
      </div>

      <div className="card radius-12">
        <div className="card-body p-24">
          <form className="row g-3" onSubmit={submit}>
            <div className="col-12 col-md-4">
              <label className="form-label">Branch</label>
              <input className="form-control" placeholder="Select branch" disabled />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label">Type</label>
              <select className="form-select" disabled>
                <option>Damage</option>
                <option>Expiry</option>
                <option>Loss</option>
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label">Quantity</label>
              <input className="form-control" type="number" placeholder="0" disabled />
            </div>
            <div className="col-12">
              <label className="form-label">Notes</label>
              <textarea className="form-control" rows={3} placeholder="Reason / details" disabled />
            </div>
            <div className="col-12 d-flex gap-2">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <a className="btn btn-light" href="/owner/inventory/adjustments">
                Back
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
