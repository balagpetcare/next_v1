/** Shared constants and types for owner clinic catalog control center */

export const DOMAIN_BADGE: Record<string, string> = {
  MEDICINE: "bg-success-subtle text-success-emphasis",
  SURGICAL_CONSUMABLE: "bg-primary-subtle text-primary-emphasis",
  DRESSING_SUPPLY: "bg-info-subtle text-info-emphasis",
  CLINIC_SUPPLY: "bg-secondary-subtle text-secondary-emphasis",
  INSTRUMENT: "bg-warning-subtle text-warning-emphasis",
  IMPLANT: "bg-dark-subtle text-dark-emphasis",
  SERVICE_SUPPORT: "bg-info-subtle text-info-emphasis",
  PACKAGE_ONLY: "bg-secondary-subtle text-secondary-emphasis",
};

export const DOMAIN_OPTIONS = [
  { value: "", label: "All types" },
  { value: "MEDICINE", label: "Medicine" },
  { value: "SURGICAL_CONSUMABLE", label: "Surgical consumable" },
  { value: "DRESSING_SUPPLY", label: "Dressing supply" },
  { value: "CLINIC_SUPPLY", label: "Clinic supply" },
  { value: "INSTRUMENT", label: "Instrument" },
  { value: "IMPLANT", label: "Implant" },
  { value: "SERVICE_SUPPORT", label: "Service support" },
  { value: "PACKAGE_ONLY", label: "Package only" },
];

export type ClinicalItemRow = {
  id: number;
  itemCode: string;
  name: string;
  domainType: string;
  isActive?: boolean;
  baseUnit?: string | null;
  updatedAt?: string;
  category?: { id: number; name: string };
  consumableProfile?: {
    consumableType?: string;
    sterileRequired?: boolean;
    wastageTrackRequired?: boolean;
    procedureLinked?: boolean;
    issueUnit?: string | null;
    usageNoteTemplate?: string | null;
  } | null;
  instrumentProfile?: { sterilizationRequired?: boolean } | null;
  _count?: { variants: number; packageItems?: number };
};

export type CatalogFilters = {
  search: string;
  domainType: string;
  categoryId: string;
  isActive: string;
  hasUsageTemplate: string;
  sort: string;
};

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  search: "",
  domainType: "",
  categoryId: "",
  isActive: "",
  hasUsageTemplate: "",
  sort: "domain_code",
};

export type CatalogKpiStats = {
  total: number;
  active: number;
  procedureLinked: number;
  sterile: number;
  wastageTracked: number;
  incompleteOrAlerts: number;
};
