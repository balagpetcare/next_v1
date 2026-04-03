/**
 * System-wide display formatters: human-readable UI text from raw data.
 * Use these everywhere instead of JSON.stringify or raw object/array dumps.
 *
 * Rules:
 * - Never show raw JSON (curly braces, quoted keys, array syntax) to users.
 * - Convert technical keys to labels, enums to readable text, changes to "From → To" lines.
 */

/** Human-readable labels for common field keys (camelCase/snake_case → Title Case). */
const FIELD_LABELS: Record<string, string> = {
  roleInPackage: "Role in package",
  surgeryPackageId: "Surgery package",
  packageId: "Package",
  serviceId: "Service",
  verificationStatus: "Verification status",
  requiresApproval: "Requires approval",
  slotDurationMin: "Slot duration",
  maxBookings: "Max bookings",
  followUpFee: "Follow-up fee",
  emergencyFee: "Emergency fee",
  defaultConsultationFee: "Consultation fee",
  consultationFee: "Consultation fee",
  status: "Status",
  contractStatus: "Contract status",
  bookingStatus: "Booking status",
  onboardingStatus: "Onboarding status",
  activeFrom: "Active from",
  effectiveFrom: "Effective from",
  customDuration: "Duration (min)",
  bookingType: "Booking type",
  scheduleEditPolicy: "Schedule edit policy",
  roleInClinic: "Role in clinic",
  displayName: "Display name",
  reason: "Reason",
  rejectReason: "Rejection reason",
  payload: "Details",
  metadata: "Details",
  oldValue: "Previous value",
  newValue: "New value",
  branchMemberId: "Doctor",
  clinicStaffProfileId: "Profile",
  proposedValue: "Proposed value",
  feeType: "Fee type",
  leaveType: "Leave type",
  startDate: "Start date",
  endDate: "End date",
  domainType: "Item type",
  packageType: "Package type",
  discountType: "Discount type",
  scope: "Scope",
  calcType: "Calculation",
  requestType: "Request type",
  entityType: "Entity type",
  // Report / billing
  totalAmount: "Total amount",
  revenue: "Revenue",
  visitCount: "Visit count",
  orderCount: "Order count",
  totalVariance: "Total variance",
  consumptions: "Consumptions",
  summary: "Summary",
  contentJson: "Content",
};

