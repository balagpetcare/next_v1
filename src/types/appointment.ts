/**
 * Shared types for appointment and booking flow.
 * Used by staff, owner, and doctor panels and booking components.
 */

export type AppointmentType =
  | "CONSULTATION"
  | "SERVICE"
  | "PACKAGE"
  | "SURGERY"
  | "FOLLOW_UP";

export type BookingStatus =
  | "DRAFT"
  | "PRE_BOOKED"
  | "PENDING"
  | "BOOKED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_QUEUE"
  | "CALLED"
  | "IN_CONSULT"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "RESCHEDULED";

export type BookingSource =
  | "OWNER_PANEL"
  | "STAFF_PANEL"
  | "DOCTOR_PANEL"
  | "ONLINE_BOOKING"
  | "MOBILE"
  | "OWNER_PORTAL"
  | "WALKIN"
  | "STAFF"
  | "PHONE";

export interface AppointmentSlot {
  start: string;
  end: string;
  doctorId: number;
  doctorName: string;
  available?: boolean;
}

export interface DoctorSlotGroup {
  doctorId: number;
  doctorName: string;
  slots: { start: string; end: string }[];
}

export interface PriceBreakdownItem {
  label: string;
  amount: number;
}

export interface PricePreview {
  basePrice: number;
  doctorFee: number;
  discountAmount: number;
  totalPrice: number;
  breakdown: PriceBreakdownItem[];
}

export interface EligibleDoctor {
  doctorId: number;
  doctorName: string;
  specializationTags?: string[] | null;
  defaultConsultationFee?: number | null;
  serviceFee?: number | null;
  durationMin?: number | null;
}

export interface BookingConstraints {
  isOpen: boolean;
  openingHours: Record<string, string> | null;
  weeklyOffDays: number[] | null;
  holidays: { date: string; name: string | null; isClosed: boolean }[];
  maxAdvanceDays: number;
  policies: { maxDiscountPercent?: number; requireOwnerApproval?: unknown };
}

export interface PetOption {
  id: number;
  name: string;
  animalType?: string;
}

export type BookingPriority = "NORMAL" | "EMERGENCY" | "VIP";

export interface CompatibleRoom {
  id: number;
  name: string;
  code: string | null;
  roomType: string;
}

export interface BookingWizardState {
  step: number;
  branchId: number;
  patientId?: number;
  petId?: number;
  patientPets?: PetOption[];
  priority?: BookingPriority;
  appointmentType: AppointmentType;
  serviceId?: number;
  packageId?: number;
  doctorId?: number | "auto";
  date?: string;
  slotStart?: string;
  slotEnd?: string;
  durationMinutes?: number;
  notes?: string;
  specialInstructions?: string;
  pricePreview?: PricePreview;
  patientName?: string;
  petName?: string;
  serviceName?: string;
  packageName?: string;
  doctorName?: string;
  roomId?: number | null;
  roomName?: string;
  compatibleRooms?: CompatibleRoom[];
}
