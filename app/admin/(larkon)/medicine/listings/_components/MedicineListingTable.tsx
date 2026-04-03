"use client";

import Link from "next/link";
import { useState } from "react";
import { ListingStatusBadge, MedicineTableEmptyState, MedicineTableSlTd, MedicineTableSlTh } from "../../_components/MedicineUiHelpers";
import { medicineTableSl } from "../../_lib/medicineTableDisplay";
import { ADMIN_MEDICINE_BASE } from "../../_lib/paths";
import styles from "../medicine-listings-console.module.css";
import MedicineListingRowActions from "./MedicineListingRowActions";
import MedicineListingRxBadge from "./MedicineListingRxBadge";
import MedicineListingSourceBadge from "./MedicineListingSourceBadge";
import MedicineTypeIcon from "./MedicineTypeIcon";

export type MedicineListingRowModel = {
  id: number;
  isActive: boolean;
  archivedAt: string | null;
  importFingerprint: string;
  packageMarkDisplay: string | null;
  firstImportBatchId?: number | null;
  lastImportBatchId?: number | null;
  country?: { code: string; name: string };
  brand?: {
    displayName: string;
    manufacturer?: { displayName?: string | null };
  };
  presentation?: {
    strengthDisplay: string;
    generic?: { displayName: string };
    dosageForm?: { displayName: string };
  };
  _count?: { prescriptionItems: number };
};

type Props = {
  page: number;
  limit: number;
  loading: boolean;
  items: MedicineListingRowModel[];
  selected: Set<number>;
  toggleId: (id: number) => void;
  toggleSelectAllPage: () => void;
  allSelectableSelected: boolean;
  selectableOnPage: MedicineListingRowModel[];
  onResetFilters: () => void;
  onListingMutation: () => void;
  onWorkspaceError: (message: string) => void;
};

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <tr key={i}>
          <td colSpan={10} className="p-3">
            <div className="placeholder-glow d-flex align-items-center gap-3">
              <span className="placeholder rounded-3" style={{ width: 40, height: 40 }} />
              <div className="flex-grow-1">
                <span className="placeholder col-6 mb-2 d-block" />
                <span className="placeholder col-9 d-block" />
              </div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export default function MedicineListingTable({
  page,
  limit,
  loading,
  items,
  selected,
  toggleId,
  toggleSelectAllPage,
  allSelectableSelected,
  selectableOnPage,
  onResetFilters,
  onListingMutation,
  onWorkspaceError,
}: Props) {
  const [openActionsId, setOpenActionsId] = useState<number | null>(null);
  const dosageLabel = (row: MedicineListingRowModel) => row.presentation?.dosageForm?.displayName ?? null;

  return (
    <div className="card radius-12 border-0 shadow-sm">
      <div className={`${styles.scrollWrap} table-responsive`}>
        <table className="table table-hover table-sm align-middle mb-0">
          <thead className={`table-light ${styles.theadSticky}`}>
            <tr>
              <th style={{ width: 40 }} className="ps-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={allSelectableSelected}
                  onChange={toggleSelectAllPage}
                  title="Select visible non-archived rows"
                  disabled={selectableOnPage.length === 0 || loading}
                />
              </th>
              <MedicineTableSlTh />
              <th className="text-muted small text-uppercase" style={{ minWidth: 160 }}>
                Brand
              </th>
              <th className="text-muted small text-uppercase">Generic</th>
              <th className="text-muted small text-uppercase">Dosage &amp; strength</th>
              <th className="text-muted small text-uppercase">Manufacturer</th>
              <th className="text-muted small text-uppercase">Country</th>
              <th className="text-muted small text-uppercase">Source &amp; Rx</th>
              <th className="text-muted small text-uppercase">Status</th>
              <th className="text-end pe-3 text-muted small text-uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-0">
                  <MedicineTableEmptyState
                    title="No medicines match these filters"
                    hint={
                      <>
                        Try resetting filters or including archived rows.{" "}
                        <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={onResetFilters}>
                          Reset filters
                        </button>
                      </>
                    }
                  />
                </td>
              </tr>
            ) : (
              items.map((row, idx) => {
                const arch = Boolean(row.archivedAt);
                const rx = row._count?.prescriptionItems ?? 0;
                const brandName = row.brand?.displayName ?? "—";
                const gen = row.presentation?.generic?.displayName ?? "—";
                const form = row.presentation?.dosageForm?.displayName ?? "—";
                const strength = row.presentation?.strengthDisplay ?? "";
                const mfr = row.brand?.manufacturer?.displayName?.trim() || "—";
                const fp = row.importFingerprint ?? "";
                const fpShort = fp.length > 20 ? `${fp.slice(0, 16)}…` : fp;
                return (
                  <tr key={row.id} className={styles.rowElevated}>
                    <td className="ps-3">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selected.has(row.id)}
                        disabled={arch}
                        onChange={() => toggleId(row.id)}
                        title={arch ? "Archived rows excluded from bulk" : undefined}
                      />
                    </td>
                    <MedicineTableSlTd>{medicineTableSl(page, limit, idx)}</MedicineTableSlTd>
                    <td>
                      <div className="d-flex align-items-start gap-2 py-1">
                        <MedicineTypeIcon dosageFormDisplay={dosageLabel(row)} />
                        <div className="min-w-0 flex-grow-1">
                          <Link
                            href={`${ADMIN_MEDICINE_BASE}/listings/${row.id}`}
                            className="fw-semibold text-dark text-decoration-none text-truncate d-block"
                            title={brandName}
                          >
                            {brandName}
                          </Link>
                          <div className="small font-monospace text-muted text-truncate mt-1" title={fp}>
                            {row.packageMarkDisplay ? <span>{row.packageMarkDisplay} · </span> : null}
                            <span className="opacity-75">{fpShort}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="small text-muted text-truncate" style={{ maxWidth: 140 }} title={gen}>
                      {gen}
                    </td>
                    <td className="small">
                      <div className="text-truncate" style={{ maxWidth: 160 }} title={form}>
                        {form}
                      </div>
                      {strength ? <div className="text-muted">{strength}</div> : null}
                    </td>
                    <td className="small text-muted text-truncate" style={{ maxWidth: 140 }} title={mfr}>
                      {mfr}
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">{row.country?.code ?? "—"}</span>
                      <div className="small text-muted text-truncate" style={{ maxWidth: 120 }} title={row.country?.name}>
                        {row.country?.name ?? ""}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex flex-column gap-1 align-items-start">
                        <MedicineListingSourceBadge firstImportBatchId={row.firstImportBatchId} />
                        <MedicineListingRxBadge prescriptionCount={rx} />
                      </div>
                    </td>
                    <td>
                      <ListingStatusBadge isActive={row.isActive} archivedAt={row.archivedAt} />
                    </td>
                    <td className="text-end pe-3">
                      <MedicineListingRowActions
                        listingId={row.id}
                        archived={arch}
                        isActive={row.isActive}
                        firstImportBatchId={row.firstImportBatchId}
                        menuOpen={openActionsId === row.id}
                        onMenuOpenChange={(open) => setOpenActionsId(open ? row.id : null)}
                        onAfterMutation={onListingMutation}
                        onWorkspaceError={onWorkspaceError}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
