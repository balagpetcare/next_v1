"use client";

import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useBranchContext } from "@/lib/useBranchContext";
import {
  staffClinicDoctors,
  staffClinicGenerateInjectionToken,
  staffClinicMedicinePoliciesList,
  staffClinicPrescriptionsByVisit,
  staffClinicServices,
  staffClinicTreatmentCourseSchedule,
  staffClinicTreatmentCoursesList,
  staffClinicVialSessionsList,
  staffClinicVisitGet,
  staffClinicVisitsList,
} from "@/lib/api";
import { uploadMedia } from "@/src/services/mediaUpload";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";
import { LoadingState, PageHeader } from "@/src/components/dashboard";
import type { InjectionEncounterKind } from "@/src/types/clinicMedicineControl";
import { ENCOUNTER_FLOW_OPTIONS } from "../../_components/injection-tokens/constants";
import { MedicineTable } from "../../_components/injection-tokens/MedicineTable";
import { defaultsFromMedicinePolicyRow, policyVariantId } from "../../_components/injection-tokens/policyUtils";
import { PatientSearch } from "../../_components/injection-tokens/PatientSearch";
import { PaymentPanel } from "../../_components/injection-tokens/PaymentPanel";
import { SummaryPanel } from "../../_components/injection-tokens/SummaryPanel";
import {
  clinicMedicineLinesTotal,
  newMedLineDraft,
  outsideLineNotesForToken,
  parseMoney,
} from "../../_components/injection-tokens/medicineLineUtils";
import type { EncounterFlowType, MedLineDraft, SelectedPetContext, VisitSummary } from "../../_components/injection-tokens/types";

