"use client";

import { useState, useCallback } from "react";
import type { 
  BookingSource, 
  AppointmentType, 
  BookingPriority,
  PricePreview,
  EligibleDoctor,
  AppointmentSlot,
  PetOption 
} from "@/src/types/appointment";
import PatientPetSelector from "./PatientPetSelector";
import ServiceSelector from "./ServiceSelector";
import DoctorSelector from "./DoctorSelector";
import SlotPicker from "./SlotPicker";
import PriceSummaryCard from "./PriceSummaryCard";

export interface EnterpriseAppointmentWizardProps {
  branchId: number;
  onComplete?: (appointmentData: any) => void;
  onCancel?: () => void;
}

const WIZARD_STEPS = [
  { id: "source", title: "Visit Source", description: "How is this visit initiated?" },
  { id: "owner", title: "Owner & Pet", description: "Select patient and pet" },
  { id: "visitType", title: "Visit Type", description: "What type of visit?" },
  { id: "service", title: "Service", description: "Select service or package" },
  { id: "doctor", title: "Doctor", description: "Choose preferred doctor" },
  { id: "slot", title: "Schedule", description: "Pick a time slot" },
  { id: "price", title: "Price Preview", description: "Review pricing" },
  { id: "confirm", title: "Confirm", description: "Confirm appointment" },
] as const;

