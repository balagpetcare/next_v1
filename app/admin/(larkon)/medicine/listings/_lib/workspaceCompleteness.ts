import type { MedicineWorkspaceProfile } from "./medicineWorkspaceProfile.types";

const WEIGHT_CORE = 4;
const WEIGHT_COMP = 3;
const WEIGHT_PACK = 2;
const WEIGHT_REG = 2;
const WEIGHT_CLIN = 2;
const WEIGHT_COMM = 1;
const WEIGHT_GOV = 1;
const MAX =
  WEIGHT_CORE + WEIGHT_COMP + WEIGHT_PACK + WEIGHT_REG + WEIGHT_CLIN + WEIGHT_COMM + WEIGHT_GOV;

function nonEmpty(v: string | undefined): boolean {
  return Boolean(v && String(v).trim());
}

export type CompletenessBlock = { id: string; label: string; score: number; max: number; hints: string[] };

export function computeWorkspaceCompleteness(params: {
  countryId: number | "";
  brandSelected: boolean;
  presentationSelected: boolean;
  packageMark: string;
  profile: MedicineWorkspaceProfile;
}): { percent: number; blocks: CompletenessBlock[] } {
  const hintsCore: string[] = [];
  let core = 0;
  if (params.countryId !== "") core += 1;
  else hintsCore.push("Select country");
  if (params.brandSelected) core += 1;
  else hintsCore.push("Select brand");
  if (params.presentationSelected) core += 1;
  else hintsCore.push("Select or create presentation (generic + dosage form + strength)");
  if (nonEmpty(params.packageMark)) core += 1;
  else hintsCore.push("Add package mark (recommended)");

  const hintsComp: string[] = [];
  let comp = 0;
  if (nonEmpty(params.profile.unit)) comp += 1;
  else hintsComp.push("Unit");
  if (nonEmpty(params.profile.route)) comp += 1;
  else hintsComp.push("Route");
  if (nonEmpty(params.profile.medicineProductType)) comp += 1;
  else hintsComp.push("Product type");
  const compMax = 3;

  const hintsPack: string[] = [];
  let pack = 0;
  if (nonEmpty(params.profile.packSize)) pack += 1;
  else hintsPack.push("Pack size");
  if (nonEmpty(params.profile.packUnit)) pack += 1;
  else hintsPack.push("Pack unit");
  if (nonEmpty(params.profile.barcode) || nonEmpty(params.profile.sku)) pack += 1;
  else hintsPack.push("Barcode or SKU");
  const packMax = 3;

  const hintsReg: string[] = [];
  let reg = 0;
  if (nonEmpty(params.profile.registrationNumber)) reg += 1;
  else hintsReg.push("Registration #");
  if (nonEmpty(params.profile.approvalStatus)) reg += 1;
  else hintsReg.push("Approval status");
  if (nonEmpty(params.profile.approvalDate) || nonEmpty(params.profile.expiryDate)) reg += 1;
  else hintsReg.push("Approval / expiry dates");
  const regMax = 3;

  const hintsClin: string[] = [];
  let clin = 0;
  if (nonEmpty(params.profile.indications)) clin += 1;
  else hintsClin.push("Indications");
  if (nonEmpty(params.profile.storage)) clin += 1;
  else hintsClin.push("Storage");
  if (nonEmpty(params.profile.warnings) || nonEmpty(params.profile.contraindications)) clin += 1;
  else hintsClin.push("Warnings or contraindications");
  const clinMax = 3;

  const hintsComm: string[] = [];
  let comm = 0;
  if (nonEmpty(params.profile.mrp) || nonEmpty(params.profile.tradePrice)) comm += 1;
  else hintsComm.push("MRP or trade price");
  const commMax = 1;

  const hintsGov: string[] = [];
  let gov = 0;
  if (nonEmpty(params.profile.reviewerNotes) || nonEmpty(params.profile.changeReason)) gov += 1;
  else hintsGov.push("Reviewer notes or change reason");
  const govMax = 1;

  const blocks: CompletenessBlock[] = [
    { id: "core", label: "Core identity & packaging", score: core, max: 4, hints: hintsCore },
    { id: "composition", label: "Composition & classification", score: comp, max: compMax, hints: hintsComp },
    { id: "packaging", label: "Packaging & codes", score: pack, max: packMax, hints: hintsPack },
    { id: "regulatory", label: "Regulatory", score: reg, max: regMax, hints: hintsReg },
    { id: "clinical", label: "Clinical / use", score: clin, max: clinMax, hints: hintsClin },
    { id: "commercial", label: "Commercial", score: comm, max: commMax, hints: hintsComm },
    { id: "governance", label: "Governance notes", score: gov, max: govMax, hints: hintsGov },
  ];

  const earned =
    (core / 4) * WEIGHT_CORE +
    (comp / compMax) * WEIGHT_COMP +
    (pack / packMax) * WEIGHT_PACK +
    (reg / regMax) * WEIGHT_REG +
    (clin / clinMax) * WEIGHT_CLIN +
    (comm / commMax) * WEIGHT_COMM +
    (gov / govMax) * WEIGHT_GOV;

  return { percent: Math.round((earned / MAX) * 100), blocks };
}
