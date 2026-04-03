"use client";

import { resolveMedicineDosageFormIcon } from "../_lib/medicineDosageFormIconMap";

type Props = {
  dosageFormDisplay?: string | null;
  className?: string;
};

/** Visual cue for dosage form / medicine presentation type (Remix Icon). */
export default function MedicineTypeIcon({ dosageFormDisplay, className }: Props) {
  const icon = resolveMedicineDosageFormIcon(dosageFormDisplay);
  return (
    <span
      className={`d-inline-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary ${className ?? ""}`}
      style={{ width: 40, height: 40, flexShrink: 0 }}
      title={dosageFormDisplay?.trim() || "Dosage form"}
    >
      <i className={`${icon} fs-5`} aria-hidden />
    </span>
  );
}
