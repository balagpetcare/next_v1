export default function StatusChip({ status }) {
  const emptyLabel = '—';
  if (!status || String(status).trim() === '' || status === "NULL" || status === "UNDEFINED") {
    return <span className="badge bg-secondary">{emptyLabel}</span>;
  }

  const s = String(status).toUpperCase().trim();
  if (!s || s === "NULL" || s === "UNDEFINED") {
    return <span className="badge bg-secondary">{emptyLabel}</span>;
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
