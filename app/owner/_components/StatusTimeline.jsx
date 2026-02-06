"use client";

import StatusBadge from "@/app/owner/_components/StatusBadge";

// A lightweight, dependency-free timeline for VerificationStatus
// Supports: DRAFT, SUBMITTED, PENDING_REVIEW, APPROVED, REJECTED, CANCELLED, SUSPENDED

const ORDER = ["DRAFT", "SUBMITTED", "PENDING_REVIEW", "APPROVED"]; // happy path

function normalize(s) {
  return String(s || "").toUpperCase();
}

export default function StatusTimeline({ status }) {
  const s = normalize(status);
  const isTerminal = ["REJECTED", "CANCELLED", "SUSPENDED"].includes(s);

  const steps = isTerminal
    ? ["DRAFT", "SUBMITTED", "PENDING_REVIEW", s]
    : ORDER;

  const currentIndex = steps.indexOf(s);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className="card radius-12 mb-3">
      <div className="card-body p-20">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <div>
            <div className="text-secondary">Current status</div>
            <div className="mt-1"><StatusBadge status={s} /></div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {steps.map((step, idx) => {
            const done = idx < activeIndex;
            const active = idx === activeIndex;
            return (
              <div key={step} className="d-flex align-items-center gap-2">
                <div
                  className={
                    "px-3 py-1 rounded-pill border " +
                    (active ? "bg-primary text-white border-primary" : done ? "bg-light border-success" : "bg-white")
                  }
                  style={{ fontSize: 12 }}
                  title={step}
                >
                  {step}
                </div>
                {idx !== steps.length - 1 ? (
                  <span className={done ? "text-success" : "text-secondary"} style={{ fontSize: 12 }}>
                    →
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
