"use client";

type Props = { firstImportBatchId?: number | null };

export default function MedicineListingSourceBadge({ firstImportBatchId }: Props) {
  const imported = firstImportBatchId != null;
  return (
    <span className={`badge rounded-pill ${imported ? "bg-info-subtle text-info-emphasis border border-info-subtle" : "bg-secondary-subtle text-dark border border-secondary-subtle"}`}>
      {imported ? "Imported" : "Manual"}
    </span>
  );
}
