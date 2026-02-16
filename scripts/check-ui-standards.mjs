#!/usr/bin/env node
/**
 * Enforces UI standards: country/language selects must show flags.
 * Fails build if deprecated patterns (raw country/language selects) are found.
 * See docs/ui-standards.md
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

function walk(dir, exts, files = []) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules") {
        walk(p, exts, files);
      } else if (e.isFile() && exts.some((ext) => e.name.endsWith(ext))) {
        files.push(p);
      }
    }
  } catch (_) {}
  return files;
}

function grepInFiles(files, pattern) {
  return files.filter((f) => {
    try {
      return new RegExp(pattern).test(readFileSync(f, "utf-8"));
    } catch {
      return false;
    }
  });
}

let failed = false;

// 1. Shared components must exist
const required = [
  "src/shared/flags/getFlagEmoji.ts",
  "src/shared/selects/CountrySelect.tsx",
  "src/shared/selects/LanguageSelect.tsx",
];
for (const p of required) {
  if (!existsSync(join(ROOT, p))) {
    console.error("[check:ui-standards] Missing required:", p);
    failed = true;
  }
}

const uiFiles = walk(join(ROOT, "app"), [".tsx", ".jsx"])
  .concat(walk(join(ROOT, "components"), [".tsx", ".jsx"]));

// 2. Deprecated: jamina-lang-btn in JSX (exclude CSS)
const jaminaJsx = grepInFiles(uiFiles, "jamina-lang-btn");
if (jaminaJsx.length) {
  console.error("[check:ui-standards] Use LanguageSelect instead of jamina-lang-btn in:", jaminaJsx.map((f) => f.replace(ROOT, "")).join(", "));
  failed = true;
}

// 3. Deprecated: raw nationality select with Bangladeshi/Other only
const nationalityRaw = grepInFiles(uiFiles, '<option value="Bangladeshi"');
if (nationalityRaw.length) {
  console.error("[check:ui-standards] Use NationalitySelect instead of raw Bangladeshi/Other select in:", nationalityRaw.map((f) => f.replace(ROOT, "")).join(", "));
  failed = true;
}

if (failed) {
  process.exit(1);
}
console.log("[check:ui-standards] OK");
