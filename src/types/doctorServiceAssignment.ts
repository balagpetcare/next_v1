/**
 * Contracts for clinic doctor–service assignment (enterprise V2 API).
 * Backend: GET/PATCH .../doctors/:memberId/service-assignment, templates, summary.
 */

export type ServiceAssignmentBulkOp =
  | { op: "upsert"; serviceId: number; role?: string; isAllowed?: boolean }
  | { op: "delete"; serviceId: number };

export type ServiceAssignmentMappingRow = {
  id: number | null;
  role: string | null;
  isAllowed: boolean;
  status: string | null;
  requiresApproval: boolean;
  customDuration: number | null;
  bookingType: string | null;
  notes: string | null;
  /** True when mapping exists, isAllowed, and status is ACTIVE */
  effectiveAssigned: boolean;
};

export type ServiceAssignmentServiceRow = {
  serviceId: number;
  name: string;
  category: string;
  serviceStatus: string;
  listPrice: number | null;
  duration: number | null;
  mapping: ServiceAssignmentMappingRow | null;
  doctorFee: number | null;
};

export type ServiceAssignmentCategoryGroup = {
  category: string;
  services: ServiceAssignmentServiceRow[];
};

export type DoctorServiceAssignmentPayload = {
  doctor: {
    memberId: number;
    displayName: string;
    profileStatus: string;
    profileId: number;
  };
  categories: ServiceAssignmentCategoryGroup[];
  allowedRolesByCategory: Record<string, string[]>;
  activeServiceCount: number;
};

export type DoctorServiceAssignmentSummaryDoctor = {
  memberId: number;
  displayName: string;
  profileStatus: string;
  assignedServiceCount: number;
};

export type DoctorServiceAssignmentSummaryPayload = {
  doctors: DoctorServiceAssignmentSummaryDoctor[];
  totalDoctors: number;
  totalActiveServices: number;
};

export type ServiceAssignmentBulkResult = {
  ok: boolean;
  errors: Array<{ index: number; message: string }>;
  assignment?: DoctorServiceAssignmentPayload;
};

export type AssignmentTemplateItem = { serviceId: number; role?: string };

export type DoctorServiceAssignmentTemplatePayload = {
  items: AssignmentTemplateItem[];
};

export type DoctorServiceAssignmentTemplateListItem = {
  id: number;
  name: string;
  scope: string;
  branchMemberId: number | null;
  itemCount: number;
  createdAt: string;
};

export type DoctorServiceAssignmentTemplateDetail = DoctorServiceAssignmentTemplateListItem & {
  payload: DoctorServiceAssignmentTemplatePayload;
};
