#!/usr/bin/env node
/**
 * Guardrails: landing CSS isolation + no src/components/landing.
 * Run from repo root: node scripts/check-landing-isolation.mjs
 * Exit 0 = pass, 1 = fail (with messages to stderr).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const ALLOWED_LANDING_CSS_IMPORTER = "app/(public)/layout.tsx";

function normalize(p) {
  return p.replace(/\\/g, "/");
}

function fail(msg) {
  process.stderr.write(`check-landing: ${msg}\n`);
  process.exit(1);
}

// 1) Forbid src/components/landing
const landingComponentsPath = path.join(ROOT, "src", "components", "landing");
if (fs.existsSync(landingComponentsPath)) {
  fail(
    `src/components/landing must not exist (landing components live in app/(public)/_components). Remove: ${normalize(path.relative(ROOT, landingComponentsPath))}`
  );
}

// 2) Find any file that imports landing.css (except app/(public)/layout.tsx)
const exts = [".tsx", ".ts", ".jsx", ".js"];
const landingCssPattern = /landing\.css/;
const importLike = /(?:import|require)\s*\(?[\s'"]*[^'"]*landing\.css/;

function walk(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = normalize(path.relative(ROOT, full));
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next" || e.name.startsWith(".")) continue;
      walk(full, list);
    } else if (exts.some((ext) => e.name.endsWith(ext)) && landingCssPattern.test(rel) === false) {
      list.push(rel);
    }
  }
  return list;
}

const candidates = [
  ...walk(path.join(ROOT, "app")),
  ...walk(path.join(ROOT, "src")),
  ...walk(path.join(ROOT, "components")),
  ...walk(path.join(ROOT, "lib")),
];
// Root-level tsx/ts/jsx/js
for (const name of fs.readdirSync(ROOT)) {
  const full = path.join(ROOT, name);
  if (!fs.statSync(full).isFile()) continue;
  if (exts.some((ext) => name.endsWith(ext))) candidates.push(normalize(name));
}

const violators = [];
for (const rel of candidates) {
  const full = path.join(ROOT, rel);
  let content;
  try {
    content = fs.readFileSync(full, "utf8");
  } catch {
    continue;
  }
  if (!landingCssPattern.test(content)) continue;
  // File mentions landing.css — is it an import/require?
  if (!importLike.test(content)) continue;
  if (rel === ALLOWED_LANDING_CSS_IMPORTER) continue;
  violators.push(rel);
}

if (violators.length > 0) {
  fail(
    `landing.css may only be imported in ${ALLOWED_LANDING_CSS_IMPORTER}. Found in: ${violators.join(", ")}`
  );
}

process.exit(0);
