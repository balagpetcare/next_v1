#!/usr/bin/env node
/**
 * Remove Next.js / Turbopack caches for all SITE_MODE dist dirs.
 * Use before production build or after dev:all corruption (missing manifests, write batch errors).
 *
 * Usage: node scripts/clean-workspace.mjs [--keep-node-modules]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const SITE_MODES = ["mother", "shop", "clinic", "admin", "owner", "producer", "country", "doctor"];

function rmDir(target) {
  if (!fs.existsSync(target)) return false;
  fs.rmSync(target, { recursive: true, force: true });
  return true;
}

const removed = [];

if (rmDir(path.join(ROOT, ".next"))) removed.push(".next");
for (const mode of SITE_MODES) {
  const p = path.join(ROOT, `.next-${mode}`);
  if (rmDir(p)) removed.push(`.next-${mode}`);
  const modeDir = path.join(ROOT, ".next", mode);
  if (rmDir(modeDir)) removed.push(`.next/${mode}`);
}

for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  if (/^\.next(\.|$)/.test(entry.name) && entry.name !== ".next") {
    const p = path.join(ROOT, entry.name);
    if (rmDir(p)) removed.push(entry.name);
  }
}

const turboCache = path.join(ROOT, "node_modules", ".cache");
if (rmDir(turboCache)) removed.push("node_modules/.cache");

console.log(removed.length ? `Removed: ${removed.join(", ")}` : "No cache directories found to remove.");
console.log("Workspace cache clean complete.");
