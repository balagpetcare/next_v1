"use client";

const PAYMENT_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  PAID: { label: "Paid", badgeClass: "bg-success" },
  PARTIAL: { label: "Partial", badgeClass: "bg-warning text-dark" },
  UNPAID: { label: "Unpaid", badgeClass: "bg-secondary" },
  WAIVED: { label: "Waived", badgeClass: "bg-info" },
};

export interface DoctorPaymentBadgeProps {
  paymentStatus?: string | null;
  className?: string;
}

export function DoctorPaymentBadge({ paymentStatus, className = "" }: DoctorPaymentBadgeProps) {
  const key = (paymentStatus ?? "UNPAID").toString().toUpperCase();
  const config = PAYMENT_CONFIG[key] ?? PAYMENT_CONFIG.UNPAID;
  return (
    <span className={`badge ${config.badgeClass} ${className}`.trim()}>
      {config.label}
    </span>
  );
}
