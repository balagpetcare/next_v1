"use client";

import Link from "next/link";
import { ListingStatusBadge, MedicineTableSlTd, MedicineTableSlTh } from "../../_components/MedicineUiHelpers";
import { medicineTableSl } from "../../_lib/medicineTableDisplay";
import { ADMIN_MEDICINE_BASE, ADMIN_MEDICINE_IMPORTS } from "../../_lib/paths";
import MedicineListingSourceBadge from "./MedicineListingSourceBadge";

export type RelatedMedicineRow = {
  id: number;
  isActive: boolean;
  archivedAt: string | null;
  packageMarkDisplay: string;
  importFingerprint: string;
  firstImportBatchId: number | null;
  brand: { id: number; displayName: string };
  presentation: {
    id: number;
    strengthDisplay: string;
    generic: { id: number; displayName: string };
    dosageForm: { id: number; displayName: string };
  };
  _count: { prescriptionItems: number };
};

export type RelatedMedicinesBundle = {
  sameGeneric: RelatedMedicineRow[];
  sameBrand: RelatedMedicineRow[];
  sameDosageForm: RelatedMedicineRow[];
  sameIndication: RelatedMedicineRow[];
};

function RelatedTable({ title, subtitle, rows }: { title: string; subtitle: string; rows: RelatedMedicineRow[] }) {
  return (
    <div className="card radius-12 mb-3">
      <div className="card-header bg-transparent fw-semibold d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <div>{title}</div>
          <div className="small text-muted fw-normal">{subtitle}</div>
        </div>
        <span className="badge bg-light text-dark border">{rows.length} in country</span>
      </div>
      {rows.length === 0 ? (
        <div className="card-body small text-muted py-3">No other listings in this country for this dimension.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr className="small text-muted text-uppercase">
                <MedicineTableSlTh />
                <th>Brand</th>
                <th>Generic</th>
                <th>Form / strength</th>
                <th>Source</th>
                <th>Rx</th>
                <th>Status</th>
                <th className="text-end pe-3">Open</th>
              </tr>
            </thead>
            <tbody className="small">
              {rows.map((r, idx) => (
                <tr key={r.id}>
                  <MedicineTableSlTd>{medicineTableSl(1, Math.max(rows.length, 1), idx)}</MedicineTableSlTd>
                  <td className="fw-semibold text-truncate" style={{ maxWidth: 140 }} title={r.brand.displayName}>
                    {r.brand.displayName}
                  </td>
                  <td className="text-muted text-truncate" style={{ maxWidth: 140 }} title={r.presentation.generic.displayName}>
                    {r.presentation.generic.displayName}
                  </td>
                  <td>
                    <div className="text-truncate" style={{ maxWidth: 160 }} title={r.presentation.dosageForm.displayName}>
                      {r.presentation.dosageForm.displayName}
                    </div>
                    <div className="text-muted">{r.presentation.strengthDisplay}</div>
                  </td>
                  <td>
                    <MedicineListingSourceBadge firstImportBatchId={r.firstImportBatchId} />
                  </td>
                  <td>{r._count.prescriptionItems > 0 ? <span className="badge bg-success-subtle text-success">Rx</span> : "—"}</td>
                  <td>
                    <ListingStatusBadge isActive={r.isActive} archivedAt={r.archivedAt} />
                  </td>
                  <td className="text-end pe-3">
                    <Link href={`${ADMIN_MEDICINE_BASE}/listings/${r.id}`} className="btn btn-sm btn-outline-primary radius-8">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type Props = {
  related: RelatedMedicinesBundle | null | undefined;
};

/** Related-medicine intelligence blocks (scoped to the same country as the current listing). */
export default function MedicineListingDetailSections({ related }: Props) {
  if (!related) return null;
  return (
    <section className="mb-4">
      <h2 className="h6 fw-bold text-uppercase text-muted mb-3 d-flex align-items-center gap-2">
        <i className="ri-node-tree" aria-hidden />
        Related medicines
      </h2>
      <RelatedTable
        title="A. Same generic"
        subtitle="All country SKUs tied to this active ingredient / generic master."
        rows={related.sameGeneric}
      />
      <RelatedTable
        title="B. Same brand"
        subtitle="Variants and packages that share this brand master in this country."
        rows={related.sameBrand}
      />
      <RelatedTable
        title="C. Same indication"
        subtitle="Indication is not stored on presentations yet; this section is reserved."
        rows={related.sameIndication}
      />
      <RelatedTable
        title="D. Same dosage form"
        subtitle="Other medicines using this dosage form master in this country (any generic or brand)."
        rows={related.sameDosageForm}
      />
      <p className="small text-muted mb-0">
        Lineage: use{" "}
        <Link href={ADMIN_MEDICINE_IMPORTS} className="text-decoration-none">
          import batches
        </Link>{" "}
        from each row&apos;s source badge when present.
      </p>
    </section>
  );
}
