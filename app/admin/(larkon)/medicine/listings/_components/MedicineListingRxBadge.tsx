"use client";

type Props = { prescriptionCount: number };

export default function MedicineListingRxBadge({ prescriptionCount }: Props) {
  if (prescriptionCount > 0) {
    return (
      <span className="badge rounded-pill bg-success-subtle text-success-emphasis border border-success-subtle" title="Referenced on prescription lines">
        Rx · {prescriptionCount}
      </span>
    );
  }
  return (
    <span className="badge rounded-pill bg-light text-muted border" title="No prescription lines yet">
      No Rx
    </span>
  );
}
