#!/usr/bin/env node
/**
 * Verify tsconfig path aliases resolve to existing files on case-sensitive filesystems.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const checks = [
  {
    alias: "@larkon/components/VectorMap",
    candidates: [
      "src/larkon-admin/components/VectorMap/index.tsx",
      "src/larkon-admin/components/VectorMap/index.ts",
    ],
  },
  {
    alias: "@larkon-ui/components/LkInput",
    candidates: [
      "src/larkon-ui/components/LkInput.tsx",
      "src/larkon-ui/components/LkInput.jsx",
      "src/larkon-ui/components/LkInput/index.tsx",
    ],
  },
];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

let failed = 0;

console.log("Path alias filesystem validation\n");

for (const { alias, candidates } of checks) {
  const hit = candidates.find(exists);
  if (hit) {
    console.log(`OK  ${alias} -> ${hit}`);
  } else {
    failed += 1;
    console.error(`FAIL ${alias} — none of:\n  ${candidates.join("\n  ")}`);
  }
}

const vectorMapDir = path.join(ROOT, "src/larkon-admin/components/VectorMap");
const vectorMapBackupDir = path.join(ROOT, "src/larkon-admin/components/VectorMap_backup");

if (fs.existsSync(vectorMapDir)) {
  const files = fs.readdirSync(vectorMapDir).sort();
  console.log(`\nVectorMap module files (${files.length}):`);
  for (const f of files) console.log(`  - ${f}`);
} else if (fs.existsSync(vectorMapBackupDir)) {
  failed += 1;
  console.error("\nFAIL VectorMap missing; found VectorMap_backup instead");
  console.error("Run: node scripts/restore-vectormap-module.mjs");
} else {
  failed += 1;
  console.error("\nFAIL VectorMap directory missing");
  console.error("Run: git checkout -- src/larkon-admin/components/VectorMap");
}

if (failed) process.exit(1);
console.log("\nAll alias checks passed.");
