"use client";

import type { VendorReceiptTab } from "@/src/lib/useBranchGrnList";

type CardKey = "pending" | "draft" | "today" | "discrepancy";

export function VendorReceiptSummaryCards(props: {
  loading: boolean;
  error: string | null;
  awaitingConfirmation: number;
  draftVendorReceives: number;
  receivedToday: number;
  discrepancyGrns: number;
  activeTab: VendorReceiptTab;
  onSelectTab: (tab: VendorReceiptTab) => void;
  onSelectDiscrepancyFilter?: () => void;
}) {
  const {
    loading,
    error,
    awaitingConfirmation,
    draftVendorReceives,
    receivedToday,
    discrepancyGrns,
    activeTab,
    onSelectTab,
    onSelectDiscrepancyFilter,
  } = props;

  const card = (key: CardKey, title: string, value: number | string, tab?: VendorReceiptTab, onClick?: () => void) => {
    const isActive =
      (key === "pending" && activeTab === "pending") ||
      (key === "draft" && activeTab === "draft") ||
      false;
    const clickable = tab != null || onClick != null;
    return (
      <div className="col-6 col-xl-3">
        <div
          className={`card radius-12 border h-100 ${isActive ? "border-primary shadow-sm" : ""} ${clickable ? "cursor-pointer" : ""}`}
          style={clickable ? { cursor: "pointer" } : undefined}
          role={clickable ? "button" : undefined}
          tabIndex={clickable ? 0 : undefined}
          onClick={() => {
            if (onClick) onClick();
            else if (tab) onSelectTab(tab);
          }}
          onKeyDown={(e) => {
            if (!clickable) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (onClick) onClick();
              else if (tab) onSelectTab(tab);
            }
          }}
        >
          <div className="card-body py-3 px-3">
            <p className="text-muted small mb-2 text-uppercase fw-medium" style={{ letterSpacing: "0.02em" }}>
              {title}
            </p>
            <div style={{ minHeight: 34 }} className="d-flex align-items-center">
              {loading ? (
                <div className="placeholder-glow w-100">
                  <span className="placeholder col-5 rounded" style={{ height: 30, display: "inline-block" }} />
                </div>
              ) : (
                <h4 className="mb-0 fw-semibold">{value}</h4>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-4">
      {error && (
        <div className="alert alert-warning radius-12 py-2 px-3 small mb-3" role="alert">
          {error}
        </div>
      )}
      <div className="row g-3">
        {card("pending", "Pending", awaitingConfirmation, "pending")}
        {card("draft", "Draft", draftVendorReceives, "draft")}
        {card("today", "Received today", receivedToday)}
        {card(
          "discrepancy",
          "Open discrepancies",
          discrepancyGrns,
          undefined,
          onSelectDiscrepancyFilter ? () => onSelectDiscrepancyFilter() : undefined
        )}
      </div>
      <p className="text-muted small mt-3 mb-0 px-1">
        Tap summary cards or tabs to switch views. Discrepancy count covers draft and awaiting GRNs
        on this branch (sampled).
      </p>
    </div>
  );
}
