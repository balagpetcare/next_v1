/** Staff clinic visits list row (API shape; optional signals from backend). */
export type ClinicVisitQueueTicket = { id: number; status: string; tokenNo?: string | null };

export type ClinicVisitSettlementSignal = {
  ledgerId: number;
  settlementStatus: string;
  doctorShare: number;
};

export type ClinicVisitBillingSignal = {
  orderCount: number;
  unpaidOrderCount: number;
};

export type ClinicVisitListRow = {
  id: number;
  treatmentCode?: string | null;
  status: string;
  createdAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  petId?: number;
  patientId?: number;
  appointmentId?: number | null;
  pet?: { id: number; name?: string | null; uniquePetId?: string | null; animalType?: { name?: string | null } | null };
  patient?: { id: number; profile?: { displayName?: string | null } | null; auth?: { phone?: string | null; email?: string | null } | null };
  doctor?: { id: number; user?: { profile?: { displayName?: string | null } | null } | null };
  appointment?: { id: number; scheduledStartAt?: string | null; status?: string | null } | null;
  clinicalCase?: { id: number; status: string } | null;
  surgeryCase?: { id: number; status: string } | null;
  _count?: { vitals: number; notes: number };
  queueTicket?: ClinicVisitQueueTicket | null;
  settlement?: ClinicVisitSettlementSignal | null;
  billing?: ClinicVisitBillingSignal | null;
};

export type ClinicVisitsSummary = {
  byStatus: Record<string, number>;
  openPipelineCount: number;
  completedInDateRange: number;
  visitsInDateRange: number;
  visitsWithUnpaidOrders: number;
};
