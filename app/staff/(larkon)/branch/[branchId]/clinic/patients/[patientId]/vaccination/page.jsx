"use client";

 

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicAdministerVaccination,
  staffClinicCorrectVaccination,
  staffClinicDewormingList,
  staffClinicDewormingRecord,
  staffClinicPatientGet,
  staffClinicVaccinationAudit,
  staffClinicVaccinationBillingOptions,
  staffClinicVaccinationReminders,
  staffClinicVaccinationRecord,
  staffClinicVaccinationsList,
  staffClinicVaccinationsNextDue,
  staffClinicVaccineStockCandidates,
  staffClinicVaccineTypes,
  staffClinicVoidVaccination,
} from "@/lib/api";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { PageWorkspace } from "@/src/components/dashboard";

const VIEW_PERMS = ["clinic.patients.read", "clinic.patients.manage", "clinic.emr.read", "clinic.emr.write"];
const WRITE_PERMS = ["clinic.emr.write"];
const WORKSPACE_TABS = [
  { key: "vaccination", label: "Vaccination" },
  { key: "deworming", label: "Deworming" },
  { key: "reminders", label: "Reminders" },
  { key: "billing", label: "Billing" },
  { key: "audit", label: "Audit" },
];

function toDateTimeLocal(value = new Date()) {
  const d = new Date(value);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getOwner(pet) {
  if (!pet) return null;
  if (pet.owner) return pet.owner;
  const user = pet.user;
  if (!user) return null;
  return {
    userId: user.id,
    displayName: user.profile?.displayName ?? null,
    username: user.profile?.username ?? null,
    email: user.auth?.email ?? null,
    phone: user.auth?.phone ?? null,
  };
}

function ownerLabel(owner) {
  if (!owner) return "No owner linked";
  return owner.displayName || owner.username || owner.email || owner.phone || `Owner #${owner.userId}`;
}

function vaccineName(record) {
  return record?.vaccineType?.name || record?.vaccineName || "Unknown vaccine";
}

function getNextDueDate(row) {
  return row?.nextDue || row?.nextDueDate || row?.vaccination?.nextDueDate || null;
}

function getDueVaccination(row) {
  return row?.vaccination || row;
}

function reminderOwnerLabel(owner) {
  if (!owner) return "-";
  return owner.displayName || owner.username || owner.phone || owner.email || `Owner #${owner.userId || "?"}`;
}

function mappingAlertClass(status) {
  if (status === "AMBIGUOUS" || status === "UNMAPPED") return "alert alert-warning py-2";
  return "alert alert-info py-2";
}

function stockCandidateStatusMessage(mapping, candidateCount) {
  if (mapping?.message) return mapping.message;
  if (mapping?.status === "UNMAPPED") {
    return "No inventory item is mapped to this vaccine type. Configure Vaccine Mapping or receive a matching vaccine item in branch stock.";
  }
  if (mapping?.status === "MATCHED" && candidateCount === 0) {
    return "Mapped vaccine item found, but this branch has no active non-expired batch with remaining stock.";
  }
  if (mapping?.status === "AMBIGUOUS") {
    return "Multiple possible vaccine stock items found. Configure Vaccine Mapping for accuracy.";
  }
  return "Choose one of the active non-expired branch batches with remaining stock.";
}

function shouldShowStockSetupActions(mapping, candidateCount) {
  const status = String(mapping?.status || "").toUpperCase();
  return status === "UNMAPPED" || status === "AMBIGUOUS" || (status === "MATCHED" && candidateCount === 0) || candidateCount === 0;
}

function createAdministerIdempotencyKey({ branchId, petId, vaccineTypeId, batchId }) {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `vaccination-administer:${branchId}:${petId}:${vaccineTypeId}:${batchId}:${Date.now()}:${randomPart}`;
}

function stockCandidateLabel(item) {
  const parts = [
    item?.batchNo || "No batch",
    item?.expiryDate ? `exp ${formatDate(item.expiryDate)}` : "no expiry",
    item?.remainingQty != null ? `qty ${item.remainingQty}` : null,
    item?.itemName || null,
    item?.manufacturerName || null,
  ].filter(Boolean);
  return parts.join(" - ");
}

function vaccinationStatusClass(status) {
  if (status === "VOIDED") return "badge bg-danger-subtle text-danger border border-danger-subtle";
  if (status === "CORRECTED") return "badge bg-warning-subtle text-warning border border-warning-subtle";
  return "badge bg-success-subtle text-success border border-success-subtle";
}

function buildRecordWarnings(record) {
  const warnings = [];
  if (record?.legacyRecord || record?.branchId == null) warnings.push("Legacy/manual branch visibility");
  if (record?.stockLedgerId != null) warnings.push(record?.status === "VOIDED" ? "Stock not reversed in this phase" : "Stock-backed record");
  if (record?.orderId != null || record?.invoiceId != null) {
    warnings.push(record?.status === "VOIDED" ? "Billing not cancelled/refunded in this phase" : "Billing linked");
  }
  return warnings;
}

function warningObjectMessages(warnings) {
  if (!warnings || typeof warnings !== "object") return [];
  const out = [];
  const stock = warnings.stock;
  const billing = warnings.billing;
  const reminder = warnings.reminder;
  if (stock?.message) out.push(stock.message);
  if (billing?.message) out.push(billing.message);
  if (reminder?.message) out.push(reminder.message);
  for (const item of stock?.items || []) out.push(item);
  for (const item of billing?.items || []) out.push(item);
  for (const item of reminder?.items || []) out.push(item);
  return out.filter(Boolean);
}

function isLegacyVaccinationRecord(record) {
  if (!record) return false;
  if (record.legacyRecord || record.branchId == null) return true;
  return record.stockLedgerId == null && record.orderId == null && record.invoiceId == null;
}

function getWorkspaceStatus(vaccinations, nextDue) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDates = nextDue.map((row) => new Date(getNextDueDate(row))).filter((date) => !Number.isNaN(date.getTime()));
  const hasOverdue = dueDates.some((date) => date < today);
  const hasDueToday = dueDates.some((date) => date.getTime() === today.getTime());
  if (hasOverdue) return { label: "Overdue", className: "badge bg-danger-subtle text-danger border border-danger-subtle" };
  if (hasDueToday || dueDates.length > 0) return { label: hasDueToday ? "Due today" : "Due scheduled", className: "badge bg-warning-subtle text-warning border border-warning-subtle" };
  if (vaccinations.some(isLegacyVaccinationRecord)) return { label: "Legacy", className: "badge bg-secondary-subtle text-secondary border border-secondary-subtle" };
  return { label: "Up to date", className: "badge bg-success-subtle text-success border border-success-subtle" };
}

export default function StaffBranchPatientVaccinationWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const patientId = useMemo(() => {
    const raw = params?.patientId;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [params]);
  const { branch, myAccess, isLoading: ctxLoading } = useBranchContext(branchId);

  const [selectedPet, setSelectedPet] = useState(null);
  const [vaccinations, setVaccinations] = useState([]);
  const [nextDue, setNextDue] = useState([]);
  const [deworming, setDeworming] = useState([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState("");
  const [activeTab, setActiveTab] = useState("vaccination");
  const [reminderFilter, setReminderFilter] = useState("PENDING");
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [remindersError, setRemindersError] = useState("");
  const [vaccineTypes, setVaccineTypes] = useState([]);
  const [vaccineTypeError, setVaccineTypeError] = useState("");
  const [billingOptions, setBillingOptions] = useState([]);
  const [billingOptionsLoading, setBillingOptionsLoading] = useState(false);
  const [billingOptionsError, setBillingOptionsError] = useState("");
  const [stockCandidateState, setStockCandidateState] = useState({
    mapping: { status: "UNMAPPED", vaccineTypeId: null, vaccineTypeName: "", matchStrategy: "none" },
    items: [],
  });
  const [stockCandidatesLoading, setStockCandidatesLoading] = useState(false);
  const [stockCandidatesError, setStockCandidatesError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [billingResult, setBillingResult] = useState(null);
  const [workflowWarnings, setWorkflowWarnings] = useState([]);
  const [saving, setSaving] = useState("");
  const inFlightAdministerKeyRef = useRef(null);
  const [adminForm, setAdminForm] = useState({
    vaccineTypeId: "",
    batchId: "",
    administeredAt: toDateTimeLocal(),
    nextDueDate: "",
    notes: "",
    createBilling: false,
    visitId: "",
    appointmentId: "",
    serviceId: "",
    pricingVariantId: "",
    unitPrice: "",
    quantity: "1",
    discountAmount: "",
    billingNotes: "",
  });
  const [vacForm, setVacForm] = useState({
    vaccineTypeId: "",
    administeredAt: toDateTimeLocal(),
    nextDueDate: "",
    batchNumber: "",
    manufacturer: "",
    notes: "",
  });
  const [dewForm, setDewForm] = useState({
    medicationName: "",
    dosage: "",
    weightAtTime: "",
    nextDueDate: "",
    notes: "",
  });
  const [correctForm, setCorrectForm] = useState({
    recordId: null,
    administeredAt: "",
    nextDueDate: "",
    notes: "",
    manufacturer: "",
    batchNumber: "",
    correctionReason: "",
  });
  const [voidForm, setVoidForm] = useState({ recordId: null, voidReason: "" });
  const [auditState, setAuditState] = useState({ recordId: null, loading: false, error: "", data: null });

  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const hasAccess = VIEW_PERMS.some((perm) => permissions.includes(perm));
  const canWrite = WRITE_PERMS.some((perm) => permissions.includes(perm));
  const canConfigureVaccineMapping = permissions.includes("clinic.services.manage");
  const owner = getOwner(selectedPet);
  const stockCandidates = Array.isArray(stockCandidateState?.items) ? stockCandidateState.items : [];
  const stockMapping = stockCandidateState?.mapping || { status: "UNMAPPED", matchStrategy: "none" };
  const selectedStockCandidate = stockCandidates.find((item) => String(item.batchId) === String(adminForm.batchId)) || null;
  const hasValidSelectedBatch = Boolean(adminForm.batchId && selectedStockCandidate);
  const stockCandidateMessage = stockCandidateStatusMessage(stockMapping, stockCandidates.length);
  const selectedBillingService = billingOptions.find((service) => String(service.serviceId) === String(adminForm.serviceId)) || null;
  const status = getWorkspaceStatus(vaccinations, nextDue);

  const loadPatientWorkspace = useCallback(async () => {
    if (!branchId || !patientId) return;
    setWorkspaceLoading(true);
    setWorkspaceError("");
    try {
      const [pet, vacList, dueList, dewList] = await Promise.all([
        staffClinicPatientGet(branchId, patientId),
        staffClinicVaccinationsList(branchId, patientId),
        staffClinicVaccinationsNextDue(branchId, patientId),
        staffClinicDewormingList(branchId, patientId),
      ]);
      setSelectedPet(pet);
      setVaccinations(Array.isArray(vacList) ? vacList : []);
      setNextDue(Array.isArray(dueList) ? dueList : []);
      setDeworming(Array.isArray(dewList) ? dewList : []);
      if (!pet) setWorkspaceError("Patient was not found or is not visible to this branch.");
    } catch (error) {
      setSelectedPet(null);
      setVaccinations([]);
      setNextDue([]);
      setDeworming([]);
      setWorkspaceError(error?.message || "Failed to load vaccination workspace.");
    } finally {
      setWorkspaceLoading(false);
    }
  }, [branchId, patientId]);

  const loadVaccineTypes = useCallback(async () => {
    if (!branchId) return;
    setVaccineTypeError("");
    try {
      const items = await staffClinicVaccineTypes(branchId, { limit: 300 });
      setVaccineTypes(Array.isArray(items) ? items : []);
    } catch (error) {
      setVaccineTypes([]);
      setVaccineTypeError(error?.message || "Failed to load vaccine types.");
    }
  }, [branchId]);

  const loadReminders = useCallback(async () => {
    if (!branchId || !patientId) return;
    setRemindersLoading(true);
    setRemindersError("");
    try {
      let reminderParams = { petId: patientId };
      if (reminderFilter === "PENDING") reminderParams = { ...reminderParams, status: "PENDING" };
      if (reminderFilter === "OVERDUE") reminderParams = { ...reminderParams, overdueOnly: true };
      const data = await staffClinicVaccinationReminders(branchId, reminderParams);
      setReminders(Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      setReminders([]);
      setRemindersError(error?.message || "Failed to load vaccination reminders.");
    } finally {
      setRemindersLoading(false);
    }
  }, [branchId, patientId, reminderFilter]);

  const loadBillingOptions = useCallback(async () => {
    if (!branchId) return;
    setBillingOptionsLoading(true);
    setBillingOptionsError("");
    try {
      const items = await staffClinicVaccinationBillingOptions(branchId);
      setBillingOptions(Array.isArray(items) ? items : []);
    } catch (error) {
      setBillingOptions([]);
      setBillingOptionsError(error?.message || "Failed to load vaccination billing options.");
    } finally {
      setBillingOptionsLoading(false);
    }
  }, [branchId]);

  const loadStockCandidates = useCallback(
    async (vaccineTypeId) => {
      if (!branchId || !vaccineTypeId) {
        setStockCandidateState({
          mapping: { status: "UNMAPPED", vaccineTypeId: null, vaccineTypeName: "", matchStrategy: "none" },
          items: [],
        });
        setStockCandidatesError("");
        return;
      }
      setStockCandidatesLoading(true);
      setStockCandidatesError("");
      try {
        const data = await staffClinicVaccineStockCandidates(branchId, Number(vaccineTypeId), { limit: 20 });
        setStockCandidateState({
          mapping: data?.mapping || { status: "UNMAPPED", vaccineTypeId: Number(vaccineTypeId), vaccineTypeName: "", matchStrategy: "none" },
          items: Array.isArray(data?.items) ? data.items : [],
        });
      } catch (error) {
        setStockCandidateState({
          mapping: { status: "UNMAPPED", vaccineTypeId: Number(vaccineTypeId), vaccineTypeName: "", matchStrategy: "none" },
          items: [],
        });
        setStockCandidatesError(error?.message || "Failed to load stock candidates.");
      } finally {
        setStockCandidatesLoading(false);
      }
    },
    [branchId]
  );

  useEffect(() => {
    loadPatientWorkspace();
    loadVaccineTypes();
  }, [loadPatientWorkspace, loadVaccineTypes]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  useEffect(() => {
    if (adminForm.createBilling && billingOptions.length === 0 && !billingOptionsLoading && !billingOptionsError) {
      loadBillingOptions();
    }
  }, [adminForm.createBilling, billingOptions.length, billingOptionsLoading, billingOptionsError, loadBillingOptions]);

  useEffect(() => {
    const vaccineTypeId = adminForm.vaccineTypeId ? Number(adminForm.vaccineTypeId) : null;
    setAdminForm((prev) => ({ ...prev, batchId: "" }));
    loadStockCandidates(vaccineTypeId);
  }, [adminForm.vaccineTypeId, loadStockCandidates]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!adminForm.createBilling || !selectedBillingService) return;
    const variants = Array.isArray(selectedBillingService.pricingVariants) ? selectedBillingService.pricingVariants : [];
    const singleVariant = variants.length === 1 ? variants[0] : null;
    setAdminForm((prev) => {
      if (String(prev.serviceId) !== String(selectedBillingService.serviceId)) return prev;
      return {
        ...prev,
        pricingVariantId: singleVariant?.pricingVariantId != null ? String(singleVariant.pricingVariantId) : "",
        unitPrice: prev.unitPrice !== "" ? prev.unitPrice : selectedBillingService.price != null ? String(selectedBillingService.price) : "",
      };
    });
  }, [adminForm.createBilling, selectedBillingService]);

  async function handleVaccinationSubmit(event) {
    event.preventDefault();
    if (!patientId || !vacForm.vaccineTypeId) {
      setActionError("Choose a vaccine type.");
      return;
    }
    setSaving("vaccination");
    setActionError("");
    setSuccess("");
    setWorkflowWarnings([]);
    try {
      await staffClinicVaccinationRecord(branchId, {
        petId: patientId,
        vaccineTypeId: Number(vacForm.vaccineTypeId),
        administeredAt: vacForm.administeredAt || undefined,
        nextDueDate: vacForm.nextDueDate || undefined,
        batchNumber: vacForm.batchNumber || undefined,
        manufacturer: vacForm.manufacturer || undefined,
        notes: vacForm.notes || undefined,
      });
      setVacForm({ vaccineTypeId: "", administeredAt: toDateTimeLocal(), nextDueDate: "", batchNumber: "", manufacturer: "", notes: "" });
      setSuccess("Vaccination record saved.");
      await Promise.all([loadPatientWorkspace(), loadReminders()]);
    } catch (error) {
      setActionError(error?.message || "Failed to save vaccination record.");
    } finally {
      setSaving("");
    }
  }

  async function handleAdministerSubmit(event) {
    event.preventDefault();
    if (saving === "administer") return;
    if (!patientId || !adminForm.vaccineTypeId) {
      setActionError("Choose a vaccine type.");
      return;
    }
    if (!adminForm.batchId || !selectedStockCandidate) {
      setActionError(stockMapping.status === "UNMAPPED" ? "No mapped stock candidate found for the selected vaccine." : "Choose a valid stock batch.");
      return;
    }
    if (adminForm.createBilling) {
      if (!adminForm.serviceId) {
        setActionError("Choose a vaccination billing service or turn billing off.");
        return;
      }
      if (billingOptions.length === 0) {
        setActionError("No vaccination billing service is configured for this branch.");
        return;
      }
      if (adminForm.unitPrice === "" || Number.isNaN(Number(adminForm.unitPrice)) || Number(adminForm.unitPrice) < 0) {
        setActionError("Enter a valid non-negative billing price.");
        return;
      }
      if (adminForm.discountAmount !== "" && (Number.isNaN(Number(adminForm.discountAmount)) || Number(adminForm.discountAmount) < 0)) {
        setActionError("Enter a valid non-negative discount amount.");
        return;
      }
    }
    setSaving("administer");
    setActionError("");
    setSuccess("");
    setBillingResult(null);
    setWorkflowWarnings([]);
    const idempotencyKey =
      inFlightAdministerKeyRef.current ||
      createAdministerIdempotencyKey({
        branchId,
        petId: patientId,
        vaccineTypeId: Number(adminForm.vaccineTypeId),
        batchId: Number(adminForm.batchId),
      });
    inFlightAdministerKeyRef.current = idempotencyKey;
    try {
      const response = await staffClinicAdministerVaccination(branchId, {
        petId: patientId,
        vaccineTypeId: Number(adminForm.vaccineTypeId),
        batchId: Number(adminForm.batchId),
        idempotencyKey,
        administeredAt: adminForm.administeredAt || undefined,
        nextDueDate: adminForm.nextDueDate || undefined,
        notes: adminForm.notes || undefined,
        createBilling: adminForm.createBilling === true,
        visitId: adminForm.createBilling && adminForm.visitId ? Number(adminForm.visitId) : undefined,
        appointmentId: adminForm.createBilling && adminForm.appointmentId ? Number(adminForm.appointmentId) : undefined,
        serviceId: adminForm.createBilling && adminForm.serviceId ? Number(adminForm.serviceId) : undefined,
        pricingVariantId: adminForm.createBilling && adminForm.pricingVariantId ? Number(adminForm.pricingVariantId) : undefined,
        unitPrice: adminForm.createBilling && adminForm.unitPrice !== "" ? Number(adminForm.unitPrice) : undefined,
        quantity: adminForm.createBilling ? 1 : undefined,
        discountAmount: adminForm.createBilling && adminForm.discountAmount !== "" ? Number(adminForm.discountAmount) : undefined,
        billingNotes: adminForm.createBilling && adminForm.billingNotes ? adminForm.billingNotes : undefined,
      });
      setAdminForm({
        vaccineTypeId: "",
        batchId: "",
        administeredAt: toDateTimeLocal(),
        nextDueDate: "",
        notes: "",
        createBilling: false,
        visitId: "",
        appointmentId: "",
        serviceId: "",
        pricingVariantId: "",
        unitPrice: "",
        quantity: "1",
        discountAmount: "",
        billingNotes: "",
      });
      setBillingResult(response?.billing || { status: "SKIPPED", message: "Billing was not requested." });
      setSuccess(response?.idempotency?.replayed ? "This administration request was already processed. Showing the existing record." : "Vaccination administered and branch stock deducted.");
      await Promise.all([loadPatientWorkspace(), loadReminders()]);
      await loadStockCandidates(null);
    } catch (error) {
      setActionError(error?.message || "Failed to administer vaccination from stock.");
    } finally {
      inFlightAdministerKeyRef.current = null;
      setSaving("");
    }
  }

  async function handleDewormingSubmit(event) {
    event.preventDefault();
    if (!patientId || !dewForm.medicationName.trim()) {
      setActionError("Enter medication name.");
      return;
    }
    setSaving("deworming");
    setActionError("");
    setSuccess("");
    setWorkflowWarnings([]);
    try {
      await staffClinicDewormingRecord(branchId, {
        petId: patientId,
        medicationName: dewForm.medicationName.trim(),
        dosage: dewForm.dosage || undefined,
        weightAtTime: dewForm.weightAtTime ? Number(dewForm.weightAtTime) : undefined,
        nextDueDate: dewForm.nextDueDate || undefined,
        notes: dewForm.notes || undefined,
      });
      setDewForm({ medicationName: "", dosage: "", weightAtTime: "", nextDueDate: "", notes: "" });
      setSuccess("Deworming record saved.");
      await loadPatientWorkspace();
    } catch (error) {
      setActionError(error?.message || "Failed to save deworming record.");
    } finally {
      setSaving("");
    }
  }

  function openCorrectForm(record) {
    setVoidForm({ recordId: null, voidReason: "" });
    setAuditState({ recordId: null, loading: false, error: "", data: null });
    setCorrectForm({
      recordId: record.id,
      administeredAt: record?.administeredAt ? toDateTimeLocal(record.administeredAt) : toDateTimeLocal(),
      nextDueDate: record?.nextDueDate ? new Date(record.nextDueDate).toISOString().slice(0, 10) : "",
      notes: record?.notes || "",
      manufacturer: record?.manufacturer || "",
      batchNumber: record?.batchNumber || "",
      correctionReason: "",
    });
    setActionError("");
    setSuccess("");
  }

  function openVoidForm(record) {
    setCorrectForm({ recordId: null, administeredAt: "", nextDueDate: "", notes: "", manufacturer: "", batchNumber: "", correctionReason: "" });
    setAuditState({ recordId: null, loading: false, error: "", data: null });
    setVoidForm({ recordId: record.id, voidReason: "" });
    setActionError("");
    setSuccess("");
  }

  async function loadVaccinationAudit(recordId) {
    setCorrectForm({ recordId: null, administeredAt: "", nextDueDate: "", notes: "", manufacturer: "", batchNumber: "", correctionReason: "" });
    setVoidForm({ recordId: null, voidReason: "" });
    setAuditState({ recordId, loading: true, error: "", data: null });
    try {
      const data = await staffClinicVaccinationAudit(branchId, Number(recordId));
      setAuditState({ recordId, loading: false, error: "", data });
    } catch (error) {
      setAuditState({ recordId, loading: false, error: error?.message || "Failed to load vaccination audit history.", data: null });
    }
  }

  async function handleCorrectSubmit(event) {
    event.preventDefault();
    if (!correctForm.recordId || !correctForm.correctionReason.trim()) {
      setActionError("Correction reason is required.");
      return;
    }
    setSaving("correct");
    setActionError("");
    setSuccess("");
    setWorkflowWarnings([]);
    try {
      const response = await staffClinicCorrectVaccination(branchId, Number(correctForm.recordId), {
        administeredAt: correctForm.administeredAt || undefined,
        nextDueDate: correctForm.nextDueDate === "" ? null : correctForm.nextDueDate,
        notes: correctForm.notes,
        manufacturer: correctForm.manufacturer,
        batchNumber: correctForm.batchNumber,
        correctionReason: correctForm.correctionReason.trim(),
      });
      setWorkflowWarnings(warningObjectMessages(response?.warnings));
      const recordId = correctForm.recordId;
      setCorrectForm({ recordId: null, administeredAt: "", nextDueDate: "", notes: "", manufacturer: "", batchNumber: "", correctionReason: "" });
      setSuccess("Vaccination corrected.");
      await Promise.all([loadPatientWorkspace(), loadReminders()]);
      await loadVaccinationAudit(recordId);
    } catch (error) {
      setActionError(error?.message || "Failed to correct vaccination.");
    } finally {
      setSaving("");
    }
  }

  async function handleVoidSubmit(event) {
    event.preventDefault();
    if (!voidForm.recordId || !voidForm.voidReason.trim()) {
      setActionError("Void reason is required.");
      return;
    }
    setSaving("void");
    setActionError("");
    setSuccess("");
    setWorkflowWarnings([]);
    try {
      const response = await staffClinicVoidVaccination(branchId, Number(voidForm.recordId), { voidReason: voidForm.voidReason.trim() });
      const warningLines = warningObjectMessages(response?.warnings);
      setWorkflowWarnings(warningLines);
      const warnings = warningLines.length ? ` ${warningLines.join(" ")}` : "";
      const recordId = voidForm.recordId;
      setVoidForm({ recordId: null, voidReason: "" });
      setSuccess(response?.alreadyVoided ? `Vaccination was already voided.${warnings}` : `Vaccination voided.${warnings}`);
      await Promise.all([loadPatientWorkspace(), loadReminders()]);
      await loadVaccinationAudit(recordId);
    } catch (error) {
      setActionError(error?.message || "Failed to void vaccination.");
    } finally {
      setSaving("");
    }
  }

  if (ctxLoading) {
    return (
      <div className="py-40 px-3 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDenied missingPerm="clinic.patients.read" onBack={() => router.push(`/staff/branch/${branchId}/clinic`)} />;
  }

  if (!patientId) {
    return (
      <PageWorkspace>
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <Card title="Invalid patient link">
          <p className="text-muted mb-16">The patient id in the URL is not valid.</p>
          <Link href={`/staff/branch/${branchId}/clinic/vaccinations`} className="btn btn-sm btn-primary">
            Back to vaccination search
          </Link>
        </Card>
      </PageWorkspace>
    );
  }

  return (
    <PageWorkspace>
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <div className="d-flex align-items-start justify-content-between flex-wrap gap-12 mb-24">
        <div>
          <div className="d-flex align-items-center gap-12 flex-wrap">
            <Link href={`/staff/branch/${branchId}/clinic/vaccinations`} className="btn btn-outline-secondary btn-sm">
              Back to Vaccination Search
            </Link>
            <Link href={`/staff/branch/${branchId}/clinic/patients/${patientId}`} className="btn btn-outline-secondary btn-sm">
              Back to Patient Profile
            </Link>
            <h4 className="mb-0">Patient vaccination workspace</h4>
          </div>
          <p className="text-muted small mb-0 mt-8">Patient-specific vaccination, deworming, reminders, billing reference, and audit workflow.</p>
        </div>
        <span className={status.className}>{status.label}</span>
      </div>

      {success ? <div className="alert alert-success py-2">{success}</div> : null}
      {actionError ? <div className="alert alert-danger py-2">{actionError}</div> : null}
      {workflowWarnings.length > 0 ? (
        <div className="alert alert-warning py-2">
          {workflowWarnings.map((line, idx) => (
            <div key={`workflow-warning-${idx}`}>{line}</div>
          ))}
        </div>
      ) : null}

      {workspaceLoading ? (
        <div className="py-40 text-center text-muted">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-16 mb-0">Loading vaccination workspace...</p>
        </div>
      ) : workspaceError || !selectedPet ? (
        <Card title="Vaccination workspace">
          <p className="text-danger mb-16">{workspaceError || "Patient was not found."}</p>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={loadPatientWorkspace}>
              Retry
            </button>
            <Link href={`/staff/branch/${branchId}/clinic/vaccinations`} className="btn btn-sm btn-outline-secondary">
              Back to search
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <Card className="mb-24" title={selectedPet.name || `Pet #${selectedPet.id}`} subtitle={`Branch: ${branch?.name || branchId}`}>
            <div className="row g-3">
              <div className="col-md-4">
                <div className="border rounded-3 p-16 h-100 bg-white">
                  <p className="text-muted small mb-4">Patient</p>
                  <div className="fw-semibold">{selectedPet.name || `Pet #${selectedPet.id}`}</div>
                  <div className="small text-muted">Clinical ID: {selectedPet.id}</div>
                  <div className="small text-muted">Pet ID: {selectedPet.uniquePetId || "-"}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="border rounded-3 p-16 h-100 bg-white">
                  <p className="text-muted small mb-4">Signalment</p>
                  <div className="small text-muted">Species: {selectedPet.animalType?.name || selectedPet.animalTypeNameSnapshot || "-"}</div>
                  <div className="small text-muted">Breed: {selectedPet.breed?.name || selectedPet.breedNameSnapshot || "-"}</div>
                  <div className="small text-muted">Sex: {selectedPet.sex || "-"}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="border rounded-3 p-16 h-100 bg-white">
                  <p className="text-muted small mb-4">Owner</p>
                  <div className="fw-semibold">{ownerLabel(owner)}</div>
                  <div className="small text-muted">Phone: {owner?.phone || "-"}</div>
                  <div className="small text-muted">Owner ID: {owner?.userId || "-"}</div>
                </div>
              </div>
            </div>
          </Card>

          <div className="row g-3 mb-24">
            <div className="col-md-4">
              <div className="border rounded-3 bg-white shadow-sm p-16 h-100">
                <p className="text-muted small mb-8">Next due</p>
                <h5 className="mb-0">{nextDue.length ? formatDate(getNextDueDate(nextDue[0])) : "-"}</h5>
              </div>
            </div>
            <div className="col-md-4">
              <div className="border rounded-3 bg-white shadow-sm p-16 h-100">
                <p className="text-muted small mb-8">Due/overdue items</p>
                <h5 className="mb-0">{nextDue.length}</h5>
              </div>
            </div>
            <div className="col-md-4">
              <div className="border rounded-3 bg-white shadow-sm p-16 h-100">
                <p className="text-muted small mb-8">Vaccination records</p>
                <h5 className="mb-0">{vaccinations.length}</h5>
              </div>
            </div>
          </div>

          <ul className="nav nav-tabs flex-wrap mb-16">
            {WORKSPACE_TABS.map((tab) => (
              <li className="nav-item" key={tab.key}>
                <button type="button" className={`nav-link ${activeTab === tab.key ? "active" : ""}`} onClick={() => setActiveTab(tab.key)}>
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>

          {activeTab === "vaccination" ? (
            <div className="row gy-4">
              <div className="col-xl-7">
                <Card title="Vaccination history" subtitle="Branch-visible patient card">
                  <NextDuePanel nextDue={nextDue} />
                  <VaccinationHistoryTable
                    vaccinations={vaccinations}
                    branchId={branchId}
                    canWrite={canWrite}
                    saving={saving}
                    onAudit={loadVaccinationAudit}
                    onCorrect={openCorrectForm}
                    onVoid={openVoidForm}
                    readonlyActions
                  />
                  <CertificateTokens vaccinations={vaccinations} />
                </Card>
              </div>
              <div className="col-xl-5">
                <AdministerForm
                  branchId={branchId}
                  canWrite={canWrite}
                  canConfigureVaccineMapping={canConfigureVaccineMapping}
                  vaccineTypes={vaccineTypes}
                  vaccineTypeError={vaccineTypeError}
                  form={adminForm}
                  setForm={setAdminForm}
                  saving={saving}
                  onSubmit={handleAdministerSubmit}
                  stockCandidates={stockCandidates}
                  stockCandidatesLoading={stockCandidatesLoading}
                  stockCandidatesError={stockCandidatesError}
                  stockMapping={stockMapping}
                  stockCandidateMessage={stockCandidateMessage}
                  hasValidSelectedBatch={hasValidSelectedBatch}
                  billingOptions={billingOptions}
                  billingOptionsLoading={billingOptionsLoading}
                  billingOptionsError={billingOptionsError}
                  selectedBillingService={selectedBillingService}
                />
                <div className="mt-24">
                  <ManualVaccinationForm
                    canWrite={canWrite}
                    vaccineTypes={vaccineTypes}
                    vaccineTypeError={vaccineTypeError}
                    form={vacForm}
                    setForm={setVacForm}
                    saving={saving}
                    onSubmit={handleVaccinationSubmit}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "deworming" ? (
            <div className="row gy-4">
              <div className="col-xl-7">
                <Card title="Deworming history">
                  {deworming.length === 0 ? (
                    <p className="text-muted small mb-0">No deworming records found.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Medication</th>
                            <th>Administered</th>
                            <th>Next due</th>
                            <th>Weight</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deworming.map((record) => (
                            <tr key={record.id}>
                              <td>
                                <div className="fw-semibold">{record.medicationName}</div>
                                <div className="small text-muted">{record.dosage || ""}</div>
                              </td>
                              <td>{formatDate(record.administeredAt)}</td>
                              <td>{formatDate(record.nextDueDate)}</td>
                              <td>{record.weightAtTime ?? "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
              <div className="col-xl-5">
                <DewormingForm canWrite={canWrite} form={dewForm} setForm={setDewForm} saving={saving} onSubmit={handleDewormingSubmit} />
              </div>
            </div>
          ) : null}

          {activeTab === "reminders" ? (
            <Card title="Vaccination reminders" subtitle="Pet-specific reminder queue">
              <ReminderList
                reminderFilter={reminderFilter}
                setReminderFilter={setReminderFilter}
                reminders={reminders}
                remindersLoading={remindersLoading}
                remindersError={remindersError}
              />
            </Card>
          ) : null}

          {activeTab === "billing" ? (
            <Card title="Billing" subtitle="Linked order/invoice references from vaccination records">
              <BillingResultAlert billingResult={billingResult} branchId={branchId} />
              <p className="alert alert-secondary py-2 small">Billing cancel/refund automation is not implemented yet.</p>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Vaccination</th>
                      <th>Order</th>
                      <th>Invoice</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vaccinations.filter((record) => record.orderId != null || record.invoiceId != null).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-muted text-center py-24">No linked billing refs found.</td>
                      </tr>
                    ) : (
                      vaccinations
                        .filter((record) => record.orderId != null || record.invoiceId != null)
                        .map((record) => (
                          <tr key={`billing-${record.id}`}>
                            <td>{vaccineName(record)}</td>
                            <td>{record.orderId || "-"}</td>
                            <td>{record.invoiceId || "-"}</td>
                            <td>{record.status || "ACTIVE"}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {activeTab === "audit" ? (
            <Card title="Correction, void, and audit" subtitle="Stock reversal and billing cancellation/refund are not automatic.">
              <div className="alert alert-warning py-2 small">
                Stock reversal is not automatic. Billing cancellation/refund is not automatic. Use this panel only for clinical record correction, void, and audit review.
              </div>
              <VaccinationHistoryTable
                vaccinations={vaccinations}
                branchId={branchId}
                canWrite={canWrite}
                saving={saving}
                onAudit={loadVaccinationAudit}
                onCorrect={openCorrectForm}
                onVoid={openVoidForm}
                correctForm={correctForm}
                voidForm={voidForm}
                auditState={auditState}
                setCorrectForm={setCorrectForm}
                setVoidForm={setVoidForm}
                setAuditState={setAuditState}
                onCorrectSubmit={handleCorrectSubmit}
                onVoidSubmit={handleVoidSubmit}
              />
            </Card>
          ) : null}
        </>
      )}
    </PageWorkspace>
  );
}

function NextDuePanel({ nextDue }) {
  return (
    <div className="border rounded-3 p-12 mb-16 bg-light-subtle">
      <div className="fw-semibold mb-8">Next due</div>
      {nextDue.length === 0 ? (
        <p className="text-muted small mb-0">No upcoming due vaccines found.</p>
      ) : (
        <div className="row g-2">
          {nextDue.map((row, index) => {
            const record = getDueVaccination(row);
            return (
              <div className="col-md-6" key={`${record?.id || "due"}-${index}`}>
                <div className="border rounded-3 p-10 bg-white h-100">
                  <div className="fw-semibold small">{vaccineName(record)}</div>
                  <div className="small text-muted">Due {formatDate(getNextDueDate(row))}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CertificateTokens({ vaccinations }) {
  const tokenRecords = vaccinations.filter((record) => record?.certificateToken);
  return (
    <div className="mt-16">
      <h6>Certificate tokens</h6>
      {tokenRecords.length === 0 ? (
        <p className="text-muted small mb-0">No certificate tokens on file.</p>
      ) : (
        <div className="d-flex flex-wrap gap-8">
          {tokenRecords.map((record) => (
            <span key={`token-${record.id}`} className="badge bg-light text-dark border">
              {vaccineName(record)}: {record.certificateToken}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function VaccinationHistoryTable({
  vaccinations,
  branchId,
  canWrite,
  saving,
  onAudit,
  onCorrect,
  onVoid,
  readonlyActions = false,
  correctForm,
  voidForm,
  auditState,
  setCorrectForm,
  setVoidForm,
  setAuditState,
  onCorrectSubmit,
  onVoidSubmit,
}) {
  if (vaccinations.length === 0) return <p className="text-muted small mb-0">No vaccinations recorded.</p>;
  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>Vaccine</th>
            <th>Status</th>
            <th>Administered</th>
            <th>Next due</th>
            <th>Batch</th>
            <th>Certificate</th>
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vaccinations.map((record) => {
            const rowWarnings = buildRecordWarnings(record);
            const isVoided = record?.status === "VOIDED";
            const isForeignBranchRecord = record?.branchId != null && String(record.branchId) !== String(branchId);
            const isCorrectOpen = correctForm?.recordId === record.id;
            const isVoidOpen = voidForm?.recordId === record.id;
            const isAuditOpen = auditState?.recordId === record.id;
            return (
              <Fragment key={record.id}>
                <tr>
                  <td>
                    <div className="fw-semibold">{vaccineName(record)}</div>
                    <div className="d-flex flex-wrap gap-8 mt-4">
                      {record?.legacyRecord ? <span className="badge bg-light text-dark border">Legacy</span> : null}
                      {isForeignBranchRecord ? <span className="badge bg-light text-dark border">Other branch record</span> : null}
                      {rowWarnings.map((warning) => (
                        <span key={`${record.id}-${warning}`} className="badge bg-light text-dark border">{warning}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={vaccinationStatusClass(record?.status)}>{record?.status || "ACTIVE"}</span>
                    {isLegacyVaccinationRecord(record) ? <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle ms-1">LEGACY</span> : null}
                  </td>
                  <td>{formatDate(record.administeredAt)}</td>
                  <td>{formatDate(record.nextDueDate)}</td>
                  <td>
                    <div>{record.batchNumber || "-"}</div>
                    <div className="small text-muted">{record.manufacturer || ""}</div>
                  </td>
                  <td>{record.certificateToken ? <code className="small">{record.certificateToken}</code> : <span className="text-muted small">None</span>}</td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end flex-wrap gap-8">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onAudit(record.id)} disabled={isForeignBranchRecord}>
                        History
                      </button>
                      {!readonlyActions ? (
                        <>
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onCorrect(record)} disabled={!canWrite || isVoided || isForeignBranchRecord || saving === "correct" || saving === "void"}>
                            Correct
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onVoid(record)} disabled={!canWrite || isVoided || isForeignBranchRecord || saving === "correct" || saving === "void"}>
                            Void
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
                {!readonlyActions && isCorrectOpen ? (
                  <tr>
                    <td colSpan={7} className="bg-light">
                      <CorrectionForm form={correctForm} setForm={setCorrectForm} canWrite={canWrite} saving={saving} onSubmit={onCorrectSubmit} />
                    </td>
                  </tr>
                ) : null}
                {!readonlyActions && isVoidOpen ? (
                  <tr>
                    <td colSpan={7} className="bg-light">
                      <VoidForm record={record} form={voidForm} setForm={setVoidForm} canWrite={canWrite} saving={saving} onSubmit={onVoidSubmit} />
                    </td>
                  </tr>
                ) : null}
                {!readonlyActions && isAuditOpen ? (
                  <tr>
                    <td colSpan={7} className="bg-light">
                      <AuditPanel auditState={auditState} setAuditState={setAuditState} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AdministerForm({
  branchId,
  canWrite,
  canConfigureVaccineMapping,
  vaccineTypes,
  vaccineTypeError,
  form,
  setForm,
  saving,
  onSubmit,
  stockCandidates,
  stockCandidatesLoading,
  stockCandidatesError,
  stockMapping,
  stockCandidateMessage,
  hasValidSelectedBatch,
  billingOptions,
  billingOptionsLoading,
  billingOptionsError,
  selectedBillingService,
}) {
  const showStockSetupActions = form.vaccineTypeId && shouldShowStockSetupActions(stockMapping, stockCandidates.length);

  return (
    <Card title="Administer & deduct stock" subtitle="Branch batch-backed vaccination administration">
      {vaccineTypeError ? <div className="alert alert-warning py-2">{vaccineTypeError}</div> : null}
      <form onSubmit={onSubmit}>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label small text-muted">Vaccine type</label>
            <select className="form-select form-select-sm" value={form.vaccineTypeId} onChange={(event) => setForm((prev) => ({ ...prev, vaccineTypeId: event.target.value }))} disabled={vaccineTypes.length === 0 || !canWrite} required>
              <option value="">Choose vaccine</option>
              {vaccineTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.name}{type.targetAnimalType?.name ? ` - ${type.targetAnimalType.name}` : ""}</option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label small text-muted">Stock batch</label>
            <select className="form-select form-select-sm" value={form.batchId} onChange={(event) => setForm((prev) => ({ ...prev, batchId: event.target.value }))} disabled={!canWrite || !form.vaccineTypeId || stockCandidatesLoading || stockCandidates.length === 0} required>
              <option value="">{stockCandidatesLoading ? "Loading batches..." : stockCandidates.length === 0 ? "No valid branch batch" : "Choose branch batch"}</option>
              {stockCandidates.map((item) => <option key={item.batchId} value={String(item.batchId)}>{stockCandidateLabel(item)}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label small text-muted">Administered</label>
            <input type="datetime-local" className="form-control form-control-sm" value={form.administeredAt} onChange={(event) => setForm((prev) => ({ ...prev, administeredAt: event.target.value }))} disabled={!canWrite} />
          </div>
          <div className="col-md-6">
            <label className="form-label small text-muted">Next due</label>
            <input type="date" className="form-control form-control-sm" value={form.nextDueDate} onChange={(event) => setForm((prev) => ({ ...prev, nextDueDate: event.target.value }))} disabled={!canWrite} />
          </div>
          <div className="col-12">
            <label className="form-label small text-muted">Notes</label>
            <textarea className="form-control form-control-sm" rows={3} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} disabled={!canWrite} />
          </div>
          <div className="col-12">
            <div className="border rounded-3 p-16 bg-light-subtle">
              <div className="form-check mb-8">
                <input id="vaccination-billing-toggle" type="checkbox" className="form-check-input" checked={form.createBilling} onChange={(event) => setForm((prev) => ({ ...prev, createBilling: event.target.checked, serviceId: event.target.checked ? prev.serviceId : "", pricingVariantId: event.target.checked ? prev.pricingVariantId : "", unitPrice: event.target.checked ? prev.unitPrice : "", quantity: "1", discountAmount: event.target.checked ? prev.discountAmount : "", visitId: event.target.checked ? prev.visitId : "", appointmentId: event.target.checked ? prev.appointmentId : "", billingNotes: event.target.checked ? prev.billingNotes : "" }))} disabled={!canWrite} />
                <label htmlFor="vaccination-billing-toggle" className="form-check-label fw-semibold">Create clinic bill/invoice for this vaccination</label>
              </div>
              <p className="small text-muted mb-0">Billing is service charge only. Vaccine stock was already deducted by administer flow.</p>
            </div>
          </div>
        </div>

        {form.createBilling ? <BillingFields form={form} setForm={setForm} canWrite={canWrite} billingOptions={billingOptions} billingOptionsLoading={billingOptionsLoading} billingOptionsError={billingOptionsError} selectedBillingService={selectedBillingService} /> : null}

        {form.vaccineTypeId ? (
          <div className="mt-16">
            {stockCandidatesError ? <div className="alert alert-danger py-2 mb-12">{stockCandidatesError}</div> : null}
            <div className={mappingAlertClass(stockMapping.status)}>
              Mapping status: <strong>{stockMapping.status}</strong>
              {stockMapping.matchStrategy && stockMapping.matchStrategy !== "none" ? ` - ${stockMapping.matchStrategy}` : ""}
            </div>
            <div className="border rounded-3 p-12 bg-light-subtle mt-12">
              <div className="small text-muted">Candidate count: <strong>{stockCandidates.length}</strong></div>
              <p className="small mb-0 mt-2">{stockCandidateMessage}</p>
            </div>
            {showStockSetupActions ? (
              <div className="border rounded-3 p-12 mt-12">
                <p className="small text-muted mb-2">Ask owner/admin to configure Vaccine Mapping when this branch cannot resolve the vaccine to stock.</p>
                <div className="d-flex flex-wrap gap-2">
                  {canConfigureVaccineMapping ? (
                    <Link href={`/owner/clinic/${branchId}/catalog/vaccine-mappings`} className="btn btn-sm btn-outline-primary">
                      Configure Mapping
                    </Link>
                  ) : (
                    <span className="btn btn-sm btn-outline-primary disabled" aria-disabled="true">
                      Configure Mapping
                    </span>
                  )}
                  <Link href={`/staff/branch/${branchId}/clinic/items`} className="btn btn-sm btn-primary">
                    Receive Stock
                  </Link>
                  <Link href={`/staff/branch/${branchId}/clinic/items`} className="btn btn-sm btn-outline-secondary">
                    View Stock
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="d-flex justify-content-end mt-16">
          <button type="submit" className="btn btn-sm btn-primary" disabled={!canWrite || saving === "administer" || !form.vaccineTypeId || !hasValidSelectedBatch || (form.createBilling && (!form.serviceId || billingOptions.length === 0 || form.unitPrice === "" || Number.isNaN(Number(form.unitPrice)) || Number(form.unitPrice) < 0))}>
            {saving === "administer" ? "Administering..." : "Administer & Deduct Stock"}
          </button>
        </div>
      </form>
      {!canWrite ? <p className="text-muted small mt-12 mb-0">Read-only access for your current permissions.</p> : null}
    </Card>
  );
}

function BillingFields({ form, setForm, canWrite, billingOptions, billingOptionsLoading, billingOptionsError, selectedBillingService }) {
  return (
    <div className="border rounded-3 p-16 mt-16">
      <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap mb-12">
        <div>
          <h6 className="mb-4">Billing</h6>
          <p className="text-muted small mb-0">Optional clinic charge linked to this vaccination. No product sale lines are created here.</p>
        </div>
        {billingOptionsLoading ? <span className="small text-muted">Loading services...</span> : null}
      </div>
      {billingOptionsError ? <div className="alert alert-warning py-2 mb-12">{billingOptionsError}</div> : null}
      {!billingOptionsLoading && billingOptions.length === 0 ? <div className="alert alert-warning py-2 mb-12">No vaccination billing services are configured for this branch yet.</div> : null}
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label small text-muted">Vaccination service</label>
          <select className="form-select form-select-sm" value={form.serviceId} onChange={(event) => {
            const nextServiceId = event.target.value;
            const option = billingOptions.find((service) => String(service.serviceId) === String(nextServiceId));
            const variants = Array.isArray(option?.pricingVariants) ? option.pricingVariants : [];
            const singleVariant = variants.length === 1 ? variants[0] : null;
            setForm((prev) => ({ ...prev, serviceId: nextServiceId, pricingVariantId: singleVariant?.pricingVariantId != null ? String(singleVariant.pricingVariantId) : "", unitPrice: option?.price != null ? String(option.price) : "" }));
          }} disabled={!canWrite || billingOptionsLoading || billingOptions.length === 0}>
            <option value="">{billingOptionsLoading ? "Loading services..." : billingOptions.length === 0 ? "No vaccination service configured" : "Choose service"}</option>
            {billingOptions.map((service) => <option key={service.serviceId} value={service.serviceId}>{service.name} {service.price != null ? `- ${formatMoney(service.price)}` : ""}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label small text-muted">Pricing variant</label>
          <select className="form-select form-select-sm" value={form.pricingVariantId} onChange={(event) => {
            const nextVariantId = event.target.value;
            const variant = (selectedBillingService?.pricingVariants || []).find((item) => String(item.pricingVariantId) === String(nextVariantId));
            setForm((prev) => ({ ...prev, pricingVariantId: nextVariantId, unitPrice: variant?.price != null ? String(variant.price) : prev.unitPrice }));
          }} disabled={!canWrite || !selectedBillingService || (selectedBillingService?.pricingVariants || []).length === 0}>
            <option value="">{(selectedBillingService?.pricingVariants || []).length === 0 ? "No pricing variant" : "Choose pricing variant"}</option>
            {(selectedBillingService?.pricingVariants || []).map((variant) => <option key={variant.pricingVariantId} value={variant.pricingVariantId}>{variant.species || "All species"}{variant.sex ? ` / ${variant.sex}` : ""}{variant.price != null ? ` - ${formatMoney(variant.price)}` : ""}</option>)}
          </select>
        </div>
        <div className="col-md-4"><label className="form-label small text-muted">Unit price</label><input type="number" min="0" step="0.01" className="form-control form-control-sm" value={form.unitPrice} onChange={(event) => setForm((prev) => ({ ...prev, unitPrice: event.target.value }))} disabled={!canWrite} /></div>
        <div className="col-md-4"><label className="form-label small text-muted">Quantity</label><input type="number" className="form-control form-control-sm" value={form.quantity} disabled readOnly /></div>
        <div className="col-md-4"><label className="form-label small text-muted">Discount amount</label><input type="number" min="0" step="0.01" className="form-control form-control-sm" value={form.discountAmount} onChange={(event) => setForm((prev) => ({ ...prev, discountAmount: event.target.value }))} disabled={!canWrite} /></div>
        <div className="col-md-6"><label className="form-label small text-muted">Visit ID (optional)</label><input type="number" min="1" className="form-control form-control-sm" value={form.visitId} onChange={(event) => setForm((prev) => ({ ...prev, visitId: event.target.value }))} disabled={!canWrite} /></div>
        <div className="col-md-6"><label className="form-label small text-muted">Appointment ID (optional)</label><input type="number" min="1" className="form-control form-control-sm" value={form.appointmentId} onChange={(event) => setForm((prev) => ({ ...prev, appointmentId: event.target.value }))} disabled={!canWrite} /></div>
        <div className="col-12"><label className="form-label small text-muted">Billing notes</label><textarea className="form-control form-control-sm" rows={2} value={form.billingNotes} onChange={(event) => setForm((prev) => ({ ...prev, billingNotes: event.target.value }))} disabled={!canWrite} /></div>
      </div>
    </div>
  );
}

function ManualVaccinationForm({ canWrite, vaccineTypes, vaccineTypeError, form, setForm, saving, onSubmit }) {
  return (
    <Card title="Manual / legacy vaccination record" subtitle="No stock deduction and no billing">
      {vaccineTypeError ? <div className="alert alert-warning py-2">{vaccineTypeError}</div> : null}
      <form onSubmit={onSubmit}>
        <div className="row g-3">
          <div className="col-md-6"><label className="form-label small text-muted">Vaccine type</label><select className="form-select form-select-sm" value={form.vaccineTypeId} onChange={(event) => setForm((prev) => ({ ...prev, vaccineTypeId: event.target.value }))} disabled={vaccineTypes.length === 0 || !canWrite} required><option value="">Choose vaccine</option>{vaccineTypes.map((type) => <option key={type.id} value={type.id}>{type.name}{type.targetAnimalType?.name ? ` - ${type.targetAnimalType.name}` : ""}</option>)}</select></div>
          <div className="col-md-6"><label className="form-label small text-muted">Administered</label><input type="datetime-local" className="form-control form-control-sm" value={form.administeredAt} onChange={(event) => setForm((prev) => ({ ...prev, administeredAt: event.target.value }))} disabled={!canWrite} /></div>
          <div className="col-md-6"><label className="form-label small text-muted">Next due</label><input type="date" className="form-control form-control-sm" value={form.nextDueDate} onChange={(event) => setForm((prev) => ({ ...prev, nextDueDate: event.target.value }))} disabled={!canWrite} /></div>
          <div className="col-md-6"><label className="form-label small text-muted">Batch number</label><input type="text" className="form-control form-control-sm" value={form.batchNumber} onChange={(event) => setForm((prev) => ({ ...prev, batchNumber: event.target.value }))} disabled={!canWrite} /></div>
          <div className="col-md-6"><label className="form-label small text-muted">Manufacturer</label><input type="text" className="form-control form-control-sm" value={form.manufacturer} onChange={(event) => setForm((prev) => ({ ...prev, manufacturer: event.target.value }))} disabled={!canWrite} /></div>
          <div className="col-12"><label className="form-label small text-muted">Notes</label><textarea className="form-control form-control-sm" rows={3} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} disabled={!canWrite} /></div>
        </div>
        <div className="d-flex justify-content-end mt-16"><button type="submit" className="btn btn-sm btn-outline-secondary" disabled={!canWrite || saving === "vaccination" || vaccineTypes.length === 0}>{saving === "vaccination" ? "Saving..." : "Save manual record"}</button></div>
      </form>
    </Card>
  );
}

function DewormingForm({ canWrite, form, setForm, saving, onSubmit }) {
  return (
    <Card title="Add deworming record" subtitle="Optional preventive care">
      <form onSubmit={onSubmit}>
        <div className="row g-3">
          <div className="col-12"><label className="form-label small text-muted">Medication</label><input type="text" className="form-control form-control-sm" value={form.medicationName} onChange={(event) => setForm((prev) => ({ ...prev, medicationName: event.target.value }))} disabled={!canWrite} required /></div>
          <div className="col-md-6"><label className="form-label small text-muted">Dosage</label><input type="text" className="form-control form-control-sm" value={form.dosage} onChange={(event) => setForm((prev) => ({ ...prev, dosage: event.target.value }))} disabled={!canWrite} /></div>
          <div className="col-md-6"><label className="form-label small text-muted">Weight</label><input type="number" step="0.01" className="form-control form-control-sm" value={form.weightAtTime} onChange={(event) => setForm((prev) => ({ ...prev, weightAtTime: event.target.value }))} disabled={!canWrite} /></div>
          <div className="col-12"><label className="form-label small text-muted">Next due</label><input type="date" className="form-control form-control-sm" value={form.nextDueDate} onChange={(event) => setForm((prev) => ({ ...prev, nextDueDate: event.target.value }))} disabled={!canWrite} /></div>
          <div className="col-12"><label className="form-label small text-muted">Notes</label><textarea className="form-control form-control-sm" rows={3} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} disabled={!canWrite} /></div>
        </div>
        <div className="d-flex justify-content-end mt-16"><button type="submit" className="btn btn-sm btn-outline-primary" disabled={!canWrite || saving === "deworming"}>{saving === "deworming" ? "Saving..." : "Save deworming"}</button></div>
      </form>
    </Card>
  );
}

function ReminderList({ reminderFilter, setReminderFilter, reminders, remindersLoading, remindersError }) {
  return (
    <>
      <div className="d-flex flex-wrap gap-8 mb-12">
        {["PENDING", "OVERDUE", "ALL"].map((filter) => (
          <button key={filter} type="button" className={`btn btn-sm ${reminderFilter === filter ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setReminderFilter(filter)}>
            {filter === "ALL" ? "All" : filter.charAt(0) + filter.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {remindersError ? <div className="alert alert-danger py-2">{remindersError}</div> : null}
      {remindersLoading ? <div className="py-24 text-center text-muted">Loading reminders...</div> : reminders.length === 0 ? <div className="py-24 text-center text-muted">No reminders found for this filter.</div> : (
        <div className="table-responsive"><table className="table table-sm align-middle mb-0"><thead className="table-light"><tr><th>Pet</th><th>Owner</th><th>Vaccine</th><th>Due date</th><th>Stage</th><th>Status</th><th>Scheduled for</th></tr></thead><tbody>{reminders.map((item) => <tr key={item.id}><td>{item.pet?.name || "-"}</td><td>{reminderOwnerLabel(item.owner)}</td><td>{item.vaccineName || "-"}</td><td>{formatDate(item.dueDate)}</td><td>{item.stage || "-"}</td><td>{item.status || "-"}</td><td>{formatDateTime(item.scheduledFor)}</td></tr>)}</tbody></table></div>
      )}
    </>
  );
}

function BillingResultAlert({ billingResult, branchId }) {
  if (!billingResult) return <p className="text-muted small">Latest submit billing status appears here after stock-backed administration.</p>;
  return (
    <div className={`alert py-2 ${billingResult.status === "CREATED" ? "alert-info" : billingResult.status === "FAILED" ? "alert-warning" : "alert-secondary"}`}>
      <div className="fw-semibold">Billing {billingResult.status}</div>
      <div className="small">{billingResult.message || "No billing message returned."}{billingResult.orderId ? ` Order #${billingResult.orderId}.` : ""}{billingResult.amount != null ? ` Amount: ${formatMoney(billingResult.amount)}.` : ""}</div>
      {billingResult.orderId ? <Link href={`/staff/branch/${branchId}/clinic/billing${billingResult.visitId ? `?visitId=${billingResult.visitId}` : ""}`} className="small text-decoration-underline">Open billing</Link> : null}
    </div>
  );
}

function CorrectionForm({ form, setForm, canWrite, saving, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="p-12">
      <div className="d-flex justify-content-between align-items-center mb-12">
        <div><div className="fw-semibold">Correct vaccination</div><div className="small text-muted">Only safe fields can be corrected. Inventory and billing refs stay locked.</div></div>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setForm({ recordId: null, administeredAt: "", nextDueDate: "", notes: "", manufacturer: "", batchNumber: "", correctionReason: "" })}>Close</button>
      </div>
      <div className="row g-3">
        <div className="col-md-6"><label className="form-label small text-muted">Administered</label><input type="datetime-local" className="form-control form-control-sm" value={form.administeredAt} onChange={(event) => setForm((prev) => ({ ...prev, administeredAt: event.target.value }))} disabled={!canWrite} /></div>
        <div className="col-md-6"><label className="form-label small text-muted">Next due</label><input type="date" className="form-control form-control-sm" value={form.nextDueDate} onChange={(event) => setForm((prev) => ({ ...prev, nextDueDate: event.target.value }))} disabled={!canWrite} /></div>
        <div className="col-md-6"><label className="form-label small text-muted">Manufacturer</label><input type="text" className="form-control form-control-sm" value={form.manufacturer} onChange={(event) => setForm((prev) => ({ ...prev, manufacturer: event.target.value }))} disabled={!canWrite} /></div>
        <div className="col-md-6"><label className="form-label small text-muted">Batch number snapshot</label><input type="text" className="form-control form-control-sm" value={form.batchNumber} onChange={(event) => setForm((prev) => ({ ...prev, batchNumber: event.target.value }))} disabled={!canWrite} /></div>
        <div className="col-12"><label className="form-label small text-muted">Notes</label><textarea className="form-control form-control-sm" rows={3} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} disabled={!canWrite} /></div>
        <div className="col-12"><label className="form-label small text-muted">Correction reason</label><textarea className="form-control form-control-sm" rows={2} value={form.correctionReason} onChange={(event) => setForm((prev) => ({ ...prev, correctionReason: event.target.value }))} disabled={!canWrite} minLength={3} required /></div>
      </div>
      <div className="d-flex justify-content-end mt-16"><button type="submit" className="btn btn-sm btn-primary" disabled={!canWrite || saving === "correct"}>{saving === "correct" ? "Saving..." : "Save correction"}</button></div>
    </form>
  );
}

function VoidForm({ record, form, setForm, canWrite, saving, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="p-12">
      <div className="d-flex justify-content-between align-items-center mb-12">
        <div><div className="fw-semibold text-danger">Void vaccination</div><div className="small text-muted">This phase does not reverse stock or cancel billing automatically.</div></div>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setForm({ recordId: null, voidReason: "" })}>Close</button>
      </div>
      {record?.stockLedgerId != null || record?.orderId != null || record?.invoiceId != null ? <div className="alert alert-warning py-2">{record?.stockLedgerId != null ? "Stock remains deducted. " : ""}{record?.orderId != null || record?.invoiceId != null ? "Billing remains linked. " : ""}Use future reversal/refund workflows for those follow-up actions.</div> : null}
      <label className="form-label small text-muted">Void reason</label>
      <textarea className="form-control form-control-sm" rows={3} value={form.voidReason} onChange={(event) => setForm((prev) => ({ ...prev, voidReason: event.target.value }))} disabled={!canWrite} minLength={3} required />
      <div className="d-flex justify-content-end mt-16"><button type="submit" className="btn btn-sm btn-danger" disabled={!canWrite || saving === "void"}>{saving === "void" ? "Voiding..." : "Confirm void"}</button></div>
    </form>
  );
}

function AuditPanel({ auditState, setAuditState }) {
  return (
    <div className="p-12">
      <div className="d-flex justify-content-between align-items-center mb-12">
        <div><div className="fw-semibold">Audit & history</div><div className="small text-muted">Clinical lifecycle, durable refs, and event timeline.</div></div>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setAuditState({ recordId: null, loading: false, error: "", data: null })}>Close</button>
      </div>
      {auditState.loading ? <div className="text-muted small">Loading audit history...</div> : null}
      {auditState.error ? <div className="alert alert-danger py-2">{auditState.error}</div> : null}
      {auditState.data ? (
        <div className="row g-3">
          <div className="col-lg-4"><div className="border rounded-3 p-12 h-100 bg-white"><div className="fw-semibold mb-8">Summary</div><div className="small text-muted">Created: {formatDateTime(auditState.data?.created?.createdAt)}</div><div className="small text-muted">Corrected: {formatDateTime(auditState.data?.correction?.correctedAt)}</div><div className="small text-muted">Voided: {formatDateTime(auditState.data?.void?.voidedAt)}</div><div className="small text-muted mt-8">Status: {auditState.data?.vaccination?.status || "ACTIVE"}</div></div></div>
          <div className="col-lg-4"><div className="border rounded-3 p-12 h-100 bg-white"><div className="fw-semibold mb-8">Durable refs</div><div className="small text-muted">Stock ledger: {auditState.data?.refs?.stockLedgerId || "-"}</div><div className="small text-muted">Order: {auditState.data?.refs?.orderId || "-"}</div><div className="small text-muted">Invoice: {auditState.data?.refs?.invoiceId || "-"}</div><div className="small text-muted">Batch ref: {auditState.data?.refs?.inventoryBatchId || "-"}</div></div></div>
          <div className="col-lg-4"><div className="border rounded-3 p-12 h-100 bg-white"><div className="fw-semibold mb-8">Warnings</div>{(auditState.data?.warnings || []).length === 0 ? <div className="small text-muted">No additional warnings.</div> : (auditState.data?.warnings || []).map((warning, index) => <div key={`audit-warning-${index}`} className="small text-muted">{warning}</div>)}{auditState.data?.warningSummary?.stock?.reversalRequired ? <div className="small text-danger mt-8">Stock reversal pending.</div> : null}{auditState.data?.warningSummary?.billing?.actionRequired ? <div className="small text-danger">Billing action pending.</div> : null}{auditState.data?.legacyWarning ? <div className="small text-warning">{auditState.data.legacyWarning}</div> : null}</div></div>
          <div className="col-12"><div className="border rounded-3 p-12 bg-white"><div className="fw-semibold mb-8">Timeline</div>{(auditState.data?.events || []).length === 0 ? <div className="small text-muted">No audit events recorded yet for this vaccination.</div> : <div className="d-flex flex-column gap-8">{(auditState.data?.events || []).map((eventItem) => <div key={eventItem.id} className="border rounded-3 p-8"><div className="d-flex justify-content-between gap-12 flex-wrap"><div className="fw-semibold">{eventItem.eventType}</div><div className="small text-muted">{formatDateTime(eventItem.createdAt)}</div></div><div className="small text-muted">Actor: {eventItem.actorRole || "STAFF"}{eventItem.actorUserId ? ` #${eventItem.actorUserId}` : ""}</div>{eventItem.metadata ? <pre className="small bg-light border rounded p-8 mt-8 mb-0" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(eventItem.metadata, null, 2)}</pre> : null}</div>)}</div>}</div></div>
        </div>
      ) : null}
    </div>
  );
}
