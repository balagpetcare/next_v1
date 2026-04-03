"use client";

import type { MedicineWorkspaceDashboardSummary } from "@/lib/adminApi";

type Card = { label: string; value: string | number };

function Group({ title, cards }: { title: string; cards: Card[] }) {
  return (
    <div className="col-lg-4">
      <div className="card border-0 shadow-sm radius-12 h-100">
        <div className="card-header bg-transparent border-0 pb-0 pt-20 px-20">
          <h6 className="mb-0 fw-semibold small text-muted text-uppercase">{title}</h6>
        </div>
        <div className="card-body pt-12 px-20 pb-20">
          <div className="row g-2">
            {cards.map((c) => (
              <div key={c.label} className="col-6">
                <div className="text-muted small">{c.label}</div>
                <div className="h5 mb-0 fw-semibold">{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MedicineControlCenterKpiGroups({ data }: { data: MedicineWorkspaceDashboardSummary }) {
  const l = data.listings;
  const m = data.masters;
  const rq = data.reviewQueues;
  const im = data.imports;

  const catalog: Card[] = [
    { label: "Total (non-archived)", value: l.totalNonArchived ?? l.active + l.inactive },
    { label: "Active", value: l.active },
    { label: "Inactive", value: l.inactive },
    { label: "Archived", value: l.archived },
    { label: "Import lineage (approx.)", value: l.importedLineage ?? "—" },
    { label: "Manual / no first batch", value: l.manualApprox ?? "—" },
  ];

  const importOps: Card[] = [
    { label: "Failed (7d)", value: im.failedLast7Days },
    { label: "Partial apply (7d)", value: im.partialAppliedLast7Days ?? 0 },
    { label: "Applying now", value: im.batchesApplying ?? 0 },
    { label: "Stuck applying (2h+)", value: im.batchesApplyingStuck ?? 0 },
    { label: "Invalid rows (open)", value: rq.invalid },
    { label: "Needs review (open)", value: rq.needsReview },
  ];

  const masters: Card[] = [
    { label: "Generics", value: m.generics },
    { label: "Dosage forms", value: m.dosageForms },
    { label: "Presentations", value: m.presentations },
    { label: "Brands", value: m.brands },
    { label: "Manufacturers", value: m.manufacturers },
    { label: "Dup in file (open)", value: rq.duplicateInFile },
  ];

  return (
    <div className="row g-3 mb-4">
      <Group title="Country catalog" cards={catalog} />
      <Group title="Import operations" cards={importOps} />
      <Group title="Master data" cards={masters} />
    </div>
  );
}