/** Human-readable labels for common enum/constant values. */
const ENUM_LABELS: Record<string, string> = {
  CONSULTANT: "Consultant",
  SURGEON: "Surgeon",
  ACTIVE: "Active",
  PENDING: "Pending",
  REJECTED: "Rejected",
  APPROVED: "Approved",
  INACTIVE: "Inactive",
  NO_SHOW: "No-show",
  FOLLOW_UP: "Follow-up",
  EMERGENCY: "Emergency",
  FULL_DAY: "Full day",
  HALF_DAY: "Half day",
  COMPLETED: "Completed",
  SUSPENDED: "Suspended",
  ENDED: "Ended",
  VERIFIED: "Verified",
  CLINIC_ONLY: "Clinic only",
  DOCTOR_PROPOSE_CLINIC_APPROVES: "Doctor proposes, clinic approves",
  DOCTOR_EDIT: "Doctor can edit",
  STANDARD: "Standard",
  PREMIUM: "Premium",
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending approval",
  PRIMARY: "Primary",
  ASSISTANT: "Assistant",
  BACKUP: "Backup",
  MEDICINE: "Medicine",
  CLINIC_SUPPLY: "Clinical supply",
  SURGICAL_CONSUMABLE: "Surgical consumable",
  DRESSING_SUPPLY: "Dressing supply",
  INSTRUMENT: "Instrument",
  IMPLANT: "Implant",
  SERVICE_SUPPORT: "Service support",
  PACKAGE_ONLY: "Package only",
  package_audit: "Package",
  approval_action: "Approval",
  discount_audit: "Discount",
  doctor_audit: "Doctor",
  // Appointment / visit
  WALK_IN: "Walk-in",
  SCHEDULED: "Scheduled",
  CONSULTATION: "Consultation",
  SERVICE: "Service",
  PACKAGE: "Package",
  SURGERY: "Surgery",
  PRE_BOOKED: "Pre-booked",
  BOOKED: "Booked",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  IN_QUEUE: "In queue",
  CALLED: "Called",
  IN_CONSULT: "In consultation",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
  // Settlement / billing
  PAID: "Paid",
  UNDER_REVIEW: "Under review",
  UNPAID: "Unpaid",
  PARTIAL: "Partial",
  // Supply request
  OWNER_REVIEW: "Owner review",
  SUBMITTED: "Submitted",
  PARTIAL_APPROVED: "Partially approved",
  PARTIALLY_APPROVED: "Partially approved",
  ORDERED: "Ordered",
  DISPATCHED: "Dispatched",
  CLOSED: "Closed",
  PARTIALLY_RECEIVED: "Partially received",
  RECEIVED: "Received",
  // Intake / workflow
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETE: "Complete",
  // Alerts / state
  EXPIRED: "Expired",
  ERROR: "Error",
  WARNING: "Warning",
  VIP: "VIP",
  NORMAL: "Normal",
  // Room (lifecycle + operational)
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  OCCUPIED: "Occupied",
  CLEANING: "Cleaning",
  MAINTENANCE: "Maintenance",
  BLOCKED: "Blocked",
  GENERAL: "General",
  PROCEDURE: "Procedure",
  RECOVERY: "Recovery",
  LAB: "Lab",
  GROOMING: "Grooming",
  OTHER: "Other",
  IMAGING: "Imaging",
  VACCINATION: "Vaccination",
  ISOLATION: "Isolation",
  MULTIPURPOSE: "Multipurpose",
  EMERGENCY_UNAVAILABLE: "Emergency unavailable",
  // Injection token / medicine
  USED: "Used",
  INTERNAL: "Internal (legacy)",
  EXTERNAL: "External (legacy)",
  OUTSIDE: "Outside (legacy)",
  INTERNAL_CLINIC: "Clinic stock (vial)",
  CLINIC_PROVIDED_MEDICINE: "Clinic-provided medicine",
  OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT: "Patient-brought (outside Rx)",
  CREATED: "Created",
  VALIDATED_IN_QUEUE: "Validated / in queue",
  ADMINISTERED: "Administered",
  INTERNAL_VISIT: "Internal visit",
  EXTERNAL_WALK_IN: "External / walk-in",
};

/**
 * Convert a technical field key to a human-readable label.
 */
export function humanizeFieldLabel(key: string): string {
  if (!key || typeof key !== "string") return "—";
  const trimmed = key.trim();
  return FIELD_LABELS[trimmed] ?? trimmed.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).replace(/_/g, " ").trim();
}

/**
 * Convert an enum-like value to human-readable text.
 */
export function humanizeEnum(value: unknown): string {
  if (value == null) return "—";
  const s = String(value).trim();
  return ENUM_LABELS[s] ?? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format a single value for display (no raw JSON).
 * - Primitives: as-is (stringified safely)
 * - Arrays: comma-separated or bullet list text
 * - Objects: flattened "Label: value" lines, not JSON
 */
export function formatValueForDisplay(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const parts = value.map((v) => (typeof v === "object" && v !== null ? formatValueForDisplay(v) : String(v)));
    return parts.join(", ");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "—";
    return entries.map(([k, v]) => `${humanizeFieldLabel(k)}: ${formatValueForDisplay(v)}`).join(" · ");
  }
  return String(value);
}

/**
 * Format a payload/object for display in remarks or details (e.g. approval payload).
 * Prefer known keys (reason, displayName, etc.) and never return raw JSON.
 */
export function formatPayloadForDisplay(payload: unknown): string {
  if (payload == null) return "—";
  if (typeof payload === "string") return payload;
  if (typeof payload !== "object") return String(payload);
  const obj = payload as Record<string, unknown>;
  const reason = obj.reason ?? obj.rejectReason ?? obj.remarks;
  if (reason != null && typeof reason === "string") return reason;
  if (typeof reason === "object") return formatValueForDisplay(reason);
  return formatValueForDisplay(payload);
}

/**
 * Build a list of human-readable change lines from old and new values (for audit/approval).
 * Returns array of "Label: oldValue → newValue" or "Label: newValue" when no old value.
 */