export default function InjectionTokenCreatePage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params?.branchId]);
  const { branch, myAccess, isLoading } = useBranchContext(branchId);
  const permissions = Array.isArray(myAccess?.permissions) ? myAccess.permissions : [];
  const canGenerate = permissions.includes("injection.token.generate");

  const [policies, setPolicies] = useState<unknown[]>([]);
  const [medicationLineDrafts, setMedicationLineDrafts] = useState<MedLineDraft[]>(() => [newMedLineDraft()]);
  const [encounterFlowType, setEncounterFlowType] = useState<EncounterFlowType>("INTERNAL_VISIT");
  const [externalPrescriberName, setExternalPrescriberName] = useState("");
  const [externalPrescriberClinic, setExternalPrescriberClinic] = useState("");
  const [externalRxNotes, setExternalRxNotes] = useState("");
  const [externalRxEvidenceUrl, setExternalRxEvidenceUrl] = useState("");
  const [serviceChargeAmount, setServiceChargeAmount] = useState("");
  const [consumablesChargeAmount, setConsumablesChargeAmount] = useState("");
  const [expiresInHours, setExpiresInHours] = useState("24");
  const [creating, setCreating] = useState(false);

  const [billingCheckoutEnabled, setBillingCheckoutEnabled] = useState(false);
  const [walkDoctorId, setWalkDoctorId] = useState("");
  const [selectedPetContext, setSelectedPetContext] = useState<SelectedPetContext | null>(null);
  const [variantListFilter, setVariantListFilter] = useState("");
  const [billingServiceId, setBillingServiceId] = useState("");
  const [billingConsumablesServiceId, setBillingConsumablesServiceId] = useState("");
  const [markPaidCheckout, setMarkPaidCheckout] = useState(true);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState("CASH");
  const [branchServices, setBranchServices] = useState<{ id: number; name: string; price?: number }[]>([]);
  const [branchDoctors, setBranchDoctors] = useState<{ id: number; displayName: string }[]>([]);
  const [evidenceUploading, setEvidenceUploading] = useState(false);

  const [visitId, setVisitId] = useState("");
  const [visitSummary, setVisitSummary] = useState<VisitSummary | null>(null);
  const [visitLoading, setVisitLoading] = useState(false);
  const [internalVisits, setInternalVisits] = useState<unknown[]>([]);
  const [internalVisitsLoading, setInternalVisitsLoading] = useState(false);
  const [visitSearchQuery, setVisitSearchQuery] = useState("");
  const [visitSearchResults, setVisitSearchResults] = useState<unknown[]>([]);
  const [visitSearchLoading, setVisitSearchLoading] = useState(false);
  const [visitSearchOpen, setVisitSearchOpen] = useState(false);

  const [prescriptions, setPrescriptions] = useState<unknown[]>([]);
  const [treatmentCourses, setTreatmentCourses] = useState<unknown[]>([]);
  const [courseDays, setCourseDays] = useState<unknown[]>([]);
  const [prescriptionId, setPrescriptionId] = useState("");
  const [treatmentCourseId, setTreatmentCourseId] = useState("");
  const [treatmentDayId, setTreatmentDayId] = useState("");
  const [rxApplyLineKey, setRxApplyLineKey] = useState("");
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseScheduleLoading, setCourseScheduleLoading] = useState(false);

  const [vialSessionsByVariant, setVialSessionsByVariant] = useState<Record<string, unknown[]>>({});

  useEffect(() => {
    if (!branchId || !canGenerate) return;
    staffClinicMedicinePoliciesList(branchId).then(setPolicies).catch(() => setPolicies([]));
    staffClinicServices(branchId).then(setBranchServices).catch(() => setBranchServices([]));
    staffClinicDoctors(branchId).then(setBranchDoctors).catch(() => setBranchDoctors([]));
  }, [branchId, canGenerate]);

  useEffect(() => {
    if (!branchId || !visitSearchQuery.trim()) {
      setVisitSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      setVisitSearchLoading(true);
      staffClinicVisitsList(branchId, { search: visitSearchQuery.trim(), limit: 20 })
        .then((r) => setVisitSearchResults((r as { visits?: unknown[] })?.visits ?? []))
        .catch(() => setVisitSearchResults([]))
        .finally(() => setVisitSearchLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [branchId, visitSearchQuery]);

  useEffect(() => {
    if (!branchId || !visitSummary?.id) {
      setPrescriptions([]);
      setPrescriptionId("");
      return;
    }
    setPrescriptionsLoading(true);
    staffClinicPrescriptionsByVisit(branchId, visitSummary.id)
      .then((list) => setPrescriptions(Array.isArray(list) ? list : []))
      .catch(() => setPrescriptions([]))
      .finally(() => setPrescriptionsLoading(false));
    setPrescriptionId("");
  }, [branchId, visitSummary?.id]);

  useEffect(() => {
    if (!branchId || visitSummary?.patientId == null) {
      setTreatmentCourses([]);
      setTreatmentCourseId("");
      setTreatmentDayId("");
      setCourseDays([]);
      return;
    }
    setCoursesLoading(true);
    staffClinicTreatmentCoursesList(branchId, { patientId: visitSummary.patientId, take: 50 })
      .then((r) => setTreatmentCourses((r as { list?: unknown[] })?.list ?? []))
      .catch(() => setTreatmentCourses([]))
      .finally(() => setCoursesLoading(false));
    setTreatmentCourseId("");
    setTreatmentDayId("");
    setCourseDays([]);
  }, [branchId, visitSummary?.patientId]);

  useEffect(() => {
    if (!branchId || !treatmentCourseId) {
      setCourseDays([]);
      setTreatmentDayId("");
      return;
    }
    setCourseScheduleLoading(true);
    staffClinicTreatmentCourseSchedule(branchId, Number(treatmentCourseId))
      .then((c) => setCourseDays((c as { days?: unknown[] })?.days ?? []))
      .catch(() => setCourseDays([]))
      .finally(() => setCourseScheduleLoading(false));
    setTreatmentDayId("");
  }, [branchId, treatmentCourseId]);

  const vialFetchKey = useMemo(() => {
    const ids = new Set<string>();
    for (const d of medicationLineDrafts) {
      if (d.medicineSource === "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT") continue;
      const n = Number(d.variantId);
      if (Number.isFinite(n) && n > 0) ids.add(String(n));
    }
    return [...ids].sort((a, b) => Number(a) - Number(b)).join(",");
  }, [medicationLineDrafts]);

  useEffect(() => {
    if (!branchId || !vialFetchKey) {
      setVialSessionsByVariant({});
      return;
    }
    let cancelled = false;
    const ids = vialFetchKey.split(",").map((s) => Number(s)).filter((n) => n > 0);
    (async () => {
      const next: Record<string, unknown[]> = {};
      await Promise.all(
        ids.map(async (vid) => {
          try {
            const r = await staffClinicVialSessionsList(branchId, { variantId: vid, status: "ACTIVE", take: 30 });
            next[String(vid)] = (r as { list?: unknown[] })?.list ?? [];
          } catch {
            next[String(vid)] = [];
          }
        })
      );
      if (!cancelled) setVialSessionsByVariant(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId, vialFetchKey]);

  useEffect(() => {
    if (!branchId || encounterFlowType === "WALK_IN_EXTERNAL" || !selectedPetContext) {
      setInternalVisits([]);
      return;
    }
    setInternalVisitsLoading(true);
    setVisitId("");
    setVisitSummary(null);
    staffClinicVisitsList(branchId, {
      petId: selectedPetContext.petId,
      limit: 50,
      sortField: "id",
      sortDir: "desc",
    })
      .then((r) => setInternalVisits(Array.isArray((r as { visits?: unknown[] })?.visits) ? (r as { visits: unknown[] }).visits : []))
      .catch(() => setInternalVisits([]))
      .finally(() => setInternalVisitsLoading(false));
  }, [branchId, encounterFlowType, selectedPetContext?.petId]);

  useEffect(() => {
    if (encounterFlowType === "WALK_IN_EXTERNAL" || internalVisitsLoading || !selectedPetContext) return;
    if (internalVisits.length !== 1) return;
    const v = internalVisits[0] as Record<string, unknown>;
    setVisitId(String(v.id));
    setVisitSummary({
      id: Number(v.id),
      patientId: v.patientId != null ? Number(v.patientId) : undefined,
      petId: v.petId != null ? Number(v.petId) : undefined,
      patientName: (v.patient as Record<string, unknown> | undefined)?.profile
        ? String((v.patient as { profile?: { displayName?: string } }).profile?.displayName ?? "")
        : undefined,
      petName: (v.pet as { name?: string } | undefined)?.name ?? undefined,
    });
  }, [encounterFlowType, selectedPetContext?.petId, internalVisits, internalVisitsLoading]);

  const isWalkInFlow = encounterFlowType === "WALK_IN_EXTERNAL";

  const clinicMedTotal = useMemo(() => clinicMedicineLinesTotal(medicationLineDrafts), [medicationLineDrafts]);
  const injectionFeeNum = useMemo(() => parseMoney(serviceChargeAmount) ?? 0, [serviceChargeAmount]);
  const consumablesNum = useMemo(() => parseMoney(consumablesChargeAmount) ?? 0, [consumablesChargeAmount]);
  const grandTotal = useMemo(
    () => clinicMedTotal + injectionFeeNum + consumablesNum,
    [clinicMedTotal, injectionFeeNum, consumablesNum]
  );

  useEffect(() => {
    if (grandTotal > 0) setBillingCheckoutEnabled(true);
  }, [grandTotal]);

  const hasOutsideLineInDrafts = useMemo(
    () => medicationLineDrafts.some((d) => d.medicineSource === "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT"),
    [medicationLineDrafts]
  );

  const paymentRequired = grandTotal > 0;

  const generateBlockedReason = useMemo(() => {
    if (!selectedPetContext?.patientUserId || !selectedPetContext?.petId) return "Select a patient / pet.";
    if (!isWalkInFlow) {
      const vid = Number(visitId);
      if (!Number.isFinite(vid) || vid <= 0) return "Select or verify a visit for this pet.";
    }
    if (medicationLineDrafts.length < 1) return "Add at least one medicine line.";
    for (let i = 0; i < medicationLineDrafts.length; i++) {
      const d = medicationLineDrafts[i];
      const doseNum = Number(d.expectedDose);
      if (!d.route.trim()) return `Line ${i + 1}: route is required.`;
      if (!Number.isFinite(doseNum) || doseNum <= 0) return `Line ${i + 1}: enter a valid dose.`;
      if (!d.unit.trim()) return `Line ${i + 1}: unit is required.`;
      if (d.medicineSource === "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT") {
        if (!d.manualMedicineName.trim()) return `Line ${i + 1}: patient-brought medicine name is required.`;
      } else {
        const vid = Number(d.variantId);
        if (!Number.isFinite(vid) || vid <= 0) return `Line ${i + 1}: select a clinic / pharmacy variant.`;
      }
    }
    if (paymentRequired && !markPaidCheckout) return "Mark payment as completed when the order total is greater than zero.";
    if (paymentRequired && !billingCheckoutEnabled) return "Enable “Create order lines” when charging fees or medicine.";
    if (paymentRequired) {
      if (injectionFeeNum > 0 && !billingServiceId) return "Select the branch service for the injection / administration fee.";
      if (consumablesNum > 0 && !billingConsumablesServiceId) return "Select a service for the consumables fee.";
    }
    return null;
  }, [
    selectedPetContext,
    isWalkInFlow,
    visitId,
    medicationLineDrafts,
    paymentRequired,
    markPaidCheckout,
    billingCheckoutEnabled,
    injectionFeeNum,
    consumablesNum,
    billingServiceId,
    billingConsumablesServiceId,
  ]);

  const verifyVisit = useCallback(async () => {
    const id = Number(visitId);
    if (!branchId || !id) {
      toast.error("Enter a visit ID");
      return;
    }
    setVisitLoading(true);
    setVisitSummary(null);
    try {
      const v = await staffClinicVisitGet(branchId, id);
      if (!v) {
        toast.error("Visit not found");
        return;
      }
      const visit = v as Record<string, unknown>;
      setVisitSummary({
        id: visit.id as number,
        patientId: visit.patientId != null ? Number(visit.patientId) : undefined,
        petId: visit.petId != null ? Number(visit.petId) : undefined,
        patientName: (visit.patient as { profile?: { displayName?: string } })?.profile?.displayName ?? undefined,
        petName: (visit.pet as { name?: string })?.name ?? undefined,
      });
      if (visit.patientId != null && visit.petId != null) {
        const pet = visit.pet as Record<string, unknown>;
        const patient = visit.patient as Record<string, unknown>;
        setSelectedPetContext({
          petId: Number(visit.petId),
          patientUserId: Number(visit.patientId),
          petName: (pet?.name as string) ?? "Pet",
          ownerDisplayName:
            (patient?.profile as { displayName?: string; username?: string })?.displayName ??
            (patient?.profile as { username?: string })?.username ??
            "Owner",
          phone: (patient?.auth as { phone?: string })?.phone ?? null,
          email: (patient?.auth as { email?: string })?.email ?? null,
          species: (pet?.animalType as { name?: string })?.name ?? null,
          breed: (pet?.breed as { name?: string })?.name ?? null,
          uniquePetId: (pet?.uniquePetId as string) ?? null,
          registeredBranchId: pet?.clinicRegisteredBranchId != null ? Number(pet.clinicRegisteredBranchId) : null,
        });
      }
      toast.success("Visit verified");
    } catch (e) {
      toast.error((e as Error)?.message || "Failed to load visit");
    } finally {
      setVisitLoading(false);
    }
  }, [branchId, visitId]);

  const onEvidenceFile = useCallback(async (ev: ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    setEvidenceUploading(true);
    try {
      const { url } = await uploadMedia(f, f.name, "injection-external-rx");
      setExternalRxEvidenceUrl(url);
      toast.success("Prescription evidence uploaded");
    } catch (err) {
      toast.error((err as Error)?.message || "Upload failed");
    } finally {
      setEvidenceUploading(false);
      ev.target.value = "";
    }
  }, []);

  const handleGenerate = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!branchId) return;
      if (generateBlockedReason) {
        toast.error(generateBlockedReason);
        return;
      }

      const visitIdNum = Number(visitId);
      const expiresNum = Number(expiresInHours);
      const isWalkIn = encounterFlowType === "WALK_IN_EXTERNAL";
      const encounterKindForApi: InjectionEncounterKind = isWalkIn ? "EXTERNAL_WALK_IN" : "INTERNAL_VISIT";

      const outsideLineBlocks = medicationLineDrafts
        .filter((d) => d.medicineSource === "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT")
        .map((d) => outsideLineNotesForToken(d));
      const baseRxNotes = externalRxNotes.trim();
      const mergedOutsideBlocks = outsideLineBlocks.length > 0 ? outsideLineBlocks.join("\n\n---\n\n") : "";
      const mergedExternalRxNotes =
        mergedOutsideBlocks && baseRxNotes
          ? `${mergedOutsideBlocks}\n\n${baseRxNotes}`
          : mergedOutsideBlocks || baseRxNotes || undefined;

      const walkDoctorNum = Number(walkDoctorId);
      const walkInBlock = isWalkIn
        ? {
            patientId: selectedPetContext!.patientUserId,
            petId: selectedPetContext!.petId,
            ...(Number.isFinite(walkDoctorNum) && walkDoctorNum > 0 ? { doctorBranchMemberId: walkDoctorNum } : {}),
          }
        : undefined;

      const hasClinicLine = medicationLineDrafts.some((d) => d.medicineSource !== "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT");
      const hasOutsideLine = medicationLineDrafts.some((d) => d.medicineSource === "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT");
      const allOutsideOnly = hasOutsideLine && !hasClinicLine;

      const medicineLineBillings = medicationLineDrafts
        .filter((d) => d.medicineSource !== "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT")
        .map((d) => {
          const vid = Number(d.variantId);
          const up = parseMoney(d.billingUnitPrice);
          return { variantId: vid, quantity: 1 as const, unitPrice: up ?? 0 };
        })
        .filter((x) => x.unitPrice > 0 && Number.isFinite(x.variantId) && x.variantId > 0);

      const clinicMedicineFeeSum = medicineLineBillings.reduce((s, x) => s + x.unitPrice, 0);

      try {
        setCreating(true);

        let billingCheckout: Parameters<typeof staffClinicGenerateInjectionToken>[1]["billingCheckout"] | undefined;

        if (billingCheckoutEnabled) {
          const servicePrice = parseMoney(serviceChargeAmount) ?? 0;
          const injectionServiceIdNum = billingServiceId ? Number(billingServiceId) : null;
          if (servicePrice > 0 && !injectionServiceIdNum) {
            toast.error("Select the branch service row that matches the injection fee");
            return;
          }
          if (allOutsideOnly && medicineLineBillings.length > 0) {
            toast.error("Patient-brought-only token cannot include clinic medicine order lines; clear per-line clinic prices");
            return;
          }
          const consPrice = parseMoney(consumablesChargeAmount) ?? 0;
          const consSvcId = billingConsumablesServiceId ? Number(billingConsumablesServiceId) : null;
          if (consPrice > 0 && !consSvcId) {
            toast.error("Select a service for the consumables fee");
            return;
          }

          const useMultiMed = medicineLineBillings.length > 0;
          billingCheckout = {
            walkIn: walkInBlock,
            injectionServiceId: injectionServiceIdNum,
            servicePrice: servicePrice > 0 ? servicePrice : null,
            ...(useMultiMed
              ? { medicineLineBillings }
              : {
                  medicineVariantId: null,
                  medicineQuantity: null,
                  medicineUnitPrice: null,
                }),
            consumablesServiceId: consSvcId,
            consumablesPrice: consPrice > 0 ? consPrice : null,
            paymentMethod: checkoutPaymentMethod || "CASH",
            markPaid: markPaidCheckout,
            notes: null,
          };
        } else if (isWalkIn) {
          billingCheckout = {
            walkIn: walkInBlock,
            injectionServiceId: null,
            servicePrice: null,
            medicineVariantId: null,
            medicineQuantity: null,
            medicineUnitPrice: null,
            consumablesServiceId: null,
            consumablesPrice: null,
            paymentMethod: checkoutPaymentMethod || "CASH",
            markPaid: true,
            notes: null,
          };
        }

        const firstVial = medicationLineDrafts.find((d) => d.selectedVialSessionId.trim());
        const medicationLines = medicationLineDrafts.map((d) => {
          const doseNum = Number(d.expectedDose);
          const isOutside = d.medicineSource === "OUTSIDE_PRESCRIPTION_PATIENT_BROUGHT";
          const vid = Number(d.variantId);
          const bill = parseMoney(d.billingUnitPrice);
          return {
            medicineSource: d.medicineSource,
            variantId: isOutside ? null : vid,
            manualMedicineName: isOutside ? d.manualMedicineName.trim() : null,
            manualStrength: d.manualStrength.trim() || null,
            manualBatch: d.manualBatch.trim() || null,
            manualManufacturer: d.manualManufacturer.trim() || null,
            route: d.route.trim(),
            expectedDose: doseNum,
            unit: d.unit.trim() || null,
            durationText: d.durationText.trim() || null,
            frequencyText: d.frequencyText.trim() || null,
            longevityNote: d.longevityNote.trim() || null,
            lineNote: d.lineNote.trim() || null,
            selectedVialSessionId: d.selectedVialSessionId ? Number(d.selectedVialSessionId) : null,
            billingUnitPrice: !isOutside && bill != null && bill > 0 ? bill : null,
          };
        });

        const payload: Parameters<typeof staffClinicGenerateInjectionToken>[1] = {
          medicationLines,
          unit: medicationLineDrafts[0]?.unit.trim() || null,
          encounterKind: encounterKindForApi,
          externalPrescriberName: externalPrescriberName.trim() || undefined,
          externalPrescriberClinic: externalPrescriberClinic.trim() || undefined,
          externalRxNotes: mergedExternalRxNotes,
          externalRxEvidenceUrl: externalRxEvidenceUrl.trim() || undefined,
          serviceChargeAmount: parseMoney(serviceChargeAmount),
          medicineChargeAmount: clinicMedicineFeeSum > 0 ? clinicMedicineFeeSum : undefined,
          consumablesChargeAmount: parseMoney(consumablesChargeAmount),
          expiresInHours: Number.isFinite(expiresNum) && expiresNum > 0 ? expiresNum : 24,
          prescriptionId: prescriptionId ? Number(prescriptionId) : undefined,
          treatmentCourseId: treatmentCourseId ? Number(treatmentCourseId) : undefined,
          treatmentDayId: treatmentDayId ? Number(treatmentDayId) : undefined,
          selectedVialSessionId: firstVial?.selectedVialSessionId ? Number(firstVial.selectedVialSessionId) : undefined,
          billingCheckout: billingCheckout ?? undefined,
        };
        if (!isWalkIn) {
          payload.visitId = visitIdNum;
        }

        const created = await staffClinicGenerateInjectionToken(branchId, payload);
        toast.success(`Token generated: ${created?.tokenCode ?? "Success"}`);
        router.push(`/staff/branch/${branchId}/clinic/medicine-control/injection-tokens`);
      } catch (err) {
        toast.error((err as Error)?.message || "Failed to generate token");
      } finally {
        setCreating(false);
      }
    },
    [
      branchId,
      generateBlockedReason,
      visitId,
      medicationLineDrafts,
      encounterFlowType,
      externalPrescriberName,
      externalPrescriberClinic,
      externalRxNotes,
      externalRxEvidenceUrl,
      serviceChargeAmount,
      consumablesChargeAmount,
      expiresInHours,
      prescriptionId,
      treatmentCourseId,
      treatmentDayId,
      billingCheckoutEnabled,
      selectedPetContext,
      walkDoctorId,
      billingServiceId,
      billingConsumablesServiceId,
      markPaidCheckout,
      checkoutPaymentMethod,
      router,
    ]
  );

  if (isLoading) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <LoadingState message="Loading…" />
      </div>
    );
  }

  if (!canGenerate) {
    return <AccessDenied missingPerm="injection.token.generate" onBack={() => window.history.back()} />;
  }

  const breadcrumbs = [
    { label: "Staff", href: "/staff" },
    { label: "Branch", href: `/staff/branch/${branchId}` },
    { label: "Clinic", href: `/staff/branch/${branchId}/clinic` },
    { label: "Medicine Control", href: `/staff/branch/${branchId}/clinic/medicine-control` },
    { label: "Injection Tokens", href: `/staff/branch/${branchId}/clinic/medicine-control/injection-tokens` },
    { label: "Generate" },
  ];

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
      <PageHeader
        title="Generate injection token"
        subtitle="Complete encounter, patient, medicines, charges, and payment. Tokens require a paid clinic order before issue."
        breadcrumbs={breadcrumbs}
        actions={
          <Link
            href={`/staff/branch/${branchId}/clinic/medicine-control/injection-tokens`}
            className="btn btn-outline-secondary btn-sm radius-8"
          >
            ← Back to list
          </Link>
        }
      />

      <form onSubmit={handleGenerate}>
        <p className="text-muted small mb-3">
          Flow: <strong>Encounter</strong> → <strong>Patient &amp; visit</strong> → <strong>Medicines</strong> → <strong>Charges</strong> →{" "}
          <strong>Payment</strong> (sidebar) → <strong>Generate</strong>.
        </p>
        <div className="row g-4 align-items-start">
          <div className="col-lg-8 min-w-0">
            <div className="card radius-12 mb-3">
              <div className="card-body">
                <h6 className="small fw-semibold mb-3">
                  <span className="badge bg-primary-subtle text-primary-emphasis me-2">1</span>
                  Encounter
                </h6>
                <div className="d-flex flex-column gap-2" role="radiogroup" aria-label="Encounter type">
                  {ENCOUNTER_FLOW_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`d-flex gap-2 align-items-start p-2 rounded border cursor-pointer small ${
                        encounterFlowType === opt.value ? "border-primary bg-primary-subtle" : "border-light"
                      }`}
                    >
                      <input
                        type="radio"
                        className="form-check-input mt-1"
                        name="encounterFlowType"
                        checked={encounterFlowType === opt.value}
                        onChange={() => {
                          setEncounterFlowType(opt.value);
                          if (opt.value === "WALK_IN_EXTERNAL") {
                            setVisitId("");
                            setVisitSummary(null);
                            setVisitSearchQuery("");
                            setVisitSearchOpen(false);
                            setInternalVisits([]);
                          }
                        }}
                      />
                      <span>
                        <span className="fw-semibold d-block">{opt.label}</span>
                        <span className="text-muted">{opt.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="card radius-12 mb-3">
              <div className="card-body py-3">
                <h6 className="small fw-semibold mb-2">
                  <span className="badge bg-primary-subtle text-primary-emphasis me-2">2</span>
                  Patient &amp; visit
                </h6>
                <PatientSearch
                  embedded
                  branchId={branchId}
                  registerHref={`/staff/branch/${branchId}/clinic/patient-register`}
                  selectedPetContext={selectedPetContext}
                  onSelectPet={(ctx) => {
                    setSelectedPetContext(ctx);
                  }}
                  onClearSelection={() => {
                    setSelectedPetContext(null);
                    setVisitId("");
                    setVisitSummary(null);
                    setInternalVisits([]);
                  }}
                />

            {isWalkInFlow && (
              <div className="border rounded px-3 py-2 mb-0 bg-light-subtle">
                <div className="fw-semibold small mb-1">Attending doctor (walk-in, optional)</div>
                <p className="text-muted small mb-2">
                  Leave blank for outside-Rx / nurse-only administration; settlement rules follow branch finance policy.
                </p>
                <select
                  className="form-select form-select-sm radius-8"
                  value={walkDoctorId}
                  onChange={(e) => setWalkDoctorId(e.target.value)}
                >
                  <option value="">— No attending doctor —</option>
                  {branchDoctors.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!isWalkInFlow && selectedPetContext && (
              <div className="border rounded px-3 py-2 mt-2 mb-0 bg-body-tertiary bg-opacity-25">
                <div className="fw-semibold small mb-2">Visit for this pet</div>
                {internalVisitsLoading ? (
                  <p className="small text-muted mb-0">Loading visits…</p>
                ) : internalVisits.length === 0 ? (
                  <p className="small text-warning mb-0">
                    No visits found for this pet at this branch. Start a visit from queue or billing, or use walk-in if appropriate.
                  </p>
                ) : (
                  <>
                    <label className="form-label small">Select visit</label>
                    <select
                      className="form-select form-select-sm radius-8 mb-2"
                      value={visitId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setVisitId(id);
                        const v = internalVisits.find((x) => String((x as { id: unknown }).id) === id) as Record<string, unknown> | undefined;
                        if (v) {
                          setVisitSummary({
                            id: Number(v.id),
                            patientId: v.patientId != null ? Number(v.patientId) : undefined,
                            petId: v.petId != null ? Number(v.petId) : undefined,
                            patientName: (v.patient as { profile?: { displayName?: string } })?.profile?.displayName,
                            petName: (v.pet as { name?: string })?.name,
                          });
                        } else {
                          setVisitSummary(null);
                        }
                      }}
                    >
                      <option value="">— Choose a visit —</option>
                      {internalVisits.map((v) => {
                        const row = v as Record<string, unknown>;
                        const patient = row.patient as { profile?: { displayName?: string } } | undefined;
                        const pet = row.pet as { name?: string } | undefined;
                        return (
                          <option key={String(row.id)} value={String(row.id)}>
                            #{String(row.id)} {row.treatmentCode ? `· ${String(row.treatmentCode)}` : ""} · {String(row.status ?? "")} ·{" "}
                            {patient?.profile?.displayName ?? "Owner"} / {pet?.name ?? "Pet"}
                          </option>
                        );
                      })}
                    </select>
                    {visitSummary && (
                      <small className="text-success d-block">
                        Visit #{visitSummary.id} — {visitSummary.patientName ?? "Patient"} / {visitSummary.petName ?? "Pet"}
                        {(prescriptions.length > 0 || treatmentCourses.length > 0) && (
                          <span className="text-muted ms-1">
                            {" "}
                            · {prescriptions.length} Rx, {treatmentCourses.length} course(s)
                          </span>
                        )}
                      </small>
                    )}
                  </>
                )}
                <details className="mt-2 small">
                  <summary className="cursor-pointer text-muted">Advanced: keyword visit search or type Visit ID</summary>
                  <div className="row g-2 mt-2">
                    <div className="col-md-6">
                      <label className="form-label small">Visit keyword search</label>
                      <input
                        type="text"
                        className="form-control form-control-sm radius-8"
                        placeholder="Treatment code or name…"
                        value={visitSearchQuery}
                        onChange={(e) => {
                          setVisitSearchQuery(e.target.value);
                          setVisitSearchOpen(true);
                        }}
                        onFocus={() => setVisitSearchOpen(true)}
                      />
                      {visitSearchOpen && (visitSearchQuery.trim() || visitSearchResults.length > 0) && (
                        <div className="position-relative">
                          <ul
                            className="list-group list-group-flush small position-absolute top-0 start-0 end-0 z-3 shadow-sm radius-8 mt-1 overflow-auto"
                            style={{ maxHeight: 200 }}
                          >
                            {visitSearchLoading ? (
                              <li className="list-group-item">Loading…</li>
                            ) : visitSearchResults.length === 0 ? (
                              <li className="list-group-item text-muted">No visits found</li>
                            ) : (
                              visitSearchResults.map((v) => {
                                const row = v as Record<string, unknown>;
                                const patient = row.patient as { profile?: { displayName?: string; username?: string }; auth?: { phone?: string; email?: string } } | undefined;
                                const pet = row.pet as {
                                  name?: string;
                                  animalType?: { name?: string };
                                  breed?: { name?: string };
                                  uniquePetId?: string;
                                  clinicRegisteredBranchId?: number;
                                } | undefined;
                                return (
                                  <li
                                    key={String(row.id)}
                                    className="list-group-item list-group-item-action cursor-pointer"
                                    onClick={() => {
                                      setVisitId(String(row.id));
                                      setVisitSummary({
                                        id: Number(row.id),
                                        patientId: row.patientId != null ? Number(row.patientId) : undefined,
                                        petId: row.petId != null ? Number(row.petId) : undefined,
                                        patientName: patient?.profile?.displayName,
                                        petName: pet?.name,
                                      });
                                      if (row.patientId != null && row.petId != null) {
                                        setSelectedPetContext({
                                          petId: Number(row.petId),
                                          patientUserId: Number(row.patientId),
                                          petName: pet?.name ?? "Pet",
                                          ownerDisplayName:
                                            patient?.profile?.displayName ?? patient?.profile?.username ?? "Owner",
                                          phone: patient?.auth?.phone ?? null,
                                          email: patient?.auth?.email ?? null,
                                          species: pet?.animalType?.name ?? null,
                                          breed: pet?.breed?.name ?? null,
                                          uniquePetId: pet?.uniquePetId ?? null,
                                          registeredBranchId: pet?.clinicRegisteredBranchId ?? null,
                                        });
                                      }
                                      setVisitSearchQuery("");
                                      setVisitSearchResults([]);
                                      setVisitSearchOpen(false);
                                    }}
                                  >
                                    #{String(row.id)} {String(row.treatmentCode ?? "")} — {patient?.profile?.displayName ?? "—"} /{" "}
                                    {pet?.name ?? "—"}
                                  </li>
                                );
                              })
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small">Visit ID + verify</label>
                      <div className="d-flex gap-2">
                        <input
                          type="number"
                          className="form-control form-control-sm radius-8"
                          placeholder="Visit ID"
                          value={visitId}
                          onChange={(e) => {
                            setVisitId(e.target.value);
                            setVisitSummary(null);
                          }}
                        />
                        <button type="button" className="btn btn-sm btn-outline-secondary radius-8 text-nowrap" onClick={verifyVisit} disabled={visitLoading}>
                          {visitLoading ? "…" : "Verify"}
                        </button>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            )}
              </div>
            </div>

            <MedicineTable
              lines={medicationLineDrafts}
              onLinesChange={setMedicationLineDrafts}
              policies={policies}
              catalogFilter={variantListFilter}
              onCatalogFilterChange={setVariantListFilter}
              vialSessionsByVariant={vialSessionsByVariant}
            />

            <div className="row g-2 mb-3">
              <div className="col-md-2">
                <label className="form-label small">Expires (hours)</label>
                <input
                  type="number"
                  min={1}
                  className="form-control form-control-sm radius-8"
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(e.target.value)}
                />
              </div>
              {visitSummary && (
                <>
                  <div className="col-md-3">
                    <label className="form-label small">Prescription (optional)</label>
                    <select className="form-select form-select-sm radius-8" value={prescriptionId} onChange={(e) => setPrescriptionId(e.target.value)}>
                      <option value="">— None —</option>
                      {prescriptionsLoading ? (
                        <option value="" disabled>
                          Loading…
                        </option>
                      ) : (
                        prescriptions.map((p) => {
                          const row = p as { id: unknown; items?: unknown[] };
                          return (
                            <option key={String(row.id)} value={String(row.id)}>
                              Rx #{String(row.id)}
                              {row.items?.length ? ` (${row.items.length} items)` : ""}
                            </option>
                          );
                        })
                      )}
                    </select>
                    {prescriptionId
                      ? (() => {
                          const rx = prescriptions.find((p) => String((p as { id: unknown }).id) === prescriptionId) as
                            | { items?: Array<{ id: unknown; productVariantId?: unknown; medicineName?: string; dosage?: string }> }
                            | undefined;
                          const rxLines = rx?.items?.filter((i) => i.productVariantId) ?? [];
                          if (rxLines.length === 0) return null;
                          return (
                            <div className="mt-2 small">
                              <label className="form-label small mb-0">Apply Rx item to line</label>
                              <div className="d-flex flex-wrap gap-1 align-items-center">
                                <select
                                  className="form-select form-select-sm radius-8"
                                  style={{ maxWidth: 140 }}
                                  value={rxApplyLineKey}
                                  onChange={(e) => setRxApplyLineKey(e.target.value)}
                                >
                                  <option value="">Line…</option>
                                  {medicationLineDrafts.map((d, i) => (
                                    <option key={d.key} value={d.key}>
                                      #{i + 1}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  key={`rx-apply-${prescriptionId}`}
                                  className="form-select form-select-sm radius-8 flex-grow-1"
                                  defaultValue=""
                                  onChange={(e) => {
                                    const itemId = e.target.value;
                                    if (!itemId) return;
                                    if (!rxApplyLineKey) {
                                      toast.error("Choose a target line first");
                                      e.target.value = "";
                                      return;
                                    }
                                    const item = rxLines.find((i) => String(i.id) === itemId);
                                    if (!item?.productVariantId) return;
                                    let doseGuess = "";
                                    if (item.dosage && /[\d.]+/.test(String(item.dosage))) {
                                      doseGuess = String(item.dosage).match(/[\d.]+/)?.[0] ?? "";
                                    }
                                    const pol = policies.find((polRow) => policyVariantId(polRow) === Number(item.productVariantId));
                                    const defs = pol ? defaultsFromMedicinePolicyRow(pol) : null;
                                    setMedicationLineDrafts((prev) =>
                                      prev.map((d) =>
                                        d.key === rxApplyLineKey
                                          ? {
                                              ...d,
                                              medicineSource: "INTERNAL_CLINIC",
                                              variantId: String(item.productVariantId),
                                              expectedDose: doseGuess || d.expectedDose,
                                              selectedVialSessionId: "",
                                              ...(defs
                                                ? {
                                                    unit: defs.unit,
                                                    route: defs.route,
                                                    billingUnitPrice: defs.price !== "" ? defs.price : d.billingUnitPrice,
                                                  }
                                                : {}),
                                            }
                                          : d
                                      )
                                    );
                                    e.target.value = "";
                                    toast.success("Applied to line");
                                  }}
                                >
                                  <option value="">Copy variant from Rx…</option>
                                  {rxLines.map((i) => (
                                    <option key={String(i.id)} value={String(i.id)}>
                                      {i.medicineName} — {i.dosage}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })()
                      : null}
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small">Treatment course (optional)</label>
                    <select className="form-select form-select-sm radius-8" value={treatmentCourseId} onChange={(e) => setTreatmentCourseId(e.target.value)}>
                      <option value="">— None —</option>
                      {coursesLoading ? (
                        <option value="" disabled>
                          Loading…
                        </option>
                      ) : (
                        treatmentCourses.map((c) => {
                          const row = c as { id: unknown; variant?: { title?: string }; _count?: { days?: number } };
                          return (
                            <option key={String(row.id)} value={String(row.id)}>
                              {row.variant?.title ?? `Course #${String(row.id)}`} ({row._count?.days ?? 0} days)
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small">Treatment day (optional)</label>
                    <select className="form-select form-select-sm radius-8" value={treatmentDayId} onChange={(e) => setTreatmentDayId(e.target.value)}>
                      <option value="">— None —</option>
                      {courseScheduleLoading ? (
                        <option value="" disabled>
                          Loading…
                        </option>
                      ) : (
                        courseDays.map((d) => {
                          const row = d as { id: unknown; dayNumber?: unknown; scheduledDate?: string };
                          return (
                            <option key={String(row.id)} value={String(row.id)}>
                              Day {String(row.dayNumber)}
                              {row.scheduledDate ? ` (${new Date(row.scheduledDate).toLocaleDateString()})` : ""}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>
                </>
              )}
            </div>

            {(isWalkInFlow || hasOutsideLineInDrafts) && (
              <div className="border rounded px-3 py-2 mb-3">
                <h6 className="small fw-semibold mb-2">Outside prescription / documentation</h6>
                <div className="row g-2">
                  <div className="col-md-3">
                    <label className="form-label small">Prescriber name</label>
                    <input
                      className="form-control form-control-sm radius-8"
                      value={externalPrescriberName}
                      onChange={(e) => setExternalPrescriberName(e.target.value)}
                      placeholder="Vet / physician"
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small">Prescriber clinic</label>
                    <input
                      className="form-control form-control-sm radius-8"
                      value={externalPrescriberClinic}
                      onChange={(e) => setExternalPrescriberClinic(e.target.value)}
                      placeholder="Clinic name"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Evidence (URL or upload)</label>
                    <input
                      className="form-control form-control-sm radius-8 mb-1"
                      value={externalRxEvidenceUrl}
                      onChange={(e) => setExternalRxEvidenceUrl(e.target.value)}
                      placeholder="https://…"
                    />
                    <input type="file" accept="image/*,.pdf" className="form-control form-control-sm radius-8" disabled={evidenceUploading} onChange={onEvidenceFile} />
                    {evidenceUploading && <small className="text-muted">Uploading…</small>}
                  </div>
                  <div className="col-md-12">
                    <label className="form-label small">Additional Rx notes</label>
                    <textarea
                      className="form-control form-control-sm radius-8"
                      rows={2}
                      value={externalRxNotes}
                      onChange={(e) => setExternalRxNotes(e.target.value)}
                      placeholder="Instructions, allergies…"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="card radius-12 mb-3">
              <div className="card-body">
                <h6 className="small fw-semibold mb-2 text-muted">
                  <span className="badge bg-primary-subtle text-primary-emphasis me-2">4</span>
                  Charges &amp; checkout
                </h6>
                <p className="text-muted small mb-2">
                  Optional order lines: injection / service fee, clinic medicine (per line with price &gt; 0), consumables. Patient-brought lines do not create medicine order lines.
                </p>
                <label className="form-check mb-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={billingCheckoutEnabled}
                    disabled={grandTotal > 0}
                    onChange={(e) => setBillingCheckoutEnabled(e.target.checked)}
                  />
                  <span className="form-check-label small">Create order lines from fee fields (required when total &gt; 0)</span>
                </label>
                {grandTotal > 0 ? (
                  <p className="small text-muted mb-2 mb-md-0">Checkout stays on while the summary total is above zero.</p>
                ) : null}
                {billingCheckoutEnabled && (
                  <div className="row g-2 mb-2">
                    <div className="col-md-6">
                      <label className="form-label small">Service line (injection fee)</label>
                      <select className="form-select form-select-sm radius-8" value={billingServiceId} onChange={(e) => setBillingServiceId(e.target.value)}>
                        <option value="">— If charging injection service fee —</option>
                        {branchServices.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small">Consumables service (optional)</label>
                      <select
                        className="form-select form-select-sm radius-8"
                        value={billingConsumablesServiceId}
                        onChange={(e) => setBillingConsumablesServiceId(e.target.value)}
                      >
                        <option value="">— If charging consumables —</option>
                        {branchServices.map((s) => (
                          <option key={`c-${s.id}`} value={String(s.id)}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <div className="row g-2">
                  <div className="col-md-4">
                    <label className="form-label small">Service / admin fee amount</label>
                    <input
                      type="text"
                      className="form-control form-control-sm radius-8"
                      inputMode="decimal"
                      value={serviceChargeAmount}
                      onChange={(e) => setServiceChargeAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Consumables amount</label>
                    <input
                      type="text"
                      className="form-control form-control-sm radius-8"
                      inputMode="decimal"
                      value={consumablesChargeAmount}
                      onChange={(e) => setConsumablesChargeAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <p className="small text-muted mt-2 mb-0">
                  <Link href={`/staff/branch/${branchId}/clinic/billing`} className="text-decoration-underline">
                    Open billing
                  </Link>{" "}
                  if the visit already has a paid order and you are not creating lines here.
                </p>
              </div>
            </div>

            {!isWalkInFlow && visitSummary && !paymentRequired && !billingCheckoutEnabled ? (
              <div className="alert alert-info py-2 small mb-3 radius-8" role="note">
                Internal visit with no new charges: the server still needs a <strong>completed</strong> clinic order on this visit. Use checkout
                above or bill separately first.
              </div>
            ) : null}

            <div className="mb-2">
              <span className="badge bg-primary-subtle text-primary-emphasis me-2">5</span>
              <span className="small fw-semibold text-muted">Issue token</span>
            </div>
            <button
              type="submit"
              className="btn btn-primary radius-8"
              disabled={creating || !!generateBlockedReason}
              title={generateBlockedReason ?? undefined}
            >
              {creating ? "Generating…" : "Generate token"}
            </button>
            {generateBlockedReason ? <p className="small text-danger mt-2 mb-0">{generateBlockedReason}</p> : null}
          </div>

          <div className="col-lg-4 min-w-0">
            <p className="small fw-semibold text-muted mb-2">
              <span className="badge bg-secondary-subtle text-secondary-emphasis me-2">↳</span>
              Totals &amp; payment
            </p>
            <div className="position-sticky z-1" style={{ top: "5.5rem" }}>
              <SummaryPanel
                medicineTotal={clinicMedTotal}
                injectionFee={injectionFeeNum}
                consumables={consumablesNum}
                grandTotal={grandTotal}
              />
              <PaymentPanel
                markPaid={markPaidCheckout}
                onMarkPaidChange={setMarkPaidCheckout}
                paymentMethod={checkoutPaymentMethod}
                onPaymentMethodChange={setCheckoutPaymentMethod}
                paymentRequired={paymentRequired}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
