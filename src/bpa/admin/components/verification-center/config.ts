export type VerificationEntityKey =
  | "owners"
  | "organizations"
  | "branches"
  | "staff"
  | "producer_orgs"
  | "doctors";

export const VERIFICATION_STATUS_OPTIONS = [
  "",
  "PENDING",
  "SUBMITTED",
  "REQUEST_CHANGES",
  "VERIFIED",
  "REJECTED",
  "SUSPENDED",
  "UNSUBMITTED",
];

export const VERIFICATION_ENTITY_CONFIG: Record<
  VerificationEntityKey,
  { key: VerificationEntityKey; label: string; routeSegment: string }
> = {
  owners: { key: "owners", label: "Owners", routeSegment: "owners" },
  organizations: {
    key: "organizations",
    label: "Organizations",
    routeSegment: "organizations",
  },
  branches: { key: "branches", label: "Branches", routeSegment: "branches" },
  staff: { key: "staff", label: "Staff", routeSegment: "staff" },
  producer_orgs: {
    key: "producer_orgs",
    label: "Producers",
    routeSegment: "producer-orgs",
  },
  doctors: { key: "doctors", label: "Doctors", routeSegment: "doctors" },
};

export const VERIFICATION_ENTITY_KEYS = Object.keys(
  VERIFICATION_ENTITY_CONFIG
) as VerificationEntityKey[];

export function normalizeVerificationEntityKey(
  input: string | null | undefined
): VerificationEntityKey | null {
  if (!input) return null;
  const normalized = String(input).trim().toLowerCase().replace("-", "_");
  if (normalized === "producer_orgs" || normalized === "producer-orgs") {
    return "producer_orgs";
  }
  if (normalized in VERIFICATION_ENTITY_CONFIG) {
    return normalized as VerificationEntityKey;
  }
  return null;
}

export function getVerificationRouteSegment(key: VerificationEntityKey): string {
  return VERIFICATION_ENTITY_CONFIG[key].routeSegment;
}

export function getVerificationListHref(key: VerificationEntityKey): string {
  return `/admin/verifications/${getVerificationRouteSegment(key)}`;
}

export function getVerificationDetailHref(
  key: VerificationEntityKey,
  id: number | string
): string {
  return `${getVerificationListHref(key)}/${id}`;
}

export function mapLogEntityTypeToKey(
  entityType: string | null | undefined
): VerificationEntityKey | null {
  const value = String(entityType || "").toUpperCase();
  if (value === "OWNER") return "owners";
  if (value === "ORGANIZATION") return "organizations";
  if (value === "BRANCH") return "branches";
  if (value === "PRODUCER_ORG") return "producer_orgs";
  return null;
}
