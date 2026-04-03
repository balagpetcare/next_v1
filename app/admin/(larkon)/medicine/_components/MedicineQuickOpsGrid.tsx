"use client";

import Link from "next/link";
import { MEDICINE_QUICK_OPS } from "../_lib/navConfig";

export default function MedicineQuickOpsGrid() {
  return (
    <div className="card border-0 shadow-sm radius-12 mb-4">
      <div className="card-header bg-transparent border-bottom-0 p-24 pb-0">
        <h6 className="mb-0 fw-semibold">Quick operations</h6>
        <p className="text-muted small mb-0 mt-1">
          Dosage and strength workflows live under <strong>Dosage forms</strong> and <strong>Strengths / Presentations</strong> — the
          building blocks for catalog medicines and imports.
        </p>
      </div>
      <div className="card-body p-24 pt-16">
        <div className="row g-3">
          {MEDICINE_QUICK_OPS.map((op) => (
            <div key={op.href} className="col-md-6 col-xl-4">
              <Link href={op.href} className="text-decoration-none d-block h-100">
                <div className="border radius-12 p-16 h-100">
                  <div className="fw-semibold text-dark">{op.label}</div>
                  <div className="small text-muted mt-1 mb-0">{op.desc}</div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