export default function EnterpriseAppointmentWizard({ 
  branchId, 
  onComplete, 
  onCancel 
}: EnterpriseAppointmentWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [source, setSource] = useState<BookingSource>("WALKIN");
  const [patient, setPatient] = useState<any>(null);
  const [pet, setPet] = useState<PetOption | null>(null);
  const [priority, setPriority] = useState<BookingPriority>("NORMAL");
  const [appointmentType, setAppointmentType] = useState<AppointmentType>("CONSULTATION");
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [packageId, setPackageId] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number | null | "auto">(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [pricePreview, setPricePreview] = useState<PricePreview | null>(null);
  const [notes, setNotes] = useState<string>("");

  // Navigation
  const nextStep = useCallback(() => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < WIZARD_STEPS.length) {
      setCurrentStep(step);
      setError(null);
    }
  }, []);

  // Step validation
  const canProceed = useCallback(() => {
    switch (WIZARD_STEPS[currentStep].id) {
      case "source":
        return !!source;
      case "owner":
        return !!patient && !!pet;
      case "visitType":
        return !!appointmentType;
      case "service":
        return !!serviceId || !!packageId;
      case "doctor":
        return doctorId !== null;
      case "slot":
        return !!selectedDate && !!selectedSlot;
      case "price":
        return true; // Price preview can be zero
      case "confirm":
        return true;
      default:
        return false;
    }
  }, [currentStep, source, patient, pet, appointmentType, serviceId, packageId, doctorId, selectedDate, selectedSlot]);

  // Render step content
  const renderStepContent = () => {
    switch (WIZARD_STEPS[currentStep].id) {
      case "source":
        return <SourceStep source={source} onChange={setSource} />;
      case "owner":
        return (
          <OwnerPetStep
            patient={patient}
            pet={pet}
            onPatientSelect={setPatient}
            onPetSelect={setPet}
            branchId={branchId}
          />
        );
      case "visitType":
        return (
          <VisitTypeStep
            appointmentType={appointmentType}
            priority={priority}
            onTypeChange={setAppointmentType}
            onPriorityChange={setPriority}
            source={source}
          />
        );
      case "service":
        return (
          <ServiceStep
            branchId={branchId}
            appointmentType={appointmentType}
            serviceId={serviceId}
            packageId={packageId}
            onServiceSelect={setServiceId}
            onPackageSelect={setPackageId}
          />
        );
      case "doctor":
        return (
          <DoctorStep
            branchId={branchId}
            serviceId={serviceId}
            packageId={packageId}
            doctorId={doctorId}
            onDoctorSelect={setDoctorId}
          />
        );
      case "slot":
        return (
          <SlotStep
            branchId={branchId}
            doctorId={doctorId}
            serviceId={serviceId}
            packageId={packageId}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            onDateSelect={setSelectedDate}
            onSlotSelect={setSelectedSlot}
          />
        );
      case "price":
        return (
          <PriceStep
            branchId={branchId}
            doctorId={doctorId}
            serviceId={serviceId}
            packageId={packageId}
            appointmentType={appointmentType}
            priority={priority}
            onPricePreview={setPricePreview}
          />
        );
      case "confirm":
        return (
          <ConfirmStep
            data={{
              source,
              patient,
              pet,
              priority,
              appointmentType,
              serviceId,
              packageId,
              doctorId,
              selectedDate,
              selectedSlot,
              pricePreview,
              notes,
            }}
            onNotesChange={setNotes}
          />
        );
      default:
        return <div>Unknown step</div>;
    }
  };

  // Handle completion
  const handleComplete = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const appointmentData = {
        branchId,
        source,
        patientId: patient?.id,
        petId: pet?.id,
        priority,
        appointmentType,
        serviceId,
        packageId,
        doctorId: doctorId === "auto" ? null : doctorId,
        isAnyDoctor: doctorId === "auto",
        scheduledStartAt: selectedSlot?.start,
        scheduledEndAt: selectedSlot?.end,
        notes,
        priceSnapshot: pricePreview,
      };

      await onComplete?.(appointmentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create appointment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="enterprise-appointment-wizard">
      {/* Progress indicator */}
      <div className="wizard-progress mb-4">
        <div className="d-flex justify-content-between align-items-center">
          {WIZARD_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`wizard-step-item flex-grow-1 ${index === currentStep ? "active" : ""} ${
                index < currentStep ? "completed" : ""
              }`}
              style={{ maxWidth: `${100 / WIZARD_STEPS.length}%` }}
            >
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none w-100"
                onClick={() => goToStep(index)}
                disabled={index > currentStep}
              >
                <div className="d-flex flex-column align-items-center">
                  <div className={`step-number mb-1 ${index <= currentStep ? "text-primary" : "text-muted"}`}>
                    {index + 1}
                  </div>
                  <div className="step-title small">{step.title}</div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Current step info */}
      <div className="wizard-header mb-4">
        <h4 className="mb-1">{WIZARD_STEPS[currentStep].title}</h4>
        <p className="text-muted mb-0">{WIZARD_STEPS[currentStep].description}</p>
      </div>

      {/* Error display */}
      {error && (
        <div className="alert alert-danger mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Step content */}
      <div className="wizard-content mb-4">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="wizard-navigation">
        <div className="d-flex justify-content-between">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            Previous
          </button>
          
          {currentStep === WIZARD_STEPS.length - 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleComplete}
              disabled={!canProceed() || loading}
            >
              {loading ? "Creating..." : "Create Appointment"}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={nextStep}
              disabled={!canProceed()}
            >
              Next
            </button>
          )}
        </div>
        
        {onCancel && (
          <div className="mt-3">
            <button
              type="button"
              className="btn btn-link text-muted"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Step components
function SourceStep({ source, onChange }: { source: BookingSource; onChange: (source: BookingSource) => void }) {
  const sources = [
    { value: "WALKIN" as const, label: "Walk-in", description: "Patient arrived at clinic" },
    { value: "PHONE" as const, label: "Phone Call", description: "Appointment booked via phone" },
    { value: "ONLINE_BOOKING" as const, label: "Online Booking", description: "Booked through website/app" },
  ];

  return (
    <div className="source-selection">
      <div className="list-group">
        {sources.map((s) => (
          <button
            key={s.value}
            type="button"
            className={`list-group-item list-group-item-action ${source === s.value ? "active" : ""}`}
            onClick={() => onChange(s.value)}
          >
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h6 className="mb-1">{s.label}</h6>
                <p className="mb-0 text-muted small">{s.description}</p>
              </div>
              {source === s.value && (
                <i className="bi bi-check-circle-fill text-primary"></i>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function OwnerPetStep({ 
  patient, 
  pet, 
  onPatientSelect, 
  onPetSelect, 
  branchId 
}: {
  patient: any;
  pet: PetOption | null;
  onPatientSelect: (patient: any) => void;
  onPetSelect: (pet: PetOption | null) => void;
  branchId: number;
}) {
  return (
    <PatientPetSelector
      patient={patient}
      pet={pet}
      onPatientSelect={onPatientSelect}
      onPetSelect={onPetSelect}
    />
  );
}

function VisitTypeStep({ 
  appointmentType, 
  priority, 
  onTypeChange, 
  onPriorityChange, 
  source 
}: {
  appointmentType: AppointmentType;
  priority: BookingPriority;
  onTypeChange: (type: AppointmentType) => void;
  onPriorityChange: (priority: BookingPriority) => void;
  source: BookingSource;
}) {
  const types = [
    { value: "CONSULTATION" as const, label: "Consultation" },
    { value: "SERVICE" as const, label: "Service/Procedure" },
    { value: "PACKAGE" as const, label: "Package" },
    { value: "SURGERY" as const, label: "Surgery" },
    { value: "FOLLOW_UP" as const, label: "Follow-up" },
  ];

  const priorities = [
    { value: "NORMAL" as const, label: "Normal", description: "Regular appointment" },
    { value: "EMERGENCY" as const, label: "Emergency", description: "Urgent medical attention" },
    { value: "VIP" as const, label: "VIP", description: "Special handling" },
  ];

  return (
    <div className="visit-type-selection">
      <div className="mb-4">
        <label className="form-label fw-semibold">Visit Type</label>
        <div className="list-group">
          {types.map((type) => (
            <button
              key={type.value}
              type="button"
              className={`list-group-item list-group-item-action ${appointmentType === type.value ? "active" : ""}`}
              onClick={() => onTypeChange(type.value)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="form-label fw-semibold">Priority</label>
        <div className="list-group">
          {priorities.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`list-group-item list-group-item-action ${priority === p.value ? "active" : ""}`}
              onClick={() => onPriorityChange(p.value)}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="mb-1">{p.label}</h6>
                  <p className="mb-0 text-muted small">{p.description}</p>
                </div>
                {priority === p.value && (
                  <i className="bi bi-check-circle-fill text-primary"></i>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ServiceStep({
  branchId,
  appointmentType,
  serviceId,
  packageId,
  onServiceSelect,
  onPackageSelect,
}: {
  branchId: number;
  appointmentType: AppointmentType;
  serviceId: number | null;
  packageId: number | null;
  onServiceSelect: (id: number | null) => void;
  onPackageSelect: (id: number | null) => void;
}) {
  void branchId;
  void appointmentType;
  void packageId;
  void onPackageSelect;
  return (
    <ServiceSelector
      services={[]}
      selectedId={serviceId}
      onSelect={(svc) => onServiceSelect(svc.id)}
      error="Enterprise wizard: load services/packages from the branch catalog API to enable this step (use staff appointment flow meanwhile)."
    />
  );
}

function DoctorStep({
  branchId,
  serviceId,
  packageId,
  doctorId,
  onDoctorSelect,
}: {
  branchId: number;
  serviceId: number | null;
  packageId: number | null;
  doctorId: number | null | "auto";
  onDoctorSelect: (id: number | null | "auto") => void;
}) {
  void branchId;
  void serviceId;
  void packageId;
  return (
    <DoctorSelector
      doctors={[]}
      selectedId={doctorId}
      onSelect={(d) => {
        if (d === "auto") onDoctorSelect("auto");
        else onDoctorSelect(d.doctorId);
      }}
      error="Enterprise wizard: load eligible doctors from the branch API to enable this step."
    />
  );
}

function SlotStep({
  branchId,
  doctorId,
  serviceId,
  packageId,
  selectedDate,
  selectedSlot,
  onDateSelect,
  onSlotSelect,
}: {
  branchId: number;
  doctorId: number | null | "auto";
  serviceId: number | null;
  packageId: number | null;
  selectedDate: string | null;
  selectedSlot: AppointmentSlot | null;
  onDateSelect: (date: string | null) => void;
  onSlotSelect: (slot: AppointmentSlot | null) => void;
}) {
  void branchId;
  void doctorId;
  void serviceId;
  void packageId;
  void selectedDate;
  void onDateSelect;
  return (
    <SlotPicker
      slotGroups={[]}
      selectedSlot={
        selectedSlot
          ? { start: selectedSlot.start, end: selectedSlot.end, doctorId: selectedSlot.doctorId }
          : null
      }
      onSelectSlot={(slot) =>
        onSlotSelect({
          start: slot.start,
          end: slot.end,
          doctorId: slot.doctorId,
          doctorName: slot.doctorName,
        })
      }
      error="Enterprise wizard: load slot groups from the schedule API to enable this step."
    />
  );
}

function PriceStep({ 
  branchId, 
  doctorId, 
  serviceId, 
  packageId, 
  appointmentType, 
  priority, 
  onPricePreview 
}: {
  branchId: number;
  doctorId: number | null | "auto";
  serviceId: number | null;
  packageId: number | null;
  appointmentType: AppointmentType;
  priority: BookingPriority;
  onPricePreview: (preview: PricePreview | null) => void;
}) {
  return (
    <div className="price-preview-step">
      <PriceSummaryCard
        preview={null} // Will be fetched
        loading={true}
      />
    </div>
  );
}

function ConfirmStep({ 
  data, 
  onNotesChange 
}: {
  data: any;
  onNotesChange: (notes: string) => void;
}) {
  return (
    <div className="confirm-step">
      <div className="card mb-3">
        <div className="card-header">Appointment Summary</div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <p><strong>Patient:</strong> {data.patient?.displayName}</p>
              <p><strong>Pet:</strong> {data.pet?.name}</p>
              <p><strong>Type:</strong> {data.appointmentType}</p>
              <p><strong>Priority:</strong> {data.priority}</p>
            </div>
            <div className="col-md-6">
              <p><strong>Doctor:</strong> {data.doctorId === "auto" ? "Any available" : "Selected"}</p>
              <p><strong>Date:</strong> {data.selectedDate}</p>
              <p><strong>Time:</strong> {data.selectedSlot?.start}</p>
              <p><strong>Source:</strong> {data.source}</p>
            </div>
          </div>
          
          <div className="mt-3">
            <label className="form-label">Notes (optional)</label>
            <textarea
              className="form-control"
              rows={3}
              value={data.notes || ""}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add any special instructions or notes..."
            />
          </div>
        </div>
      </div>

      {data.pricePreview && (
        <PriceSummaryCard preview={data.pricePreview} />
      )}
    </div>
  );
}
