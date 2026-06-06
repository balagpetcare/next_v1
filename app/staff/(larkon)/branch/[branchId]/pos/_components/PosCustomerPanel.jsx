 
"use client";

import Card from "@/src/bpa/components/ui/Card";

export default function PosCustomerPanel({
  canSell,
  busy,
  lookupValue,
  onLookupValueChange,
  onLookupSubmit,
  customerDraft,
  onDraftChange,
  onPersistDraft,
  onCreateCustomer,
  onClearCustomer,
  customerContext,
  customerError,
  showCreateCustomer,
  cardClassName,
}) {
  const resolvedCustomer = customerContext?.customer ?? null;
  const pets = Array.isArray(customerContext?.pets) ? customerContext.pets : [];

  return (
    <Card className={cardClassName || ""}>
      <div className="d-flex align-items-center justify-content-between mb-5">
        <h6 className="mb-0 fw-semibold small text-uppercase text-secondary" style={{ fontSize: "11px", letterSpacing: "0.04em" }}>
          Customer
        </h6>
        <button
          type="button"
          className="btn btn-link btn-sm text-decoration-none p-0"
          disabled={busy || !resolvedCustomer}
          onClick={onClearCustomer}
        >
          Clear
        </button>
      </div>

      <form
        className="d-flex gap-4 mb-7"
        onSubmit={(e) => {
          e.preventDefault();
          onLookupSubmit();
        }}
      >
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Enter phone number"
          value={lookupValue}
          onChange={(e) => onLookupValueChange(e.target.value)}
          disabled={busy}
        />
        <button type="submit" className="btn btn-sm btn-primary px-10" disabled={busy || !String(lookupValue || "").trim()}>
          {busy ? "..." : "Search"}
        </button>
      </form>

      {customerError ? <div className="alert alert-warning py-2 px-10 small mb-8">{customerError}</div> : null}

      {resolvedCustomer ? (
        <div className="border rounded-3 p-8 bg-light mb-7">
          <div className="d-flex align-items-start justify-content-between gap-7">
            <div className="d-flex align-items-start gap-7 min-w-0">
              <div
              className="rounded-circle bg-white border d-flex align-items-center justify-content-center text-secondary-light"
              style={{ width: 26, height: 26, minWidth: 26 }}
              >
                <i className="ri-user-line" />
              </div>
              <div className="min-w-0">
                <div className="fw-semibold">{resolvedCustomer.displayName || "Customer"}</div>
                <div className="small text-secondary-light">{resolvedCustomer.phone || customerDraft.phone || "-"}</div>
                {resolvedCustomer.email ? (
                  <div className="small text-secondary-light text-truncate">{resolvedCustomer.email}</div>
                ) : null}
                {resolvedCustomer.address ? (
                  <div className="small text-secondary-light text-truncate">{resolvedCustomer.address}</div>
                ) : null}
                {pets.length > 0 ? (
                  <div className="small text-secondary-light text-truncate">
                    Pets: {pets.slice(0, 2).map((pet) => pet?.name || "Pet").join(", ")}
                    {pets.length > 2 ? ` +${pets.length - 2}` : ""}
                  </div>
                ) : null}
                <span className="badge bg-white text-secondary mt-4">Regular Customer</span>
              </div>
            </div>
            <button type="button" className="btn btn-sm btn-link p-0 text-secondary">
              <i className="ri-pencil-line" />
            </button>
          </div>
        </div>
      ) : showCreateCustomer ? (
        <div className="border rounded-3 p-8 bg-light mb-7">
          <p className="small text-secondary-light mb-7">No customer found. Quick create:</p>
          <div className="row g-8">
            <div className="col-12">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Name"
                value={customerDraft.displayName}
                onChange={(e) => onDraftChange("displayName", e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="col-12">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Phone"
                value={customerDraft.phone}
                onChange={(e) => onDraftChange("phone", e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="col-12">
              <input
                type="email"
                className="form-control form-control-sm"
                placeholder="Email (optional)"
                value={customerDraft.email}
                onChange={(e) => onDraftChange("email", e.target.value)}
                disabled={busy}
              />
            </div>
          </div>
          <div className="d-flex gap-6 mt-8">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary flex-grow-1"
              disabled={!canSell || busy}
              onClick={onPersistDraft}
            >
              Save draft
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary flex-grow-1"
              disabled={!canSell || busy || !String(customerDraft.phone || "").trim()}
              onClick={onCreateCustomer}
            >
              Create
            </button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
