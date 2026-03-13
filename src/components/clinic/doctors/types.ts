export type DoctorsSummary = {
  totalDoctors: number;
  activeDoctors: number;
  onDutyToday: number;
  availableForBooking: number;
  pendingInvites: number;
  pendingApprovals: number;
  onLeave: number;
  credentialExpiringSoon: number;
};

export type OperationalAlert = {
  severity: "info" | "warning" | "critical";
  message: string;
  count?: number;
  link?: string;
};

export type EnrichedDoctor = {
  memberId: number;
  clinicStaffProfileId: number;
  displayName: string;
  avatar?: string | null;
  email?: string | null;
  phone?: string | null;
  doctorCode: string;
  speciality?: string | null;
  qualification?: string | null;
  registrationStatus: string;
  assignmentType: string;
  branchRole?: string | null;
  todaysShift?: string | null;
  bookingStatus: string;
  consultationFee?: number | null;
  servicesAssignedCount: number;
  packagesAssignedCount: number;
  performanceStatus: string;
  lastUpdated: string;
  status: string;
  contractStatus?: string | null;
};
