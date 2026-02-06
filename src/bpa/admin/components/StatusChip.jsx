export default function StatusChip({ status }) {
  // Handle null, undefined, empty string, or "—"
  if (!status || status === "—" || status === "NULL" || status === "UNDEFINED") {
    return <span className="badge bg-secondary-50 text-secondary-600">—</span>;
  }
  
  const s = String(status).toUpperCase().trim();
  if (!s || s === "—" || s === "NULL" || s === "UNDEFINED") {
    return <span className="badge bg-secondary-50 text-secondary-600">—</span>;
  }
  
  const tone =
    s === "VERIFIED" || s === "APPROVED" || s === "ACTIVE" ? "success" :
    s === "REJECTED" || s === "BLOCKED" || s === "SUSPENDED" ? "danger" :
    s === "SUBMITTED" || s === "UNDER_REVIEW" || s === "INVITED" ? "info" :
    s === "REQUEST_CHANGES" ? "warning" : "secondary";
  
  return <span className={`badge bg-${tone}-50 text-${tone}-600`}>{s}</span>;
}
