import { ADMIN_MEDICINE_BASE, ADMIN_MEDICINE_IMPORTS } from "./paths";

/**
 * Canonical Medicine workspace IA (order/hrefs). Admin sidebar items live in `src/lib/permissionMenu.ts` (Medicine section);
 * keep hrefs aligned when adding routes. Previously a horizontal bar consumed `MEDICINE_WORKSPACE_NAV`; only in-page quick links use `MEDICINE_QUICK_OPS` now.
 */
export const MEDICINE_WORKSPACE_NAV: { href: string; label: string }[] = [
  { href: ADMIN_MEDICINE_BASE, label: "Control Center" },
  { href: `${ADMIN_MEDICINE_BASE}/listings`, label: "Medicines" },
  { href: `${ADMIN_MEDICINE_BASE}/generics`, label: "Generics" },
  { href: `${ADMIN_MEDICINE_BASE}/brands`, label: "Brands" },
  { href: `${ADMIN_MEDICINE_BASE}/dosage-forms`, label: "Dosage Forms" },
  { href: `${ADMIN_MEDICINE_BASE}/presentations`, label: "Strengths / Presentations" },
  { href: `${ADMIN_MEDICINE_BASE}/manufacturers`, label: "Manufacturers" },
  { href: `${ADMIN_MEDICINE_BASE}/country-catalogs`, label: "Country Catalogs" },
  { href: ADMIN_MEDICINE_IMPORTS, label: "Imports" },
  { href: `${ADMIN_MEDICINE_BASE}/review`, label: "Review & Conflicts" },
  { href: `${ADMIN_MEDICINE_BASE}/exports`, label: "Export & Reports" },
  { href: `${ADMIN_MEDICINE_BASE}/settings`, label: "Governance" },
];

/** Control Center quick links (subset + descriptions). */
export const MEDICINE_QUICK_OPS: { href: string; label: string; desc: string }[] = [
  { href: `${ADMIN_MEDICINE_BASE}/listings`, label: "Country medicines", desc: "Search, filter, bulk lifecycle, export-aligned filters." },
  { href: ADMIN_MEDICINE_IMPORTS, label: "Import center", desc: "CSV staging, preview, confirm, apply, batch history & purge." },
  { href: `${ADMIN_MEDICINE_BASE}/dosage-forms`, label: "Dosage forms", desc: "Global dosage types for presentations and catalog." },
  { href: `${ADMIN_MEDICINE_BASE}/presentations`, label: "Strengths / presentations", desc: "Strength variants linked to generics and forms." },
  { href: `${ADMIN_MEDICINE_BASE}/generics`, label: "Generics", desc: "Molecule / generic name master data." },
  { href: `${ADMIN_MEDICINE_BASE}/brands`, label: "Brands & manufacturers", desc: "Trade names and manufacturers." },
  { href: `${ADMIN_MEDICINE_BASE}/exports`, label: "Exports", desc: "Download listings CSV with optional filters." },
  { href: `${ADMIN_MEDICINE_BASE}/review`, label: "Review & conflicts", desc: "Import row classification queues." },
];
