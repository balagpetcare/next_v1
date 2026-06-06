#!/usr/bin/env node
/**
 * Verify jsvectormap country map files exist (1.3.x bundle layout).
 * Usage: node scripts/validate-jsvectormap-maps.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const mapsDir = path.join(ROOT, "node_modules", "jsvectormap", "dist", "maps");

const REQUIRED = [
  "world.js",
  "canada.js",
  "iraq.js",
  "italy.js",
  "russia.js",
  "spain.js",
  "us-merc-en.js",
];

let pkgVersion = "unknown";
try {
  pkgVersion = JSON.parse(
    fs.readFileSync(path.join(ROOT, "node_modules", "jsvectormap", "package.json"), "utf8")
  ).version;
} catch {
  console.error("jsvectormap is not installed. Run npm install.");
  process.exit(1);
}

console.log(`jsvectormap version: ${pkgVersion}\n`);

let failed = 0;
for (const file of REQUIRED) {
  const full = path.join(mapsDir, file);
  if (fs.existsSync(full)) {
    console.log(`OK  dist/maps/${file}`);
  } else {
    failed += 1;
    console.error(`FAIL dist/maps/${file} missing`);
  }
}

if (pkgVersion !== "1.3.2") {
  console.warn(`\nWARN: expected pinned version 1.3.2 (country maps bundled); got ${pkgVersion}`);
}

if (failed) {
  console.error("\nInstall pinned version: npm install jsvectormap@1.3.2");
  process.exit(1);
}

console.log("\njsvectormap map files: PASS");
