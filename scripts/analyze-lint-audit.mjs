#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const auditPath = path.join(ROOT, "lint-audit.json");

const legacyPatterns = [
  /^src\/larkon-admin\//,
  /^src\/larkon-ui\//,
  /^_vendor_templates\//,
  /^demo\//,
  /^examples\//,
  /^legacy\//,
];

const stylingRules = new Set([
  "@next/next/no-img-element",
  "@next/next/no-css-tags",
  "react/no-unescaped-entities",
  "jsx-a11y/role-has-required-aria-props",
  "jsx-a11y/role-supports-aria-props",
  "jsx-a11y/alt-text",
  "@next/next/no-html-link-for-pages",
]);

const criticalRules = new Set([
  "react-hooks/rules-of-hooks",
  "react/jsx-no-undef",
  "import/no-anonymous-default-export",
  "react/jsx-key",
]);

function rel(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function bucket(n) {
  if (n.startsWith("src/larkon-admin/")) return "src/larkon-admin";
  if (n.startsWith("src/larkon-ui/")) return "src/larkon-ui";
  if (n.startsWith("app/")) return "app";
  if (n.startsWith("lib/")) return "lib";
  if (n.startsWith("src/")) return "src (production)";
  if (n.startsWith("components/")) return "components";
  if (n.startsWith("tests/")) return "tests";
  if (n.startsWith("scripts/")) return "scripts";
  if (n.startsWith("types/")) return "types";
  if (n.startsWith("_vendor_templates/")) return "_vendor_templates";
  return "root/other";
}

function classify(n, msg) {
  if (legacyPatterns.some((p) => p.test(n))) return "legacy";
  if (msg.severity === 1) return "warningOnly";
  if (stylingRules.has(msg.ruleId)) return "styling";
  if (criticalRules.has(msg.ruleId)) return "critical";
  if (msg.ruleId?.startsWith("react-hooks/")) return "critical";
  return "styling";
}

const data = JSON.parse(fs.readFileSync(auditPath, "utf8"));
const byDir = {};
const byRule = {};
const byCat = { critical: 0, legacy: 0, styling: 0, warningOnly: 0 };

let prodErr = 0;
let prodWarn = 0;
let legTotal = 0;

for (const r of data) {
  if (!r.messages.length) continue;
  const n = rel(r.filePath);
  const isLegacy = legacyPatterns.some((p) => p.test(n));

  for (const m of r.messages) {
    byRule[m.ruleId || "(no rule)"] = (byRule[m.ruleId || "(no rule)"] || 0) + 1;
    const b = bucket(n);
    if (!byDir[b]) byDir[b] = { errors: 0, warnings: 0, files: new Set() };
    byDir[b].files.add(n);
    if (m.severity === 2) byDir[b].errors++;
    else byDir[b].warnings++;
    byCat[classify(n, m)]++;

    if (isLegacy) legTotal++;
    else if (m.severity === 2) prodErr++;
    else prodWarn++;
  }
}

const prodByRule = {};
for (const r of data) {
  const n = rel(r.filePath);
  if (legacyPatterns.some((p) => p.test(n))) continue;
  for (const m of r.messages) {
    const k = m.ruleId || "(no rule)";
    if (!prodByRule[k]) prodByRule[k] = { errors: 0, warnings: 0 };
    if (m.severity === 2) prodByRule[k].errors++;
    else prodByRule[k].warnings++;
  }
}

console.log(
  JSON.stringify(
    {
      byDir: Object.fromEntries(
        Object.entries(byDir).map(([k, v]) => [
          k,
          {
            files: v.files.size,
            errors: v.errors,
            warnings: v.warnings,
            total: v.errors + v.warnings,
          },
        ]),
      ),
      byCat,
      byRule,
      productionByRule: prodByRule,
      productionScope: {
        errors: prodErr,
        warnings: prodWarn,
        total: prodErr + prodWarn,
      },
      legacyTotal: legTotal,
    },
    null,
    2,
  ),
);
