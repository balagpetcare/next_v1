const VARIANT_TO_BADGE = {
  primary: 'badge bg-primary',
  secondary: 'badge bg-secondary',
  success: 'badge bg-success',
  info: 'badge bg-info',
  warning: 'badge bg-warning text-dark',
  danger: 'badge bg-danger',
};

export default function StatusChip({ status, variant }) {
  const emptyLabel = '—';
  if (!status || String(status).trim() === '' || status === "NULL" || status === "UNDEFINED") {
    return <span className="badge bg-secondary">{emptyLabel}</span>;
  }

  const s = String(status).toUpperCase().trim();
  if (!s || s === "NULL" || s === "UNDEFINED") {
    return <span className="badge bg-secondary">{emptyLabel}</span>;
  }

  if (variant && VARIANT_TO_BADGE[variant]) {
    return <span className={VARIANT_TO_BADGE[variant]}>{s}</span>;
  }

  // Governance vs operational: APPROVED = blue (info), ACTIVE = green (success), SUBMITTED = warning, DECLINED/REJECTED = danger
  const badgeClass =
    s === "ACTIVE" || s === "VERIFIED" ? "badge bg-success" :
    s === "APPROVED" ? "badge bg-info" :
    s === "REJECTED" || s === "BLOCKED" || s === "SUSPENDED" || s === "DECLINED" ? "badge bg-danger" :
    s === "SUBMITTED" || s === "UNDER_REVIEW" || s === "INVITED" ? "badge bg-warning text-dark" :
    s === "REQUEST_CHANGES" || s === "CHANGES_REQUESTED" ? "badge bg-warning text-dark" :
    s === "INACTIVE" || s === "UNAPPROVED" || s === "DRAFT" ? "badge bg-secondary" :
    "badge bg-secondary";

  return <span className={badgeClass}>{s}</span>;
}
