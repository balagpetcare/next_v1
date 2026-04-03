const fs = require("fs");
const path = require("path");

const origPath = path.join(__dirname, "..", "_full_original.jsx");
const outPath = path.join(
  __dirname,
  "..",
  "app",
  "staff",
  "(larkon)",
  "branch",
  "[branchId]",
  "clinic",
  "appointments",
  "_components",
  "CreateAppointmentModal.jsx"
);

let orig;
try {
  orig = fs.readFileSync(origPath, "utf16le");
} catch (_) {
  orig = fs.readFileSync(origPath, "utf8");
}
const lines = orig.split("\n");
const startIdx = lines.findIndex((l) => l.includes("const CHANNEL_MODES = ["));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.startsWith("function RescheduleModal"));
const block = lines.slice(startIdx, endIdx).join("\n");

// Fix encoding
let out = block
  .replace(/\u2014/g, "—")
  .replace(/\u2026/g, "…")
  .replace(/ÔÇö/g, "—")
  .replace(/ÔÇª/g, "…")
  .replace(/ÔÇ£/g, '"')
  .replace(/ÔÇØ/g, '"');

// formatPetLabel: use formatPetTaxonomyLine
out = out.replace(
  `function formatPetLabel(p) {
  const typeName = p.animalType?.name ?? "?";
  const breedName = p.breed?.name ?? "";
  const sex = p.sex ?? "";
  const ownerName = p.owner?.displayName ?? "";
  const parts = [p.name, typeName, breedName, sex].filter(Boolean);
  const label = parts.join(" ÔÇö ");
  return ownerName ? \`\${label} ÔÇö Owner: \${ownerName}\` : label;
}`,
  `function formatPetLabel(p) {
  const taxonomy = formatPetTaxonomyLine(p);
  const sex = p.sex ?? "";
  const ownerName = p.owner?.displayName ?? "";
  const parts = [p.name, taxonomy, sex].filter(Boolean);
  const label = parts.join(" — ");
  return ownerName ? \`\${label} — Owner: \${ownerName}\` : label;
}`
);

// PetSelectWithQuickCreate: use useBreedsByAnimalType hook instead of useState+useEffect
out = out.replace(
  "const [breeds, setBreeds] = useState([]);\n  const [quickPet, setQuickPet] = useState({ name: \"\", animalTypeId: \"\", breedId: \"\", sex: \"\" });\n  const [creating, setCreating] = useState(false);\n\n  useEffect(() => {\n    if (quickPet.animalTypeId) {\n      getBreedsByAnimalType(Number(quickPet.animalTypeId)).then((b) => setBreeds(Array.isArray(b) ? b : []));\n    } else setBreeds([]);\n  }, [quickPet.animalTypeId]);",
  "const [quickPet, setQuickPet] = useState({ name: \"\", animalTypeId: \"\", breedId: \"\", sex: \"\" });\n  const { breeds = [] } = useBreedsByAnimalType(quickPet.animalTypeId || null);\n  const [creating, setCreating] = useState(false);"
);

// CreateAppointmentModal: use useAnimalTypes, remove getAnimalTypes from Promise.all
out = out.replace(
  "const [animalTypes, setAnimalTypes] = useState([]);",
  "const { types: animalTypes = [], loading: animalTypesLoading = false } = useAnimalTypes();\n  const optionsOrTypesLoading = optionsLoading || animalTypesLoading;"
);
out = out.replace(
  `Promise.all([staffClinicDoctors(branchId), staffClinicServices(branchId), getAnimalTypes()])
      .then(([d, s, at]) => {
        setDoctors(Array.isArray(d) ? d : []);
        setServices(Array.isArray(s) ? s : []);
        setAnimalTypes(Array.isArray(at) ? at : []);
      })`,
  `Promise.all([staffClinicDoctors(branchId), staffClinicServices(branchId)])
      .then(([d, s]) => {
        setDoctors(Array.isArray(d) ? d : []);
        setServices(Array.isArray(s) ? s : []);
      })`
);
// Pass optionsOrTypesLoading to sub-forms where we pass optionsLoading
out = out.replace(
  /optionsLoading=\{optionsLoading\}/g,
  "optionsLoading={optionsOrTypesLoading}"
);

const header = `"use client";

import { useEffect, useState, useCallback } from "react";
import {
  staffClinicDoctors,
  staffClinicServices,
  staffClinicSlots,
  staffClinicOwnerLookup,
  staffClinicPatientsList,
  staffClinicPatientRegister,
  staffClinicCheckDuplicate,
  staffClinicAppointmentCreateV2,
} from "@/lib/api";
import { useAnimalTypes, useBreedsByAnimalType } from "@/lib/usePetTaxonomy";
import { formatPetTaxonomyLine } from "@/lib/formatPetTaxonomy";

function todayYMD() {
  const d = new Date();
  return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, "0")}-\${String(d.getDate()).padStart(2, "0")}\`;
}
function maxDateYMD() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, "0")}-\${String(d.getDate()).padStart(2, "0")}\`;
}

`;

fs.writeFileSync(outPath, header + out + "\n\nexport default CreateAppointmentModal;\n");
console.log("Wrote", outPath);