export function formatAuditChangeLines(
  oldVal: unknown,
  newVal: unknown,
  options?: { action?: string; field?: string }
): string[] {
  const lines: string[] = [];
  const oldObj = oldVal != null && typeof oldVal === "object" && !Array.isArray(oldVal) ? (oldVal as Record<string, unknown>) : null;
  const newObj = newVal != null && typeof newVal === "object" && !Array.isArray(newVal) ? (newVal as Record<string, unknown>) : null;

  if (oldObj && newObj) {
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    allKeys.forEach((key) => {
      const o = oldObj[key];
      const n = newObj[key];
      const label = humanizeFieldLabel(key);
      const oldStr = formatValueForDisplay(o);
      const newStr = formatValueForDisplay(n);
      if (oldStr !== newStr) {
        lines.push(`${label}: ${humanizeEnum(oldStr) || oldStr} → ${humanizeEnum(newStr) || newStr}`);
      }
    });
  } else if (newObj) {
    Object.entries(newObj).forEach(([key, v]) => {
      const label = humanizeFieldLabel(key);
      const val = formatValueForDisplay(v);
      lines.push(`${label}: ${humanizeEnum(val) || val}`);
    });
  } else if (oldObj) {
    Object.entries(oldObj).forEach(([key, v]) => {
      const label = humanizeFieldLabel(key);
      const val = formatValueForDisplay(v);
      lines.push(`${label}: ${humanizeEnum(val) || val} (removed)`);
    });
  } else {
    const oldStr = formatValueForDisplay(oldVal);
    const newStr = formatValueForDisplay(newVal);
    if (oldStr !== "—" || newStr !== "—") {
      const fieldLabel = options?.field ? humanizeFieldLabel(options.field) : "Value";
      if (oldStr !== "—" && newStr !== "—") lines.push(`${fieldLabel}: ${oldStr} → ${newStr}`);
      else if (newStr !== "—") lines.push(`${fieldLabel}: ${newStr}`);
      else lines.push(`${fieldLabel}: ${oldStr} (removed)`);
    }
  }
  return lines;
}

/**
 * Derive audit module label from action (for Audit Logs module column).
 */
export function getAuditModule(action: string | null | undefined): string {
  if (!action || typeof action !== "string") return "—";
  const s = action.trim().toLowerCase();
  if (s.includes("approval") || s.includes("approve") || s.includes("reject")) return "Approvals";
  if (s.includes("schedule") || s.includes("template") || s.includes("exception")) return "Schedule";
  if (s.includes("service") || s.includes("mapping")) return "Service";
  if (s.includes("package") || s.includes("role")) return "Package";
  if (s.includes("credential") || s.includes("license")) return "Credentials";
  if (s.includes("status") || s.includes("activate")) return "Doctor";
  if (s.includes("fee") || s.includes("contract")) return "Fees";
  if (s.includes("leave")) return "Leave";
  return "Doctor";
}

/**
 * Derive audit risk level from action (for Audit Logs risk column).
 */
export function getAuditRiskLevel(action: string | null | undefined): "low" | "medium" | "high" | null {
  if (!action || typeof action !== "string") return null;
  const s = action.trim().toLowerCase();
  if (s.includes("status") || s.includes("deactivat") || s.includes("reject") || s.includes("delete")) return "high";
  if (s.includes("approval") || s.includes("credential") || s.includes("fee") || s.includes("contract")) return "medium";
  return "low";
}

/**
 * Format audit log "Details" column: no raw JSON, only human-readable change summary.
 */
export function formatAuditDetails(entry: {
  action?: string;
  field?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}): string[] {
  const { action, field, oldValue, newValue } = entry;
  const lines = formatAuditChangeLines(oldValue, newValue, { action, field: field ?? undefined });
  if (lines.length > 0) return lines;
  if (oldValue != null || newValue != null) {
    return [formatValueForDisplay(newValue ?? oldValue)];
  }
  return [];
}

/**
 * Format activity/timeline metadata for display (no JSON.stringify).
 */
export function formatMetadataForDisplay(metadata: unknown): string {
  if (metadata == null) return "—";
  if (typeof metadata === "string") return metadata;
  return formatValueForDisplay(metadata);
}

/** Visit type: WALK_IN | SCHEDULED | EMERGENCY */
export function formatVisitType(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  return humanizeEnum(value);
}

/** Appointment type: CONSULTATION | SERVICE | PACKAGE | SURGERY | FOLLOW_UP */
export function formatAppointmentType(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  return humanizeEnum(value);
}

/** Appointment status for display (no raw enum). */
export function formatAppointmentStatus(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  return humanizeEnum(value);
}
