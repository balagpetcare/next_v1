 
"use client";

import { useState } from "react";
import Card from "@/src/bpa/components/ui/Card";

export default function PosMembershipPanel({
  canSell,
  busy,
  lookupCode,
  onLookupCodeChange,
  onLookupByCode,
  onLookupByCustomer,
  matches,
  selectedCardId,
  onSelectCard,
  onApplySelectedCard,
  onClearMembership,
  appliedSummary,
  membershipError,
  hasCustomerContext,
  cardClassName,
}) {
  const [showLookup, setShowLookup] = useState(false);
  const hasApplied = Boolean(appliedSummary?.memberName);
  const hasMatches = Array.isArray(matches) && matches.length > 0;

  return (
    <Card className={cardClassName || ""}>
      <div className="d-flex align-items-center justify-content-between mb-5">
        <h6 className="mb-0 fw-semibold small text-uppercase text-secondary" style={{ fontSize: "11px", letterSpacing: "0.04em" }}>
          Membership
        </h6>
        <button
          type="button"
          className="btn btn-link btn-sm text-decoration-none p-0"
          onClick={() => setShowLookup((prev) => !prev)}
        >
          Link membership
        </button>
      </div>

      {membershipError ? <div className="alert alert-warning py-2 px-10 small mb-8">{membershipError}</div> : null}

      {(showLookup || hasApplied || hasMatches) ? (
        <>
          <div className="d-flex gap-5 mb-7">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Card number"
              value={lookupCode}
              onChange={(e) => onLookupCodeChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onLookupByCode?.();
                }
              }}
              disabled={busy}
            />
            <button
              type="button"
              className="btn btn-sm btn-primary px-10"
              disabled={busy || !String(lookupCode || "").trim()}
              onClick={onLookupByCode}
            >
              Find
            </button>
          </div>
          <div className="d-flex gap-5 mb-7">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary flex-grow-1"
              disabled={busy || !hasCustomerContext}
              onClick={onLookupByCustomer}
            >
              Find by customer
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={busy || !hasApplied}
              onClick={onClearMembership}
            >
              Clear
            </button>
          </div>

          {hasApplied ? (
            <div className="border rounded-3 p-8 bg-light mb-7">
              <div className="fw-semibold">{appliedSummary.memberName}</div>
              <div className="small text-secondary-light">
                {appliedSummary.cardNumber || "-"}
                {appliedSummary.discountPercent > 0 ? ` | ${appliedSummary.discountPercent}%` : ""}
              </div>
            </div>
          ) : null}

          {hasMatches ? (
            <div className="d-flex flex-column gap-5">
              {matches.map((card) => (
                <label key={card.ownerDiscountCardId} className="border rounded-3 p-6 cursor-pointer bg-white">
                  <div className="d-flex align-items-center gap-8">
                    <input
                      type="radio"
                      className="form-check-input mt-0"
                      checked={selectedCardId === card.ownerDiscountCardId}
                      onChange={() => onSelectCard(card.ownerDiscountCardId)}
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-truncate">
                        {card.cardNumberMasked || `Card #${card.ownerDiscountCardId}`}
                      </div>
                      <div className="small text-secondary-light text-truncate">
                        {card.memberDisplayName || "Member"}
                        {card.discountPercent > 0 ? ` | ${card.discountPercent}%` : ""}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-primary mt-2"
                disabled={!canSell || busy || !selectedCardId}
                onClick={onApplySelectedCard}
              >
                Apply selected
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="border rounded-3 p-8 bg-light text-center">
          <div className="text-secondary-light mb-2" style={{ fontSize: 20 }}>
            <i className="ri-coupon-3-line" />
          </div>
          <p className="small text-secondary-light mb-7">
            No membership linked
            <br />
            Search customer to view eligible cards
          </p>
          <button type="button" className="btn btn-sm btn-outline-primary px-16" onClick={() => setShowLookup(true)}>
            Scan / Enter Card No
          </button>
        </div>
      )}
    </Card>
  );
}
