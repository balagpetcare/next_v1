"use client";

type RefChipProps = {
  refNo: string | number | null | undefined;
  prefix?: string;
  className?: string;
};

export function RefChip({ refNo, prefix = "#", className = "" }: RefChipProps) {
  if (refNo == null || refNo === "") return <span className="text-muted">—</span>;
  return <span className={`text-nowrap fw-medium ${className}`}>{prefix}{refNo}</span>;
}
